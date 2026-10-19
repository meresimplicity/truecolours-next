import { NextRequest, NextResponse } from "next/server";
import { historicalLibrary } from "@/lib/paint/historical-library";
import { samplesForChart } from "@/lib/paint/chart-samples";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams;
  const bookId = params.get("bookId");
  const chartIndex = Number(params.get("chartIndex"));
  if (!bookId || !params.has("chartIndex") || !Number.isInteger(chartIndex) || chartIndex < 0) return NextResponse.json({ success: false, error: "Select a colour book and chart." }, { status: 400 });
  const detail = historicalLibrary().details[bookId];
  const chart = detail?.charts[chartIndex];
  if (!chart) return NextResponse.json({ success: false, error: "Colour chart not found." }, { status: 404 });
  try {
    const samples = await samplesForChart(chart, chartIndex);
    return NextResponse.json({ success: true, data: samples }, { headers: { "Cache-Control": "public, max-age=86400" } });
  } catch (error) {
    console.error("[Original colour samples]", error);
    return NextResponse.json({ success: false, error: "This page could not be converted. Its original chart is still available." }, { status: 503 });
  }
}
