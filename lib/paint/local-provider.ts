import fs from "node:fs";
import path from "node:path";
import type {
  CodeSearchResult,
  PaginatedPaintResponse,
  PaintColor,
  PaintColorQueryFilter,
  PaintDataProvider,
  VehicleBrand,
  VehicleGeneration,
  VehicleModel,
} from "../../types/paint.ts";
import { normalizeColorName, formatDisplayCode } from "../../scripts/normalize-paint-codes.ts";
import { getPaintSearchMatch } from "./search.ts";
import { paintColourFamilies } from "./colour-families.ts";
import { hasPaintVerificationEvidence, preserveDistinctPaintIds, restoreKnownHondaCode } from "./catalogue-quality.ts";
import { withPaintSwatchPreview } from "./swatch-preview.ts";

/**
 * LocalOpenDataProvider
 * High-performance data provider backed by data/paint-records.json
 * and data/paint.db.
 */
interface StoredPaintRecordJson {
  id: string;
  brand: string;
  model: string;
  brandId?: string;
  modelId?: string;
  generation?: string;
  generationId?: string;
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  years?: number[];
  code: string;
  primaryCode?: string;
  salesCodes?: string[];
  displayCode?: string;
  aliases?: string[];
  name: string;
  baseColor?: string;
  normalizedName?: string;
  finish?: string;
  hex?: string;
  swatchHex?: string;
  swatchSource?: string;
  swatchVerified?: boolean;
  alternativeNames?: { language: string; name: string }[];
  market?: string;
  manufacturer?: string;
  source?: 'truecolours' | 'licensed' | 'open-data' | 'api' | 'unverified';
  sourceId?: string;
  sourceUrl?: string;
  sourceLicense?: string;
  verified?: boolean;
  notes?: string;
  formulaReference?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

function normalizeBrandName(val: string): string {
  const clean = val
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (clean === "susuki") return "suzuki";
  if (clean === "mercedes" || clean === "mercedesbenz") return "mercedesbenz";
  if (clean === "citron" || clean === "citroen") return "citroen";
  if (clean === "faw") return "faw";
  if (clean === "chevy") return "chevrolet";
  return clean;
}

export function matchBrand(recordBrand: string, queryBrand: string): boolean {
  if (!recordBrand || !queryBrand) return false;
  if (recordBrand.toLowerCase() === queryBrand.toLowerCase()) return true;
  const nRecord = normalizeBrandName(recordBrand);
  const nQuery = normalizeBrandName(queryBrand);
  if (nRecord === nQuery) return true;
  if (nQuery === "haval" && (nRecord === "haval" || nRecord.includes("haval") || nRecord === "gwmhaval")) return true;
  if (nQuery === "gwm" && (nRecord === "gwm" || nRecord.includes("gwm") || nRecord === "gwmhaval")) return true;
  return false;
}

export class LocalOpenDataProvider implements PaintDataProvider {
  private records: PaintColor[] = [];
  private brandsCache: VehicleBrand[] | null = null;
  private modelsCache = new Map<string, VehicleModel[]>();
  private generationsCache = new Map<string, VehicleGeneration[]>();
  private yearsCache = new Map<string, number[]>();
  private lastLoadedMtime = 0;

  constructor() {
    this.ensureFreshData();
  }

  private ensureFreshData(): void {
    try {
      const jsonPath = path.join(process.cwd(), "data", "paint-records.json");
      if (fs.existsSync(jsonPath)) {
        const stat = fs.statSync(jsonPath);
        if (stat.mtimeMs > this.lastLoadedMtime) {
          this.loadDataset(jsonPath);
          this.lastLoadedMtime = stat.mtimeMs;
          this.brandsCache = null;
          this.modelsCache.clear();
          this.generationsCache.clear();
          this.yearsCache.clear();
        }
      }
    } catch (err) {
      console.error("[LocalOpenDataProvider] Failed checking dataset mtime:", err);
    }
  }

