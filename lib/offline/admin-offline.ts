"use client";

import type {
  LiveAdminProduct,
  LiveAdminSettings,
  LiveAdminWorkspace,
  LiveCustomer,
  LiveStockStatus,
} from "@/lib/admin-live-types";
import {
  DEFAULT_BUSINESS_ID,
  availableInventoryStock,
  type InventoryBalance,
} from "@/lib/business/inventory-types";
import { hasPermission, normalizeBusinessRole } from "@/lib/business/permissions";
import {
  createOfflineOperationIdentifiers,
  enqueueSyncOperation,
  getCachedInventoryBalance,
  getCachedProduct,
  getOfflineActorSession,
  getOrCreateDeviceState,
  listCachedCustomers,
  listCachedInventoryBalances,
  listCachedProducts,
  listSyncQueue,
  replaceOfflineProjectionCaches,
  upsertCachedInventoryBalance,
  upsertCachedProduct,
  upsertOperationalRecord,
} from "@/lib/offline/offline-db";
import type { JsonValue, OfflineSyncQueueRecord } from "@/lib/offline/types";

export type OfflineProductProjection = {
  id: string;
  name: string;
  code: string;
  sku: string;
  barcodes: string[];
  category: string;
  brand: string;
  supplier: string;
  imageUrl: string;
  visible: boolean;
  stockStatus: LiveStockStatus;
  inventoryVersion: number;
  minStock: number;
  stockOnHand: number;
  stockQuantity: number;
  reservedStock: number;
  incomingStock: number;
  damagedStock: number;
  returnedStock: number;
  quarantinedStock: number;
  managed: boolean;
  sellingPriceCents: number | null;
  priceVerified: boolean;
  updatedAt: string | null;
};

export type OfflineCustomerProjection = {
  id: string;
  customerId: string;
  displayName: string;
  email: string;
  phone: string;
  companyName: string;
  updatedAt: string | null;
};

export type OfflineBootstrapResponse = {
  schemaVersion: 1;
  generatedAt: string;
  businessId: string;
  location: { id: string; name: string; registered: boolean };
  device: { id: string; registered: boolean };
  actor: { id: string; role: string };
  capabilities: {
    allowedOperationKinds: string[];
    cashSalesOffline: boolean;
    cardSalesOffline: boolean;
    securityOperationsOffline: boolean;
  };
  products: OfflineProductProjection[];
  inventoryBalances: InventoryBalance[];
  customers: OfflineCustomerProjection[];
  bounds: Record<string, { returned: number; limit: number; truncated: boolean }>;
};

export type OfflineOperationResult = {
  operationId: string;
  kind: string;
  status: "applied" | "replayed" | "rejected" | "failed";
  code: string;
  message: string;
  movementId?: string;
  balance?: InventoryBalance;
  currentVersion?: number;
  retryable?: boolean;
};

export type OfflineSyncResponse = {
  ok: boolean;
  acceptedAt: string;
  summary: { received: number; applied: number; replayed: number; rejected: number; failed: number };
  results: OfflineOperationResult[];
};

const offlineSettings: LiveAdminSettings = {
  businessName: "TRUECOLOURS",
  vatNumber: "",
  invoicePrefix: "INV-",
  email: "",
  phone: "",
  address: "",
  vatRate: 15,
  registrationNumber: "",
  website: "",
  country: "South Africa",
  bankAccountHolder: "",
  bankName: "",
  bankAccountNumber: "",
  bankAccountType: "",
  bankBranchCode: "",
  defaultPaymentTerms: 30,
  defaultPublicNotes: "",
  invoiceFooter: "",
  invoiceAccentColor: "#111827",
};

function roundQuantity(value: number) {
  return Math.round(value * 1_000) / 1_000;
}

function statusFor(
  available: number,
  minimumStock: number,
  requested?: LiveStockStatus,
): LiveStockStatus {
  if (requested === "On Order" || requested === "Confirm availability") return requested;
  if (available <= 0) return "Out of Stock";
  if (available <= minimumStock) return "Limited Stock";
  return "In Stock";
}

function productWithBalance(product: OfflineProductProjection, balance?: InventoryBalance): LiveAdminProduct {
  const onHand = balance?.onHand ?? product.stockOnHand;
  const available = balance?.available ?? product.stockQuantity;
  return {
    id: product.id,
    name: product.name,
    code: product.code,
    category: product.category,
    brand: product.brand,
    supplier: product.supplier,
    price: "Quote on request",
    sellingPrice: product.sellingPriceCents === null ? null : product.sellingPriceCents / 100,
    priceVerified: product.priceVerified && product.sellingPriceCents !== null,
    imageUrl: product.imageUrl,
    stockOnHand: onHand,
    stockQuantity: available,
    reservedStock: balance?.reserved ?? product.reservedStock,
    incomingStock: balance?.incoming ?? product.incomingStock,
    damagedStock: balance?.damaged ?? product.damagedStock,
    returnedStock: balance?.returned ?? product.returnedStock,
    quarantinedStock: balance?.quarantined ?? product.quarantinedStock,
    inventoryVersion: balance?.version ?? product.inventoryVersion,
    minStock: product.minStock,
    stockStatus: balance ? statusFor(available, product.minStock, product.stockStatus) : product.stockStatus,
    visible: product.visible,
    managed: Boolean(balance || product.managed),
    updatedAt: product.updatedAt,
  };
}

