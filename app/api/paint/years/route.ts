import { NextRequest, NextResponse } from "next/server";
import { getPaintProvider } from "@/lib/paint/provider";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");
    const model = searchParams.get("model");

    if (!brand || !model) {
      return NextResponse.json(
        { success: false, error: "Missing required 'brand' and/or 'model' query parameters." },
        { status: 400 }
      );
    }

    const provider = getPaintProvider();
    const years = await provider.getYears(brand.trim(), model.trim());

    return NextResponse.json({
      success: true,
      brand: brand.trim(),
      model: model.trim(),
      data: years,
      count: years.length,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("[API /api/paint/years] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve vehicle years." },
      { status: 500 }
    );
  }
}
