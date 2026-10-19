import { NextRequest, NextResponse } from "next/server";
import { vehicleModels } from "@/lib/vehicles/catalogue";
export const dynamic = "force-dynamic";
export function GET(request: NextRequest) { const params = new URL(request.url).searchParams; const year = Number(params.get("year")); const make = params.get("make")?.trim(); if (!Number.isInteger(year) || !make) return NextResponse.json({ success: false, error: "A valid year and make are required." }, { status: 400 }); const data = vehicleModels(year, make); return NextResponse.json({ success: true, data, count: data.length }); }