function customerForCache(customer: OfflineCustomerProjection): LiveCustomer {
  return {
    id: customer.id,
    customerId: customer.customerId,
    displayName: customer.displayName,
    email: customer.email,
    phone: customer.phone,
    companyName: customer.companyName,
    city: "",
    province: "",
    physicalAddress: "",
    deliveryAddress: "",
    role: "customer",
    provider: "offline cache",
    updatedAt: customer.updatedAt,
    carts: [],
    orders: [],
    quotes: [],
    vehicles: [],
    activities: [],
  };
}

export async function cacheOfflineBootstrap(snapshot: OfflineBootstrapResponse) {
  if (snapshot.schemaVersion !== 1) throw new Error("This offline snapshot version is not supported.");
  const balanceByProduct = new Map(
    snapshot.inventoryBalances.map((balance) => [balance.productId, balance]),
  );
  const products = snapshot.products.map((product) => productWithBalance(product, balanceByProduct.get(product.id)));
  const customers = snapshot.customers.map(customerForCache);

  await replaceOfflineProjectionCaches({
    businessId: snapshot.businessId,
    locationId: snapshot.location.id,
    deviceLabel: snapshot.device.registered
      ? snapshot.location.name
      : `Browser POS · ${snapshot.location.name}`,
    cachedAt: snapshot.generatedAt,
    products,
    customers,
    inventoryBalances: snapshot.inventoryBalances,
    productSourceUpdatedAt: (product) => product.updatedAt,
    customerSourceUpdatedAt: (customer) => customer.updatedAt,
    balanceSourceUpdatedAt: (balance) => typeof balance.updatedAt === "string" ? balance.updatedAt : null,
  });
  return { products: products.length, customers: customers.length, balances: snapshot.inventoryBalances.length };
}

export async function loadCachedAdminWorkspace(): Promise<LiveAdminWorkspace | null> {
  const [productRecords, customerRecords, balanceRecords, device] = await Promise.all([
    listCachedProducts<LiveAdminProduct>(DEFAULT_BUSINESS_ID),
    listCachedCustomers<LiveCustomer>(DEFAULT_BUSINESS_ID),
    listCachedInventoryBalances({ businessId: DEFAULT_BUSINESS_ID }),
    getOrCreateDeviceState(),
  ]);
  if (!productRecords.length && !customerRecords.length) return null;

  const balances = new Map(
    balanceRecords
      .filter((record) => record.locationId === device.locationId)
      .map((record) => [record.productId, record.value]),
  );
  const products = productRecords.map((record) => {
    const product = record.value;
    const balance = balances.get(product.id);
    if (!balance) return product;
    return {
      ...product,
      stockOnHand: balance.onHand,
      stockQuantity: balance.available,
      reservedStock: balance.reserved,
      incomingStock: balance.incoming,
      damagedStock: balance.damaged,
      returnedStock: balance.returned,
      quarantinedStock: balance.quarantined,
      inventoryVersion: balance.version,
      stockStatus: statusFor(balance.available, product.minStock, product.stockStatus),
    };
  });
  const customers = customerRecords.map((record) => record.value);
  const generatedAt = [...productRecords, ...customerRecords]
    .map((record) => record.cachedAt)
    .sort()
    .at(-1) || null;

  return {
    configured: true,
    offlineSnapshot: true,
    snapshotGeneratedAt: generatedAt,
    message: "Offline — showing the last approved product, inventory, and customer snapshot stored on this device.",
    products,
    customers,
    stockMovements: [],
    orders: [],
    quotes: [],
    messages: [],
    invoices: [],
    auditLogs: [],
    settings: offlineSettings,
    totals: {
      cartItems: 0,
      customers: customers.length,
      lowStock: products.filter((product) => product.stockStatus === "Limited Stock").length,
      orders: 0,
      outOfStock: products.filter((product) => product.stockStatus === "Out of Stock").length,
      products: products.length,
      quotes: 0,
      invoices: 0,
      grossBilled: 0,
      paidRevenue: 0,
      outstanding: 0,
      vatBilled: 0,
    },
  };
}

export type QueueOfflineInventoryInput = {
  product: LiveAdminProduct;
  targetOnHand: number;
  minStock: number;
  stockStatus: LiveStockStatus;
  visible: boolean;
  reason: string;
  note: string;
};

