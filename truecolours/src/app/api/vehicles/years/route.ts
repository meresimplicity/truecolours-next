import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface YearRow {
  year: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const makeSlug = searchParams.get("make");
  const modelSlug = searchParams.get("model");
  if (!makeSlug || !modelSlug) {
    return NextResponse.json({ error: "Query params 'make' and 'model' are required" }, { status: 400 });
  }

  const confirmed = await query<YearRow>(
    `select distinct vmy.year
       from vehicle_model_years vmy
       join vehicle_models vm on vm.id = vmy.model_id
       join manufacturers mf on mf.id = vm.manufacturer_id
      where mf.slug = $1 and vm.slug = $2
      order by vmy.year desc`,
    [makeSlug, modelSlug]
  );

  if (confirmed.length > 0) {
    return NextResponse.json({
      years: confirmed.map((r) => r.year),
      source: "vehicle_model_years",
    });
  }

  // Fallback: derive candidate years from whatever paint fitments we've
  // already imported for this model. This is a weaker signal — it says
  // "we have paint data referencing this year", not "this model was
  // definitely made this year" — so it's labelled distinctly rather than
  // merged silently into the confirmed list.
  const fromPaint = await query<YearRow>(
    `select distinct coalesce(pf.year_from, pf.year_to) as year
       from paint_fitments pf
       join vehicle_models vm on vm.id = pf.model_id
       join manufacturers mf on mf.id = vm.manufacturer_id
      where mf.slug = $1 and vm.slug = $2
        and coalesce(pf.year_from, pf.year_to) is not null
      order by year desc`,
    [makeSlug, modelSlug]
  );

  return NextResponse.json({
    years: fromPaint.map((r) => r.year),
    source: "derived_from_paint_fitments",
    note:
      fromPaint.length === 0
        ? "No confirmed model years and no paint fitment years yet — this vehicle isn't in our verified database."
        : "These years come from imported paint records, not a confirmed production-year source, for this model.",
  });
}
