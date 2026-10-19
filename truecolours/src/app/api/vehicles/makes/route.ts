import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface MakeRow {
  id: string;
  name: string;
  slug: string;
  country: string | null;
}

export async function GET() {
  const rows = await query<MakeRow>(
    `select id, name, slug, country
       from manufacturers
      order by name asc`
  );
  return NextResponse.json({ makes: rows });
}
