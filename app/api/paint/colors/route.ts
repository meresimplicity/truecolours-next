import { NextRequest, NextResponse } from "next/server";
import { getPaintProvider } from "@/lib/paint/provider";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const brand = searchParams.get("brand");
    const model = searchParams.get("model");
    const yearStr = searchParams.get("year");
    const generation = searchParams.get("generation") || undefined;
    const sortBy = (searchParams.get("sortBy") || "code_asc") as "name_asc" | "name_desc" | "code_asc" | "code_desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "24", 10);
    const market = searchParams.get("market") || "South Africa";

    if (!brand || !model) {
      return NextResponse.json(
        { success: false, error: "Missing required query parameters: 'brand' and 'model'." },
        { status: 400 }
      );
    }

    let parsedYear: number | undefined = undefined;
    if (yearStr && yearStr.toLowerCase() !== "all") {
      const y = parseInt(yearStr, 10);
      if (!isNaN(y) && y >= 1900 && y <= 2100) {
        parsedYear = y;
      }
    }

    const provider = getPaintProvider();
    const paginated = await provider.getColorsPaginated({
      brand: brand.trim(),
      model: model.trim(),
      year: parsedYear,
      generation,
      sortBy,
      page: isNaN(page) ? 1 : page,
      limit: isNaN(limit) ? 24 : limit,
      market: market.trim() || "South Africa",
    });

    return NextResponse.json({
      success: true,
      query: {
        brand: brand.trim(),
        model: model.trim(),
        year: parsedYear ?? "all",
        generation: generation || null,
        sortBy,
        market: market.trim() || "South Africa",
      },
      data: paginated.colors,
      pagination: {
        total: paginated.total,
        page: paginated.page,
        limit: paginated.limit,
        totalPages: paginated.totalPages,
        hasPrev: paginated.hasPrev,
        hasNext: paginated.hasNext,
      },
      count: paginated.colors.length,
    }, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      },
    });
  } catch (error) {
    console.error("[API /api/paint/colors] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve vehicle paint colors." },
      { status: 500 }
    );
  }
}
