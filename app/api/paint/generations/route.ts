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
        { success: false, error: "Missing required query parameters: 'brand' and 'model'." },
        { status: 400 }
      );
    }

    const provider = getPaintProvider();
    const generations = await provider.getGenerations(brand.trim(), model.trim());

    return NextResponse.json({
      success: true,
      data: generations,
      count: generations.length,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
  } catch (error) {
    console.error("[API /api/paint/generations] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve vehicle generations." },
      { status: 500 }
    );
  }
}