  private loadDataset(jsonPath = path.join(process.cwd(), "data", "paint-records.json")): void {
    try {
      if (fs.existsSync(jsonPath)) {
        const raw = fs.readFileSync(jsonPath, "utf-8");
        const list: StoredPaintRecordJson[] = JSON.parse(raw);
        this.records = preserveDistinctPaintIds(list.map(restoreKnownHondaCode).map((r: StoredPaintRecordJson) => {
          const primaryCode = r.primaryCode || r.code;
          const salesCodes = r.salesCodes || [];
          const displayCode = r.displayCode || formatDisplayCode(primaryCode, salesCodes);
          const hexVal = r.swatchHex || r.hex;

          const yearFrom = r.yearFrom ?? r.year ?? (r.years && r.years.length ? r.years[0] : 2010);
          const yearTo = r.yearTo ?? r.year ?? (r.years && r.years.length ? r.years[r.years.length - 1] : 2024);

          return {
            id: r.id,
            brand: r.brand,
            model: r.model,
            brandId: r.brandId,
            modelId: r.modelId,
            generation: r.generation,
            generationId: r.generationId,
            year: r.year ?? (r.years && r.years[0]) ?? yearFrom,
            yearFrom,
            yearTo,
            years: r.years || (yearFrom && yearTo ? Array.from({ length: yearTo - yearFrom + 1 }, (_, i) => yearFrom + i) : []),
            code: primaryCode,
            primaryCode,
            salesCodes,
            displayCode,
            aliases: r.aliases || [],
            name: r.name,
            baseColor: r.baseColor || paintColourFamilies([r.name, ...(r.alternativeNames || []).map((alt) => alt.name)].join(" ")),
            normalizedName: r.normalizedName || normalizeColorName(r.name),
            finish: r.finish || "Solid",
            hex: hexVal,
            swatchHex: hexVal,
            swatchSource: r.swatchSource || (hexVal ? "Indicative catalogue preview" : undefined),
            swatchVerified: Boolean(r.swatchVerified && hasPaintVerificationEvidence({ ...r, verified: Boolean(r.verified) })),
            alternativeNames: r.alternativeNames || [],
            market: r.market,
            manufacturer: r.manufacturer || r.brand,
            source: r.source || "open-data",
            sourceId: r.sourceId || r.source,
            sourceUrl: r.sourceUrl,
            sourceLicense: r.sourceLicense,
            verified: hasPaintVerificationEvidence({ ...r, verified: Boolean(r.verified) }),
            notes: r.notes,
            formulaReference: r.formulaReference,
            verifiedBy: r.verifiedBy,
            verifiedAt: r.verifiedAt,
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
          };
        }).map(withPaintSwatchPreview));
      } else {
        console.warn(`[LocalOpenDataProvider] Warning: ${jsonPath} not found.`);
      }
    } catch (err) {
      console.error("[LocalOpenDataProvider] Failed to load dataset:", err);
      this.records = [];
    }
  }

  async getBrands(): Promise<VehicleBrand[]> {
    this.ensureFreshData();
    if (this.brandsCache) return this.brandsCache;

    const brandCounts = new Map<string, number>();
    for (const r of this.records) {
      brandCounts.set(r.brand, (brandCounts.get(r.brand) || 0) + 1);
    }

    const brands: VehicleBrand[] = Array.from(brandCounts.keys())
      .sort((a, b) => a.localeCompare(b))
      .map((b) => ({
        id: b.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: b,
        slug: b.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        modelsCount: brandCounts.get(b) || 0,
      }));

    this.brandsCache = brands;
    return brands;
  }

  async getModels(brand: string): Promise<VehicleModel[]> {
    this.ensureFreshData();
    const brandKey = brand.trim().toLowerCase();
    if (this.modelsCache.has(brandKey)) {
      return this.modelsCache.get(brandKey)!;
    }

    const modelCounts = new Map<string, number>();
    for (const r of this.records) {
      if (matchBrand(r.brand, brand)) {
        modelCounts.set(r.model, (modelCounts.get(r.model) || 0) + 1);
      }
    }

    const models: VehicleModel[] = Array.from(modelCounts.keys())
      .sort((a, b) => a.localeCompare(b))
      .map((m) => ({
        id: `${brandKey}-${m.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        brandId: brandKey,
        name: m,
        slug: m.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        colorsCount: modelCounts.get(m) || 0,
      }));

    this.modelsCache.set(brandKey, models);
    return models;
  }

  async getGenerations(brand: string, model: string): Promise<VehicleGeneration[]> {
    const key = `${brand.trim().toLowerCase()}|${model.trim().toLowerCase()}`;
    if (this.generationsCache.has(key)) {
      return this.generationsCache.get(key)!;
    }

    const genSet = new Map<string, VehicleGeneration>();
    for (const r of this.records) {
      if (
        matchBrand(r.brand, brand) &&
        r.model.toLowerCase() === model.trim().toLowerCase() &&
        r.generation
      ) {
        if (!genSet.has(r.generation)) {
          genSet.set(r.generation, {
            id: `gen-${r.generation.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
            modelId: r.modelId || model,
            name: r.generation,
            yearFrom: r.yearFrom,
            yearTo: r.yearTo,
          });
        }
      }
    }

    const generations = Array.from(genSet.values());
    this.generationsCache.set(key, generations);
    return generations;
  }

