import { NextRequest, NextResponse } from "next/server";
import { vehicleMakes } from "@/lib/vehicles/catalogue";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) { const year = Number(new URL(request.url).searchParams.get("year")); if (!Number.isInteger(year)) return NextResponse.json({ success: false, error: "A valid year is required." }, { status: 400 }); const data = vehicleMakes(year); return NextResponse.json({ success: true, data, count: data.length }); }
