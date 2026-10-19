import { NextRequest, NextResponse } from "next/server";
import { historicalLibrary, searchHistoricalLibrary } from "@/lib/paint/historical-library";
import { historicalSampleCache, referenceHexForName } from "@/lib/paint/chart-samples";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  try {
    const params = new URL(request.url).searchParams;
    const bookId = params.get("bookId");
    if (bookId) {
      const library = historicalLibrary();
      const book = library.books.find((item) => item.id === bookId);
      if (!book) return NextResponse.json({ success: false, error: "Colour book not found." }, { status: 404 });
      const detail = library.details[book.id];
      const samples = historicalSampleCache();
      return NextResponse.json({ success: true, data: { book, detail: detail ? { ...detail, colours: detail.colours.map((colour) => ({ ...colour, swatchHex: colour.imageUrl ? samples.named[colour.imageUrl]?.swatchHex : referenceHexForName(colour.name), swatchSource: colour.imageUrl ? "chart" : "name-reference" })) } : null } });
    }
    const era = params.get("era") || "all";
    const year = params.has("year") ? Number(params.get("year")) : undefined;
    const page = params.has("page") ? Number(params.get("page")) : 1;
    if (!["all", "antique", "vintage", "classic", "modern"].includes(era) || (year !== undefined && (!Number.isInteger(year) || year < 1900 || year > 2100)) || !Number.isInteger(page) || page < 1) {
      return NextResponse.json({ success: false, error: "Select a valid era, year and page." }, { status: 400 });
    }
    return NextResponse.json({ success: true, data: searchHistoricalLibrary({ era, year, make: params.get("make")?.trim(), query: (params.get("q") || "").slice(0, 120), page }) });
  } catch (error) {
    console.error("[Historical paint library]", error);
    return NextResponse.json({ success: false, error: "The colour library is temporarily unavailable. Please try again." }, { status: 503 });
  }
}
