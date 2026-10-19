import { PAINT_MARKET_PALETTES } from "../../data/paint-market-palettes.ts";
import { EUROPE_MARKET_PALETTES } from "../../data/paint-market-europe.ts";
import type { CodeSearchResult } from "../../types/paint.ts";
import { PAINT_MARKETS, matchesPaintMarket, paintMarketName } from "./markets.ts";
import { getPaintSearchMatch } from "./search.ts";
import { paintColourFamilies } from "./colour-families.ts";
import { withPaintSwatchPreview } from "./swatch-preview.ts";

const ALL_MARKET_PALETTES = [...PAINT_MARKET_PALETTES, ...EUROPE_MARKET_PALETTES];

export const MARKET_COLOURS: CodeSearchResult[] = ALL_MARKET_PALETTES.flatMap((palette) => palette.colours.map((colour, index) => ({
  id: `market-${palette.id}-${index}`,
  brand: palette.brand,
  model: palette.model,
  year: palette.modelYear,
  yearFrom: palette.modelYear,
  yearTo: palette.modelYear,
  code: colour.code || "",
  displayCode: colour.code || "Code not published",
  name: colour.name,
  baseColor: colour.baseColor || paintColourFamilies(colour.name),
  finish: colour.finish,
  alternativeNames: colour.alternativeName ? [{ language: palette.countryCode === "JP" ? "jp" : palette.countryCode === "UA" ? "ua" : "en", name: colour.alternativeName }] : [],
  market: paintMarketName(palette.countryCode),
  marketEvidence: {
    countryCode: palette.countryCode,
    sourceTitle: palette.sourceTitle,
    sourceUrl: palette.sourceUrl,
    edition: palette.edition,
    checkedAt: "2026-10-15",
  },
  source: "open-data" as const,
  sourceUrl: palette.sourceUrl,
  sourceId: palette.id,
  verified: false,
  notes: ["Manufacturer-published regional availability; trim and build-date restrictions may apply.", !colour.code ? "This regional source gives a colour name without a paint code." : "", colour.notes || ""].filter(Boolean).join(" "),
}))).map(withPaintSwatchPreview);

export function searchMarketColours(query: string, country = ""): CodeSearchResult[] {
  return MARKET_COLOURS.flatMap((colour) => {
    if (!matchesPaintMarket(colour.marketEvidence!.countryCode, country)) return [];
    const match = query.trim() ? getPaintSearchMatch(colour, query) : { relevanceScore: 0 };
    return match ? [{ ...colour, ...match }] : [];
  }).sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0));
}

export function paintMarketCoverage() {
  return PAINT_MARKETS.map((market) => {
    const palettes = ALL_MARKET_PALETTES.filter((palette) => palette.countryCode === market.code);
    return {
      ...market,
      colourCount: palettes.reduce((total, palette) => total + palette.colours.length, 0),
      sources: palettes.map(({ sourceTitle, sourceUrl, edition, brand, model }) => ({ sourceTitle, sourceUrl, edition, brand, model })),
    };
  });
}
