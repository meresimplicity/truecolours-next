export const inventoryBuckets = [
  "onHand",
  "reserved",
  "incoming",
  "damaged",
  "returned",
  "quarantined",
] as const;

export type InventoryBucket = (typeof inventoryBuckets)[number];

export type InventoryQuantities = Record<InventoryBucket, number> & {
  available: number;
};

export const stockMovementTypes = [
  "OPENING_BALANCE",
  "SALE",
  "PURCHASE_RECEIVED",
  "RETURN",
  "TRANSFER_IN",
  "TRANSFER_OUT",
  "DAMAGE",
  "STOCK_COUNT",
  "MANUAL_ADJUSTMENT",
  "WEBSITE_ORDER",
  "CANCELLED_SALE",
  "SUPPLIER_RETURN",
  "RESERVATION_CREATED",
  "RESERVATION_RELEASED",
] as const;

export type StockMovementType = (typeof stockMovementTypes)[number];

export type InventoryBalance = InventoryQuantities & {
  id: string;
  businessId: string;
  locationId: string;
  productId: string;
  variantId: string | null;
  version: number;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type InventoryMovement = {
  id: string;
  businessId: string;
  locationId: string;
  productId: string;
  variantId: string | null;
  productName: string;
  productCode: string;
  type: StockMovementType;
  changes: Partial<Record<InventoryBucket, number>>;
  before: InventoryQuantities;
  after: InventoryQuantities;
  previousQuantity: number;
  newQuantity: number;
  delta: number;
  stockStatus: string;
  reason: string;
  note: string;
  referenceType: string;
  referenceId: string;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  deviceId: string;
  operationId: string;
  correlationId: string;
  beforeVersion: number;
  afterVersion: number;
  idempotencyHash: string;
  requestHash: string;
  createdAt?: unknown;
};

export const inventoryReservationStatuses = ["active", "released", "consumed", "expired"] as const;
export type InventoryReservationStatus = (typeof inventoryReservationStatuses)[number];

export type InventoryReservation = {
  id: string;
  businessId: string;
  locationId: string;
  productId: string;
  variantId: string | null;
  productName: string;
  productCode: string;
  sourceType: string;
  sourceId: string;
  quantity: number;
  status: InventoryReservationStatus;
  actorId: string;
  actorEmail: string;
  actorRole: string;
  requestHash: string;
  expiresAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  releasedAt?: unknown;
  releasedById?: string;
  releaseReason?: string;
};

export const DEFAULT_BUSINESS_ID = "truecolours";
export const DEFAULT_LOCATION_ID = "main-store";

export function emptyInventoryQuantities(): InventoryQuantities {
  return {
    onHand: 0,
    reserved: 0,
    incoming: 0,
    damaged: 0,
    returned: 0,
    quarantined: 0,
    available: 0,
  };
}

export function availableInventoryStock(
  value: Pick<InventoryQuantities, "onHand" | "reserved" | "damaged" | "returned" | "quarantined">,
) {
  const available = value.onHand - value.reserved - value.damaged - value.returned - value.quarantined;
  return Math.max(0, Math.round(available * 1000) / 1000);
}

export function hasInventoryVersionConflict(expectedVersion: number | undefined, currentVersion: number) {
  return expectedVersion !== undefined && expectedVersion !== currentVersion;
}
