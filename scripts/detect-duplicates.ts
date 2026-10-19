import { normalizePaintCode, normalizeColorName } from "./normalize-paint-codes.ts";

export interface DuplicateCheckRecord {
  id?: string;
  brand: string;
  model: string;
  code: string;
  primaryCode?: string;
  salesCodes?: string[];
  name: string;
  yearFrom?: number;
  yearTo?: number;
  years?: number[];
  source?: string;
}

export interface DuplicateDetectionResult {
  exactDuplicates: { original: DuplicateCheckRecord; duplicate: DuplicateCheckRecord }[];
  codeClashes: { code: string; records: DuplicateCheckRecord[] }[];
  sameVehicleYearDuplicates: { vehicleYearKey: string; records: DuplicateCheckRecord[] }[];
  totalDuplicates: number;
}

export function detectDuplicates(records: DuplicateCheckRecord[]): DuplicateDetectionResult {
  const exactDuplicates: { original: DuplicateCheckRecord; duplicate: DuplicateCheckRecord }[] = [];
  const codeClashesMap = new Map<string, DuplicateCheckRecord[]>();
  const vehicleYearMap = new Map<string, DuplicateCheckRecord[]>();
  const seenExact = new Map<string, DuplicateCheckRecord>();

  for (const r of records) {
    const normBrand = (r.brand || "").trim().toLowerCase();
    const normModel = (r.model || "").trim().toLowerCase();
    const normCode = normalizePaintCode(r.primaryCode || r.code);
    const normName = normalizeColorName(r.name);
    const yFrom = r.yearFrom ?? 0;
    const yTo = r.yearTo ?? 0;

    // 1. Exact Duplicate Key
    const exactKey = `${normBrand}|${normModel}|${normCode}|${normName}|${yFrom}|${yTo}`;
    if (seenExact.has(exactKey)) {
      exactDuplicates.push({
        original: seenExact.get(exactKey)!,
        duplicate: r,
      });
    } else {
      seenExact.set(exactKey, r);
    }

    // 2. Code grouping by vehicle
    const vehicleCodeKey = `${normBrand}|${normModel}|${normCode}`;
    if (!codeClashesMap.has(vehicleCodeKey)) {
      codeClashesMap.set(vehicleCodeKey, []);
    }
    codeClashesMap.get(vehicleCodeKey)!.push(r);

    // 3. Duplicate within same vehicle and year
    const years = r.years && r.years.length > 0 ? r.years : (yFrom && yTo ? Array.from({ length: yTo - yFrom + 1 }, (_, i) => yFrom + i) : []);
    for (const yr of years) {
      const vKey = `${normBrand}|${normModel}|${yr}|${normCode}`;
      if (!vehicleYearMap.has(vKey)) {
        vehicleYearMap.set(vKey, []);
      }
      vehicleYearMap.get(vKey)!.push(r);
    }
  }

  const codeClashes = Array.from(codeClashesMap.entries())
    .filter(([_, list]) => list.length > 1)
    .map(([code, records]) => ({ code, records }));

  const sameVehicleYearDuplicates = Array.from(vehicleYearMap.entries())
    .filter(([_, list]) => list.length > 1)
    .map(([vehicleYearKey, records]) => ({ vehicleYearKey, records }));

  return {
    exactDuplicates,
    codeClashes,
    sameVehicleYearDuplicates,
    totalDuplicates: exactDuplicates.length,
  };
}
