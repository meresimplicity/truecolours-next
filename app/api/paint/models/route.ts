import { NextRequest, NextResponse } from "next/server";
import { getPaintProvider } from "@/lib/paint/provider";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");

    if (!brand || !brand.trim()) {
      return NextResponse.json(
        { success: false, error: "Missing required 'brand' query parameter." },
        { status: 400 }
      );
    }

    const provider = getPaintProvider();
    const models = await provider.getModels(brand.trim());

    return NextResponse.json({
      success: true,
      brand: brand.trim(),
      data: models,
      count: models.length,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("[API /api/paint/models] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve vehicle models." },
      { status: 500 }
    );
  }
}
