import type { CodeSearchResult, PaintColor, PaintSourceType } from "../../../types/paint";
import { paintReferenceCode } from "../catalogue-quality.ts";

export type PaintProviderName = "truecolours" | "open-vehicle" | "local" | "paint-calculators";
export type PaintProviderSource = PaintSourceType;

export interface PaintProviderDefinition {
  name: PaintProviderName;
  source: PaintProviderSource;
  isAvailable?: () => boolean | Promise<boolean>;
  getColors: (
    brand: string,
    model: string,
    year: number,
    market?: string,
  ) => Promise<PaintColor[]>;
  searchByCode: (query: string) => Promise<CodeSearchResult[]>;
}

export const SOURCE_PRIORITY: Record<PaintProviderSource, number> = {
  truecolours: 5,
  licensed: 4,
  "open-data": 3,
  api: 2,
  unverified: 1,
};

export function normalizePaintKey(
  brand: string,
  model: string,
  code: string,
  year?: number,
): string {
  return `${brand.trim().toLowerCase()}|${model.trim().toLowerCase()}|${code.trim().toLowerCase()}|${year ?? ""}`;
}

export function choosePreferredPaintColor(
  candidate: PaintColor,
  current: PaintColor,
): PaintColor {
  const sourceRank = SOURCE_PRIORITY[candidate.source] ?? 0;
  const currentRank = SOURCE_PRIORITY[current.source] ?? 0;

  if (candidate.verified && !current.verified) return candidate;
  if (!candidate.verified && current.verified) return current;
  if (sourceRank > currentRank) return candidate;
  if (sourceRank < currentRank) return current;
  if ((candidate.notes || "").length > (current.notes || "").length) return candidate;
  if ((candidate.relevanceScore ?? 0) > (current.relevanceScore ?? 0)) return candidate;
  return current;
}

export function mergePaintResults(...batches: PaintColor[][]): PaintColor[] {
  const merged = new Map<string, PaintColor>();

  for (const batch of batches) {
    for (const item of batch) {
      const key = normalizePaintKey(item.brand, item.model, paintReferenceCode(item), item.year ?? item.yearFrom ?? item.yearTo);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, item);
        continue;
      }

      merged.set(key, choosePreferredPaintColor(item, existing));
    }
  }

  return Array.from(merged.values()).sort((a, b) => {
    const sourceDelta = (SOURCE_PRIORITY[b.source] ?? 0) - (SOURCE_PRIORITY[a.source] ?? 0);
    if (sourceDelta !== 0) return sourceDelta;
    if (Boolean(b.verified) !== Boolean(a.verified)) return Number(b.verified) - Number(a.verified);
    return (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0);
  });
}

export function mergeCodeSearchResults(...batches: CodeSearchResult[][]): CodeSearchResult[] {
  const merged = new Map<string, CodeSearchResult>();

  for (const batch of batches) {
    for (const item of batch) {
      const key = normalizePaintKey(item.brand, item.model, paintReferenceCode(item), item.yearFrom ?? item.yearTo ?? item.year);
      const existing = merged.get(key);
      if (!existing) {
        merged.set(key, item);
        continue;
      }

      const nextCandidate = (item.relevanceScore ?? 0) > (existing.relevanceScore ?? 0) ? item : existing;
      merged.set(key, nextCandidate);
    }
  }

  return Array.from(merged.values()).sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
}
