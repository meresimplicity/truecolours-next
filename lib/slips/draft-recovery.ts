import type { PendingSlipCommand } from "./api.ts";
import type { SlipDocument, SlipDraft } from "./types.ts";

export type CachedSlipDraft = {
  version: number;
  data: SlipDraft;
  pendingSave: PendingSlipCommand | null;
};
export type DraftRecovery = {
  data: SlipDraft;
  pendingSave: PendingSlipCommand | null;
  conflict: CachedSlipDraft | null;
};

// Postgres JSONB changes object key order; ordering must not create false edits.
export function serializeSlipDraft(draft: SlipDraft): string {
  return JSON.stringify(draft, (_key: string, value: unknown) => {
    if (value && typeof value === "object" && !Array.isArray(value))
      return Object.fromEntries(
        Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
      );
    return value;
  });
}

function isDraft(value: unknown): value is SlipDraft {
  if (!value || typeof value !== "object") return false;
  const d = value as Record<string, unknown>;
  const strings = [
    "counterparty",
    "reference",
    "documentDate",
    "currency",
    "stockEffect",
    "linkedSaleId",
    "sourceSha256",
    "sourceName",
    "rawText",
    "paymentMethod",
    "paymentReference",
  ];
  const numbers = [
    "chargesCents",
    "discountCents",
    "roundingCents",
    "vatCents",
    "declaredTotalCents",
    "paidCents",
  ];
  return (
    strings.every((k) => typeof d[k] === "string") &&
    numbers.every((k) => typeof d[k] === "number" && Number.isFinite(d[k])) &&
    (d.confidence === null ||
      (typeof d.confidence === "number" && Number.isFinite(d.confidence))) &&
    Array.isArray(d.warnings) &&
    d.warnings.every((w) => typeof w === "string") &&
    Array.isArray(d.items) &&
    d.items.every((item) => {
      if (!item || typeof item !== "object") return false;
      return (
        ["id", "description", "productId"].every(
          (k) => typeof item[k] === "string",
        ) &&
        ["quantity", "unitPriceCents", "discountCents", "stockVersion"].every(
          (k) => typeof item[k] === "number" && Number.isFinite(item[k]),
        )
      );
    })
  );
}

/** Never overwrite a newer server version just to recover unsaved local work. */
export function recoverSlipDraft(
  server: SlipDocument,
  input: unknown,
): DraftRecovery {
  const clean: DraftRecovery = {
    data: server.data,
    pendingSave: null,
    conflict: null,
  };
  if (!input || typeof input !== "object") return clean;
  const cache = input as Record<string, unknown>;
  if (
    !Number.isSafeInteger(cache.version) ||
    Number(cache.version) < 1 ||
    !isDraft(cache.data)
  )
    return clean;
  const value = cache.pendingSave as PendingSlipCommand | null | undefined;
  const validPending =
    value?.action === "save" &&
    typeof value.key === "string" &&
    value.key.length >= 8 &&
    value.key.length <= 200 &&
    value.payload?.id === server.id &&
    value.payload.kind === server.kind &&
    value.payload.locationId === server.branch_id &&
    value.payload.expectedVersion === cache.version &&
    isDraft(value.payload.data);
  const pending = validPending ? value! : null;
  const cached: CachedSlipDraft = {
    version: Number(cache.version),
    data: cache.data,
    pendingSave: pending,
  };
  const sameData =
    serializeSlipDraft(cached.data) === serializeSlipDraft(server.data);
  if (server.status !== "draft")
    return sameData ? clean : { ...clean, conflict: cached };
  // This save committed while its response was lost. Keep edits made after it.
  if (
    pending &&
    server.last_save_key === pending.key &&
    Number(server.version) === cached.version + 1 &&
    serializeSlipDraft(pending.payload.data as SlipDraft) ===
      serializeSlipDraft(server.data)
  )
    return { data: cached.data, pendingSave: null, conflict: null };
  if (cached.version === Number(server.version))
    return { data: cached.data, pendingSave: pending, conflict: null };
  return sameData ? clean : { ...clean, conflict: cached };
}