  async getYears(brand: string, model: string): Promise<number[]> {
    const key = `${brand.trim().toLowerCase()}|${model.trim().toLowerCase()}`;
    if (this.yearsCache.has(key)) {
      return this.yearsCache.get(key)!;
    }

    const yearsSet = new Set<number>();
    for (const r of this.records) {
      if (
        matchBrand(r.brand, brand) &&
        r.model.toLowerCase() === model.trim().toLowerCase()
      ) {
        if (r.years && Array.isArray(r.years) && r.years.length > 0) {
          for (const y of r.years) {
            yearsSet.add(y);
          }
        } else if (r.yearFrom && r.yearTo) {
          for (let y = r.yearFrom; y <= r.yearTo; y++) {
            yearsSet.add(y);
          }
        }
      }
    }

    const years = Array.from(yearsSet).sort((a, b) => b - a);
    this.yearsCache.set(key, years);
    return years;
  }

  async getColors(brand: string, model: string, year: number, market?: string): Promise<PaintColor[]> {
    const m = model.trim().toLowerCase();
    const targetMarket = market?.trim();

    return this.records.filter((r) => {
      const matchesBrand = matchBrand(r.brand, brand);
      const matchesModel = r.model.toLowerCase() === m;
      const matchesYear =
        (r.years && r.years.length > 0 && r.years.includes(year)) ||
        (r.yearFrom !== undefined && r.yearTo !== undefined && year >= r.yearFrom && year <= r.yearTo);
      const matchesMarket = !targetMarket || !r.market || r.market === targetMarket || r.market === "South Africa";
      return matchesBrand && matchesModel && matchesYear && matchesMarket;
    });
  }

  async getColorsPaginated(filter: PaintColorQueryFilter): Promise<PaginatedPaintResponse> {
    const m = filter.model.trim().toLowerCase();
    const targetYear = filter.year;
    const sortBy = filter.sortBy || "code_asc";
    const page = Math.max(1, filter.page || 1);
    const limit = Math.min(96, Math.max(12, filter.limit || 24));

    // 1. Filter
    let list = this.records.filter((r) => {
      const matchesBrand = matchBrand(r.brand, filter.brand);
      const matchesModel = r.model.toLowerCase() === m;
      if (!matchesBrand || !matchesModel) return false;

      if (targetYear !== undefined && targetYear > 0) {
        const inYears = r.years && r.years.length > 0 && r.years.includes(targetYear);
        const inRange = r.yearFrom !== undefined && r.yearTo !== undefined && targetYear >= r.yearFrom && targetYear <= r.yearTo;
        if (!inYears && !inRange) return false;
      }

      if (filter.generation) {
        const genSlug = filter.generation.toLowerCase();
        if (!r.generation || !r.generation.toLowerCase().includes(genSlug)) return false;
      }

      return true;
    });

    // 2. Sort
    list = list.sort((a, b) => {
      if (sortBy === "name_asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "name_desc") {
        return b.name.localeCompare(a.name);
      }
      if (sortBy === "code_desc") {
        return (b.primaryCode || b.code).localeCompare(a.primaryCode || a.code);
      }
      // Default: code_asc
      return (a.primaryCode || a.code).localeCompare(b.primaryCode || b.code);
    });

    const total = list.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const start = (page - 1) * limit;
    const paged = list.slice(start, start + limit);

    return {
      colors: paged,
      total,
      page,
      limit,
      totalPages,
      hasPrev: page > 1,
      hasNext: page < totalPages,
    };
  }

  async searchByCode(query: string): Promise<CodeSearchResult[]> {
    this.ensureFreshData();
    const q = query.trim();
    if (!q) return [];

    const matches: CodeSearchResult[] = [];
    const seenIds = new Set<string>();

    for (const r of this.records) {
      if (seenIds.has(r.id)) continue;

      const match = getPaintSearchMatch(r, q);
      if (match) {
        seenIds.add(r.id);
        matches.push({
          ...r,
          ...match,
        });
      }
    }

    // Sort by relevance score descending
    return matches.sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
  }

  withIndicativeSwatches(colours: CodeSearchResult[]): CodeSearchResult[] {
    this.ensureFreshData();
    const swatches = new Map<string, Set<string>>();
    for (const record of this.records) {
      const hex = record.swatchHex || record.hex;
      if (hex && !record.swatchEstimated && /^#[0-9a-f]{6}$/i.test(hex)) {
        const key = `${normalizeBrandName(record.brand)}|${record.code.toUpperCase()}`;
        const variants = swatches.get(key) || new Set<string>();
        variants.add(hex.toUpperCase());
        swatches.set(key, variants);
      }
    }
    return colours.map((colour) => {
      const variants = colour.code ? swatches.get(`${normalizeBrandName(colour.brand)}|${colour.code.toUpperCase()}`) : undefined;
      const hex = variants?.size === 1 ? [...variants][0] : undefined;
      return hex ? { ...colour, hex, swatchHex: hex, swatchEstimated: false, swatchSource: "Indicative preview from the catalogue paint-code reference", swatchVerified: false } : withPaintSwatchPreview(colour);
    });
  }
}
