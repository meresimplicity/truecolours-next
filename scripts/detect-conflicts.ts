import { normalizePaintCode, cleanText } from "./normalize-paint-codes.ts";

export interface ConflictRecord {
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
  hex?: string;
  swatchHex?: string;
}

export interface ValidationIssue {
  type:
    | "missing_code"
    | "missing_name"
    | "missing_source"
    | "invalid_manufacturer"
    | "invalid_model"
    | "invalid_year"
    | "year_range_inverted"
    | "invalid_hex"
    | "fake_code_prohibited";
  message: string;
  record: ConflictRecord;
}

export interface ConflictReport {
  issues: ValidationIssue[];
  sourceConflicts: {
    key: string;
    sources: string[];
    records: ConflictRecord[];
  }[];
  isValid: boolean;
}

export function validateAndDetectConflicts(records: ConflictRecord[]): ConflictReport {
  const issues: ValidationIssue[] = [];
  const sourceGroups = new Map<string, ConflictRecord[]>();

  const currentYear = new Date().getFullYear();

  for (const r of records) {
    const brand = cleanText(r.brand);
    const model = cleanText(r.model);
    const code = cleanText(r.primaryCode || r.code);
    const name = cleanText(r.name);
    const source = cleanText(r.source);

    // 1. Missing fields
    if (!brand) {
      issues.push({ type: "invalid_manufacturer", message: "Manufacturer / brand is missing or empty.", record: r });
    }
    if (!model) {
      issues.push({ type: "invalid_model", message: "Model is missing or empty.", record: r });
    }
    if (!code) {
      issues.push({ type: "missing_code", message: "Paint code is missing or empty.", record: r });
    }
    if (!name) {
      issues.push({ type: "missing_name", message: "Color name is missing or empty.", record: r });
    }
    if (!source) {
      issues.push({ type: "missing_source", message: "Data source provenance is missing.", record: r });
    }

    // Prohibit fake codes
    if (code.toUpperCase().includes("SAMPLE") || code.toUpperCase().includes("FAKE") || code.toUpperCase().includes("DUMMY")) {
      issues.push({ type: "fake_code_prohibited", message: `Rejecting fake or test code: "${code}"`, record: r });
    }

    // Year validation
    const yFrom = r.yearFrom;
    const yTo = r.yearTo;
    if (yFrom !== undefined && (yFrom < 1950 || yFrom > currentYear + 5)) {
      issues.push({ type: "invalid_year", message: `yearFrom ${yFrom} is outside realistic automotive range.`, record: r });
    }
    if (yTo !== undefined && (yTo < 1950 || yTo > currentYear + 5)) {
      issues.push({ type: "invalid_year", message: `yearTo ${yTo} is outside realistic automotive range.`, record: r });
    }
    if (yFrom !== undefined && yTo !== undefined && yFrom > yTo) {
      issues.push({ type: "year_range_inverted", message: `yearFrom (${yFrom}) is greater than yearTo (${yTo}).`, record: r });
    }

    // Swatch validation
    const hex = r.swatchHex || r.hex;
    if (hex && !/^#[0-9A-Fa-f]{6}$/.test(hex.trim())) {
      issues.push({ type: "invalid_hex", message: `Invalid hex format: "${hex}". Swatches must be valid 6-digit hex or undefined.`, record: r });
    }

    // Conflict detection across sources
    if (brand && model && code) {
      const groupKey = `${brand.toLowerCase()}|${model.toLowerCase()}|${normalizePaintCode(code)}`;
      if (!sourceGroups.has(groupKey)) {
        sourceGroups.set(groupKey, []);
      }
      sourceGroups.get(groupKey)!.push(r);
    }
  }

  const sourceConflicts: ConflictReport["sourceConflicts"] = [];
  for (const [key, group] of sourceGroups.entries()) {
    const sources = Array.from(new Set(group.map((g) => g.source || "unknown")));
    if (sources.length > 1) {
      // Multiple sources for the same brand, model, and code
      sourceConflicts.push({
        key,
        sources,
        records: group,
      });
    }
  }

  return {
    issues,
    sourceConflicts,
    isValid: issues.length === 0,
  };
}
