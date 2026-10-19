import type { VehicleProvider, RawVehicleRecord } from "./types";
import type { Make, Model, ModelYear } from "@/types/vehicle";

/**
 * VehiclesDB (https://github.com/vehiclesdb/vehiclesdb) — CC-BY 4.0.
 *
 * Verified live against the repo on 8 Sep 2026: current release is a
 * `dist/vehicles.json` "gem projection" shaped like
 *
 *   { version, schema_version, kinds, makes: [
 *       { name, slug, kinds: [...], models: [
 *           { name, slug, kind, body_type?, global_decile?, availability: string[] }
 *       ]}
 *   ]}
 *
 * REQUIRED ATTRIBUTION (do not remove, verbatim from the repo README):
 *   "Vehicle data by VehiclesDB (CC-BY 4.0), built from official public
 *    registers — see ATTRIBUTION.md for source notices."
 *
 * IMPORTANT GAP: per SCHEMA.md, `year_start` / `year_end` on a model and the
 * whole `generations` / `variants` layer are explicitly "optional, future"
 * / "reserved — currently unpopulated". This provider therefore does NOT
 * invent model years. getYears() returns an empty array and logs why;
 * real year granularity for the "Find My Colour" year dropdown should come
 * from vehicle_model_years rows populated by NHTSA vPIC (US market — see
 * nhtsa-vpic.provider.ts) or from the distinct years already present in
 * paint_fitments once a paint provider has been imported for that model.
 * Re-check SCHEMA.md before removing this comment — the field is expected
 * to populate in a future VehiclesDB release.
 */

const CDN_URL = "https://cdn.jsdelivr.net/gh/vehiclesdb/vehiclesdb@latest/dist/vehicles.json";

export const VEHICLESDB_ATTRIBUTION =
  "Vehicle data by VehiclesDB (CC-BY 4.0), built from official public registers — see ATTRIBUTION.md for source notices.";

interface VehiclesDbModel {
  name: string;
  slug: string;
  kind: string;
  body_type?: string;
  global_decile?: number;
  availability?: string[];
}

interface VehiclesDbMake {
  name: string;
  slug: string;
  kinds: string[];
  models: VehiclesDbModel[];
}

interface VehiclesDbDist {
  version: string;
  schema_version: number;
  kinds: string[];
  makes: VehiclesDbMake[];
}

let cache: VehiclesDbDist | null = null;

async function loadDist(): Promise<VehiclesDbDist> {
  if (cache) return cache;
  const res = await fetch(CDN_URL, { next: { revalidate: 60 * 60 * 24 } as any });
  if (!res.ok) {
    throw new Error(`VehiclesDB fetch failed: ${res.status} ${res.statusText}`);
  }
  cache = (await res.json()) as VehiclesDbDist;
  return cache;
}

export class VehiclesDbProvider implements VehicleProvider {
  readonly slug = "vehiclesdb";
  readonly license = "CC-BY-4.0";
  readonly attribution = VEHICLESDB_ATTRIBUTION;

  /** Restrict to a kind for a "car paint" catalogue by default; pass null for everything. */
  constructor(private readonly kindFilter: string | null = "car") {}

  async getMakes(): Promise<RawVehicleRecord[]> {
    const dist = await loadDist();
    return dist.makes
      .filter((m) => !this.kindFilter || m.kinds.includes(this.kindFilter))
      .map((m) => ({ sourceRecordId: m.slug, ...m }));
  }

  async getModels(makeSlug: string): Promise<RawVehicleRecord[]> {
    const dist = await loadDist();
    const make = dist.makes.find((m) => m.slug === makeSlug);
    if (!make) return [];
    return make.models
      .filter((m) => !this.kindFilter || m.kind === this.kindFilter)
      .map((m) => ({ sourceRecordId: `${makeSlug}/${m.slug}`, ...m }));
  }

  async getYears(_makeSlug: string, _modelSlug: string): Promise<RawVehicleRecord[]> {
    // Deliberately empty — see file header. Returning fabricated years here
    // would violate the "no fake data" rule the whole system is built on.
    console.warn(
      "[vehiclesdb.provider] getYears() called, but VehiclesDB does not yet publish per-model year data. " +
        "Falling back source (NHTSA vPIC / paint_fitments) should be used instead."
    );
    return [];
  }

  normalizeMake(raw: RawVehicleRecord): Omit<Make, "id" | "source"> & { sourceRecordId: string } {
    const m = raw as unknown as VehiclesDbMake & { sourceRecordId: string };
    return { name: m.name, slug: m.slug, country: null, sourceRecordId: m.sourceRecordId };
  }

  normalizeModel(
    raw: RawVehicleRecord,
    manufacturerId: string
  ): Omit<Model, "id" | "source" | "manufacturerId"> & { manufacturerId: string; sourceRecordId: string } {
    const m = raw as unknown as VehiclesDbModel & { sourceRecordId: string };
    return {
      manufacturerId,
      name: m.name,
      slug: m.slug,
      vehicleType: m.kind ?? null,
      bodyStyle: m.body_type ?? null,
      generation: null,
      // Honest nulls, not guesses — see file header.
      yearFrom: null,
      yearTo: null,
      sourceRecordId: m.sourceRecordId,
    };
  }

  normalizeModelYear(
    raw: RawVehicleRecord,
    modelId: string
  ): Omit<ModelYear, "id" | "source" | "modelId"> & { modelId: string; sourceRecordId: string } {
    // Not reachable while getYears() returns [], kept for interface completeness
    // against the day VehiclesDB's depth layer ships year_start/year_end.
    throw new Error("VehiclesDbProvider does not currently supply model-year records");
  }
}
