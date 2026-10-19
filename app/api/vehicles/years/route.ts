import { NextResponse } from "next/server";
import { vehicleYears } from "@/lib/vehicles/catalogue";
export const dynamic = "force-dynamic";
export function GET() { const data = vehicleYears(); return NextResponse.json({ success: true, data, count: data.length }); }
