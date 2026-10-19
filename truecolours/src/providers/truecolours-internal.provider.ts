import type { PaintProvider, PaintSearchQuery, RawPaintRecord } from "./types";
import type { PaintColor, PaintFitment } from "@/types/paint";
import { query } from "@/lib/db";

/**
 * TRUECOLOURS's own verified records — every colour a team member has
 * personally confirmed against a real vehicle or paint-code label (spec
 * section 40, Phase 3). Always ranks highest in the priority merge
 * (src/providers/registry.ts, spec section 17), because it's the one
 * source with a human standing behind it rather than a scrape or an API
 * response.
 *
 * Unlike the other providers this one reads straight from Postgres —
 * there's no external HTTP call, no rate limit, and results are already
 * normalized (they were written by an admin action, not an importer), so
 * normalizePaintColor/normalizeFitment below are near pass-throughs.
 */

interface InternalRow {
  id: string;
  manufacturer_id: string;
  code: string;
  aux_code: string | null;
  standard_number: string | null;
  name: string;
  base_color: string | null;
  finish: string | null;
  hex: string | null;
  source_url: string | null;
  model_id: string | null;
  variant_id: string | null;
  year_from: number | null;
  year_to: number | null;
  market: string | null;
}

export class TrueColoursInternalProvider implements PaintProvider {
  readonly slug = "truecolours_internal";
  readonly license = "internal";
  readonly attribution = undefined;
  readonly redistributionAllowed = true;

  async searchColors(input: PaintSearchQuery): Promise<RawPaintRecord[]> {
    const rows = await query<InternalRow>(
      `select pc.id, pc.manufacturer_id, pc.code, pc.aux_code, pc.standard_number,
              pc.name, pc.base_color, pc.finish, pc.hex, pc.source_url,
              pf.model_id, pf.variant_id, pf.year_from, pf.year_to, pf.market
         from paint_colors pc
         join paint_fitments pf on pf.paint_color_id = pc.id
         join manufacturers mf on mf.id = pc.manufacturer_id
         left join vehicle_models vm on vm.id = pf.model_id
        where mf.slug = $1
          and pc.verification_status = 'team_verified'
          and ($2::text is null or vm.slug = $2)
          and ($3::int is null or (pf.year_from is null or pf.year_from <= $3))
          and ($3::int is null or (pf.year_to is null or pf.year_to >= $3))`,
      [input.make, input.model ?? null, input.year ?? null]
    );
    return rows.map((r) => ({ sourceRecordId: r.id, ...r }));
  }

  normalizePaintColor(
    raw: RawPaintRecord,
    manufacturerId: string
  ): Omit<PaintColor, "id" | "source" | "manufacturerId" | "codeNormalized" | "verificationStatus"> & {
    manufacturerId: string;
    sourceRecordId: string;
  } {
    const r = raw as unknown as InternalRow & { sourceRecordId: string };
    return {
      manufacturerId,
      code: r.code,
      auxCode: r.aux_code,
      standardNumber: r.standard_number,
      name: r.name,
      alternativeNames: [],
      baseColor: r.base_color,
      finish: r.finish,
      hex: r.hex,
      sourceUrl: r.source_url,
      sourceRecordId: r.sourceRecordId,
    };
  }

  normalizeFitment(
    raw: RawPaintRecord,
    ids: { paintColorId: string; manufacturerId: string; modelId?: string; variantId?: string }
  ): Omit<PaintFitment, "id" | "source" | "confidence" | "verificationStatus"> & { sourceRecordId: string } {
    const r = raw as unknown as InternalRow & { sourceRecordId: string };
    return {
      paintColorId: ids.paintColorId,
      manufacturerId: ids.manufacturerId,
      modelId: r.model_id,
      variantId: r.variant_id,
      yearFrom: r.year_from,
      yearTo: r.year_to,
      market: r.market,
      sourceUrl: r.source_url,
      sourceRecordId: r.sourceRecordId,
    };
  }
}
