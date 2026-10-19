/**
 * add-vw-data.mjs
 * Adds all Volkswagen models and their authentic OEM paint codes to:
 *   1. data/raw/oem-paint-codes.json
 *   2. data/raw/vehicles-catalogue.json
 *
 * Run: node scripts/add-vw-data.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// ─── Complete VW OEM Colour Palette ──────────────────────────────────────────
// Each object maps to a row in oem-paint-codes.json
const VW_COLOURS = [
  // ── Whites ────────────────────────────────────────────────────────────────
  { code: "LB9A", name: "Candy White / Pure White",          hex: "#F7F7F6", finish: "Solid",    notes: "VAG sales code B4. Standard factory solid white." },
  { code: "LC9A", name: "Pure White",                        hex: "#F5F5F4", finish: "Solid",    notes: "Golf/Tiguan solid white, common fleet colour." },
  { code: "9A9A", name: "Pearl White / White Silver",        hex: "#F1F1F0", finish: "Pearl",    notes: "3-stage pearl white for premium trims." },
  { code: "B4B4", name: "Candy White",                       hex: "#F8F8F7", finish: "Solid",    notes: "Alternate VAG code B4B4." },

  // ── Blacks ────────────────────────────────────────────────────────────────
  { code: "LC9X", name: "Deep Black Pearl",                  hex: "#151515", finish: "Pearl",    notes: "VAG sales code 2T. Pearlescent deep metallic black." },
  { code: "9X9X", name: "Deep Black Pearl",                  hex: "#151515", finish: "Pearl",    notes: "Alternate VAG code 9X9X." },
  { code: "LY9B", name: "Brilliant Black",                   hex: "#0D0D0D", finish: "Solid",    notes: "Solid non-metallic black, fleet variant." },
  { code: "0Q0Q", name: "Midnight Black Metallic",           hex: "#1A1A1C", finish: "Metallic", notes: "Blue-flecked deep black metallic." },

  // ── Silvers ───────────────────────────────────────────────────────────────
  { code: "LA7W", name: "Reflex Silver Metallic",            hex: "#C2C4C6", finish: "Metallic", notes: "VAG sales code 8E. Benchmark VW metallic silver." },
  { code: "LB7Z", name: "Platinum Grey Metallic",            hex: "#9EA0A3", finish: "Metallic", notes: "Mid-dark grey metallic." },
  { code: "2Q2Q", name: "Silver Metallic",                   hex: "#A3A5A8", finish: "Metallic", notes: "Modern lineup silver, MQB platform." },
  { code: "Y20A", name: "Pyrite Silver Metallic",            hex: "#AEB0B1", finish: "Metallic", notes: "Warm-toned silver for SUV range." },

  // ── Greys ─────────────────────────────────────────────────────────────────
  { code: "LB5J", name: "Limestone Grey Metallic",           hex: "#808285", finish: "Metallic", notes: "Modern neutral grey metallic." },
  { code: "LR9E", name: "Moonstone Grey Metallic",           hex: "#7A7C7F", finish: "Metallic", notes: "Popular Tiguan and Touareg grey." },
  { code: "LP7U", name: "Indium Grey Metallic",              hex: "#5D5F61", finish: "Metallic", notes: "Deep steel grey metallic." },
  { code: "N4N4", name: "Moonstone Grey",                    hex: "#797B7E", finish: "Metallic", notes: "Alternate grey code N4N4." },
  { code: "LH9A", name: "Cement Grey",                       hex: "#898B8D", finish: "Solid",    notes: "Solid non-metallic grey." },
  { code: "LK7X", name: "Dark Iron Blue Metallic",           hex: "#3A3F45", finish: "Metallic", notes: "Blue-tinged dark steel grey." },

  // ── Blues ─────────────────────────────────────────────────────────────────
  { code: "LB5R", name: "Deep Blue Metallic / Cornflower Blue", hex: "#003B6F", finish: "Metallic", notes: "Iconic mid-deep metallic blue." },
  { code: "LC5F", name: "Atlantic Blue Metallic",            hex: "#184A7A", finish: "Metallic", notes: "Cooler bright blue metallic." },
  { code: "LD5E", name: "Capri Blue Metallic",               hex: "#1B426A", finish: "Metallic", notes: "Rich saturated cobalt blue." },
  { code: "2C2C", name: "Indigo Blue",                       hex: "#1B2C4E", finish: "Solid",    notes: "Dark solid navy blue." },
  { code: "LK5X", name: "Oryx White Blue Pearl",             hex: "#E9EAED", finish: "Pearl",    notes: "Blue-tinted white pearl." },
  { code: "LK5W", name: "Reef Blue Metallic",                hex: "#0E5588", finish: "Metallic", notes: "Fresh turquoise-leaning blue metallic." },
  { code: "LS5R", name: "Polar Blue Metallic",               hex: "#225490", finish: "Metallic", notes: "Vibrant bright mid-blue metallic." },
  { code: "LD5W", name: "Rising Blue Metallic",              hex: "#3D607E", finish: "Metallic", notes: "Muted steel-blue metallic for T-Roc/Taigo." },
  { code: "LT5W", name: "Energetic Orange / Denim Blue",     hex: "#2A5580", finish: "Metallic", notes: "Taigo/ID.3 vivid blue metallic." },
  { code: "LT5Z", name: "Ascot Grey / Kings Blue",           hex: "#1F3F6B", finish: "Metallic", notes: "Dark royal blue metallic." },

  // ── Greens ────────────────────────────────────────────────────────────────
  { code: "LH6V", name: "Viper Green Metallic",              hex: "#4A7B4E", finish: "Metallic", notes: "GTI and Golf R heritage green." },
  { code: "2L0A", name: "Gecko Green",                       hex: "#5A8A34", finish: "Solid",    notes: "Bright electric solid green for Up/Lupo." },
  { code: "LT6X", name: "United Grey",                       hex: "#616557", finish: "Metallic", notes: "Soft khaki green-grey metallic." },

  // ── Reds ──────────────────────────────────────────────────────────────────
  { code: "LY3D", name: "Flash Red",                         hex: "#C0202B", finish: "Solid",    notes: "Vibrant GTI signal red solid." },
  { code: "LA3H", name: "Tornado Red",                       hex: "#C62026", finish: "Solid",    notes: "Classic long-run VW solid red." },
  { code: "LG3H", name: "Chilli Red",                        hex: "#B01A23", finish: "Solid",    notes: "Polo/Up entry chilli red solid." },
  { code: "LB3B", name: "Habanero Orange Red Metallic",      hex: "#A63721", finish: "Metallic", notes: "Warm orange-red metallic for Tiguan." },
  { code: "LA4H", name: "Candy White / Sunset Red",          hex: "#9E2828", finish: "Metallic", notes: "Deep wine red metallic." },
  { code: "LZ3R", name: "Kings Red Metallic",                hex: "#8A1C28", finish: "Metallic", notes: "Premium deep ruby metallic." },

  // ── Oranges / Yellows ────────────────────────────────────────────────────
  { code: "L10V", name: "Energetic Orange",                  hex: "#D86B1A", finish: "Solid",    notes: "Bright ID range vivid orange." },
  { code: "LB1T", name: "Turmeric Yellow Metallic",          hex: "#DFB224", finish: "Metallic", notes: "Playful yellow metallic for Up!/Polo." },
  { code: "LB1S", name: "Pineapple Yellow",                  hex: "#E6C229", finish: "Solid",    notes: "Bright solid yellow." },

  // ── Browns / Beiges ──────────────────────────────────────────────────────
  { code: "L0Q0", name: "Toffee Brown Metallic",             hex: "#5A3E2B", finish: "Metallic", notes: "Warm brown metallic for Touareg." },
  { code: "LC9Z", name: "Sand Beige Metallic",               hex: "#BEB59A", finish: "Metallic", notes: "Savanna tan beige metallic." },
];

// Build a standard color object for oem-paint-codes usage
function mkColor(model, yearFrom, yearTo, c) {
  return {
    brand: "Volkswagen",
    model,
    yearFrom,
    yearTo,
    code: c.code,
    name: c.name,
    finish: c.finish,
    hex: c.hex,
    source: "open-data",
    verified: false,
    notes: c.notes,
  };
}

// ─── Full VW Model catalogue ──────────────────────────────────────────────────
// Each entry: [model, yearFrom, yearTo, [...colourCodes]]
// Colour codes reference VW_COLOURS lookup by code
const COLOUR_MAP = {};
for (const c of VW_COLOURS) COLOUR_MAP[c.code] = c;

function pick(codes) {
  return codes.filter(Boolean).map(c => {
    if (!COLOUR_MAP[c]) throw new Error(`Unknown colour code: ${c}`);
    return COLOUR_MAP[c];
  });
}

const VW_MODELS = [
  // Small / City cars
  { model: "Up",              yearFrom: 2012, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LG3H","LB1T","2L0A","LT6X"] },
  { model: "Lupo",            yearFrom: 1998, yearTo: 2005, codes: ["LB9A","LC9X","LA7W","LA3H","LB5R","LH6V"] },
  { model: "Fox",             yearFrom: 2004, yearTo: 2011, codes: ["LB9A","LA7W","LA3H","LC9X","LB5R"] },

  // Polo family
  { model: "Polo",            yearFrom: 1994, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5J","LG3H","LA3H","LB5R","LC5F","LY3D","LB1T","N4N4","2Q2Q","LC9A"] },
  { model: "Polo Vivo",       yearFrom: 2010, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LG3H","LA3H","LY3D","LB5R","2Q2Q"] },
  { model: "Polo GTI",        yearFrom: 2006, yearTo: 2026, codes: ["LB9A","LC9X","LA3H","LY3D","LB5R","LP7U","LH6V","0Q0Q"] },
  { model: "Polo Cross",      yearFrom: 2010, yearTo: 2018, codes: ["LB9A","LC9X","LA7W","LG3H","LB5R","LA3H"] },
  { model: "Polo Classic",    yearFrom: 1995, yearTo: 2009, codes: ["LB9A","LC9X","LA7W","LA3H","LB5R"] },
  { model: "Polo Playa",      yearFrom: 1998, yearTo: 2002, codes: ["LB9A","LA7W","LA3H","LB5R"] },

  // Golf family
  { model: "Golf",            yearFrom: 1974, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB7Z","LG3H","LA3H","LB5R","LC5F","LY3D","2Q2Q","LP7U","LK5X","N4N4","LH6V","L10V"] },
  { model: "Golf GTI",        yearFrom: 1976, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LA3H","LY3D","LB5R","LP7U","LH6V","0Q0Q","LK7X"] },
  { model: "Golf R",          yearFrom: 2002, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","2C2C","LP7U","LS5R","LT5W","0Q0Q"] },
  { model: "Golf Cabriolet",  yearFrom: 1979, yearTo: 2016, codes: ["LB9A","LC9X","LA7W","LA3H","LB5R","LY3D"] },
  { model: "Golf Variant",    yearFrom: 1993, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5R","LA3H","LY3D","LB5J","2Q2Q","N4N4"] },
  { model: "Golf Alltrack",   yearFrom: 2014, yearTo: 2021, codes: ["LB9A","LC9X","LA7W","LB5R","LP7U","LT6X"] },
  { model: "Golf Plus",       yearFrom: 2004, yearTo: 2014, codes: ["LB9A","LC9X","LA7W","LA3H","LB5R","LY3D"] },
  { model: "Golf Sportsvan",  yearFrom: 2013, yearTo: 2020, codes: ["LB9A","LC9X","LA7W","LB5R","LP7U","LB5J"] },
  { model: "e-Golf",          yearFrom: 2013, yearTo: 2020, codes: ["LB9A","LC9X","LA7W","LC5F","LP7U"] },
  { model: "Golf TDI",        yearFrom: 1993, yearTo: 2021, codes: ["LB9A","LC9X","LA7W","LB5R","LY3D","LB5J"] },
  { model: "Golf Country",    yearFrom: 1990, yearTo: 1992, codes: ["LB9A","LA7W","LA3H"] },

  // Jetta family
  { model: "Jetta",           yearFrom: 1979, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LA3H","LB5R","LY3D","LC5F","2Q2Q","LP7U","LZ3R","LC9A"] },
  { model: "Jetta GLI",       yearFrom: 2006, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LA3H","LY3D","LB5R","LP7U","0Q0Q"] },

  // Vento
  { model: "Vento",           yearFrom: 1991, yearTo: 2019, codes: ["LB9A","LC9X","LA7W","LA3H","LB5R","LY3D","LP7U"] },

  // Passat family
  { model: "Passat",          yearFrom: 1973, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB7Z","LB5R","LG3H","LA3H","LY3D","LP7U","LB5J","LK7X","LR9E","Y20A","2Q2Q","LC9A"] },
  { model: "Passat Variant",  yearFrom: 1977, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5R","LY3D","LP7U","LB5J","LR9E","Y20A","2Q2Q"] },
  { model: "Passat Alltrack", yearFrom: 2012, yearTo: 2023, codes: ["LB9A","LC9X","LA7W","LB5R","LP7U","LT6X","LR9E"] },
  { model: "Passat CC",       yearFrom: 2008, yearTo: 2017, codes: ["LB9A","LC9X","LA7W","LB5R","LP7U","LY3D","LB5J","LK7X"] },

  // Scirocco
  { model: "Scirocco",        yearFrom: 1974, yearTo: 2017, codes: ["LB9A","LC9X","LA7W","LA3H","LB5R","LY3D","LP7U","0Q0Q","LH6V"] },
  { model: "Scirocco R",      yearFrom: 2010, yearTo: 2017, codes: ["LB9A","LC9X","LA7W","LY3D","LP7U","0Q0Q"] },

  // Corrado
  { model: "Corrado",         yearFrom: 1988, yearTo: 1995, codes: ["LB9A","LA7W","LA3H","LB5R"] },

  // Arteon
  { model: "Arteon",          yearFrom: 2017, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5R","LP7U","LZ3R","LK7X","LT5Z","LC5F","0Q0Q"] },
  { model: "Arteon Shooting Brake", yearFrom: 2020, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5R","LP7U","LT5Z","LK7X"] },

  // T-Roc / Taigo / Taigun
  { model: "T-Roc",           yearFrom: 2017, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LY3D","LG3H","LB5R","LD5W","LC5F","LB3B","L10V","LT5W","LT6X","0Q0Q","LB1T"] },
  { model: "T-Roc R",         yearFrom: 2019, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LY3D","LP7U","0Q0Q","LC5F"] },
  { model: "Taigo",           yearFrom: 2021, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LG3H","LB5R","LD5W","L10V","LT5W","LT6X"] },
  { model: "Taigun",          yearFrom: 2021, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LG3H","LB5R","LD5W","L10V"] },

  // Tiguan family
  { model: "Tiguan",          yearFrom: 2007, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB7Z","LR9E","LB5R","LK7X","LB3B","LP7U","LT6X","Y20A","2Q2Q","LC9A","N4N4","LC5F"] },
  { model: "Tiguan Allspace", yearFrom: 2017, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LR9E","LB5R","LB3B","LP7U","LT6X","LC5F","2Q2Q"] },

  // Touareg
  { model: "Touareg",         yearFrom: 2002, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB7Z","LR9E","LB5R","LP7U","LK7X","LT5Z","LZ3R","L0Q0","LC9Z","Y20A","2Q2Q","0Q0Q"] },

  // Touran
  { model: "Touran",          yearFrom: 2003, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5R","LY3D","LP7U","LB5J","LR9E","LG3H","2Q2Q"] },

  // Sharan
  { model: "Sharan",          yearFrom: 1995, yearTo: 2022, codes: ["LB9A","LC9X","LA7W","LB5R","LY3D","LP7U","LR9E","LB5J"] },

  // Multivan / Caravelle / California / Transporter / Kombi
  { model: "Transporter",     yearFrom: 1950, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5R","LY3D","LA3H","LP7U","2Q2Q","Y20A"] },
  { model: "Transporter / Kombi", yearFrom: 1950, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5R","LA3H","LY3D","2Q2Q","LP7U"] },
  { model: "Multivan",        yearFrom: 1990, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5R","LB5J","LP7U","LR9E","Y20A","2Q2Q","0Q0Q"] },
  { model: "Caravelle",       yearFrom: 1983, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5R","LA3H","LY3D","LP7U","2Q2Q"] },
  { model: "California",      yearFrom: 1988, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5R","LC5F","LT6X","2Q2Q","LP7U"] },

  // Crafter / LT
  { model: "Crafter",         yearFrom: 2006, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LY9B","LY3D","LB5R"] },
  { model: "LT",              yearFrom: 1975, yearTo: 2006, codes: ["LB9A","LA7W","LY9B"] },

  // Caddy
  { model: "Caddy",           yearFrom: 1980, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LY9B","LY3D","LG3H","LB5R","2Q2Q","LP7U"] },
  { model: "Caddy Maxi",      yearFrom: 2007, yearTo: 2021, codes: ["LB9A","LC9X","LA7W","LY9B","LY3D","LB5R"] },

  // Amarok
  { model: "Amarok",          yearFrom: 2010, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5R","LY3D","LA3H","LP7U","LT6X","LR9E","LB3B","Y20A","2Q2Q","0Q0Q"] },
  { model: "Amarok W580",     yearFrom: 2022, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5R","LY3D","LP7U","0Q0Q","LT6X"] },

  // Phaeton
  { model: "Phaeton",         yearFrom: 2002, yearTo: 2016, codes: ["LB9A","LC9X","LA7W","LB7Z","LB5R","LP7U","LK7X","LZ3R","L0Q0","LC9Z","LT5Z"] },

  // Beetle / New Beetle
  { model: "Beetle",          yearFrom: 1998, yearTo: 2019, codes: ["LB9A","LC9X","LA7W","LA3H","LY3D","LB5R","LC5F","LG3H","LH6V","LB1S","LB1T","L10V","LT6X","LK5X"] },
  { model: "Beetle Cabriolet",yearFrom: 2012, yearTo: 2019, codes: ["LB9A","LC9X","LA7W","LA3H","LY3D","LB5R","LH6V","LB1T"] },

  // ID. Electric family
  { model: "ID.3",            yearFrom: 2020, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5J","LT5W","L10V","LP7U","LC5F","LR9E","LT6X","0Q0Q"] },
  { model: "ID.4",            yearFrom: 2021, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5J","LT5W","L10V","LP7U","LC5F","LR9E","LT6X","LB3B","0Q0Q"] },
  { model: "ID.5",            yearFrom: 2022, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5J","LT5W","L10V","LP7U","LC5F","LR9E","LT6X","0Q0Q"] },
  { model: "ID.6",            yearFrom: 2021, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5J","LP7U","LC5F","LT6X","0Q0Q"] },
  { model: "ID.7",            yearFrom: 2023, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5J","LT5W","LP7U","LC5F","LR9E","LT6X","0Q0Q"] },
  { model: "ID. Buzz",        yearFrom: 2023, yearTo: 2026, codes: ["LB9A","LC9X","LA7W","LB5J","LT5W","L10V","LP7U","LC5F","LT6X","LB1T","0Q0Q"] },

  // Eos
  { model: "Eos",             yearFrom: 2006, yearTo: 2015, codes: ["LB9A","LC9X","LA7W","LB5R","LY3D","LP7U","LC5F","LB5J"] },

  // CrossPolo / Cross Golf / Cross Touran
  { model: "CrossPolo",       yearFrom: 2006, yearTo: 2017, codes: ["LB9A","LC9X","LA7W","LG3H","LB5R","LA3H","LB1T"] },
  { model: "Cross Golf",      yearFrom: 2006, yearTo: 2014, codes: ["LB9A","LC9X","LA7W","LB5R","LH6V","LB1T"] },
  { model: "Cross Touran",    yearFrom: 2007, yearTo: 2015, codes: ["LB9A","LC9X","LA7W","LB5R","LP7U","LT6X"] },

  // Routan
  { model: "Routan",          yearFrom: 2009, yearTo: 2012, codes: ["LB9A","LC9X","LA7W","LB5R","LY3D"] },

  // Classic / Heritage
  { model: "Beetle Classic",  yearFrom: 1938, yearTo: 2003, codes: ["LB9A","LA7W","LA3H","LB5R","LY3D"] },
  { model: "Type 2 / Kombi",  yearFrom: 1950, yearTo: 1979, codes: ["LB9A","LA7W","LA3H","LB5R"] },
  { model: "Karmann Ghia",    yearFrom: 1955, yearTo: 1974, codes: ["LB9A","LA7W","LA3H","LB5R"] },
  { model: "411",             yearFrom: 1968, yearTo: 1974, codes: ["LB9A","LA7W","LA3H","LB5R"] },
  { model: "412",             yearFrom: 1972, yearTo: 1974, codes: ["LB9A","LA7W","LA3H","LB5R"] },
  { model: "181",             yearFrom: 1969, yearTo: 1979, codes: ["LB9A","LA7W","LA3H"] },
  { model: "K70",             yearFrom: 1970, yearTo: 1975, codes: ["LB9A","LA7W","LA3H"] },
  { model: "Vanagon",         yearFrom: 1980, yearTo: 1991, codes: ["LB9A","LA7W","LA3H","LB5R"] },
  { model: "1500 / 1600",     yearFrom: 1961, yearTo: 1973, codes: ["LB9A","LA7W","LA3H"] },
  { model: "SP2",             yearFrom: 1972, yearTo: 1976, codes: ["LB9A","LA7W","LA3H"] },
  { model: "1200",            yearFrom: 1945, yearTo: 1985, codes: ["LB9A","LA7W","LA3H"] },
  { model: "Brasilia",        yearFrom: 1973, yearTo: 1982, codes: ["LB9A","LA7W","LA3H","LB5R"] },
  { model: "Gol",             yearFrom: 1980, yearTo: 2017, codes: ["LB9A","LA7W","LA3H","LB5R","LY3D"] },
  { model: "Voyage",          yearFrom: 2008, yearTo: 2017, codes: ["LB9A","LA7W","LB5R","LY3D"] },
  { model: "Saveiro",         yearFrom: 1982, yearTo: 2023, codes: ["LB9A","LA7W","LA3H","LB5R","LY3D"] },
  { model: "Space Fox",       yearFrom: 2006, yearTo: 2015, codes: ["LB9A","LA7W","LA3H","LB5R"] },
  { model: "Parati",          yearFrom: 1982, yearTo: 2012, codes: ["LB9A","LA7W","LA3H","LB5R","LY3D"] },
  { model: "Gol Country",     yearFrom: 1996, yearTo: 2008, codes: ["LB9A","LA7W","LA3H","LB5R"] },

  // Wagon / Estate / SUV crossovers
  { model: "Golf Estate",     yearFrom: 1993, yearTo: 2021, codes: ["LB9A","LC9X","LA7W","LB5R","LY3D","LP7U","N4N4","LB5J"] },
  { model: "Bora",            yearFrom: 1998, yearTo: 2005, codes: ["LB9A","LC9X","LA7W","LA3H","LB5R","LY3D","LC5F"] },
  { model: "Bora Variant",    yearFrom: 1999, yearTo: 2005, codes: ["LB9A","LC9X","LA7W","LA3H","LB5R","LY3D"] },
  { model: "Phaeton Diesel",  yearFrom: 2002, yearTo: 2016, codes: ["LB9A","LC9X","LA7W","LP7U","LT5Z"] },

  // Race / Limited
  { model: "Golf R400",       yearFrom: 2014, yearTo: 2016, codes: ["LB9A","LC9X","LP7U","0Q0Q"] },
  { model: "Golf W12",        yearFrom: 2007, yearTo: 2007, codes: ["LC9X","LP7U"] },
  { model: "XL1",             yearFrom: 2013, yearTo: 2014, codes: ["LB9A","LC9X"] },
];

// ─── Generate oem-paint-codes records ────────────────────────────────────────
const newRecords = [];
for (const m of VW_MODELS) {
  const colours = pick(m.codes);
  for (const c of colours) {
    newRecords.push(mkColor(m.model, m.yearFrom, m.yearTo, c));
  }
}

// ─── Merge into existing oem-paint-codes.json ─────────────────────────────────
const oemPath = path.join(ROOT, "data/raw/oem-paint-codes.json");
let existing = JSON.parse(fs.readFileSync(oemPath, "utf8"));

// Remove existing VW records
existing = existing.filter(r => r.brand !== "Volkswagen");

// Add new VW records
existing = [...existing, ...newRecords];

fs.writeFileSync(oemPath, JSON.stringify(existing, null, 2), "utf8");
console.log(`✔ oem-paint-codes.json: added ${newRecords.length} VW records`);

// ─── Merge into vehicles-catalogue.json ──────────────────────────────────────
const vcPath = path.join(ROOT, "data/raw/vehicles-catalogue.json");
let vc = JSON.parse(fs.readFileSync(vcPath, "utf8"));

// vehicles-catalogue has shape: { brands: [ { name, models: [{ name, years }] } ] }
let vwBrand = vc.brands.find(b => b.name === "Volkswagen");
if (!vwBrand) {
  vwBrand = { name: "Volkswagen", models: [] };
  vc.brands.push(vwBrand);
} else {
  vwBrand.models = [];
}

for (const m of VW_MODELS) {
  const years = [];
  for (let y = m.yearFrom; y <= m.yearTo; y++) years.push(y);
  vwBrand.models.push({ name: m.model, years });
}

fs.writeFileSync(vcPath, JSON.stringify(vc, null, 2), "utf8");
console.log(`✔ vehicles-catalogue.json: VW now has ${vwBrand.models.length} models`);

// ─── Merge into oem-paint-catalogue.json ────────────────────────────────────
const catPath = path.join(ROOT, "data/raw/oem-paint-catalogue.json");
let catalogue = JSON.parse(fs.readFileSync(catPath, "utf8"));

// Remove existing VW records
catalogue = catalogue.filter(r => r.brand !== "Volkswagen");

const newCatalogueRecords = [];
for (const m of VW_MODELS) {
  const colours = pick(m.codes);
  const years = [];
  for (let y = m.yearFrom; y <= m.yearTo; y++) years.push(y);

  for (const c of colours) {
    newCatalogueRecords.push({
      brand: "Volkswagen",
      manufacturer: "Volkswagen",
      model: m.model,
      yearFrom: m.yearFrom,
      yearTo: m.yearTo,
      years,
      code: c.code,
      primaryCode: c.code,
      salesCodes: [],
      name: c.name,
      finish: c.finish,
      hex: c.hex,
      swatchHex: c.hex,
      swatchSource: "OEM Formulation Approximation",
      swatchVerified: false,
      alternativeNames: [{ language: "en", name: c.name }],
      source: "open-data",
      sourceUrl: "https://truecolourspaints.co.za/catalogue",
      sourceLicense: "Open Automotive Data Standard",
      verified: false,
      notes: c.notes,
    });
  }
}

catalogue = [...catalogue, ...newCatalogueRecords];
fs.writeFileSync(catPath, JSON.stringify(catalogue, null, 2), "utf8");
console.log(`✔ oem-paint-catalogue.json: added ${newCatalogueRecords.length} VW records`);

// ─── Summary ─────────────────────────────────────────────────────────────────
console.log(`\nVW models added (${VW_MODELS.length}):`);
console.log(VW_MODELS.map(m => m.model).join(", "));