export async function queueOfflineInventoryAdjustment(input: QueueOfflineInventoryInput) {
  const actor = await getOfflineActorSession();
  if (!actor) {
    throw new Error("Reconnect and sign in once before creating offline inventory changes on this device.");
  }
  if (!hasPermission(normalizeBusinessRole(actor.actorRole), "inventory.adjust")) {
    throw new Error("Your role cannot create inventory adjustments, including while offline.");
  }
  if (
    input.minStock !== input.product.minStock
    || input.stockStatus !== input.product.stockStatus
    || input.visible !== input.product.visible
  ) {
    throw new Error("Low-stock levels, website visibility, and availability labels require an internet connection.");
  }

  const device = await getOrCreateDeviceState();
  const targetOnHand = roundQuantity(input.targetOnHand);
  const currentOnHand = roundQuantity(input.product.stockOnHand);
  const quantityDelta = roundQuantity(targetOnHand - currentOnHand);
  if (quantityDelta === 0) throw new Error("There is no stock quantity change to queue.");

  const unavailable = input.product.reservedStock
    + input.product.damagedStock
    + input.product.returnedStock
    + input.product.quarantinedStock;
  if (targetOnHand < unavailable) {
    throw new Error("On-hand stock cannot be lower than reserved or non-sellable stock.");
  }

  const waiting = await listSyncQueue({
    actorId: actor.actorId,
    deviceId: device.deviceId,
    locationId: device.locationId,
  });
  const sameProduct = waiting.find((record) => {
    const payload = record.payload as Record<string, JsonValue>;
    return record.entityType === "inventory" && payload.productId === input.product.id;
  });
  if (sameProduct) {
    throw new Error("This product already has an offline inventory change waiting to synchronize.");
  }

  const { operationId, idempotencyKey } = createOfflineOperationIdentifiers();
  const payload = {
    productId: input.product.id,
    variantId: null,
    quantityDelta,
    expectedVersion: input.product.inventoryVersion,
    reason: input.reason.trim() || "Offline stock adjustment",
    note: input.note.trim(),
  } satisfies Record<string, JsonValue>;

  await upsertOperationalRecord({
    localId: operationId,
    operationId,
    businessId: device.businessId,
    deviceId: device.deviceId,
    locationId: device.locationId,
    entityType: "inventory_adjustment",
    payload,
    status: "draft",
  });
  const queued = await enqueueSyncOperation({
    operationId,
    idempotencyKey,
    actorId: actor.actorId,
    businessId: device.businessId,
    deviceId: device.deviceId,
    locationId: device.locationId,
    entityType: "inventory",
    action: "adjustment",
    payload,
    localRecordId: operationId,
  });

  const existingBalance = await getCachedInventoryBalance({
    businessId: device.businessId,
    locationId: device.locationId,
    productId: input.product.id,
  });
  const balance: InventoryBalance = {
    id: existingBalance?.value.id || `offline:${device.locationId}:${input.product.id}`,
    businessId: device.businessId,
    locationId: device.locationId,
    productId: input.product.id,
    variantId: null,
    version: input.product.inventoryVersion,
    onHand: targetOnHand,
    reserved: input.product.reservedStock,
    incoming: input.product.incomingStock,
    damaged: input.product.damagedStock,
    returned: input.product.returnedStock,
    quarantined: input.product.quarantinedStock,
    available: availableInventoryStock({
      onHand: targetOnHand,
      reserved: input.product.reservedStock,
      damaged: input.product.damagedStock,
      returned: input.product.returnedStock,
      quarantined: input.product.quarantinedStock,
    }),
    updatedAt: new Date().toISOString(),
  };
  const stockStatus = statusFor(balance.available, input.product.minStock, input.product.stockStatus);
  await Promise.all([
    upsertCachedInventoryBalance(balance),
    upsertCachedProduct({
      ...input.product,
      stockOnHand: balance.onHand,
      stockQuantity: balance.available,
      stockStatus,
    }, { businessId: device.businessId }),
  ]);

  return { queued, balance, stockStatus };
}

export function operationEnvelope(operation: OfflineSyncQueueRecord) {
  return {
    operationId: operation.operationId,
    idempotencyKey: operation.idempotencyKey,
    actorId: operation.actorId,
    deviceId: operation.deviceId,
    locationId: operation.locationId,
    entityType: operation.entityType,
    action: operation.action,
    payload: operation.payload,
  };
}

export async function cacheSynchronizedInventoryBalance(balance: InventoryBalance) {
  const device = await getOrCreateDeviceState();
  const productRecord = await getCachedProduct<LiveAdminProduct>(balance.productId, balance.businessId);
  await upsertCachedInventoryBalance(balance);
  if (!productRecord) return;

  const product = productRecord.value;
  await upsertCachedProduct({
    ...product,
    stockOnHand: balance.onHand,
    stockQuantity: balance.available,
    reservedStock: balance.reserved,
    incomingStock: balance.incoming,
    damagedStock: balance.damaged,
    returnedStock: balance.returned,
    quarantinedStock: balance.quarantined,
    inventoryVersion: balance.version,
    stockStatus: statusFor(balance.available, product.minStock, product.stockStatus),
    updatedAt: typeof balance.updatedAt === "string" ? balance.updatedAt : product.updatedAt,
  }, { businessId: device.businessId });
}
