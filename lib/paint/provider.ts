import type {
  CodeSearchResult,
  PaintColor,
  PaintDataProvider,
  VehicleBrand,
  VehicleModel,
} from "../../types/paint.ts";
import { LocalOpenDataProvider } from "./local-provider.ts";
import { DEFAULT_PROVIDER_CHAIN, mergeCodeSearchResults, mergePaintResults } from "./providers/index.ts";

/**
 * CompositePaintDataProvider
 * Orchestrates multiple data sources in priority order:
 * 1. TRUECOLOURS In-Store Verified Overrides
 * 2. Open-vehicle OEM lookup layer
 * 3. Local fallback records
 * 4. Optional licensed provider adapters
 */
export class CompositePaintDataProvider implements PaintDataProvider {
  private localProvider: LocalOpenDataProvider;

  constructor() {
    this.localProvider = new LocalOpenDataProvider();
  }

  async getBrands(): Promise<VehicleBrand[]> {
    return this.localProvider.getBrands();
  }

  async getModels(brand: string): Promise<VehicleModel[]> {
    return this.localProvider.getModels(brand);
  }

  async getYears(brand: string, model: string): Promise<number[]> {
    return this.localProvider.getYears(brand, model);
  }

  async getColors(brand: string, model: string, year: number, market?: string): Promise<PaintColor[]> {
    const batches: PaintColor[][] = [];

    for (const provider of DEFAULT_PROVIDER_CHAIN) {
      const available = await provider.isAvailable?.();
      if (available === false) continue;

      const nextBatch = await provider.getColors(brand, model, year, market);
      if (nextBatch.length > 0) {
        batches.push(nextBatch);
      }
    }

    return mergePaintResults(...batches);
  }

  async getGenerations(brand: string, model: string) {
    return this.localProvider.getGenerations(brand, model);
  }

  async getColorsPaginated(filter: import("@/types/paint").PaintColorQueryFilter) {
    return this.localProvider.getColorsPaginated(filter);
  }

  async searchByCode(query: string): Promise<CodeSearchResult[]> {
    const q = query.trim();
    if (!q) return [];

    const batches: CodeSearchResult[][] = [];

    for (const provider of DEFAULT_PROVIDER_CHAIN) {
      const available = await provider.isAvailable?.();
      if (available === false) continue;

      const nextBatch = await provider.searchByCode(q);
      if (nextBatch.length > 0) {
        batches.push(nextBatch);
      }
    }

    return mergeCodeSearchResults(...batches);
  }

  withIndicativeSwatches(colours: CodeSearchResult[]): CodeSearchResult[] {
    return this.localProvider.withIndicativeSwatches(colours);
  }
}

let providerInstance: CompositePaintDataProvider | null = null;

export function getPaintProvider(): CompositePaintDataProvider {
  if (!providerInstance) {
    providerInstance = new CompositePaintDataProvider();
  }
  return providerInstance;
}
