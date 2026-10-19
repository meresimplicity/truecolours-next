/** Sales markets with an indexed, manufacturer-published palette. */
export const PAINT_MARKETS = [
  { code: "AU", name: "Australia", aliases: ["australian"] },
  { code: "AT", name: "Austria", aliases: ["austrian", "osterreich"] },
  { code: "CA", name: "Canada", aliases: ["canadian"] },
  { code: "FR", name: "France", aliases: ["french"] },
  { code: "DE", name: "Germany", aliases: ["german", "deutschland"] },
  { code: "IN", name: "India", aliases: ["indian"] },
  { code: "IT", name: "Italy", aliases: ["italian", "italia"] },
  { code: "JP", name: "Japan", aliases: ["japanese"] },
  { code: "NL", name: "Netherlands", aliases: ["dutch", "holland"] },
  { code: "ZA", name: "South Africa", aliases: ["south african"] },
  { code: "UA", name: "Ukraine", aliases: ["ukrainian"] },
  { code: "GB", name: "United Kingdom", aliases: ["uk", "britain"] },
  { code: "US", name: "United States", aliases: ["usa", "america", "american", "united states of america"] },
] as const;

export const PAINT_REGIONS = [
  { code: "AFRICA", name: "Africa", countries: ["ZA"], aliases: ["african"] },
  { code: "ASIA", name: "Asia", countries: ["IN", "JP"], aliases: ["asian"] },
  { code: "EUROPE", name: "Europe", countries: ["AT", "FR", "DE", "IT", "NL", "UA", "GB"], aliases: ["european"] },
  { code: "NORTH_AMERICA", name: "North America", countries: ["CA", "US"], aliases: ["north american"] },
  { code: "OCEANIA", name: "Oceania", countries: ["AU"], aliases: ["oceanian"] },
] as const;

export function paintMarketName(code?: string) {
  return PAINT_MARKETS.find((market) => market.code === code)?.name || PAINT_REGIONS.find((region) => region.code === code)?.name;
}

export function matchesPaintMarket(countryCode: string, scope: string) {
  if (!scope || countryCode === scope) return true;
  const region = PAINT_REGIONS.find((item) => item.code === scope);
  return region ? (region.countries as readonly string[]).includes(countryCode) : false;
}

/** Country words can be typed into the universal search as well as selected. */
export function resolvePaintMarketQuery(query: string, country = "") {
  const normalizedCountry = country.trim().toUpperCase();
  const candidates = [...PAINT_MARKETS, ...PAINT_REGIONS].flatMap((market) => [market.name, ...market.aliases].map((name) => ({ market, name }))).sort((a, b) => b.name.length - a.name.length);
  for (const { market, name } of candidates) {
    const pattern = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if ((!normalizedCountry || normalizedCountry === market.code || matchesPaintMarket(market.code, normalizedCountry)) && pattern.test(query)) {
      let remaining = query.replace(pattern, " ");
      for (const region of PAINT_REGIONS) {
        if (region.code === market.code || (region.countries as readonly string[]).includes(market.code)) {
          for (const word of [region.name, ...region.aliases]) remaining = remaining.replace(new RegExp(`\\b${word}\\b`, "gi"), " ");
        }
      }
      return { country: market.code, query: remaining.replace(/\s+/g, " ").trim() };
    }
  }
  return { country: normalizedCountry, query: query.trim() };
}
