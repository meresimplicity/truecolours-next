import type { PaintColor } from "../../types/paint.ts";
import { normalizeColorName, normalizePaintCode } from "../../scripts/normalize-paint-codes.ts";

/** Distinct order references must survive provider merging, even if an old primary code was truncated. */
export function paintReferenceCode(record: Pick<PaintColor, "code" | "primaryCode" | "salesCodes">): string {
  return [record.primaryCode || record.code, ...(record.salesCodes || [])].map(normalizePaintCode).join("/");
}

/** Legacy IDs can collide for different colours. Keep their full identity, not their array position. */
export function preserveDistinctPaintIds<T extends Pick<PaintColor, "id" | "brand" | "model" | "code" | "primaryCode" | "salesCodes" | "name" | "yearTo" | "generation">>(records: T[]): T[] {
  const counts = new Map<string, number>();
  for (const record of records) counts.set(record.id, (counts.get(record.id) || 0) + 1);
  const distinct = records.map((record) => counts.get(record.id)! > 1 ? {
    ...record,
    id: `${record.id}--${encodeURIComponent(record.brand)}--${encodeURIComponent(record.model)}--${[paintReferenceCode(record), normalizeColorName(record.name), record.yearTo, record.generation].filter(Boolean).join("-").replace(/[^a-z0-9-]/gi, "-")}`,
  } : record);
  return [...new Map(distinct.map((record) => [record.id, record])).values()];
}

export function hasPaintVerificationEvidence(record: Pick<PaintColor, "verified" | "verifiedBy" | "verifiedAt">): boolean {
  return Boolean(record.verified && record.verifiedBy?.trim() && record.verifiedAt && Number.isFinite(Date.parse(record.verifiedAt)));
}

// Honda's published code tables and service bulletin establish these complete
// codes. Correct the legacy split only when both the name and code parts agree.
const HONDA_CODES: Record<string, string> = {
  "taffeta white": "NH-578",
  "crystal black pearl": "NH-731P",
  "lunar silver metallic": "NH-830M",
  "modern steel metallic": "NH-797M",
  "platinum white pearl": "NH-883P",
  "rallye red": "R-513",
};

export function restoreKnownHondaCode<T extends Pick<PaintColor, "brand" | "name" | "code" | "primaryCode" | "salesCodes" | "displayCode">>(record: T): T {
  if (record.brand.toLowerCase() !== "honda" || record.salesCodes?.length !== 1) return record;
  const code = HONDA_CODES[normalizeColorName(record.name)];
  if (!code || normalizePaintCode(code) !== normalizePaintCode(`${record.primaryCode || record.code}${record.salesCodes[0]}`)) return record;
  return { ...record, code, primaryCode: code, displayCode: code, salesCodes: [] };
}
