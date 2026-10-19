/**
 * Factual regional colour listings checked 15 October 2026.
 * An edition date is not automatically a vehicle model year. Codes are omitted
 * when the regional source publishes only a name. See docs/paint-market-research.md.
 */
export interface MarketPalette {
  id: string;
  countryCode: string;
  brand: string;
  model: string;
  edition: string;
  modelYear?: number;
  sourceTitle: string;
  sourceUrl: string;
  colours: { code?: string; name: string; finish?: string; alternativeName?: string; baseColor?: string; notes?: string }[];
}

export const PAINT_MARKET_PALETTES: MarketPalette[] = [
  {
    id: "us-honda-hrv-2026", countryCode: "US", brand: "Honda", model: "HR-V", edition: "2026 model year", modelYear: 2026,
    sourceTitle: "American Honda — 2026 HR-V, complete exterior colours and trim table",
    sourceUrl: "https://hondanews.com/en-US/honda-automobiles/releases/release-6f8b202ddb1c7f26ecd92774bb014b0c-2026-honda-hr-v-specifications-and-features",
    colours: [
      { code: "NH-932M", name: "Solar Silver Metallic", finish: "Metallic" }, { code: "NH-731P", name: "Crystal Black Pearl", finish: "Pearl" },
      { code: "R-81", name: "Milano Red", notes: "Sport trim in this edition." }, { code: "NH-797M", name: "Modern Steel Metallic", finish: "Metallic" },
      { code: "NH-883P", name: "Platinum White Pearl", finish: "Pearl" }, { code: "B-637P", name: "Boost Blue Pearl", finish: "Pearl", notes: "Sport trim in this edition." },
      { code: "G-553P", name: "Nordic Forest Pearl", finish: "Pearl" }, { code: "NH-912P", name: "Urban Gray Pearl", finish: "Pearl" },
    ],
  },
  {
    id: "us-honda-civic-sedan-2026", countryCode: "US", brand: "Honda", model: "Civic Sedan", edition: "2026 model year", modelYear: 2026,
    sourceTitle: "American Honda — 2026 Civic Sedan, complete exterior colours and trim table",
    sourceUrl: "https://hondanews.com/en-US/honda-automobiles/releases/release-395467bf3b280929feeb74845f0060f5-2026-honda-civic-sedan-specifications-features",
    colours: [
      { code: "NH-932M", name: "Solar Silver Metallic", finish: "Metallic" }, { code: "NH-904M", name: "Meteorite Gray Metallic", finish: "Metallic" },
      { code: "NH-731P", name: "Crystal Black Pearl", finish: "Pearl" }, { code: "B-645P", name: "Blue Lagoon Pearl", finish: "Pearl" },
      { code: "R-513", name: "Rallye Red" }, { code: "NH-883P", name: "Platinum White Pearl", finish: "Pearl" },
      { code: "NH-912P", name: "Urban Gray Pearl", finish: "Pearl", notes: "Not listed for LX in this edition." },
    ],
  },
  {
    id: "us-honda-accord-2023", countryCode: "US", brand: "Honda", model: "Accord", edition: "2023 model year", modelYear: 2023,
    sourceTitle: "American Honda — 2023 Accord, complete exterior colours and trim table",
    sourceUrl: "https://hondanews.com/en-US/honda-automobiles/releases/release-4e58b4e0fcd795affa5685a66a387e28-2023-honda-accord-specifications-features",
    colours: [
      { code: "NH-830M", name: "Lunar Silver Metallic", finish: "Metallic" }, { code: "NH-731P", name: "Crystal Black Pearl", finish: "Pearl" },
      { code: "NH-904M", name: "Meteorite Gray Metallic", finish: "Metallic" }, { code: "B-640M", name: "Canyon River Blue Metallic", finish: "Metallic" },
      { code: "NH-883P", name: "Platinum White Pearl", finish: "Pearl" }, { code: "B-575P", name: "Still Night Pearl", finish: "Pearl" },
      { code: "NH-912P", name: "Urban Gray Pearl", finish: "Pearl" }, { code: "R-569M", name: "Radiant Red Metallic", finish: "Metallic" },
    ],
  },
  {
    id: "de-toyota-corolla-2026-09", countryCode: "DE", brand: "Toyota", model: "Corolla", edition: "September 2026 price list",
    sourceTitle: "Toyota Germany — Corolla price list, paint and trim availability (p. 18)",
    sourceUrl: "https://broschueren.toyota.de/de/profiles/9c59aae1a25d-toyota/editions/corolla-preisliste",
    colours: [
      { code: "040", name: "Super White", finish: "Solid" }, { code: "089", name: "Platinum-White Pearl", finish: "Pearl" },
      { code: "1J6", name: "Precious Silver Metallic", finish: "Metallic" }, { code: "1M2", name: "Ash Grey Metallic", finish: "Metallic" },
      { code: "209", name: "Black Mica", finish: "Mica" }, { code: "3U5", name: "Emotional Red Metallic", finish: "Metallic" },
      { code: "2PU", name: "Platinum White Pearl / Black", finish: "Pearl" }, { code: "2RD", name: "Precious Silver / Black" },
      { code: "M52", name: "Ash Grey Metallic / Black", finish: "Metallic" }, { code: "2SZ", name: "Emotional Red Metallic / Black", finish: "Metallic" },
      { code: "MB1", name: "Boreal Blue Metallic / Black", finish: "Metallic" },
    ],
  },
  {
    id: "us-ford-mustang-2025", countryCode: "US", brand: "Ford", model: "Mustang", edition: "2025 model year", modelYear: 2025,
    sourceTitle: "Ford USA — 2025 Mustang order guide, exterior colour tables (pp. 28–30)",
    sourceUrl: "https://www.fromtheroad.ford.com/content/dam/fordmediasite/us/en/library/2025/order-guides/2025_Ford_Mustang_Order_Guide.pdf",
    colours: [
      { code: "AE", name: "Grabber Blue Metallic", finish: "Metallic" },
      { code: "B7", name: "Intense Lime Yellow Metallic", finish: "Metallic" },
      { code: "G1", name: "Shadow Black" }, { code: "JS", name: "Iconic Silver Metallic", finish: "Metallic" },
      { code: "M7", name: "Carbonized Gray Metallic", finish: "Metallic" }, { code: "K1", name: "Vapor Blue Metallic", finish: "Metallic" },
      { code: "DT", name: "Molten Magenta Metallic Tri-coat", finish: "Metallic Tri-coat" },
      { code: "PQ", name: "Race Red" }, { code: "YZ", name: "Oxford White" },
      { code: "E1", name: "Blue Ember Metallic", finish: "Metallic", notes: "Listed for Dark Horse; consult the source for trim availability." },
      { code: "N4", name: "Wimbledon White", notes: "Listed for the 60th Anniversary Package; consult the source for availability." },
    ],
  },
  {
    id: "us-toyota-gr-corolla-2025", countryCode: "US", brand: "Toyota", model: "GR Corolla", edition: "2025 model year", modelYear: 2025,
    sourceTitle: "Toyota USA — 2025 GR Corolla launch, grade-specific exterior colours",
    sourceUrl: "https://pressroom.toyota.com/ready-to-hit-the-streets-the-2025-toyota-gr-corolla-adds-new-direct-automatic-transmission-option-and-more/",
    colours: [{ name: "Ice Cap" }, { name: "Black" }, { name: "Supersonic Red" }, { name: "Heavy Metal", notes: "Listed for Premium and Premium Plus grades." }],
  },
  {
    id: "gb-toyota-yaris-march", countryCode: "GB", brand: "Toyota", model: "Yaris", edition: "March brochure (edition undated)",
    sourceTitle: "Toyota UK — Yaris brochure, monotone and bi-tone colour choices (pp. 14–15)",
    sourceUrl: "https://www.toyota.co.uk/content/dam/toyota/nmsc/united-kingdom/brochure-downloads/yaris-march.pdf",
    colours: [
      { code: "040", name: "Pure White", finish: "Solid" }, { code: "089", name: "Platinum White Pearl", finish: "Pearl" },
      { code: "1L0", name: "Silver Metallic", finish: "Metallic" }, { code: "1K6", name: "Ash Grey", finish: "Metallic", notes: "GR SPORT only in this edition." },
      { code: "1G3", name: "Decuma Grey", finish: "Metallic" }, { code: "209", name: "Eclipse Black", finish: "Metallic" },
      { code: "6X1", name: "Titan Bronze", finish: "Metallic" }, { code: "3U5", name: "Scarlet Flare", finish: "Pearl" },
      { code: "8W7", name: "Galactic Blue", finish: "Metallic" }, { code: "2PU", name: "Platinum White Pearl Bi-tone", finish: "Pearl" },
      { code: "2SZ", name: "Scarlet Flare Bi-tone", finish: "Pearl" }, { code: "2RZ", name: "Ash Grey Bi-tone", finish: "Metallic" },
    ],
  },
  {
    id: "au-toyota-gr-corolla-2025", countryCode: "AU", brand: "Toyota", model: "GR Corolla", edition: "January 2025 brochure",
    sourceTitle: "Toyota Australia — GR Corolla, colour and trim guide (p. 24)",
    sourceUrl: "https://www.toyota.com.au/-/media/toyota/main-site/vehicle-hubs/gr-corolla/files/20250124_gto008687_gr-corolla_brochure.pdf",
    colours: [{ code: "040", name: "Glacier White" }, { code: "1L5", name: "Liquid Mercury" }, { code: "202", name: "Ebony" }, { code: "3U5", name: "Feverish Red" }],
  },
  {
    id: "au-toyota-hilux-2025", countryCode: "AU", brand: "Toyota", model: "HiLux", edition: "April 2025 brochure",
    sourceTitle: "Toyota Australia — HiLux, colour and trim guide (p. 25)",
    sourceUrl: "https://cdn.mattaki.com/toyota/static-assets/vehicles/brochures/hilux_ebrochure.pdf",
    colours: [
      { code: "040", name: "Glacier White" }, { code: "089", name: "Frosted White" }, { code: "1L0", name: "Stunning Silver" },
      { code: "1G3", name: "Graphite" }, { code: "218", name: "Eclipse Black" }, { code: "3U5", name: "Feverish Red" },
      { code: "6X1", name: "Oxide Bronze" }, { code: "8X8", name: "Saturn Blue" },
      { code: "2UE", name: "Glacier White with black roof" }, { code: "2PS", name: "Frosted White with black roof" }, { code: "2SC", name: "Feverish Red with black roof" },
    ],
  },
  {
    id: "ca-toyota-corolla-2020", countryCode: "CA", brand: "Toyota", model: "Corolla", edition: "2020 model year", modelYear: 2020,
    sourceTitle: "Toyota Canada — 2020 Corolla & Corolla Hybrid, exterior colours (p. 14)",
    sourceUrl: "https://media.toyota.ca/content/dam/media-toyota/general/unassigned/20145/20-corolla-brochure-en.pdf",
    colours: [
      { code: "040", name: "Super White" }, { code: "070", name: "Blizzard Pearl", finish: "Pearl" },
      { code: "1F7", name: "Classic Silver Metallic", finish: "Metallic" }, { code: "1K3", name: "Celestite" },
      { code: "209", name: "Black Sand Pearl", finish: "Pearl" }, { code: "3R3", name: "Barcelona Red Metallic", finish: "Metallic" },
      { code: "8X8", name: "Blue Print" }, { code: "8W7", name: "Blue Crush Metallic", finish: "Metallic" },
    ],
  },
  {
    id: "jp-toyota-gr-corolla-faq", countryCode: "JP", brand: "Toyota", model: "GR Corolla", edition: "Manufacturer colour FAQ, checked October 2026",
    sourceTitle: "Toyota Japan — GR Corolla body paint names and manufacturer codes",
    sourceUrl: "https://toyota.jp/faq/show/10124.html",
    colours: [
      { code: "040", name: "Super White II", alternativeName: "スーパーホワイトⅡ" },
      { code: "089", name: "Platinum White Pearl Mica", alternativeName: "プラチナホワイトパールマイカ", finish: "Pearl Mica" },
      { code: "1L5", name: "Precious Metal", alternativeName: "プレシャスメタル" },
      { code: "219", name: "Precious Black Pearl", alternativeName: "プレシャスブラックパール", finish: "Pearl" },
      { code: "3U5", name: "Emotional Red II", alternativeName: "エモーショナルレッドⅡ" },
    ],
  },
  {
    id: "za-toyota-corolla-cross-2023", countryCode: "ZA", brand: "Toyota", model: "Corolla Cross", edition: "2023 specification sheet",
    sourceTitle: "Toyota South Africa — Corolla Cross specification sheet, colour codes (p. 2)",
    sourceUrl: "https://media.cdntoyota.co.za/toyotacms/attachments/cle6tays400zi0pqlifwad22u-corolla-cross-spec-sheet-2023.pdf",
    colours: [
      { code: "040", name: "Glacier White" }, { code: "089", name: "Platinum White Pearl", finish: "Pearl" },
      { code: "1D6", name: "Chromium Silver" }, { code: "1K3", name: "Celestite Grey Metallic", finish: "Metallic" },
      { code: "3T6", name: "Arizona Red" }, { code: "8X2", name: "Cosmic Blue" }, { code: "218", name: "Attitude Black" },
      { code: "2VX", name: "Arizona Red Bi-tone", notes: "GR-S CVT only in this edition." },
      { code: "2QY", name: "Chromium Silver Bi-tone", notes: "GR-S CVT only in this edition." },
      { code: "2UE", name: "Glacier White Bi-tone", notes: "GR-S CVT only in this edition." },
    ],
  },
  {
    id: "at-mazda3-2025", countryCode: "AT", brand: "Mazda", model: "Mazda3", edition: "2025 model year", modelYear: 2025,
    sourceTitle: "Mazda Austria — January 2025 price list, Mazda3 paint options (p. 19)",
    sourceUrl: "https://media-assets.mazda.eu/raw/upload/mazdaat/globalassets/01-global/downloads/preisliste/2025/01_25_nova/mazda_gesamtpreisliste_01_2025.pdf",
    colours: [
      { code: "A4D", name: "Arctic White" }, { code: "25D", name: "Snowflake White" }, { code: "47A", name: "Ceramic White" },
      { code: "48T", name: "Zircon Sand" }, { code: "42M", name: "Deep Crystal Blue" }, { code: "41W", name: "Jet Black" },
      { code: "47C", name: "Polymetal Grey" }, { code: "47S", name: "Platinum Quartz" }, { code: "46G", name: "Machine Grey" }, { code: "46V", name: "Soul Red Crystal" },
    ],
  },
  {
    id: "ua-toyota-hilux-2025", countryCode: "UA", brand: "Toyota", model: "Hilux", edition: "30 January 2025 brochure",
    sourceTitle: "Toyota Ukraine — Hilux, body colour guide (p. 1)",
    sourceUrl: "https://scene7.toyota.eu/is/content/toyotaeurope/toyota/nmsc/ukraine/brochures/toyota-hilux-a5.pdf",
    colours: [
      { code: "040", name: "White", alternativeName: "Білий, лак", finish: "Solid" }, { code: "218", name: "Black Metallic", alternativeName: "Чорний, металік", finish: "Metallic" },
      { code: "089", name: "White Pearl", alternativeName: "Білий, перламутр", finish: "Pearl" }, { code: "3U5", name: "Red Pearl", alternativeName: "Червоний, перламутр", finish: "Pearl" },
      { code: "8X8", name: "Dark Blue Metallic", alternativeName: "Темно-синій, металік", finish: "Metallic" },
      { code: "1L0", name: "Silver Metallic", alternativeName: "Сріблястий, металік", finish: "Metallic" }, { code: "6X1", name: "Bronze Metallic", alternativeName: "Бронзовий, металік", finish: "Metallic" },
    ],
  },
  {
    id: "in-toyota-hyryder-2022", countryCode: "IN", brand: "Toyota", model: "Urban Cruiser Hyryder", edition: "July 2022 launch palette",
    sourceTitle: "Toyota India — Urban Cruiser Hyryder launch, monotone and dual tone exterior colours",
    sourceUrl: "https://www.toyotabharat.com/news/2022/toyota-forays-into-the-coveted-b-suv-segment-in-india-with-the-urban-cruiser-hyryder.html",
    colours: [
      { name: "Cave Black" }, { name: "Sportin Red" }, { name: "Speedy Blue" }, { name: "Enticing Silver" },
      { name: "Cafe White" }, { name: "Gaming Grey" }, { name: "Midnight Black" },
      { name: "Cafe White with Black roof" }, { name: "Sportin Red with Black roof" },
      { name: "Enticing Silver with Black roof" }, { name: "Speedy Blue with Black roof" },
    ],
  },
];
