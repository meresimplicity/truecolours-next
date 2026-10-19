import type { Make, Model, ModelYear, Variant } from "@/types/vehicle";
import type { PaintColor, PaintFitment } from "@/types/paint";

/**
 * A "raw" record as it comes back from a provider, before normalization.
 * Kept loosely typed on purpose — providers disagree wildly on shape —
 * but every adapter is responsible for stamping sourceRecordId so the
 * normalizer can trace it back.
 */
export interface RawVehicleRecord {
  sourceRecordId: string;
  [key: string]: unknown;
}

export interface RawPaintRecord {
  sourceRecordId: string;
  [key: string]: unknown;
}

export interface VehicleProvider {
  /** Machine-readable id matching a data_sources.slug row. */
  readonly slug: string;
  readonly license: string;
  readonly attribution?: string;

  getMakes(): Promise<RawVehicleRecord[]>;
  getModels(makeSlug: string): Promise<RawVehicleRecord[]>;
  getYears(makeSlug: string, modelSlug: string): Promise<RawVehicleRecord[]>;

  /** Map this provider's raw shape into TRUECOLOURS's normalized shape. */
  normalizeMake(raw: RawVehicleRecord): Omit<Make, "id" | "source"> & { sourceRecordId: string };
  normalizeModel(raw: RawVehicleRecord, manufacturerId: string): Omit<Model, "id" | "source" | "manufacturerId"> & {
    manufacturerId: string;
    sourceRecordId: string;
  };
  normalizeVariant?(raw: RawVehicleRecord, modelId: string): Omit<Variant, "id" | "source" | "modelId"> & {
    modelId: string;
    sourceRecordId: string;
  };
  normalizeModelYear(raw: RawVehicleRecord, modelId: string): Omit<ModelYear, "id" | "source" | "modelId"> & {
    modelId: string;
    sourceRecordId: string;
  };
}

export interface PaintSearchQuery {
  make: string;
  model?: string;
  variant?: string;
  year?: number;
  code?: string;
}

export interface PaintProvider {
  readonly slug: string;
  readonly license: string;
  readonly attribution?: string;
  /** false => results may only be shown live, never written to paint_colors/paint_fitments. */
  readonly redistributionAllowed: boolean;

  searchColors(input: PaintSearchQuery): Promise<RawPaintRecord[]>;

  normalizePaintColor(raw: RawPaintRecord, manufacturerId: string): Omit<
    PaintColor,
    "id" | "source" | "manufacturerId" | "codeNormalized" | "verificationStatus"
  > & { manufacturerId: string; sourceRecordId: string };

  normalizeFitment(
    raw: RawPaintRecord,
    ids: { paintColorId: string; manufacturerId: string; modelId?: string; variantId?: string }
  ): Omit<PaintFitment, "id" | "source" | "confidence" | "verificationStatus"> & { sourceRecordId: string };
}

export class ProviderConfigError extends Error {}
export class ProviderUnavailableError extends Error {}
