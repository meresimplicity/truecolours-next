import type { MarketPalette } from "./paint-market-palettes.ts";

const bmwSource = "https://www.bmw.de/content/dam/bmw/marketDE/bmw_de/new-vehicles/pricelists/preisliste-bmwm8.pdf.asset.1749107905847.pdf";
const miniSource = "https://www.mini.co.uk/en_GB/home/range/colours-and-paints.html";
const peugeotUK = "https://www.media.stellantis.com/uploads/uk/model-pricelist/peugeot308priceandspecaug2023-6502e1cc69e63.pdf";
const peugeotFR = "https://www.peugeot.fr/content/dam/peugeot/france/b2c/documentation/catalogues/2402/308.pdf";

/** Complete named tables for these source editions; individual trim restrictions still apply. */
export const EUROPE_MARKET_PALETTES: MarketPalette[] = [
  {
    id: "de-bmw-m8-2025-07", countryCode: "DE", brand: "BMW", model: "M8 Competition", edition: "July 2025 price list",
    sourceTitle: "BMW Germany — M8 Coupé & Cabriolet, exterior colour availability (p. 10)", sourceUrl: bmwSource,
    colours: [
      { code: "300", name: "Alpinweiß", finish: "Solid" }, { code: "475", name: "Saphirschwarz", finish: "Metallic" },
      { code: "C1K", name: "M Marina Bay Blau", finish: "Metallic" }, { code: "C4W", name: "Skyscraper Grau", finish: "Metallic" },
      { code: "C4P", name: "M Brooklyn Grau", finish: "Metallic" }, { code: "C4G", name: "M Isle of Man Grün", alternativeName: "Isle of Man Green", baseColor: "Green", finish: "Metallic" },
      { code: "C36", name: "BMW Individual Dravitgrau", finish: "Metallic" }, { code: "C3Z", name: "BMW Individual Tansanitblau", finish: "Metallic" },
      { code: "C57", name: "Aventurinrot", finish: "Metallic" }, { code: "C5A", name: "BMW Individual Frozen Pure Grey", finish: "Matte Metallic" },
      { code: "X1G", name: "BMW Individual Frozen Tansanitblau", finish: "Matte Metallic" },
      { code: "W93", name: "BMW Individual Frozen Brillant White", finish: "Matte Metallic" },
      { code: "P5T", name: "BMW Individual Frozen Marina Bay Blue", finish: "Matte Metallic" },
    ],
  },
  {
    id: "de-bmw-m850i-2025-07", countryCode: "DE", brand: "BMW", model: "M850i xDrive", edition: "July 2025 price list",
    sourceTitle: "BMW Germany — M850i Coupé & Cabriolet, exterior colour availability (p. 10)", sourceUrl: bmwSource,
    colours: [
      { code: "300", name: "Alpinweiß", finish: "Solid" }, { code: "475", name: "Saphirschwarz", finish: "Metallic" },
      { code: "A96", name: "Mineralweiß", finish: "Metallic" }, { code: "416", name: "M Carbonschwarz", finish: "Metallic" },
      { code: "C31", name: "M Portimao Blau", finish: "Metallic" }, { code: "C1X", name: "Sunset Orange", finish: "Metallic" },
      { code: "C4W", name: "Skyscraper Grau", finish: "Metallic" }, { code: "C4E", name: "Sanremo Green", baseColor: "Green", finish: "Metallic" },
      { code: "C36", name: "BMW Individual Dravitgrau", finish: "Metallic" }, { code: "C3Z", name: "BMW Individual Tansanitblau", finish: "Metallic" },
      { code: "C57", name: "Aventurinrot", finish: "Metallic" }, { code: "C5A", name: "BMW Individual Frozen Pure Grey", finish: "Matte Metallic" },
      { code: "X1G", name: "BMW Individual Frozen Tansanitblau", finish: "Matte Metallic" },
      { code: "W93", name: "BMW Individual Frozen Brillant White", finish: "Matte Metallic" },
    ],
  },
  {
    id: "de-audi-a5-sportback-my2024", countryCode: "DE", brand: "Audi", model: "A5 Sportback", edition: "MY2024 price list", modelYear: 2024,
    sourceTitle: "Audi Germany — A5 Sportback, published colour/order references (p. 12)",
    sourceUrl: "https://www.audi.de/dam/nemo/models/misc/pdf/my-2024/preislisten/preisliste_a5-sportback.pdf",
    colours: [
      { name: "Arkonaweiß", alternativeName: "Arkona White", finish: "Solid" }, { code: "A2", name: "Brillantschwarz", alternativeName: "Brilliant Black", finish: "Solid" },
      { code: "M4", name: "Distriktgrün Metallic", alternativeName: "District Green Metallic", baseColor: "Green", finish: "Metallic" },
      { code: "0E", name: "Mythosschwarz Metallic", finish: "Metallic" }, { code: "2D", name: "Navarrablau Metallic", finish: "Metallic" },
      { code: "2Y", name: "Gletscherweiß Metallic", finish: "Metallic" }, { code: "B1", name: "Progressivrot Metallic", finish: "Metallic" },
      { code: "H1", name: "Manhattangrau Metallic", finish: "Metallic" }, { code: "L5", name: "Florettsilber Metallic", finish: "Metallic" },
      { code: "Z7", name: "Chronosgrau Metallic", finish: "Metallic" }, { code: "9W", name: "Ascariblau Metallic", finish: "Metallic" },
      { code: "6Y", name: "Daytonagrau Perleffekt", finish: "Pearl" },
    ],
  },
  ...([
    ["cooper", "Cooper", ["British Racing Green IV", "Chili Red", "Sunnyside Yellow", "Blazing Blue", "Ocean Wave Green", "Legend Grey", "Midnight Black II", "Nanuq White", "Melting Silver III"]],
    ["aceman", "Aceman", ["British Racing Green IV", "Chili Red II", "Blazing Blue", "Indigo Sunset Blue", "Ocean Wave Green", "Rebel Red", "Legend Grey", "Midnight Black II", "Nanuq White", "Melting Silver III"]],
    ["countryman", "Countryman", ["British Racing Green IV", "Chili Red II", "Blazing Blue", "Slate Blue", "Smokey Green", "Legend Grey", "Midnight Black II", "Nanuq White", "Melting Silver III"]],
    ["convertible", "Cooper Convertible", ["British Racing Green IV", "Chili Red II", "Ocean Wave Green", "Icy Sunshine Blue", "Sunnyside Yellow", "Copper Grey", "Legend Grey", "Midnight Black II", "Nanuq White", "Melting Silver III"]],
  ] satisfies [string, string, string[]][]).map(([id, model, names]): MarketPalette => ({
    id: `gb-mini-${id}-2026`, countryCode: "GB", brand: "MINI", model, edition: "UK colour guide, checked October 2026",
    sourceTitle: `MINI UK — ${model}, all named paint options in the manufacturer guide`, sourceUrl: miniSource,
    colours: names.map((name) => ({ name, baseColor: name.includes("Green") ? "Green" : undefined })),
  })),
  {
    id: "gb-peugeot-308-2023-08", countryCode: "GB", brand: "Peugeot", model: "308 Hatchback", edition: "August 2023 price and specification guide",
    sourceTitle: "Peugeot UK — 308 hatchback paint and order references (p. 29)", sourceUrl: peugeotUK,
    colours: [
      { code: "P0WP", name: "Bianca White", finish: "Solid", notes: "Stock only in this edition." },
      { code: "M0M1", name: "Olivine Green", baseColor: "Green", finish: "Metallic" }, { code: "M0F4", name: "Cumulus Grey", finish: "Metallic" },
      { code: "M09V", name: "Nera Black", finish: "Metallic" }, { code: "M0SU", name: "Okenite White", finish: "Metallic" },
      { code: "M0LD", name: "Selenium Grey", finish: "Metallic" }, { code: "M5VH", name: "Elixir Red" }, { code: "M6SM", name: "Vertigo Blue" },
      { code: "M6N9", name: "Pearlescent White", finish: "Pearl", notes: "Stock only in this edition." },
    ],
  },
  {
    id: "gb-peugeot-308-sw-2023-08", countryCode: "GB", brand: "Peugeot", model: "308 SW", edition: "August 2023 price and specification guide",
    sourceTitle: "Peugeot UK — 308 SW paint and order references (p. 30)", sourceUrl: peugeotUK,
    colours: [
      { code: "P0WP", name: "Bianca White", finish: "Solid", notes: "Stock only in this edition." },
      { code: "M0BK", name: "Avatar Blue", finish: "Metallic" }, { code: "M0F4", name: "Cumulus Grey", finish: "Metallic" },
      { code: "M0VL", name: "Nimbus Grey", finish: "Metallic", notes: "Stock only in this edition." },
      { code: "M09V", name: "Nera Black", finish: "Metallic" }, { code: "M0SU", name: "Okenite White", finish: "Metallic" },
      { code: "M0LD", name: "Selenium Grey", finish: "Metallic" }, { code: "M5VH", name: "Elixir Red" },
    ],
  },
  {
    id: "fr-peugeot-308-2024-02", countryCode: "FR", brand: "Peugeot", model: "308 Berline", edition: "1 February 2024 price list",
    sourceTitle: "Peugeot France — 308 Berline, full paint table (p. 16)", sourceUrl: peugeotFR,
    colours: [
      { code: "M0M1", name: "Vert Olivine", alternativeName: "Olivine Green", baseColor: "Green", finish: "Metallic" },
      { code: "M0F4", name: "Gris Artense", finish: "Metallic" }, { code: "M09V", name: "Noir Perla Nera", finish: "Metallic" },
      { code: "M0SU", name: "Blanc Okénite", finish: "Metallic" }, { code: "M0LD", name: "Gris Sélénium", finish: "Metallic" },
      { code: "M0DP", name: "Bleu Obsession" }, { code: "M5VH", name: "Rouge Elixir" },
    ],
  },
  {
    id: "fr-peugeot-308-sw-2024-02", countryCode: "FR", brand: "Peugeot", model: "308 SW", edition: "1 February 2024 price list",
    sourceTitle: "Peugeot France — 308 SW, full paint table (p. 17)", sourceUrl: peugeotFR,
    colours: [{ code: "M0BK", name: "Bleu Avatar", finish: "Metallic" }, { code: "M0F4", name: "Gris Artense", finish: "Metallic" }, { code: "M09V", name: "Noir Perla Nera", finish: "Metallic" }, { code: "M0SU", name: "Blanc Okénite", finish: "Metallic" }, { code: "M0LD", name: "Gris Sélénium", finish: "Metallic" }, { code: "M5VH", name: "Rouge Elixir" }],
  },
  {
    id: "it-fiat-panda-pandina-2026", countryCode: "IT", brand: "Fiat", model: "Panda / Pandina", edition: "Italian trim comparison, checked October 2026",
    sourceTitle: "Fiat Italy — Panda / Pandina, complete named colour lists (p. 1)",
    sourceUrl: "https://www.fiat.it/content/dam/fiat2023/it/trimcomparison/pandina/confronta-gli-allestimenti/FIAT_Panda_Hybrid_trimcomparison.pdf",
    colours: [
      { name: "Rosso Passione", alternativeName: "Passion Red" }, { name: "Rosso Passione Bi-Color" },
      { name: "Bianco Gelato", alternativeName: "Gelato White" }, { name: "Bianco Gelato Bi-Color" },
      { name: "Nero Cinema", alternativeName: "Cinema Black" }, { name: "Blu Italia", alternativeName: "Italia Blue" }, { name: "Blu Italia Bi-Color" },
      { name: "Verde Foresta", alternativeName: "Forest Green", baseColor: "Green" }, { name: "Verde Foresta Bi-Color", alternativeName: "Forest Green Bi-Color", baseColor: "Green" },
      { name: "Giallo Positano", alternativeName: "Positano Yellow" }, { name: "Giallo Positano Bi-Color" },
    ],
  },
  {
    id: "nl-skoda-octavia-2025-06", countryCode: "NL", brand: "Škoda", model: "Octavia", edition: "1 June 2025 price list",
    sourceTitle: "Škoda Netherlands / Pon — Octavia, exterior colour/order table (p. 8)",
    sourceUrl: "https://s3.eu-central-1.amazonaws.com/poncenter-nl/07/prijslijst-skoda-octavia-1-juni-2025.pdf",
    colours: [
      { code: "K4K4", name: "Energy Blue", finish: "Solid" }, { code: "9P8P", name: "Candy White", finish: "Solid" },
      { name: "Mamba Green", baseColor: "Green", finish: "Solid", notes: "Sportline Tour only. The source duplicates another colour’s order reference, so its code is left unconfirmed." },
      { code: "1Z1Z", name: "Black Magic", finish: "Metallic" }, { code: "8X8X", name: "Race Blue", finish: "Metallic" },
      { code: "8E8E", name: "Brilliant Silver", finish: "Metallic" }, { code: "2Y2Y", name: "Moon White", finish: "Metallic" },
      { code: "5X5X", name: "Graphite Grey", finish: "Metallic" }, { code: "2X2X", name: "Phoenix Orange", finish: "Metallic" },
      { code: "K1K1", name: "Velvet Red", finish: "Metallic" }, { code: "9585 / FB1", name: "Storm Blue" },
      { code: "9693 / FB1", name: "Highland Green", baseColor: "Green" },
    ],
  },
];
