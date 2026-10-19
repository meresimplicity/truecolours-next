import {
  DEFAULT_BUSINESS_ID,
  DEFAULT_LOCATION_ID,
  type InventoryBalance,
} from "@/lib/business/inventory-types";
import {
  OFFLINE_RECORD_SCHEMA_VERSION,
  type ClaimSyncOperationOptions,
  type EnqueueSyncOperationInput,
  type JsonValue,
  type OfflineCacheRecord,
  type OfflineActorSession,
  type OfflineCachedCustomer,
  type OfflineCachedInventoryBalance,
  type OfflineCachedProduct,
  type OfflineDeviceState,
  type OfflineEntity,
  type OfflineMetadataRecord,
  type OfflineOperationalRecord,
  type OfflineOperationalStatus,
  type OfflineSyncQueueQuery,
  type OfflineSyncQueueRecord,
  type OfflineSyncStatus,
  type UpsertOfflineOperationalRecordInput,
} from "@/lib/offline/types";

export const OFFLINE_DB_NAME = "truecolours-retail-offline";
export const OFFLINE_DB_VERSION = 1;
export const OFFLINE_DEVICE_STATE_KEY = "device-state";
export const OFFLINE_ACTOR_SESSION_KEY = "admin-actor-session";

export const offlineStoreNames = {
  metadata: "metadata",
  products: "cachedProducts",
  customers: "cachedCustomers",
  inventoryBalances: "cachedInventoryBalances",
  operationalRecords: "operationalRecords",
  syncQueue: "syncQueue",
} as const;

type OfflineStoreName = (typeof offlineStoreNames)[keyof typeof offlineStoreNames];

export class OfflineDatabaseUnavailableError extends Error {
  constructor() {
    super("Offline storage is available only in browsers that support IndexedDB.");
    this.name = "OfflineDatabaseUnavailableError";
  }
}

export class OfflineDatabaseBlockedError extends Error {
  constructor() {
    super("Offline storage could not be upgraded because another app tab still has the database open.");
    this.name = "OfflineDatabaseBlockedError";
  }
}

export class OfflineQueueConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OfflineQueueConflictError";
  }
}

let databasePromise: Promise<IDBDatabase> | null = null;

function indexedDbFactory(): IDBFactory | null {
  if (typeof globalThis === "undefined" || !("indexedDB" in globalThis)) return null;
  return globalThis.indexedDB || null;
}

export function isOfflineDatabaseAvailable() {
  return indexedDbFactory() !== null;
}

function ensureIndex(
  store: IDBObjectStore,
  name: string,
  keyPath: string | string[],
  options?: IDBIndexParameters,
) {
  if (!store.indexNames.contains(name)) store.createIndex(name, keyPath, options);
}

function storeForUpgrade(
  database: IDBDatabase,
  transaction: IDBTransaction,
  name: OfflineStoreName,
  options: IDBObjectStoreParameters,
) {
  return database.objectStoreNames.contains(name)
    ? transaction.objectStore(name)
    : database.createObjectStore(name, options);
}

function upgradeOfflineDatabase(database: IDBDatabase, transaction: IDBTransaction) {
  storeForUpgrade(database, transaction, offlineStoreNames.metadata, { keyPath: "key" });

  const products = storeForUpgrade(database, transaction, offlineStoreNames.products, { keyPath: "key" });
  ensureIndex(products, "businessId", "businessId");
  ensureIndex(products, "entityId", "entityId");
  ensureIndex(products, "cachedAt", "cachedAt");

  const customers = storeForUpgrade(database, transaction, offlineStoreNames.customers, { keyPath: "key" });
  ensureIndex(customers, "businessId", "businessId");
  ensureIndex(customers, "entityId", "entityId");
  ensureIndex(customers, "cachedAt", "cachedAt");

  const balances = storeForUpgrade(database, transaction, offlineStoreNames.inventoryBalances, { keyPath: "key" });
  ensureIndex(balances, "businessId", "businessId");
  ensureIndex(balances, "locationId", "locationId");
  ensureIndex(balances, "productId", "productId");
  ensureIndex(balances, "businessLocation", ["businessId", "locationId"]);
  ensureIndex(balances, "cachedAt", "cachedAt");

  const operations = storeForUpgrade(database, transaction, offlineStoreNames.operationalRecords, {
    keyPath: "localId",
  });
  ensureIndex(operations, "operationId", "operationId", { unique: false });
  ensureIndex(operations, "status", "status");
  ensureIndex(operations, "entityType", "entityType");
  ensureIndex(operations, "locationId", "locationId");
  ensureIndex(operations, "createdAt", "createdAt");

  const queue = storeForUpgrade(database, transaction, offlineStoreNames.syncQueue, {
    keyPath: "operationId",
  });
  ensureIndex(queue, "idempotencyKey", "idempotencyKey", { unique: true });
  ensureIndex(queue, "status", "status");
  ensureIndex(queue, "createdAt", "createdAt");
  ensureIndex(queue, "deviceId", "deviceId");
  ensureIndex(queue, "locationId", "locationId");
  ensureIndex(queue, "statusCreatedAt", ["status", "createdAt"]);
}

