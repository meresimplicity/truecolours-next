import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { normalizePaintCode } from "@/lib/normalize";

interface SearchRow {
  id: string;
  code: string;
  aux_code: string | null;
  name: string;
  manufacturer_name: string;
  match_type: "code" | "aux_code" | "alias" | "name";
}

const MAX_RESULTS = 25;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("q")?.trim();
  if (!raw) {
    return NextResponse.json({ error: "Query param 'q' is required" }, { status: 400 });
  }
  const normalizedCode = normalizePaintCode(raw);

  // Exact code match — highest confidence, tried first (section 21: "exact first").
  const codeMatches = await query<SearchRow>(
    `select pc.id, pc.code, pc.aux_code, pc.name, mf.name as manufacturer_name, 'code' as match_type
       from paint_colors pc
       join manufacturers mf on mf.id = pc.manufacturer_id
      where pc.code_normalized = $1
      limit $2`,
    [normalizedCode, MAX_RESULTS]
  );
  if (codeMatches.length > 0) {
    return NextResponse.json({ query: raw, matchType: "code", results: codeMatches });
  }

  // Aux code match — normalized the same way, on the fly (no separate column needed).
  const auxMatches = await query<SearchRow>(
    `select pc.id, pc.code, pc.aux_code, pc.name, mf.name as manufacturer_name, 'aux_code' as match_type
       from paint_colors pc
       join manufacturers mf on mf.id = pc.manufacturer_id
      where pc.aux_code is not null
        and upper(regexp_replace(pc.aux_code, '[\\s/_.-]+', '', 'g')) = $1
      limit $2`,
    [normalizedCode, MAX_RESULTS]
  );
  if (auxMatches.length > 0) {
    return NextResponse.json({ query: raw, matchType: "aux_code", results: auxMatches });
  }

  // Alias match — second-cheapest, case-insensitive on the raw (unnormalized) query,
  // since aliases are names ("Nogaro Blue Pearl"), not codes.
  const aliasMatches = await query<SearchRow>(
    `select pc.id, pc.code, pc.aux_code, pc.name, mf.name as manufacturer_name, 'alias' as match_type
       from paint_colors pc
       join manufacturers mf on mf.id = pc.manufacturer_id
       join paint_aliases pa on pa.paint_color_id = pc.id
      where lower(pa.alias) = lower($1)
      limit $2`,
    [raw, MAX_RESULTS]
  );
  if (aliasMatches.length > 0) {
    return NextResponse.json({ query: raw, matchType: "alias", results: aliasMatches });
  }

  // Name search — broadest, tried last (section 21: "name search third").
  const nameMatches = await query<SearchRow>(
    `select pc.id, pc.code, pc.aux_code, pc.name, mf.name as manufacturer_name, 'name' as match_type
       from paint_colors pc
       join manufacturers mf on mf.id = pc.manufacturer_id
      where pc.name ilike $1
      order by pc.name asc
      limit $2`,
    [`%${raw}%`, MAX_RESULTS]
  );

  return NextResponse.json({
    query: raw,
    matchType: nameMatches.length > 0 ? "name" : "none",
    results: nameMatches,
    note: nameMatches.length === 0 ? "No match in our verified database for that code or name." : undefined,
  });
}
