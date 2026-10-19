import type { VehicleProvider, RawVehicleRecord } from "./types";
import type { Make, Model, ModelYear } from "@/types/vehicle";

/**
 * NHTSA vPIC (https://vpic.nhtsa.dot.gov/api/) — US government API, no key
 * required, public domain. Confirmed live on 8 Sep 2026.
 *
 * Role in this system: NOT the primary vehicle taxonomy source (it's
 * US-market and VIN/regulatory oriented, not a global make/model catalogue
 * — see its own docs). It plugs the one real gap VehiclesDB currently has:
 * per-model-year confirmation (spec section 8 / section 16, "Provider —
 * vPIC ... useful for validating Make → Model → Year").
 *
 * vPIC has no "years for this model" endpoint — only "models for this
 * make+year". So getYears() here works by probing a bounded year range
 * and checking whether the model shows up for each year. That's an O(years)
 * call fan-out, which is fine for scripts/validate-fitments.ts running on a
 * schedule, but too slow to call on a live dropdown click — callers should
 * read the resulting vehicle_model_years rows from the database, not call
 * this provider directly from an API route.
 */

const BASE_URL = "https://vpic.nhtsa.dot.gov/api/vehicles";

interface VpicModel {
  Make_Name: string;
  Model_Name: string;
  Model_ID: number;
}

interface VpicResponse<T> {
  Count: number;
  Results: T[];
}

async function getJson<T>(path: string): Promise<VpicResponse<T>> {
  const res = await fetch(`${BASE_URL}${path}${path.includes("?") ? "&" : "?"}format=json`);
  if (!res.ok) throw new Error(`NHTSA vPIC fetch failed: ${res.status} ${res.statusText}`);
  return (await res.json()) as VpicResponse<T>;
}

export class NhtsaVpicProvider implements VehicleProvider {
  readonly slug = "nhtsa_vpic";
  readonly license = "public-domain";
  readonly attribution = "Vehicle data validated against NHTSA vPIC (US Department of Transportation)";

  constructor(
    /** Inclusive range to probe when validating years. Keep modest — this is O(n) requests. */
    private readonly yearProbeRange: { from: number; to: number } = {
      from: 1996,
      to: new Date().getFullYear() + 1,
    }
  ) {}

  async getMakes(): Promise<RawVehicleRecord[]> {
    const data = await getJson<{ Make_Name: string; Make_ID: number }>("/getallmakes");
    return data.Results.map((m) => ({ sourceRecordId: String(m.Make_ID), ...m }));
  }

  async getModels(makeSlug: string): Promise<RawVehicleRecord[]> {
    const data = await getJson<VpicModel>(`/getmodelsformake/${encodeURIComponent(makeSlug)}`);
    return data.Results.map((m) => ({ sourceRecordId: String(m.Model_ID), ...m }));
  }

  /** Expensive — see file header. Intended for scripts/validate-fitments.ts, not request-time use. */
  async getYears(makeSlug: string, modelSlug: string): Promise<RawVehicleRecord[]> {
    const confirmed: RawVehicleRecord[] = [];
    for (let year = this.yearProbeRange.from; year <= this.yearProbeRange.to; year++) {
      const data = await getJson<VpicModel>(
        `/getmodelsformakeyear/make/${encodeURIComponent(makeSlug)}/modelyear/${year}`
      );
      const hit = data.Results.find(
        (m) => m.Model_Name.toLowerCase() === modelSlug.toLowerCase().replace(/-/g, " ")
      );
      if (hit) {
        confirmed.push({ sourceRecordId: `${makeSlug}-${modelSlug}-${year}`, year, model: hit });
      }
    }
    return confirmed;
  }

  normalizeMake(raw: RawVehicleRecord): Omit<Make, "id" | "source"> & { sourceRecordId: string } {
    const m = raw as unknown as { Make_Name: string; sourceRecordId: string };
    const slug = m.Make_Name.toLowerCase().trim().replace(/\s+/g, "-");
    return { name: titleCase(m.Make_Name), slug, country: null, sourceRecordId: m.sourceRecordId };
  }

  normalizeModel(
    raw: RawVehicleRecord,
    manufacturerId: string
  ): Omit<Model, "id" | "source" | "manufacturerId"> & { manufacturerId: string; sourceRecordId: string } {
    const m = raw as unknown as VpicModel & { sourceRecordId: string };
    const slug = m.Model_Name.toLowerCase().trim().replace(/\s+/g, "-");
    return {
      manufacturerId,
      name: m.Model_Name,
      slug,
      vehicleType: "car",
      bodyStyle: null,
      generation: null,
      yearFrom: null,
      yearTo: null,
      sourceRecordId: m.sourceRecordId,
    };
  }

  normalizeModelYear(
    raw: RawVehicleRecord,
    modelId: string
  ): Omit<ModelYear, "id" | "source" | "modelId"> & { modelId: string; sourceRecordId: string } {
    const r = raw as unknown as { year: number; sourceRecordId: string };
    return {
      modelId,
      variantId: null,
      year: r.year,
      market: "us",
      verified: false, // structural presence in vPIC, not a TRUECOLOURS human check
      sourceRecordId: r.sourceRecordId,
    };
  }
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length ? w[0]!.toUpperCase() + w.slice(1) : w))
    .join(" ");
}