export function openOfflineDatabase(): Promise<IDBDatabase> {
  const factory = indexedDbFactory();
  if (!factory) return Promise.reject(new OfflineDatabaseUnavailableError());
  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = factory.open(OFFLINE_DB_NAME, OFFLINE_DB_VERSION);
    let settled = false;

    request.onupgradeneeded = () => {
      const transaction = request.transaction;
      if (!transaction) return;
      upgradeOfflineDatabase(request.result, transaction);
    };

    request.onsuccess = () => {
      const database = request.result;
      if (settled) {
        database.close();
        return;
      }
      settled = true;
      database.onversionchange = () => {
        database.close();
        databasePromise = null;
      };
      resolve(database);
    };

    request.onerror = () => {
      if (settled) return;
      settled = true;
      reject(request.error || new Error("Offline storage could not be opened."));
    };

    request.onblocked = () => {
      if (settled) return;
      settled = true;
      reject(new OfflineDatabaseBlockedError());
    };
  }).catch((error) => {
    databasePromise = null;
    throw error;
  });

  return databasePromise;
}

export async function closeOfflineDatabase() {
  const pending = databasePromise;
  databasePromise = null;
  if (!pending) return;
  try {
    const database = await pending;
    database.close();
  } catch {
    // Opening errors are reported to the original caller.
  }
}

/**
 * Removes server-derived business projections and the cached actor identity,
 * while deliberately preserving the device ID and durable command queue.
 */
export async function clearOfflineSessionCaches() {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(
    [
      offlineStoreNames.metadata,
      offlineStoreNames.products,
      offlineStoreNames.customers,
      offlineStoreNames.inventoryBalances,
    ],
    "readwrite",
  );
  transaction.objectStore(offlineStoreNames.metadata).delete(OFFLINE_ACTOR_SESSION_KEY);
  transaction.objectStore(offlineStoreNames.products).clear();
  transaction.objectStore(offlineStoreNames.customers).clear();
  transaction.objectStore(offlineStoreNames.inventoryBalances).clear();
  await transactionResult(transaction);
}

/** Clears only replaceable query projections before a new server bootstrap. */
export async function clearOfflineProjectionCaches() {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(
    [offlineStoreNames.products, offlineStoreNames.customers, offlineStoreNames.inventoryBalances],
    "readwrite",
  );
  transaction.objectStore(offlineStoreNames.products).clear();
  transaction.objectStore(offlineStoreNames.customers).clear();
  transaction.objectStore(offlineStoreNames.inventoryBalances).clear();
  await transactionResult(transaction);
}

function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("The IndexedDB request failed."));
  });
}

function transactionResult(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () => reject(transaction.error || new Error("The IndexedDB transaction was aborted."));
    transaction.onerror = () => reject(transaction.error || new Error("The IndexedDB transaction failed."));
  });
}

function nowIso() {
  return new Date().toISOString();
}

function requiredText(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) throw new TypeError(`${field} is required.`);
  return normalized;
}

function optionalIso(value: string | null | undefined, field = "timestamp") {
  if (!value) return null;
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) throw new TypeError(`${field} is invalid.`);
  return timestamp.toISOString();
}

