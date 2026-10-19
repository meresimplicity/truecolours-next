import type { InventoryBalance } from "@/lib/business/inventory-types";

/**
 * Increment when the shape of persisted offline records changes. IndexedDB's
 * database version is managed separately in offline-db.ts.
 */
export const OFFLINE_RECORD_SCHEMA_VERSION = 1 as const;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export type OfflineEntity = {
  id: string;
};

export type OfflineMetadataRecord<T = unknown> = {
  key: string;
  schemaVersion: number;
  value: T;
  updatedAt: string;
};

export type OfflineDeviceState = {
  schemaVersion: number;
  deviceId: string;
  businessId: string;
  locationId: string;
  label: string;
  createdAt: string;
  updatedAt: string;
  lastSuccessfulSyncAt: string | null;
};

export type OfflineActorSession = {
  actorId: string;
  actorName: string;
  actorRole: string;
  expiresAt: string;
  capturedAt: string;
};

export type OfflineCacheRecord<T> = {
  key: string;
  schemaVersion: number;
  businessId: string;
  entityId: string;
  locationId: string | null;
  value: T;
  cachedAt: string;
  sourceUpdatedAt: string | null;
};

export type OfflineCachedProduct<T extends OfflineEntity = OfflineEntity> = OfflineCacheRecord<T>;
export type OfflineCachedCustomer<T extends OfflineEntity = OfflineEntity> = OfflineCacheRecord<T>;

/** Keeps the Phase 1 inventory model as the only balance model. */
export type OfflineCachedInventoryBalance = OfflineCacheRecord<InventoryBalance> & {
  locationId: string;
  productId: string;
  variantId: string | null;
};

export const offlineOperationalStatuses = [
  "draft",
  "queued",
  "syncing",
  "failed",
  "synced",
] as const;

export type OfflineOperationalStatus = (typeof offlineOperationalStatuses)[number];

/**
 * A locally materialized sale, count, return, or other operational record.
 * Its payload is deliberately JSON-only so it can become a command envelope.
 */
export type OfflineOperationalRecord<TPayload extends JsonValue = JsonValue> = {
  localId: string;
  schemaVersion: number;
  operationId: string | null;
  businessId: string;
  deviceId: string;
  locationId: string;
  entityType: string;
  payload: TPayload;
  status: OfflineOperationalStatus;
  createdAt: string;
  updatedAt: string;
  lastError: string | null;
};

export type UpsertOfflineOperationalRecordInput<TPayload extends JsonValue = JsonValue> = {
  localId: string;
  operationId?: string | null;
  businessId: string;
  deviceId: string;
  locationId: string;
  entityType: string;
  payload: TPayload;
  status?: OfflineOperationalStatus;
  createdAt?: string;
  lastError?: string | null;
};

export const offlineSyncStatuses = ["pending", "syncing", "failed"] as const;
export type OfflineSyncStatus = (typeof offlineSyncStatuses)[number];

/**
 * A durable command waiting for server acknowledgement. There is intentionally
 * no `succeeded` queue state: acknowledged commands are removed atomically.
 */
export type OfflineSyncQueueRecord<TPayload extends JsonValue = JsonValue> = {
  schemaVersion: number;
  operationId: string;
  actorId: string;
  deviceId: string;
  locationId: string;
  idempotencyKey: string;
  entityType: string;
  action: string;
  payload: TPayload;
  createdAt: string;
  attempts: number;
  status: OfflineSyncStatus;
  lastError: string | null;
  failureCode?: string | null;
  retryable?: boolean | null;
  businessId: string;
  localRecordId: string | null;
  claimedAt: string | null;
  updatedAt: string;
};

export type EnqueueSyncOperationInput<TPayload extends JsonValue = JsonValue> = {
  operationId: string;
  actorId: string;
  deviceId: string;
  locationId: string;
  idempotencyKey: string;
  entityType: string;
  action: string;
  payload: TPayload;
  businessId: string;
  localRecordId?: string | null;
  createdAt?: string;
};

export type OfflineSyncQueueQuery = {
  status?: OfflineSyncStatus | readonly OfflineSyncStatus[];
  actorId?: string;
  deviceId?: string;
  locationId?: string;
  limit?: number;
};

export type ClaimSyncOperationOptions = {
  actorId?: string;
  deviceId?: string;
  locationId?: string;
  includeFailed?: boolean;
  maxAttempts?: number;
  staleAfterMs?: number;
};
