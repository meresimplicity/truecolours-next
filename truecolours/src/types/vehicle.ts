/**
 * Layer A — vehicle taxonomy types.
 *
 * These describe "what vehicles exist", independent of paint. Nothing here
 * should ever be populated by hand for production use — see
 * scripts/import-vehicles.ts. Hand-written fixtures belong only in tests
 * and must use obviously fake identifiers (see tests/fixtures.ts).
 */

export interface DataSourceRef {
  id: string;
  slug: string;
}

export interface Make {
  id: string;
  name: string;
  slug: string;
  country?: string | null;
  source: DataSourceRef;
  sourceRecordId?: string | null;
}

export interface Model {
  id: string;
  manufacturerId: string;
  /** Kept as the source actually names it — "A1 Sportback" stays distinct from "A1". */
  name: string;
  slug: string;
  vehicleType?: string | null;
  bodyStyle?: string | null;
  generation?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  source: DataSourceRef;
  sourceRecordId?: string | null;
}

export interface Variant {
  id: string;
  modelId: string;
  name: string;
  slug: string;
  bodyStyle?: string | null;
  trim?: string | null;
  generation?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  source: DataSourceRef;
  sourceRecordId?: string | null;
}

export interface ModelYear {
  id: string;
  modelId: string;
  variantId?: string | null;
  year: number;
  market?: string | null;
  verified: boolean;
  source: DataSourceRef;
  sourceRecordId?: string | null;
}

/** The vehicle context a customer has selected in the Find My Colour flow. */
export interface VehicleSelection {
  makeSlug: string;
  modelSlug?: string;
  variantSlug?: string;
  year?: number;
  market?: string;
}
