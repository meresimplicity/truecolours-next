import { NextRequest, NextResponse } from "next/server";
import { getPaintProvider } from "@/lib/paint/provider";
import { searchHistoricalLibrary } from "@/lib/paint/historical-library";
import { paginatePaintSearch } from "@/lib/paint/search";
import { searchMarketColours } from "@/lib/paint/market-library";
import { PAINT_MARKETS, PAINT_REGIONS, paintMarketName, resolvePaintMarketQuery } from "@/lib/paint/markets";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawQuery = (searchParams.get("q") || searchParams.get("query") || "").trim();
    const { query, country } = resolvePaintMarketQuery(rawQuery, searchParams.get("country") || "");

    if (rawQuery.length > 120 || (country && ![...PAINT_MARKETS, ...PAINT_REGIONS].some((market) => market.code === country))) {
      return NextResponse.json({ success: false, error: "Choose a supported country and a search of up to 120 characters." }, { status: 400 });
    }

    if (!query && !country) {
      return NextResponse.json(
        { success: false, error: "Missing required search query parameter 'q'." },
        { status: 400 }
      );
    }

    const provider = getPaintProvider();
    const regional = provider.withIndicativeSwatches(searchMarketColours(query, country));
    // Untagged catalogue records never imply a documented national palette.
    const results = country ? regional : [...regional, ...await provider.searchByCode(query)]
      .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
    const { data, pagination } = paginatePaintSearch(results, {
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 50),
      sortBy: searchParams.get("sortBy") || "relevance",
    });
    const historical = country ? null : searchHistoricalLibrary({ query, page: Number(searchParams.get("historyPage") || 1) });

    return NextResponse.json({
      success: true,
      query: rawQuery,
      country,
      countryName: paintMarketName(country),
      data,
      count: results.length,
      pagination,
      historicalBooks: historical?.books ?? [],
      historicalBookCount: historical?.pagination.total ?? 0,
      historicalPagination: historical?.pagination ?? { total: 0, page: 1, totalPages: 1 },
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    console.error("[API /api/paint/search] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to perform paint search." },
      { status: 500 }
    );
  }
}
