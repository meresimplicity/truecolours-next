import type { PaintProvider, PaintSearchQuery, RawPaintRecord } from "./types";
import type { PaintColor, PaintFitment } from "@/types/paint";
import { ProviderConfigError } from "./types";

/**
 * Paint Calculators (https://www.paintcalculators.com/colour-codes/api/) —
 * documented free tier: 1,000 req/month, 10 req/min. Confirmed live on
 * 8 Sep 2026.
 *
 * DOCS INCONSISTENCY, FLAGGED NOT GUESSED AWAY: their own page shows two
 * different base paths for the same host —
 *   Quick Start example:  https://api.paintcalculators.com/v1/color/convert
 *   Endpoint reference:   GET /api/v1/car-colors/{brand}
 * i.e. it's unclear whether the real base is
 *   https://api.paintcalculators.com          (no extra /api segment), or
 *   https://api.paintcalculators.com/api      (matching the listed routes)
 * PAINT_CALCULATORS_BASE_URL below defaults to the Quick Start's host
 * without an extra /api segment. If every request 404s once you have a
 * real key, try adding the /api segment back — don't assume either without
 * testing against a live key, since no test call was possible here.
 *
 * Response shape for GET /car-colors/{brand}?model=&year= (documented
 * example, Tesla):
 *   { success, data: { brand, model, colors: [
 *       { name, code, hex, finish, availability: string[] }
 *   ]}}
 * Notably: no aux_code / standard_number field, and no per-colour year in
 * the response even though `year` is an accepted query param. See
 * normalizeFitment() for how that gap is handled — we do NOT stamp a
 * fitment's year from the request just because the request asked for it.
 */

const DEFAULT_BASE_URL = "https://api.paintcalculators.com/v1";

interface PaintCalculatorsColor {
  name: string;
  code: string;
  hex?: string;
  finish?: string;
  /** Model names this colour is documented as available on — a real, source-confirmed fitment signal. */
  availability?: string[];
}

interface PaintCalculatorsResponse {
  success: boolean;
  data: {
    brand: string;
    model?: string;
    colors: PaintCalculatorsColor[];
  };
}

export class PaintCalculatorsProvider implements PaintProvider {
  readonly slug = "paint_calculators";
  readonly license = "proprietary-api-free-tier";
  readonly attribution = "Paint colour data via Paint Calculators (paintcalculators.com)";
  readonly redistributionAllowed = true; // per their documented API terms of providing structured data for integration; re-confirm in ToS before relying on this for production caching

  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;

  constructor(opts?: { apiKey?: string; baseUrl?: string }) {
    this.apiKey = opts?.apiKey ?? process.env.PAINT_CALCULATORS_API_KEY;
    this.baseUrl = opts?.baseUrl ?? process.env.PAINT_CALCULATORS_BASE_URL ?? DEFAULT_BASE_URL;
  }

  async searchColors(input: PaintSearchQuery): Promise<RawPaintRecord[]> {
    if (!this.apiKey) {
      throw new ProviderConfigError("PAINT_CALCULATORS_API_KEY is not set — see .env.example");
    }
    const params = new URLSearchParams();
    if (input.model) params.set("model", input.model);
    if (input.year) params.set("year", String(input.year));

    const url = `${this.baseUrl}/car-colors/${encodeURIComponent(input.make)}${
      params.size ? `?${params}` : ""
    }`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${this.apiKey}` } });
    if (!res.ok) {
      throw new Error(`Paint Calculators request failed: ${res.status} ${res.statusText}`);
    }
    const body = (await res.json()) as PaintCalculatorsResponse;
    if (!body.success) return [];

    return body.data.colors.map((c) => ({
      sourceRecordId: `${body.data.brand}:${c.code}`,
      requestedModel: input.model,
      requestedYear: input.year,
      ...c,
    }));
  }

  normalizePaintColor(
    raw: RawPaintRecord,
    manufacturerId: string
  ): Omit<PaintColor, "id" | "source" | "manufacturerId" | "codeNormalized" | "verificationStatus"> & {
    manufacturerId: string;
    sourceRecordId: string;
  } {
    const c = raw as unknown as PaintCalculatorsColor & { sourceRecordId: string };
    return {
      manufacturerId,
      code: c.code,
      auxCode: null,
      standardNumber: null,
      name: c.name,
      alternativeNames: [],
      baseColor: null,
      finish: c.finish ?? null,
      hex: c.hex ?? null, // UI presentation only — see README
      sourceUrl: "https://www.paintcalculators.com/car-colour-codes/",
      sourceRecordId: c.sourceRecordId,
    };
  }

  normalizeFitment(
    raw: RawPaintRecord,
    ids: { paintColorId: string; manufacturerId: string; modelId?: string; variantId?: string }
  ): Omit<PaintFitment, "id" | "source" | "confidence" | "verificationStatus"> & { sourceRecordId: string } {
    const c = raw as unknown as PaintCalculatorsColor & {
      sourceRecordId: string;
      requestedModel?: string;
      requestedYear?: number;
    };
    return {
      paintColorId: ids.paintColorId,
      manufacturerId: ids.manufacturerId,
      modelId: ids.modelId ?? null,
      variantId: ids.variantId ?? null,
      // Deliberately NOT set from `requestedYear` — the response never
      // confirmed the colour for that specific year, only that the query
      // didn't error. See file header. The import script sets
      // verification_status: 'unverified' + a below-1.0 confidence when
      // yearFrom/yearTo are both null for exactly this reason.
      yearFrom: null,
      yearTo: null,
      market: null,
      sourceUrl: "https://www.paintcalculators.com/car-colour-codes/",
      sourceRecordId: c.sourceRecordId,
    };
  }
}
