import { NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import type { PaintSearchResult } from "@/types/paint";

interface ResultRow {
  id: string;
  code: string;
  aux_code: string | null;
  standard_number: string | null;
  name: string;
  base_color: string | null;
  finish: string | null;
  hex: string | null;
  source_slug: string;
  source_url: string | null;
  verification_status: string;
  fitment_year_from: number | null;
  fitment_year_to: number | null;
  fitment_market: string | null;
  fitment_confidence: string; // numeric comes back as string from pg
  fitment_verification_status: string;
}

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 48;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const make = searchParams.get("make");
  if (!make) {
    return NextResponse.json({ error: "Query param 'make' is required" }, { status: 400 });
  }
  const model = searchParams.get("model") ?? undefined;
  const variant = searchParams.get("variant") ?? undefined;
  const year = searchParams.get("year") ? Number(searchParams.get("year")) : undefined;
  const market = searchParams.get("market") ?? undefined;
  const verifiedOnly = searchParams.get("verifiedOnly") === "true";
  const baseColor = searchParams.get("baseColor") ?? undefined;
  const finish = searchParams.get("finish") ?? undefined;
  const sort = searchParams.get("sort") === "code_asc" ? "code_asc" : "name_asc";
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, Number(searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE)));

  const makeRow = await queryOne<{ id: string; name: string }>(`select id, name from manufacturers where slug = $1`, [
    make,
  ]);
  if (!makeRow) {
    return NextResponse.json({
      vehicle: { make },
      results: [],
      page,
      pageSize,
      total: 0,
      note: "This manufacturer is not yet in our verified database.",
    } satisfies PaintSearchResult & { note: string });
  }

  const conditions = ["pc.manufacturer_id = $1"];
  const params: unknown[] = [makeRow.id];

  if (model) {
    conditions.push(`vm.slug = $${params.length + 1}`);
    params.push(model);
  }
  if (variant) {
    conditions.push(`vv.slug = $${params.length + 1}`);
    params.push(variant);
  }
  if (year !== undefined) {
    conditions.push(
      `((pf.year_from is null or pf.year_from <= $${params.length + 1}) and (pf.year_to is null or pf.year_to >= $${
        params.length + 1
      }))`
    );
    params.push(year);
  }
  if (market) {
    conditions.push(`(pf.market is null or pf.market = $${params.length + 1})`);
    params.push(market);
  }
  if (verifiedOnly) {
    conditions.push(`pc.verification_status in ('source_verified', 'team_verified')`);
  }
  if (baseColor) {
    conditions.push(`lower(pc.base_color) = lower($${params.length + 1})`);
    params.push(baseColor);
  }
  if (finish) {
    conditions.push(`lower(pc.finish) = lower($${params.length + 1})`);
    params.push(finish);
  }

  const whereClause = conditions.join(" and ");
  const orderClause = sort === "code_asc" ? "pc.code asc" : "pc.name asc";

  const totalRow = await queryOne<{ count: string }>(
    `select count(distinct pc.id) as count
       from paint_colors pc
       join paint_fitments pf on pf.paint_color_id = pc.id
       left join vehicle_models vm on vm.id = pf.model_id
       left join vehicle_variants vv on vv.id = pf.variant_id
      where ${whereClause}`,
    params
  );
  const total = Number(totalRow?.count ?? 0);

  const offset = (page - 1) * pageSize;
  const rows = await query<ResultRow>(
    `select distinct on (pc.id)
            pc.id, pc.code, pc.aux_code, pc.standard_number, pc.name,
            pc.base_color, pc.finish, pc.hex, pc.verification_status,
            ds.slug as source_slug, pc.source_url,
            pf.year_from as fitment_year_from, pf.year_to as fitment_year_to,
            pf.market as fitment_market, pf.confidence as fitment_confidence,
            pf.verification_status as fitment_verification_status
       from paint_colors pc
       join paint_fitments pf on pf.paint_color_id = pc.id
       join data_sources ds on ds.id = pc.source_id
       left join vehicle_models vm on vm.id = pf.model_id
       left join vehicle_variants vv on vv.id = pf.variant_id
      where ${whereClause}
      order by pc.id, ${orderClause}
      limit $${params.length + 1} offset $${params.length + 2}`,
    [...params, pageSize, offset]
  );

  const results = rows.map((r) => ({
    id: r.id,
    manufacturerId: makeRow.id,
    code: r.code,
    codeNormalized: "", // not needed in API response; present in DB only
    auxCode: r.aux_code,
    standardNumber: r.standard_number,
    name: r.name,
    alternativeNames: [],
    baseColor: r.base_color,
    finish: r.finish,
    hex: r.hex,
    source: { id: "", slug: r.source_slug },
    sourceUrl: r.source_url,
    verificationStatus: r.verification_status as any,
    fitment: {
      yearFrom: r.fitment_year_from,
      yearTo: r.fitment_year_to,
      market: r.fitment_market,
      confidence: Number(r.fitment_confidence),
      verificationStatus: r.fitment_verification_status as any,
    },
  }));

  const body: PaintSearchResult & { note?: string } = {
    vehicle: { make: makeRow.name, model, variant, year },
    results,
    page,
    pageSize,
    total,
  };
  if (results.length === 0) {
    body.note = "We don't currently have a verified paint record for this vehicle. Check the paint-code label on your vehicle, or contact TRUECOLOURS.";
  }

  return NextResponse.json(body);
}
