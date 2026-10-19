import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface ModelRow {
  id: string;
  name: string;
  slug: string;
  body_style: string | null;
  vehicle_type: string | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const makeSlug = searchParams.get("make");
  if (!makeSlug) {
    return NextResponse.json({ error: "Query param 'make' is required" }, { status: 400 });
  }

  const rows = await query<ModelRow>(
    `select vm.id, vm.name, vm.slug, vm.body_style, vm.vehicle_type
       from vehicle_models vm
       join manufacturers mf on mf.id = vm.manufacturer_id
      where mf.slug = $1
      order by vm.name asc`,
    [makeSlug]
  );

  if (rows.length === 0) {
    return NextResponse.json({ models: [], note: "No models catalogued yet for this make." });
  }
  return NextResponse.json({ models: rows });
}
