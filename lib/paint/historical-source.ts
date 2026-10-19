export const AUTO_COLOR_LIBRARY_ORIGIN = "https://www.autocolorlibrary.com";

export interface HistoricalColour {
  name: string;
  manufacturerCode?: string;
  chipReference?: string;
  imageUrl?: string;
  swatchHex?: string;
  swatchSource?: "chart" | "name-reference";
}

export interface HistoricalBook {
  id: string;
  year: number;
  make: string;
  era: "antique" | "vintage" | "classic" | "modern";
  sourceUrl: string;
}

export interface HistoricalBookDetail {
  id: string;
  sourceUrl: string;
  charts: string[];
  colours: HistoricalColour[];
}

export interface HistoricalBookSummary extends HistoricalBook {
  colourCount: number;
  chartCount: number;
  previewUrl?: string;
}

export function decodeEntities(value: string): string {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (_, entity: string) => {
    if (entity.startsWith("#")) {
      const point = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return point <= 0x10ffff ? String.fromCodePoint(point) : "";
    }
    return ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " } as Record<string, string>)[entity.toLowerCase()];
  });
}

export function sitemapLocations(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g), (match) => decodeEntities(match[1].trim()));
}

const MAKE_NAMES: Record<string, string> = {
  bmw: "BMW", amc: "AMC", gm: "GM", gmc: "GMC", reo: "REO", mg: "MG", vw: "Volkswagen",
  ahmg: "Austin-Healey / MG", blmc: "British Leyland",
  desoto: "DeSoto", grahampaige: "Graham-Paige", piercearrow: "Pierce-Arrow",
  mercedesbenz: "Mercedes-Benz", "mercedes-benz": "Mercedes-Benz", "alfa-romeo": "Alfa Romeo",
  "rolls-royce": "Rolls-Royce", "aston-martin": "Aston Martin", "land-rover": "Land Rover",
  "austin-healey": "Austin-Healey", "gm-canada": "GM Canada", "international-harvester": "International Harvester",
  alfaromeo: "Alfa Romeo", arondesimca: "Aronde Simca", autocar: "Autocar", "auto-car": "Autocar",
  gmctruck: "GMC Truck", highwaytrailer: "Highway Trailer", corvair95: "Corvair 95",
  studabaker: "Studebaker", "lincon-interior": "Lincoln Interior", "mac-truck": "Mack Truck",
  fruhauf: "Fruehauf",
};

export function historicalBookFromUrl(sourceUrl: string): HistoricalBook | null {
  const url = new URL(sourceUrl);
  if (url.origin !== AUTO_COLOR_LIBRARY_ORIGIN) return null;
  const match = url.pathname.match(/^\/pages\/(\d{4})-(.+)$/);
  if (!match) return null;
  const year = Number(match[1]);
  if (year < 1900 || year > 2100) return null;
  const makeSlug = match[2].replace(/-\d+$/, "").replace(/-?(?:car-colors|car-colours)$/, "").replace(/-colors$/, "").replace(/-+$/, "");
  if (!makeSlug || /^\d+$/.test(makeSlug) || /(?:test|copy-of)/.test(makeSlug)) return null;
  const make = MAKE_NAMES[makeSlug] || makeSlug.split("-").map((part) => MAKE_NAMES[part] || part[0].toUpperCase() + part.slice(1)).join(" ");
  return { id: `${year}-${makeSlug}`, year, make, era: year < 1930 ? "antique" : year < 1950 ? "vintage" : year < 1978 ? "classic" : "modern", sourceUrl };
}

function safeChartUrl(value: string): string | undefined {
  try {
    const url = new URL(decodeEntities(value), AUTO_COLOR_LIBRARY_ORIGIN);
    if (url.protocol === "https:" && url.hostname === "cdn.shopify.com" && ["/s/files/1/0040/1312/9763/", "/s/files/1/0271/7931/9375/"].some((prefix) => url.pathname.startsWith(prefix))) return url.href;
  } catch { /* Invalid source image. */ }
}

export function parseHistoricalBook(html: string, book: HistoricalBook): HistoricalBookDetail {
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? "";
  const colours: HistoricalColour[] = [];
  const ordering = main.match(/<ul\b[^>]*class=["'][^"']*\bcarsBlocks\b[^"']*["'][^>]*>([\s\S]*?)<\/ul>/i)?.[1] ?? "";
  for (const row of ordering.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    // The source's ordering cards separate chip reference, colour name and
    // manufacturer code with <br>. Keep these identifiers distinct.
    const fields = row[1].split(/<br\s*\/?\s*>/i).map((part) => decodeEntities(part.replace(/<[^>]+>/g, "")).trim()).filter(Boolean);
    if (fields.length < 2) continue;
    const [chipReference, name, manufacturerCode] = fields;
    if (!/\d/.test(chipReference) || !/[a-z]/i.test(name)) continue;
    const image = row[1].match(/<img\b[^>]*src=["']([^"']+)["']/i)?.[1];
    colours.push({ name, chipReference, ...(manufacturerCode ? { manufacturerCode } : {}), ...(image && safeChartUrl(image) ? { imageUrl: safeChartUrl(image) } : {}) });
  }
  const withoutOrdering = main.replace(/<ul\b[^>]*class=["'][^"']*\bcarsBlocks\b[^"']*["'][^>]*>[\s\S]*?<\/ul>/gi, "");
  const charts = [...new Set(Array.from(withoutOrdering.matchAll(/<img\b[^>]*src=["']([^"']+)["']/gi), (m) => safeChartUrl(m[1])).filter((url): url is string => Boolean(url)))];
  return { id: book.id, sourceUrl: book.sourceUrl, charts, colours };
}
