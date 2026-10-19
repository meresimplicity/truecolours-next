import { NextResponse } from "next/server";
import { paintMarketCoverage } from "@/lib/paint/market-library";

export function GET() {
  return NextResponse.json({ success: true, data: paintMarketCoverage(), checkedAt: "2026-10-15" });
}