function assertJsonValue(value: unknown, path = "payload", seen = new Set<object>()): asserts value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") return;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new TypeError(`${path} contains a non-finite number.`);
    return;
  }
  if (typeof value !== "object") throw new TypeError(`${path} must contain JSON-compatible values only.`);
  if (seen.has(value)) throw new TypeError(`${path} contains a circular reference.`);
  seen.add(value);

  if (Array.isArray(value)) {
    value.forEach((item, index) => assertJsonValue(item, `${path}[${index}]`, seen));
  } else {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} must contain plain objects only.`);
    }
    Object.entries(value).forEach(([key, item]) => assertJsonValue(item, `${path}.${key}`, seen));
  }
  seen.delete(value);
}

function stableJson(value: JsonValue): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  return `{${Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
    .join(",")}}`;
}

function encodedKey(namespace: string, ...parts: Array<string | null>) {
  return [namespace, ...parts.map((part) => part || "default")].map(encodeURIComponent).join("|");
}

export function offlineProductCacheKey(productId: string, businessId = DEFAULT_BUSINESS_ID) {
  return encodedKey("product", requiredText(businessId, "businessId"), requiredText(productId, "productId"));
}

export function offlineCustomerCacheKey(customerId: string, businessId = DEFAULT_BUSINESS_ID) {
  return encodedKey("customer", requiredText(businessId, "businessId"), requiredText(customerId, "customerId"));
}

export function offlineInventoryBalanceCacheKey(input: {
  businessId?: string;
  locationId?: string;
  productId: string;
  variantId?: string | null;
}) {
  return encodedKey(
    "inventory",
    requiredText(input.businessId || DEFAULT_BUSINESS_ID, "businessId"),
    requiredText(input.locationId || DEFAULT_LOCATION_ID, "locationId"),
    requiredText(input.productId, "productId"),
    input.variantId || "default",
  );
}

export function createOfflineUuid() {
  const cryptoApi = globalThis.crypto;
  if (!cryptoApi) throw new Error("A cryptographically secure browser UUID generator is unavailable.");
  if (typeof cryptoApi.randomUUID === "function") return cryptoApi.randomUUID();

  const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

export function createOfflineOperationIdentifiers() {
  return {
    operationId: createOfflineUuid(),
    idempotencyKey: createOfflineUuid(),
  };
}

export async function getOfflineMetadata<T>(key: string): Promise<OfflineMetadataRecord<T> | null> {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(offlineStoreNames.metadata, "readonly");
  const result = await requestResult(
    transaction.objectStore(offlineStoreNames.metadata).get(requiredText(key, "metadata key")),
  );
  await transactionResult(transaction);
  return (result as OfflineMetadataRecord<T> | undefined) || null;
}

export async function upsertOfflineMetadata<T>(key: string, value: T): Promise<OfflineMetadataRecord<T>> {
  const record: OfflineMetadataRecord<T> = {
    key: requiredText(key, "metadata key"),
    schemaVersion: OFFLINE_RECORD_SCHEMA_VERSION,
    value,
    updatedAt: nowIso(),
  };
  const database = await openOfflineDatabase();
  const transaction = database.transaction(offlineStoreNames.metadata, "readwrite");
  transaction.objectStore(offlineStoreNames.metadata).put(record);
  await transactionResult(transaction);
  return record;
}

export async function getDeviceState(): Promise<OfflineDeviceState | null> {
  const record = await getOfflineMetadata<OfflineDeviceState>(OFFLINE_DEVICE_STATE_KEY);
  return record?.value || null;
}

export async function getOfflineActorSession(): Promise<OfflineActorSession | null> {
  const record = await getOfflineMetadata<OfflineActorSession>(OFFLINE_ACTOR_SESSION_KEY);
  if (!record?.value?.actorId) return null;
  const expiry = new Date(record.value.expiresAt).getTime();
  return Number.isFinite(expiry) && expiry > Date.now() ? record.value : null;
}

export async function setOfflineActorSession(input: Omit<OfflineActorSession, "capturedAt">) {
  const session: OfflineActorSession = {
    actorId: requiredText(input.actorId, "actorId"),
    actorName: requiredText(input.actorName, "actorName"),
    actorRole: requiredText(input.actorRole, "actorRole"),
    expiresAt: optionalIso(input.expiresAt, "expiresAt") || "",
    capturedAt: nowIso(),
  };
  await upsertOfflineMetadata(OFFLINE_ACTOR_SESSION_KEY, session);
  return session;
}

export async function getOrCreateDeviceState(input: {
  businessId?: string;
  locationId?: string;
  label?: string;
} = {}): Promise<OfflineDeviceState> {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(offlineStoreNames.metadata, "readwrite");
  const store = transaction.objectStore(offlineStoreNames.metadata);
  const existing = (await requestResult(store.get(OFFLINE_DEVICE_STATE_KEY))) as
    | OfflineMetadataRecord<OfflineDeviceState>
    | undefined;

  if (existing?.value?.deviceId) {
    await transactionResult(transaction);
    return existing.value;
  }

  const timestamp = nowIso();
  const state: OfflineDeviceState = {
    schemaVersion: OFFLINE_RECORD_SCHEMA_VERSION,
    deviceId: createOfflineUuid(),
    businessId: requiredText(input.businessId || DEFAULT_BUSINESS_ID, "businessId"),
    locationId: requiredText(input.locationId || DEFAULT_LOCATION_ID, "locationId"),
    label: input.label?.trim() || "Browser POS",
    createdAt: timestamp,
    updatedAt: timestamp,
    lastSuccessfulSyncAt: null,
  };
  store.put({
    key: OFFLINE_DEVICE_STATE_KEY,
    schemaVersion: OFFLINE_RECORD_SCHEMA_VERSION,
    value: state,
    updatedAt: timestamp,
  } satisfies OfflineMetadataRecord<OfflineDeviceState>);
  await transactionResult(transaction);
  return state;
}

export async function updateDeviceState(
  patch: Partial<Pick<OfflineDeviceState, "businessId" | "locationId" | "label" | "lastSuccessfulSyncAt">>,
): Promise<OfflineDeviceState> {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(offlineStoreNames.metadata, "readwrite");
  const store = transaction.objectStore(offlineStoreNames.metadata);
  const existing = (await requestResult(store.get(OFFLINE_DEVICE_STATE_KEY))) as
    | OfflineMetadataRecord<OfflineDeviceState>
    | undefined;
  const timestamp = nowIso();
  const current: OfflineDeviceState = existing?.value?.deviceId
    ? existing.value
    : {
        schemaVersion: OFFLINE_RECORD_SCHEMA_VERSION,
        deviceId: createOfflineUuid(),
        businessId: DEFAULT_BUSINESS_ID,
        locationId: DEFAULT_LOCATION_ID,
        label: "Browser POS",
        createdAt: timestamp,
        updatedAt: timestamp,
        lastSuccessfulSyncAt: null,
      };
  const updated: OfflineDeviceState = {
    ...current,
    businessId: patch.businessId === undefined ? current.businessId : requiredText(patch.businessId, "businessId"),
    locationId: patch.locationId === undefined ? current.locationId : requiredText(patch.locationId, "locationId"),
    label: patch.label === undefined ? current.label : requiredText(patch.label, "device label"),
    lastSuccessfulSyncAt:
      patch.lastSuccessfulSyncAt === undefined
        ? current.lastSuccessfulSyncAt
        : optionalIso(patch.lastSuccessfulSyncAt, "lastSuccessfulSyncAt"),
    updatedAt: timestamp,
  };
  store.put({
    key: OFFLINE_DEVICE_STATE_KEY,
    schemaVersion: OFFLINE_RECORD_SCHEMA_VERSION,
    value: updated,
    updatedAt: timestamp,
  } satisfies OfflineMetadataRecord<OfflineDeviceState>);
  await transactionResult(transaction);
  return updated;
}

export type OfflineCacheWriteOptions<T> = {
  businessId?: string;
  cachedAt?: string;
  sourceUpdatedAt?: (entity: T) => string | null | undefined;
};

async function putCacheRecords<T>(storeName: OfflineStoreName, records: readonly OfflineCacheRecord<T>[]) {
  if (!records.length) return;
  const database = await openOfflineDatabase();
  const transaction = database.transaction(storeName, "readwrite");
  const store = transaction.objectStore(storeName);
  records.forEach((record) => store.put(record));
  await transactionResult(transaction);
}

async function getCacheRecord<T>(storeName: OfflineStoreName, key: string) {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(storeName, "readonly");
  const result = await requestResult(transaction.objectStore(storeName).get(key));
  await transactionResult(transaction);
  return (result as OfflineCacheRecord<T> | undefined) || null;
}

async function listCacheRecords<T>(storeName: OfflineStoreName, businessId?: string) {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(storeName, "readonly");
  const store = transaction.objectStore(storeName);
  const result = businessId
    ? await requestResult(store.index("businessId").getAll(requiredText(businessId, "businessId")))
    : await requestResult(store.getAll());
  await transactionResult(transaction);
  return (result as OfflineCacheRecord<T>[]).sort((left, right) => left.key.localeCompare(right.key));
}

function cacheTimestamp(value?: string) {
  return value ? optionalIso(value) || nowIso() : nowIso();
}

function cachedProductRecords<T extends OfflineEntity>(
  products: readonly T[],
  options: OfflineCacheWriteOptions<T> = {},
): Array<OfflineCachedProduct<T>> {
  const businessId = requiredText(options.businessId || DEFAULT_BUSINESS_ID, "businessId");
  const cachedAt = cacheTimestamp(options.cachedAt);
  return products.map((product): OfflineCachedProduct<T> => ({
    key: offlineProductCacheKey(product.id, businessId),
    schemaVersion: OFFLINE_RECORD_SCHEMA_VERSION,
    businessId,
    entityId: requiredText(product.id, "product id"),
    locationId: null,
    value: product,
    cachedAt,
    sourceUpdatedAt: optionalIso(options.sourceUpdatedAt?.(product)),
  }));
}

function cachedCustomerRecords<T extends OfflineEntity>(
  customers: readonly T[],
  options: OfflineCacheWriteOptions<T> = {},
): Array<OfflineCachedCustomer<T>> {
  const businessId = requiredText(options.businessId || DEFAULT_BUSINESS_ID, "businessId");
  const cachedAt = cacheTimestamp(options.cachedAt);
  return customers.map((customer): OfflineCachedCustomer<T> => ({
    key: offlineCustomerCacheKey(customer.id, businessId),
    schemaVersion: OFFLINE_RECORD_SCHEMA_VERSION,
    businessId,
    entityId: requiredText(customer.id, "customer id"),
    locationId: null,
    value: customer,
    cachedAt,
    sourceUpdatedAt: optionalIso(options.sourceUpdatedAt?.(customer)),
  }));
}

function cachedInventoryBalanceRecords(
  balances: readonly InventoryBalance[],
  options: Pick<OfflineCacheWriteOptions<InventoryBalance>, "cachedAt" | "sourceUpdatedAt"> = {},
): OfflineCachedInventoryBalance[] {
  const cachedAt = cacheTimestamp(options.cachedAt);
  return balances.map((balance): OfflineCachedInventoryBalance => ({
    key: offlineInventoryBalanceCacheKey(balance),
    schemaVersion: OFFLINE_RECORD_SCHEMA_VERSION,
    businessId: requiredText(balance.businessId, "businessId"),
    entityId: requiredText(balance.id, "inventory balance id"),
    locationId: requiredText(balance.locationId, "locationId"),
    productId: requiredText(balance.productId, "productId"),
    variantId: balance.variantId || null,
    value: balance,
    cachedAt,
    sourceUpdatedAt: optionalIso(options.sourceUpdatedAt?.(balance)),
  }));
}

export async function upsertCachedProducts<T extends OfflineEntity>(
  products: readonly T[],
  options: OfflineCacheWriteOptions<T> = {},
): Promise<Array<OfflineCachedProduct<T>>> {
  const records = cachedProductRecords(products, options);
  await putCacheRecords(offlineStoreNames.products, records);
  return records;
}

export async function upsertCachedProduct<T extends OfflineEntity>(
  product: T,
  options: OfflineCacheWriteOptions<T> = {},
) {
  return (await upsertCachedProducts([product], options))[0];
}

export async function getCachedProduct<T extends OfflineEntity = OfflineEntity>(
  productId: string,
  businessId = DEFAULT_BUSINESS_ID,
) {
  return getCacheRecord<T>(offlineStoreNames.products, offlineProductCacheKey(productId, businessId)) as Promise<
    OfflineCachedProduct<T> | null
  >;
}

export async function listCachedProducts<T extends OfflineEntity = OfflineEntity>(businessId?: string) {
  return listCacheRecords<T>(offlineStoreNames.products, businessId) as Promise<Array<OfflineCachedProduct<T>>>;
}

export async function upsertCachedCustomers<T extends OfflineEntity>(
  customers: readonly T[],
  options: OfflineCacheWriteOptions<T> = {},
): Promise<Array<OfflineCachedCustomer<T>>> {
  const records = cachedCustomerRecords(customers, options);
  await putCacheRecords(offlineStoreNames.customers, records);
  return records;
}

export async function upsertCachedCustomer<T extends OfflineEntity>(
  customer: T,
  options: OfflineCacheWriteOptions<T> = {},
) {
  return (await upsertCachedCustomers([customer], options))[0];
}

export async function getCachedCustomer<T extends OfflineEntity = OfflineEntity>(
  customerId: string,
  businessId = DEFAULT_BUSINESS_ID,
) {
  return getCacheRecord<T>(offlineStoreNames.customers, offlineCustomerCacheKey(customerId, businessId)) as Promise<
    OfflineCachedCustomer<T> | null
  >;
}

export async function listCachedCustomers<T extends OfflineEntity = OfflineEntity>(businessId?: string) {
  return listCacheRecords<T>(offlineStoreNames.customers, businessId) as Promise<Array<OfflineCachedCustomer<T>>>;
}

export async function upsertCachedInventoryBalances(
  balances: readonly InventoryBalance[],
  options: Pick<OfflineCacheWriteOptions<InventoryBalance>, "cachedAt" | "sourceUpdatedAt"> = {},
): Promise<OfflineCachedInventoryBalance[]> {
  const records = cachedInventoryBalanceRecords(balances, options);
  await putCacheRecords(offlineStoreNames.inventoryBalances, records);
  return records;
}

export async function upsertCachedInventoryBalance(
  balance: InventoryBalance,
  options: Pick<OfflineCacheWriteOptions<InventoryBalance>, "cachedAt" | "sourceUpdatedAt"> = {},
) {
  return (await upsertCachedInventoryBalances([balance], options))[0];
}

/**
 * Atomically replaces every server-derived projection and updates the device
 * scope. A quota/interruption failure aborts the transaction, preserving the
 * previous complete snapshot instead of leaving an empty or partial cache.
 */
export async function replaceOfflineProjectionCaches<
  TProduct extends OfflineEntity,
  TCustomer extends OfflineEntity,
>(input: {
  businessId: string;
  locationId: string;
  deviceLabel: string;
  cachedAt: string;
  products: readonly TProduct[];
  customers: readonly TCustomer[];
  inventoryBalances: readonly InventoryBalance[];
  productSourceUpdatedAt?: (product: TProduct) => string | null | undefined;
  customerSourceUpdatedAt?: (customer: TCustomer) => string | null | undefined;
  balanceSourceUpdatedAt?: (balance: InventoryBalance) => string | null | undefined;
}) {
  const businessId = requiredText(input.businessId, "businessId");
  const locationId = requiredText(input.locationId, "locationId");
  const deviceLabel = requiredText(input.deviceLabel, "device label");
  const cachedAt = cacheTimestamp(input.cachedAt);
  const products = cachedProductRecords(input.products, {
    businessId,
    cachedAt,
    sourceUpdatedAt: input.productSourceUpdatedAt,
  });
  const customers = cachedCustomerRecords(input.customers, {
    businessId,
    cachedAt,
    sourceUpdatedAt: input.customerSourceUpdatedAt,
  });
  const balances = cachedInventoryBalanceRecords(input.inventoryBalances, {
    cachedAt,
    sourceUpdatedAt: input.balanceSourceUpdatedAt,
  });

  const database = await openOfflineDatabase();
  const transaction = database.transaction(
    [
      offlineStoreNames.metadata,
      offlineStoreNames.products,
      offlineStoreNames.customers,
      offlineStoreNames.inventoryBalances,
    ],
    "readwrite",
  );
  const metadata = transaction.objectStore(offlineStoreNames.metadata);
  const productStore = transaction.objectStore(offlineStoreNames.products);
  const customerStore = transaction.objectStore(offlineStoreNames.customers);
  const balanceStore = transaction.objectStore(offlineStoreNames.inventoryBalances);
  const existingDevice = (await requestResult(metadata.get(OFFLINE_DEVICE_STATE_KEY))) as
    | OfflineMetadataRecord<OfflineDeviceState>
    | undefined;
  const timestamp = nowIso();
  const currentDevice: OfflineDeviceState = existingDevice?.value?.deviceId
    ? existingDevice.value
    : {
        schemaVersion: OFFLINE_RECORD_SCHEMA_VERSION,
        deviceId: createOfflineUuid(),
        businessId,
        locationId,
        label: deviceLabel,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastSuccessfulSyncAt: null,
      };
  const updatedDevice: OfflineDeviceState = {
    ...currentDevice,
    businessId,
    locationId,
    label: deviceLabel,
    updatedAt: timestamp,
  };

  productStore.clear();
  customerStore.clear();
  balanceStore.clear();
  products.forEach((record) => productStore.put(record));
  customers.forEach((record) => customerStore.put(record));
  balances.forEach((record) => balanceStore.put(record));
  metadata.put({
    key: OFFLINE_DEVICE_STATE_KEY,
    schemaVersion: OFFLINE_RECORD_SCHEMA_VERSION,
    value: updatedDevice,
    updatedAt: timestamp,
  } satisfies OfflineMetadataRecord<OfflineDeviceState>);
  await transactionResult(transaction);

  return {
    device: updatedDevice,
    products: products.length,
    customers: customers.length,
    balances: balances.length,
  };
}

export async function getCachedInventoryBalance(input: {
  businessId?: string;
  locationId?: string;
  productId: string;
  variantId?: string | null;
}) {
  return getCacheRecord<InventoryBalance>(
    offlineStoreNames.inventoryBalances,
    offlineInventoryBalanceCacheKey(input),
  ) as Promise<OfflineCachedInventoryBalance | null>;
}

export async function listCachedInventoryBalances(input: {
  businessId?: string;
  locationId?: string;
} = {}) {
  const records = (await listCacheRecords<InventoryBalance>(
    offlineStoreNames.inventoryBalances,
    input.businessId,
  )) as OfflineCachedInventoryBalance[];
  return input.locationId
    ? records.filter((record) => record.locationId === input.locationId)
    : records;
}

export async function upsertOperationalRecord<TPayload extends JsonValue>(
  input: UpsertOfflineOperationalRecordInput<TPayload>,
): Promise<OfflineOperationalRecord<TPayload>> {
  assertJsonValue(input.payload);
  const database = await openOfflineDatabase();
  const transaction = database.transaction(offlineStoreNames.operationalRecords, "readwrite");
  const store = transaction.objectStore(offlineStoreNames.operationalRecords);
  const localId = requiredText(input.localId, "localId");
  const existing = (await requestResult(store.get(localId))) as OfflineOperationalRecord<TPayload> | undefined;

  if (
    existing &&
    (existing.businessId !== input.businessId ||
      existing.deviceId !== input.deviceId ||
      existing.locationId !== input.locationId ||
      existing.entityType !== input.entityType)
  ) {
    transaction.abort();
    throw new OfflineQueueConflictError("A local record cannot be reassigned to another device, location, or type.");
  }

  const timestamp = nowIso();
  const record: OfflineOperationalRecord<TPayload> = {
    localId,
    schemaVersion: OFFLINE_RECORD_SCHEMA_VERSION,
    operationId: input.operationId === undefined ? existing?.operationId || null : input.operationId,
    businessId: requiredText(input.businessId, "businessId"),
    deviceId: requiredText(input.deviceId, "deviceId"),
    locationId: requiredText(input.locationId, "locationId"),
    entityType: requiredText(input.entityType, "entityType"),
    payload: input.payload,
    status: input.status || existing?.status || "draft",
    createdAt: existing?.createdAt || optionalIso(input.createdAt, "createdAt") || timestamp,
    updatedAt: timestamp,
    lastError: input.lastError === undefined ? existing?.lastError || null : input.lastError,
  };
  store.put(record);
  await transactionResult(transaction);
  return record;
}

export async function getOperationalRecord<TPayload extends JsonValue = JsonValue>(localId: string) {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(offlineStoreNames.operationalRecords, "readonly");
  const result = await requestResult(
    transaction.objectStore(offlineStoreNames.operationalRecords).get(requiredText(localId, "localId")),
  );
  await transactionResult(transaction);
  return (result as OfflineOperationalRecord<TPayload> | undefined) || null;
}

export async function listOperationalRecords<TPayload extends JsonValue = JsonValue>(input: {
  status?: OfflineOperationalStatus | readonly OfflineOperationalStatus[];
  entityType?: string;
  locationId?: string;
  limit?: number;
} = {}) {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(offlineStoreNames.operationalRecords, "readonly");
  const records = (await requestResult(
    transaction.objectStore(offlineStoreNames.operationalRecords).index("createdAt").getAll(),
  )) as Array<OfflineOperationalRecord<TPayload>>;
  await transactionResult(transaction);
  const statuses = input.status
    ? new Set(Array.isArray(input.status) ? input.status : [input.status])
    : null;
  const limit = Math.max(0, Math.floor(input.limit ?? Number.MAX_SAFE_INTEGER));
  return records
    .filter((record) => !statuses || statuses.has(record.status))
    .filter((record) => !input.entityType || record.entityType === input.entityType)
    .filter((record) => !input.locationId || record.locationId === input.locationId)
    .sort(compareOperationalRecords)
    .slice(0, limit);
}

function compareOperationalRecords(
  left: Pick<OfflineOperationalRecord, "createdAt" | "localId">,
  right: Pick<OfflineOperationalRecord, "createdAt" | "localId">,
) {
  return left.createdAt.localeCompare(right.createdAt) || left.localId.localeCompare(right.localId);
}

function compareCreatedRecords(
  left: Pick<OfflineSyncQueueRecord, "createdAt" | "operationId">,
  right: Pick<OfflineSyncQueueRecord, "createdAt" | "operationId">,
) {
  return left.createdAt.localeCompare(right.createdAt) || left.operationId.localeCompare(right.operationId);
}

function queueCommandsMatch(left: OfflineSyncQueueRecord, right: OfflineSyncQueueRecord) {
  return (
    left.operationId === right.operationId &&
    left.actorId === right.actorId &&
    left.idempotencyKey === right.idempotencyKey &&
    left.businessId === right.businessId &&
    left.deviceId === right.deviceId &&
    left.locationId === right.locationId &&
    left.entityType === right.entityType &&
    left.action === right.action &&
    left.localRecordId === right.localRecordId &&
    stableJson(left.payload) === stableJson(right.payload)
  );
}

async function updateLinkedOperationalRecord(
  store: IDBObjectStore,
  queueRecord: OfflineSyncQueueRecord,
  status: OfflineOperationalStatus,
  timestamp: string,
  lastError: string | null,
) {
  if (!queueRecord.localRecordId) return;
  const record = (await requestResult(store.get(queueRecord.localRecordId))) as OfflineOperationalRecord | undefined;
  if (!record) return;
  store.put({
    ...record,
    operationId: queueRecord.operationId,
    status,
    updatedAt: timestamp,
    lastError,
  } satisfies OfflineOperationalRecord);
}

export async function enqueueSyncOperation<TPayload extends JsonValue>(
  input: EnqueueSyncOperationInput<TPayload>,
): Promise<OfflineSyncQueueRecord<TPayload>> {
  assertJsonValue(input.payload);
  const timestamp = nowIso();
  const record: OfflineSyncQueueRecord<TPayload> = {
    schemaVersion: OFFLINE_RECORD_SCHEMA_VERSION,
    operationId: requiredText(input.operationId, "operationId"),
    actorId: requiredText(input.actorId, "actorId"),
    deviceId: requiredText(input.deviceId, "deviceId"),
    locationId: requiredText(input.locationId, "locationId"),
    idempotencyKey: requiredText(input.idempotencyKey, "idempotencyKey"),
    entityType: requiredText(input.entityType, "entityType"),
    action: requiredText(input.action, "action"),
    payload: input.payload,
    createdAt: optionalIso(input.createdAt, "createdAt") || timestamp,
    attempts: 0,
    status: "pending",
    lastError: null,
    failureCode: null,
    retryable: null,
    businessId: requiredText(input.businessId, "businessId"),
    localRecordId: input.localRecordId ? requiredText(input.localRecordId, "localRecordId") : null,
    claimedAt: null,
    updatedAt: timestamp,
  };

  const database = await openOfflineDatabase();
  const transaction = database.transaction(
    [offlineStoreNames.syncQueue, offlineStoreNames.operationalRecords],
    "readwrite",
  );
  const queue = transaction.objectStore(offlineStoreNames.syncQueue);
  const operations = transaction.objectStore(offlineStoreNames.operationalRecords);
  const [byOperation, byIdempotency] = await Promise.all([
    requestResult(queue.get(record.operationId)) as Promise<OfflineSyncQueueRecord<TPayload> | undefined>,
    requestResult(queue.index("idempotencyKey").get(record.idempotencyKey)) as Promise<
      OfflineSyncQueueRecord<TPayload> | undefined
    >,
  ]);
  const existing = byOperation || byIdempotency;

  if (existing) {
    if (!queueCommandsMatch(existing, record)) {
      transaction.abort();
      throw new OfflineQueueConflictError(
        "The operation ID or idempotency key is already attached to a different offline command.",
      );
    }
    await transactionResult(transaction);
    return existing;
  }

  queue.put(record);
  await updateLinkedOperationalRecord(operations, record, "queued", timestamp, null);
  await transactionResult(transaction);
  return record;
}

export async function listSyncQueue<TPayload extends JsonValue = JsonValue>(
  query: OfflineSyncQueueQuery = {},
) {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(offlineStoreNames.syncQueue, "readonly");
  const records = (await requestResult(
    transaction.objectStore(offlineStoreNames.syncQueue).index("createdAt").getAll(),
  )) as Array<OfflineSyncQueueRecord<TPayload>>;
  await transactionResult(transaction);
  const statuses = query.status
    ? new Set(Array.isArray(query.status) ? query.status : [query.status])
    : null;
  const limit = Math.max(0, Math.floor(query.limit ?? Number.MAX_SAFE_INTEGER));
  return records
    .filter((record) => !statuses || statuses.has(record.status))
    .filter((record) => !query.actorId || record.actorId === query.actorId)
    .filter((record) => !query.deviceId || record.deviceId === query.deviceId)
    .filter((record) => !query.locationId || record.locationId === query.locationId)
    .sort(compareCreatedRecords)
    .slice(0, limit);
}

function claimableQueueRecord(
  record: OfflineSyncQueueRecord,
  options: Required<Pick<ClaimSyncOperationOptions, "includeFailed" | "maxAttempts" | "staleAfterMs">> &
    Pick<ClaimSyncOperationOptions, "actorId" | "deviceId" | "locationId">,
  now: number,
) {
  if (options.actorId && record.actorId !== options.actorId) return false;
  if (options.deviceId && record.deviceId !== options.deviceId) return false;
  if (options.locationId && record.locationId !== options.locationId) return false;
  if (record.attempts >= options.maxAttempts) return false;
  if (record.status === "pending") return true;
  if (record.status === "failed") return options.includeFailed;
  if (!record.claimedAt) return true;
  const claimedAt = new Date(record.claimedAt).getTime();
  return !Number.isFinite(claimedAt) || now - claimedAt >= options.staleAfterMs;
}

export async function claimNextSyncOperation<TPayload extends JsonValue = JsonValue>(
  input: ClaimSyncOperationOptions = {},
): Promise<OfflineSyncQueueRecord<TPayload> | null> {
  const options = {
    actorId: input.actorId,
    deviceId: input.deviceId,
    locationId: input.locationId,
    includeFailed: input.includeFailed ?? false,
    maxAttempts: Math.max(1, Math.floor(input.maxAttempts ?? 10)),
    staleAfterMs: Math.max(1_000, Math.floor(input.staleAfterMs ?? 5 * 60_000)),
  };
  const database = await openOfflineDatabase();
  const transaction = database.transaction(
    [offlineStoreNames.syncQueue, offlineStoreNames.operationalRecords],
    "readwrite",
  );
  const queue = transaction.objectStore(offlineStoreNames.syncQueue);
  const operations = transaction.objectStore(offlineStoreNames.operationalRecords);
  const records = (await requestResult(queue.index("createdAt").getAll())) as Array<
    OfflineSyncQueueRecord<TPayload>
  >;
  const now = Date.now();
  // Only inspect the oldest command in the requested device/location scope.
  // A failed or in-flight head command blocks later commands so dependent POS
  // operations can never be replayed out of order.
  const candidate = records
    .sort(compareCreatedRecords)
    .find(
      (record) =>
        (!options.actorId || record.actorId === options.actorId) &&
        (!options.deviceId || record.deviceId === options.deviceId) &&
        (!options.locationId || record.locationId === options.locationId),
    );

  if (!candidate) {
    await transactionResult(transaction);
    return null;
  }

  if (candidate.status !== "failed" && candidate.attempts >= options.maxAttempts) {
    const timestamp = new Date(now).toISOString();
    const failed: OfflineSyncQueueRecord<TPayload> = {
      ...candidate,
      status: "failed",
      claimedAt: null,
      updatedAt: timestamp,
      lastError: candidate.lastError || "Automatic retry limit reached. Review the connection, then retry this command.",
      failureCode: "AUTOMATIC_RETRY_LIMIT",
      retryable: true,
    };
    queue.put(failed);
    await updateLinkedOperationalRecord(operations, failed, "failed", timestamp, failed.lastError);
    await transactionResult(transaction);
    return null;
  }

  if (!claimableQueueRecord(candidate, options, now)) {
    await transactionResult(transaction);
    return null;
  }

  const timestamp = new Date(now).toISOString();
  const claimed: OfflineSyncQueueRecord<TPayload> = {
    ...candidate,
    status: "syncing",
    attempts: candidate.attempts + 1,
    claimedAt: timestamp,
    updatedAt: timestamp,
    lastError: null,
    failureCode: null,
    retryable: null,
  };
  queue.put(claimed);
  await updateLinkedOperationalRecord(operations, claimed, "syncing", timestamp, null);
  await transactionResult(transaction);
  return claimed;
}

function errorMessage(error: unknown) {
  const value = error instanceof Error ? error.message : String(error || "Synchronization failed.");
  return value.trim().slice(0, 2_000) || "Synchronization failed.";
}

export async function markSyncOperationFailed(
  operationId: string,
  error: unknown,
  options: { code?: string; retryable?: boolean } = {},
): Promise<OfflineSyncQueueRecord | null> {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(
    [offlineStoreNames.syncQueue, offlineStoreNames.operationalRecords],
    "readwrite",
  );
  const queue = transaction.objectStore(offlineStoreNames.syncQueue);
  const operations = transaction.objectStore(offlineStoreNames.operationalRecords);
  const record = (await requestResult(queue.get(requiredText(operationId, "operationId")))) as
    | OfflineSyncQueueRecord
    | undefined;
  if (!record) {
    await transactionResult(transaction);
    return null;
  }
  const timestamp = nowIso();
  const failed: OfflineSyncQueueRecord = {
    ...record,
    status: "failed",
    claimedAt: null,
    updatedAt: timestamp,
    lastError: errorMessage(error),
    failureCode: options.code?.trim().slice(0, 100) || null,
    retryable: options.retryable ?? false,
  };
  queue.put(failed);
  await updateLinkedOperationalRecord(operations, failed, "failed", timestamp, failed.lastError);
  await transactionResult(transaction);
  return failed;
}

export async function retrySyncOperation(
  operationId: string,
  options: { resetAttempts?: boolean; error?: unknown } = {},
): Promise<OfflineSyncQueueRecord | null> {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(
    [offlineStoreNames.syncQueue, offlineStoreNames.operationalRecords],
    "readwrite",
  );
  const queue = transaction.objectStore(offlineStoreNames.syncQueue);
  const operations = transaction.objectStore(offlineStoreNames.operationalRecords);
  const record = (await requestResult(queue.get(requiredText(operationId, "operationId")))) as
    | OfflineSyncQueueRecord
    | undefined;
  if (!record) {
    await transactionResult(transaction);
    return null;
  }
  const timestamp = nowIso();
  const pending: OfflineSyncQueueRecord = {
    ...record,
    status: "pending",
    attempts: options.resetAttempts ? 0 : record.attempts,
    claimedAt: null,
    updatedAt: timestamp,
    lastError: options.error === undefined ? null : errorMessage(options.error),
    failureCode: null,
    retryable: true,
  };
  queue.put(pending);
  await updateLinkedOperationalRecord(operations, pending, "queued", timestamp, null);
  await transactionResult(transaction);
  return pending;
}

/** Removes a server-rejected local command after an operator accepts the conflict. */
export async function discardRejectedSyncOperation(
  operationId: string,
): Promise<boolean> {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(
    [offlineStoreNames.syncQueue, offlineStoreNames.operationalRecords],
    "readwrite",
  );
  const queue = transaction.objectStore(offlineStoreNames.syncQueue);
  const operations = transaction.objectStore(offlineStoreNames.operationalRecords);
  const record = (await requestResult(queue.get(requiredText(operationId, "operationId")))) as
    | OfflineSyncQueueRecord
    | undefined;
  if (!record) {
    await transactionResult(transaction);
    return false;
  }
  if (record.status !== "failed" || record.retryable !== false) {
    transaction.abort();
    throw new OfflineQueueConflictError(
      "Only a command the server definitively rejected can be discarded safely.",
    );
  }
  const timestamp = nowIso();
  queue.delete(record.operationId);
  await updateLinkedOperationalRecord(
    operations,
    record,
    "failed",
    timestamp,
    `Discarded after server rejection: ${record.lastError || record.failureCode || "Rejected"}`,
  );
  await transactionResult(transaction);
  return true;
}

export async function markSyncOperationSucceeded(operationId: string): Promise<boolean> {
  const database = await openOfflineDatabase();
  const transaction = database.transaction(
    [offlineStoreNames.syncQueue, offlineStoreNames.operationalRecords, offlineStoreNames.metadata],
    "readwrite",
  );
  const queue = transaction.objectStore(offlineStoreNames.syncQueue);
  const operations = transaction.objectStore(offlineStoreNames.operationalRecords);
  const metadata = transaction.objectStore(offlineStoreNames.metadata);
  const record = (await requestResult(queue.get(requiredText(operationId, "operationId")))) as
    | OfflineSyncQueueRecord
    | undefined;
  if (!record) {
    await transactionResult(transaction);
    return false;
  }

  const timestamp = nowIso();
  queue.delete(record.operationId);
  await updateLinkedOperationalRecord(operations, record, "synced", timestamp, null);
  const deviceRecord = (await requestResult(metadata.get(OFFLINE_DEVICE_STATE_KEY))) as
    | OfflineMetadataRecord<OfflineDeviceState>
    | undefined;
  if (deviceRecord?.value.deviceId === record.deviceId) {
    const state: OfflineDeviceState = {
      ...deviceRecord.value,
      updatedAt: timestamp,
      lastSuccessfulSyncAt: timestamp,
    };
    metadata.put({
      ...deviceRecord,
      schemaVersion: OFFLINE_RECORD_SCHEMA_VERSION,
      value: state,
      updatedAt: timestamp,
    } satisfies OfflineMetadataRecord<OfflineDeviceState>);
  }
  await transactionResult(transaction);
  return true;
}

export function isOfflineSyncStatus(value: unknown): value is OfflineSyncStatus {
  return value === "pending" || value === "syncing" || value === "failed";
}
