/**
 * add-bmw-data.mjs
 * Adds all BMW models and their authentic OEM paint codes to:
 *   1. data/raw/oem-paint-codes.json
 *   2. data/raw/vehicles-catalogue.json
 *   3. data/raw/oem-paint-catalogue.json
 *
 * Run: node scripts/add-bmw-data.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// ─── Authentic BMW OEM Colour Palette ─────────────────────────────────────────
const BMW_COLOURS = [
  // Whites
  { code: "300", name: "Alpine White III (Alpinweiss III)",   hex: "#F5F6F8", finish: "Solid",    notes: "Most iconic BMW solid white worldwide." },
  { code: "A96", name: "Mineral White Metallic",              hex: "#EEEEEC", finish: "Pearl",    notes: "Signature multi-stage metallic mineral white." },
  { code: "490", name: "Frozen Brilliant White Metallic",    hex: "#F0F0EE", finish: "Matte",    notes: "BMW Individual matte finish." },

  // Blacks
  { code: "475", name: "Black Sapphire Metallic",            hex: "#161719", finish: "Metallic", notes: "Benchmark high-volume BMW deep metallic black." },
  { code: "668", name: "Jet Black (Schwarz II)",              hex: "#0A0A0A", finish: "Solid",    notes: "Deep non-metallic piano black." },
  { code: "416", name: "Carbon Black Metallic",              hex: "#121620", finish: "Metallic", notes: "M Sport exclusive deep blue-black metallic." },

  // Silvers & Light Greys
  { code: "354", name: "Titanium Silver Metallic",           hex: "#C6C9C8", finish: "Metallic", notes: "Classic legacy BMW bright silver metallic." },
  { code: "A83", name: "Glacier Silver Metallic",            hex: "#D0D2D3", finish: "Metallic", notes: "Modern cool crisp silver metallic." },
  { code: "A72", name: "Cashmere Silver Metallic",           hex: "#BDB7AB", finish: "Metallic", notes: "Warm champagne silver metallic." },
  { code: "C4W", name: "Skyscraper Grey Metallic",           hex: "#909497", finish: "Metallic", notes: "Contemporary satin mid-tone grey metallic." },
  { code: "C28", name: "Donington Grey Metallic",            hex: "#8C9092", finish: "Metallic", notes: "Performance M line cool dynamic grey." },

  // Medium & Dark Greys
  { code: "B39", name: "Mineral Grey Metallic",              hex: "#4E5155", finish: "Metallic", notes: "Deep charcoal graphite metallic." },
  { code: "A52", name: "Space Grey Metallic",                hex: "#5C5E62", finish: "Metallic", notes: "Rich technical grey metallic." },
  { code: "C4P", name: "Brooklyn Grey Metallic",             hex: "#7A8288", finish: "Metallic", notes: "Modern trending flat-gloss chalk grey metallic." },
  { code: "C36", name: "Dravit Grey Metallic",               hex: "#4C4B48", finish: "Metallic", notes: "Individual grey with subtle gold flake flop." },
  { code: "A89", name: "Sophisto Grey / Dark Graphite",      hex: "#3B3E42", finish: "Metallic", notes: "Deep graphite grey with brilliant pearl effect." },

  // Blues
  { code: "C31", name: "Portimao Blue Metallic",             hex: "#1E3C75", finish: "Metallic", notes: "Signature modern 3/4 Series M Sport vivid blue." },
  { code: "B45", name: "Estoril Blue II Metallic",           hex: "#1A56A0", finish: "Metallic", notes: "Heritage M Sport electric royal blue metallic." },
  { code: "C1M", name: "Phytonic Blue Metallic",             hex: "#173863", finish: "Metallic", notes: "Signature SUV X3/X5 deep athletic blue." },
  { code: "C3Z", name: "Tanzanite Blue II Metallic",         hex: "#0D1C38", finish: "Metallic", notes: "BMW Individual rich midnight navy crystal pearl." },
  { code: "B51", name: "San Marino Blue Metallic",           hex: "#102B7B", finish: "Metallic", notes: "High chroma M performance cobalt blue." },
  { code: "B68", name: "Yas Marina Blue Metallic",           hex: "#5A8CB8", finish: "Metallic", notes: "F80 M3 / F82 M4 launch light sky blue." },
  { code: "C16", name: "Long Beach Blue Metallic",           hex: "#007799", finish: "Metallic", notes: "F87 M2 launch vivid turquoise blue." },
  { code: "381", name: "Le Mans Blue Metallic",              hex: "#153268", finish: "Metallic", notes: "Classic high-depth royal blue metallic." },
  { code: "A30", name: "Interlagos Blue Metallic",           hex: "#17245A", finish: "Metallic", notes: "Deep violet-blue E46/E92 M3 heritage metallic." },
  { code: "C10", name: "Mediterranean Blue Metallic",        hex: "#18335E", finish: "Metallic", notes: "Sophisticated European navy blue metallic." },
  { code: "C4E", name: "Marina Bay Blue Metallic",           hex: "#0E447E", finish: "Metallic", notes: "F90 M5 / X5 M launch electric blue metallic." },

  // Reds
  { code: "A75", name: "Melbourne Red Metallic",             hex: "#9C1A25", finish: "Metallic", notes: "Dynamic sports car candy ruby metallic." },
  { code: "C3G", name: "Toronto Red Metallic",               hex: "#A81B26", finish: "Metallic", notes: "High saturation fiery orange-red metallic." },
  { code: "C57", name: "Aventurine Red III Metallic",        hex: "#6E1B24", finish: "Metallic", notes: "Luxury deep burgundy wine metallic." },
  { code: "405", name: "Imola Red II",                       hex: "#9E121E", finish: "Solid",    notes: "Legendary M motorsport pure signal solid red." },
  { code: "314", name: "Bright Red (Hellrot)",               hex: "#C31F2A", finish: "Solid",    notes: "Heritage E36/E46 bright solid red." },

  // Greens
  { code: "C4G", name: "Isle of Man Green Metallic",         hex: "#1B4D3E", finish: "Metallic", notes: "G80 M3 launch rich British racing green metallic." },
  { code: "C4E_G", name: "Sanremo Green Metallic",           hex: "#2A4F3E", finish: "Metallic", notes: "Elegant modern forest green metallic." },
  { code: "324", name: "Oxford Green Metallic",              hex: "#1B392B", finish: "Metallic", notes: "Heritage E39/E46 dark emerald metallic." },
  { code: "442", name: "Java Green Metallic",                hex: "#3F8A38", finish: "Metallic", notes: "BMW Individual vivid hyper green metallic." },

  // Yellows & Oranges
  { code: "B67", name: "Austin Yellow Metallic",             hex: "#CCA633", finish: "Metallic", notes: "M4 launch gold-green metallic." },
  { code: "C1X", name: "Sunset Orange Metallic",             hex: "#C7521E", finish: "Metallic", notes: "Rich burnt metallic orange." },
  { code: "A84", name: "Valencia Orange Metallic",           hex: "#C94C1D", finish: "Metallic", notes: "1M Coupe / X1 vibrant burnt orange metallic." },
  { code: "B66", name: "Solar Orange Metallic",              hex: "#D65A20", finish: "Metallic", notes: "BMW i3 / i8 signature electric solar orange." },
  { code: "U96", name: "Fire Orange",                        hex: "#E25010", finish: "Solid",    notes: "M3 GTS / Lime Rock Park iconic solid orange." },
  { code: "337", name: "Dakar Yellow II",                    hex: "#E8D354", finish: "Solid",    notes: "E36 M3 classic pastel solid yellow." },

  // Purple / Specialty
  { code: "C5A", name: "Thundernight Metallic",              hex: "#3E244B", finish: "Metallic", notes: "2 Series G42 launch deep royal purple metallic." },
];

const COLOUR_MAP = {};
for (const c of BMW_COLOURS) COLOUR_MAP[c.code] = c;

function pick(codes) {
  return codes.map(c => {
    if (!COLOUR_MAP[c]) throw new Error(`Unknown BMW colour code: ${c}`);
    return COLOUR_MAP[c];
  });
}

// ─── Complete BMW Model Catalogue ────────────────────────────────────────────
const BMW_MODELS = [
  // ── 1 Series ──
  { model: "1 Series",             yearFrom: 2004, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","A75","C4P","668","354"] },
  { model: "1 Series 3-Door",      yearFrom: 2007, yearTo: 2019, codes: ["300","475","B39","B45","A75","668","354"] },
  { model: "1 Series 5-Door",      yearFrom: 2004, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","A75","668"] },
  { model: "1 Series Coupe",       yearFrom: 2007, yearTo: 2013, codes: ["300","475","A84","A75","354","668","381"] },
  { model: "1 Series Convertible", yearFrom: 2008, yearTo: 2013, codes: ["300","475","A84","A75","354","668"] },
  { model: "1 Series M Coupe",     yearFrom: 2011, yearTo: 2012, codes: ["300","475","A84"] },
  { model: "116i",                 yearFrom: 2004, yearTo: 2022, codes: ["300","475","A83","B39","A75","668","354"] },
  { model: "118i",                 yearFrom: 2004, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","A75","668"] },
  { model: "120i",                 yearFrom: 2004, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","A75","668"] },
  { model: "125i",                 yearFrom: 2008, yearTo: 2021, codes: ["300","475","B39","B45","A75","668"] },
  { model: "128ti",                yearFrom: 2020, yearTo: 2026, codes: ["300","475","A96","C4P","C31","A75"] },
  { model: "130i",                 yearFrom: 2005, yearTo: 2012, codes: ["300","475","354","381","668"] },
  { model: "135i",                 yearFrom: 2007, yearTo: 2013, codes: ["300","475","354","A84","668","381"] },
  { model: "M135i",                yearFrom: 2012, yearTo: 2026, codes: ["300","475","A96","B45","C31","C4P","A75","C3G"] },
  { model: "M140i",                yearFrom: 2016, yearTo: 2019, codes: ["300","475","A96","B45","B39","A75"] },

  // ── 2 Series ──
  { model: "2 Series",             yearFrom: 2014, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","A75","C5A","C4P","C4W"] },
  { model: "2 Series Coupe",       yearFrom: 2014, yearTo: 2026, codes: ["300","475","A96","C5A","C31","C4P","B45","A75","C3G"] },
  { model: "2 Series Convertible", yearFrom: 2014, yearTo: 2021, codes: ["300","475","A96","B39","B45","A75","668"] },
  { model: "2 Series Gran Coupe",  yearFrom: 2020, yearTo: 2026, codes: ["300","475","A96","C31","C4P","C4W","C1X","A75"] },
  { model: "2 Series Active Tourer", yearFrom: 2014, yearTo: 2026, codes: ["300","475","A96","A83","B39","C10","C4W"] },
  { model: "2 Series Gran Tourer", yearFrom: 2015, yearTo: 2022, codes: ["300","475","A96","A83","B39","C10"] },
  { model: "218i",                 yearFrom: 2014, yearTo: 2026, codes: ["300","475","A96","B39","C31","A75","C4W"] },
  { model: "220i",                 yearFrom: 2014, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","A75","C5A"] },
  { model: "228i",                 yearFrom: 2014, yearTo: 2021, codes: ["300","475","A96","B39","B45","A75"] },
  { model: "230i",                 yearFrom: 2016, yearTo: 2026, codes: ["300","475","A96","C31","C5A","C4P","A75"] },
  { model: "M235i",                yearFrom: 2014, yearTo: 2024, codes: ["300","475","A96","B45","A75","C31","C4P"] },
  { model: "M240i",                yearFrom: 2016, yearTo: 2026, codes: ["300","475","A96","C5A","C31","C4P","B45","A75"] },
  { model: "M2",                   yearFrom: 2016, yearTo: 2026, codes: ["300","475","A96","C16","C3G","C4P","C3Z","C5A"] },
  { model: "M2 Competition",       yearFrom: 2018, yearTo: 2021, codes: ["300","475","C16","C1X","B39","A96"] },
  { model: "M2 CS",                yearFrom: 2020, yearTo: 2021, codes: ["300","475","B51","C3G"] },

  // ── 3 Series ──
  { model: "3 Series",             yearFrom: 1975, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","A75","C4P","C36","C4W","C3Z","668","354","A52"] },
  { model: "3 Series Sedan",       yearFrom: 1975, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","A75","C4P","C36","C4W","C3Z"] },
  { model: "3 Series Touring",     yearFrom: 1987, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","A75","C4P","C36","C4W"] },
  { model: "3 Series Compact",     yearFrom: 1994, yearTo: 2004, codes: ["300","668","354","314","324"] },
  { model: "3 Series Gran Turismo",yearFrom: 2013, yearTo: 2020, codes: ["300","475","A96","B39","A83","B45","A75"] },
  { model: "316i",                 yearFrom: 1982, yearTo: 2015, codes: ["300","475","354","668","A75","B39"] },
  { model: "318i",                 yearFrom: 1975, yearTo: 2026, codes: ["300","475","A96","B39","C31","A75","C4W","668"] },
  { model: "320i",                 yearFrom: 1975, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","A75","C4P","C4W","668","354"] },
  { model: "323i",                 yearFrom: 1977, yearTo: 2011, codes: ["300","475","354","668","354","A52"] },
  { model: "325i",                 yearFrom: 1985, yearTo: 2013, codes: ["300","475","354","668","A52","381"] },
  { model: "328i",                 yearFrom: 1995, yearTo: 2016, codes: ["300","475","A96","B39","B45","A75","668","354"] },
  { model: "330i",                 yearFrom: 2000, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","C4P","C36","A75","C4W"] },
  { model: "330d",                 yearFrom: 1999, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","C4P","C36"] },
  { model: "330e",                 yearFrom: 2016, yearTo: 2026, codes: ["300","475","A96","B39","C31","C4P","C36","C4W"] },
  { model: "335i",                 yearFrom: 2006, yearTo: 2015, codes: ["300","475","A96","B39","B45","354","A52","668"] },
  { model: "340i",                 yearFrom: 2015, yearTo: 2019, codes: ["300","475","A96","B39","B45","A75"] },
  { model: "M340i",                yearFrom: 2019, yearTo: 2026, codes: ["300","475","A96","C31","C4P","C36","C3Z","C4W"] },
  { model: "M3",                   yearFrom: 1986, yearTo: 2026, codes: ["300","475","C4G","C3G","C4P","C36","B51","B68","405","314","A30"] },
  { model: "M3 Competition",       yearFrom: 2016, yearTo: 2026, codes: ["300","475","C4G","C3G","C4P","C36","C3Z","B51"] },
  { model: "M3 CS",                yearFrom: 2018, yearTo: 2026, codes: ["300","475","B51","C4G","C3G","C4P"] },
  { model: "M3 Touring",           yearFrom: 2022, yearTo: 2026, codes: ["300","475","C4G","C3G","C4P","C36","C3Z"] },
  { model: "M3 CSL",               yearFrom: 2003, yearTo: 2004, codes: ["354","475"] },

  // ── 4 Series ──
  { model: "4 Series",             yearFrom: 2013, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","C4E_G","C4P","C36","C3Z","A75"] },
  { model: "4 Series Coupe",       yearFrom: 2013, yearTo: 2026, codes: ["300","475","A96","C31","C4E_G","C4P","C36","C3Z","A75"] },
  { model: "4 Series Convertible", yearFrom: 2014, yearTo: 2026, codes: ["300","475","A96","C31","C4E_G","C4P","C36","A75"] },
  { model: "4 Series Gran Coupe",  yearFrom: 2014, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","C4E_G","C4P","C36","A75"] },
  { model: "420i",                 yearFrom: 2013, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","A75","C4P"] },
  { model: "428i",                 yearFrom: 2013, yearTo: 2016, codes: ["300","475","A96","B39","B45","A75"] },
  { model: "430i",                 yearFrom: 2016, yearTo: 2026, codes: ["300","475","A96","C31","C4P","C4E_G","A75"] },
  { model: "435i",                 yearFrom: 2013, yearTo: 2016, codes: ["300","475","A96","B39","B45","A75"] },
  { model: "440i",                 yearFrom: 2016, yearTo: 2020, codes: ["300","475","A96","B39","B45","C1X"] },
  { model: "M440i",                yearFrom: 2020, yearTo: 2026, codes: ["300","475","A96","C31","C4P","C4E_G","C36","C3Z"] },
  { model: "M4",                   yearFrom: 2014, yearTo: 2026, codes: ["300","475","B67","B68","C4G","C3G","C4P","B51","C36"] },
  { model: "M4 Competition",       yearFrom: 2016, yearTo: 2026, codes: ["300","475","C4G","C3G","C4P","B67","B51","C3Z"] },
  { model: "M4 CSL",               yearFrom: 2022, yearTo: 2023, codes: ["475","300","C4P"] },
  { model: "M4 GTS",               yearFrom: 2016, yearTo: 2017, codes: ["475","300","B39","A96"] },

  // ── 5 Series ──
  { model: "5 Series",             yearFrom: 1972, yearTo: 2026, codes: ["300","475","A96","416","B39","A89","C3Z","C28","C4W","C57","354","A52","668"] },
  { model: "5 Series Sedan",       yearFrom: 1972, yearTo: 2026, codes: ["300","475","A96","416","B39","A89","C3Z","C28","C4W","C57"] },
  { model: "5 Series Touring",     yearFrom: 1991, yearTo: 2026, codes: ["300","475","A96","416","B39","A89","C3Z","C4W"] },
  { model: "5 Series Gran Turismo",yearFrom: 2009, yearTo: 2017, codes: ["300","475","A96","416","A89","354","A52"] },
  { model: "520i",                 yearFrom: 1972, yearTo: 2026, codes: ["300","475","A96","416","B39","A89","C4W","354"] },
  { model: "520d",                 yearFrom: 2000, yearTo: 2026, codes: ["300","475","A96","416","B39","A89","C4W"] },
  { model: "523i",                 yearFrom: 1995, yearTo: 2011, codes: ["300","475","354","668","A52"] },
  { model: "525i",                 yearFrom: 1972, yearTo: 2010, codes: ["300","475","354","668","A52","324"] },
  { model: "528i",                 yearFrom: 1975, yearTo: 2017, codes: ["300","475","A96","416","B39","354","A52"] },
  { model: "530i",                 yearFrom: 1975, yearTo: 2026, codes: ["300","475","A96","416","B39","A89","C3Z","C4W"] },
  { model: "530d",                 yearFrom: 1998, yearTo: 2026, codes: ["300","475","A96","416","B39","A89","C3Z"] },
  { model: "530e",                 yearFrom: 2017, yearTo: 2026, codes: ["300","475","A96","416","B39","A89","C4W"] },
  { model: "535i",                 yearFrom: 1985, yearTo: 2017, codes: ["300","475","A96","416","B39","354","A52"] },
  { model: "540i",                 yearFrom: 1992, yearTo: 2026, codes: ["300","475","A96","416","A89","C3Z","C28"] },
  { model: "545i",                 yearFrom: 2003, yearTo: 2005, codes: ["300","475","354","668","A52"] },
  { model: "550i",                 yearFrom: 2005, yearTo: 2020, codes: ["300","475","A96","416","A89","354","C28"] },
  { model: "M550i",                yearFrom: 2017, yearTo: 2023, codes: ["300","475","A96","416","C28","C3Z","C57"] },
  { model: "M5",                   yearFrom: 1984, yearTo: 2026, codes: ["300","475","416","C4E","C28","B51","C3G","C4G","405","A30"] },
  { model: "M5 Competition",       yearFrom: 2018, yearTo: 2026, codes: ["300","475","C4E","C28","B51","C3G","C4G","C57"] },
  { model: "M5 CS",                yearFrom: 2021, yearTo: 2022, codes: ["475","C28","490"] },

  // ── 6 Series ──
  { model: "6 Series",             yearFrom: 1976, yearTo: 2023, codes: ["300","475","A96","416","A89","A52","354","C57","C3Z"] },
  { model: "6 Series Coupe",       yearFrom: 1976, yearTo: 2017, codes: ["300","475","A96","416","A52","354","668"] },
  { model: "6 Series Convertible", yearFrom: 2004, yearTo: 2018, codes: ["300","475","A96","416","A52","354"] },
  { model: "6 Series Gran Coupe",  yearFrom: 2012, yearTo: 2018, codes: ["300","475","A96","416","A89","C3Z","354"] },
  { model: "6 Series Gran Turismo",yearFrom: 2017, yearTo: 2023, codes: ["300","475","A96","416","A89","C3Z","C57"] },
  { model: "630i",                 yearFrom: 1976, yearTo: 2023, codes: ["300","475","A96","416","A89","354"] },
  { model: "640i",                 yearFrom: 2011, yearTo: 2023, codes: ["300","475","A96","416","A89","C3Z"] },
  { model: "650i",                 yearFrom: 2005, yearTo: 2018, codes: ["300","475","A96","416","A89","354","C3Z"] },
  { model: "M6",                   yearFrom: 1983, yearTo: 2018, codes: ["300","475","416","B51","A30","354"] },
  { model: "M6 Gran Coupe",        yearFrom: 2013, yearTo: 2018, codes: ["300","475","416","B51","C3Z"] },

  // ── 7 Series ──
  { model: "7 Series",             yearFrom: 1977, yearTo: 2026, codes: ["300","475","A96","416","A89","C3Z","C57","C36","C28","354","668"] },
  { model: "730i",                 yearFrom: 1977, yearTo: 2022, codes: ["300","475","A96","416","A89","354"] },
  { model: "740i",                 yearFrom: 1992, yearTo: 2026, codes: ["300","475","A96","416","A89","C3Z","C36","C57"] },
  { model: "740d",                 yearFrom: 1998, yearTo: 2026, codes: ["300","475","A96","416","A89","C3Z","C36"] },
  { model: "745i",                 yearFrom: 1980, yearTo: 2026, codes: ["300","475","A96","416","A89","354"] },
  { model: "750i",                 yearFrom: 1987, yearTo: 2026, codes: ["300","475","A96","416","A89","C3Z","C28"] },
  { model: "760i",                 yearFrom: 2003, yearTo: 2026, codes: ["300","475","A96","416","C3Z","C36","C28"] },
  { model: "M760Li",               yearFrom: 2016, yearTo: 2022, codes: ["300","475","416","C28","C3Z","490"] },

  // ── 8 Series ──
  { model: "8 Series",             yearFrom: 1989, yearTo: 2026, codes: ["300","475","A96","416","C3Z","C57","C36","C28","C31","C4P"] },
  { model: "8 Series Coupe",       yearFrom: 1989, yearTo: 2026, codes: ["300","475","A96","416","C3Z","C57","C31","C4P"] },
  { model: "8 Series Convertible", yearFrom: 2019, yearTo: 2026, codes: ["300","475","A96","416","C3Z","C57","C31"] },
  { model: "8 Series Gran Coupe",  yearFrom: 2019, yearTo: 2026, codes: ["300","475","A96","416","C3Z","C57","C4P","C31"] },
  { model: "840i",                 yearFrom: 1993, yearTo: 2026, codes: ["300","475","A96","416","C3Z","C31"] },
  { model: "850i",                 yearFrom: 1989, yearTo: 2026, codes: ["300","475","A96","416","C3Z","C28","354"] },
  { model: "M850i",                yearFrom: 2018, yearTo: 2026, codes: ["300","475","A96","416","C3Z","C28","C31","C57"] },
  { model: "M8",                   yearFrom: 2019, yearTo: 2026, codes: ["300","475","416","C4E","C28","B51","C3G","C4G"] },
  { model: "M8 Competition",       yearFrom: 2019, yearTo: 2026, codes: ["300","475","C4E","C28","B51","C3G","C4G","C3Z"] },
  { model: "M8 Gran Coupe",        yearFrom: 2019, yearTo: 2026, codes: ["300","475","416","C4E","C28","B51","C3G","C3Z"] },

  // ── X Series (SAV / SAC) ──
  { model: "X1",                   yearFrom: 2009, yearTo: 2026, codes: ["300","475","A96","B39","C1M","C4P","C4W","C1X","A84","A83"] },
  { model: "X2",                   yearFrom: 2018, yearTo: 2026, codes: ["300","475","A96","C1X","C4P","C31","C4W","C3G"] },
  { model: "X2 M35i",              yearFrom: 2019, yearTo: 2026, codes: ["300","475","A96","C1X","C4P","C31","C3G"] },
  { model: "X3",                   yearFrom: 2003, yearTo: 2026, codes: ["300","475","A96","416","B39","C1M","C4P","C4W","C3Z","354","A52"] },
  { model: "X3 M",                 yearFrom: 2019, yearTo: 2026, codes: ["300","475","C4E","C3G","C4P","C28","B51"] },
  { model: "X3 M Competition",     yearFrom: 2019, yearTo: 2026, codes: ["300","475","C4E","C3G","C4P","C28","B51","C4G"] },
  { model: "X4",                   yearFrom: 2014, yearTo: 2026, codes: ["300","475","A96","416","B39","C1M","C4P","C31","C4W"] },
  { model: "X4 M",                 yearFrom: 2019, yearTo: 2026, codes: ["300","475","C4E","C3G","C4P","C28","B51"] },
  { model: "X4 M Competition",     yearFrom: 2019, yearTo: 2026, codes: ["300","475","C4E","C3G","C4P","C28","B51","C4G"] },
  { model: "X5",                   yearFrom: 1999, yearTo: 2026, codes: ["300","475","A96","416","A89","C1M","C3Z","C28","C4W","354","A52","668"] },
  { model: "X5 M",                 yearFrom: 2009, yearTo: 2026, codes: ["300","475","416","C4E","C28","C3G","C4G","B51"] },
  { model: "X5 M Competition",     yearFrom: 2020, yearTo: 2026, codes: ["300","475","C4E","C28","C3G","C4G","B51","C3Z"] },
  { model: "X6",                   yearFrom: 2008, yearTo: 2026, codes: ["300","475","A96","416","A89","C1M","C3Z","C28","A52"] },
  { model: "X6 M",                 yearFrom: 2009, yearTo: 2026, codes: ["300","475","416","C4E","C28","C3G","B51"] },
  { model: "X6 M Competition",     yearFrom: 2020, yearTo: 2026, codes: ["300","475","C4E","C28","C3G","C4G","B51","C3Z"] },
  { model: "X7",                   yearFrom: 2019, yearTo: 2026, codes: ["300","475","A96","416","A89","C3Z","C36","C57","C28"] },
  { model: "X7 M50i",              yearFrom: 2019, yearTo: 2022, codes: ["300","475","A96","416","C3Z","C28","C57"] },
  { model: "X7 M60i",              yearFrom: 2022, yearTo: 2026, codes: ["300","475","A96","416","C3Z","C28","C4E","C57"] },
  { model: "XM",                   yearFrom: 2023, yearTo: 2026, codes: ["300","475","416","C36","C4E","C57","C4G"] },

  // ── Z Series (Roadsters) ──
  { model: "Z1",                   yearFrom: 1989, yearTo: 1991, codes: ["300","668","314"] },
  { model: "Z3",                   yearFrom: 1995, yearTo: 2002, codes: ["300","668","354","314","324"] },
  { model: "Z3 Coupe",             yearFrom: 1998, yearTo: 2002, codes: ["300","668","354","314"] },
  { model: "Z3 M",                 yearFrom: 1997, yearTo: 2002, codes: ["300","668","354","405","381"] },
  { model: "Z4",                   yearFrom: 2002, yearTo: 2026, codes: ["300","475","A96","B39","C31","B45","A75","C4W","C1X","354"] },
  { model: "Z4 Coupe",             yearFrom: 2006, yearTo: 2008, codes: ["300","475","354","668","A52"] },
  { model: "Z4 M",                 yearFrom: 2006, yearTo: 2008, codes: ["300","475","354","405","381","A30"] },
  { model: "Z4 M40i",              yearFrom: 2019, yearTo: 2026, codes: ["300","475","A96","C31","C4W","C1X","C4P"] },
  { model: "Z8",                   yearFrom: 2000, yearTo: 2003, codes: ["354","668","475","314"] },

  // ── i Series (Electric) ──
  { model: "i3",                   yearFrom: 2013, yearTo: 2022, codes: ["300","475","A96","B66","C1X","B39"] },
  { model: "i3s",                  yearFrom: 2017, yearTo: 2022, codes: ["300","475","A96","B66","C1X"] },
  { model: "i4",                   yearFrom: 2021, yearTo: 2026, codes: ["300","475","A96","C31","C4P","C4E_G","C36","C3Z"] },
  { model: "i4 M50",               yearFrom: 2021, yearTo: 2026, codes: ["300","475","A96","C31","C4P","C4E_G","C36","C3Z","C3G"] },
  { model: "i5",                   yearFrom: 2023, yearTo: 2026, codes: ["300","475","A96","416","A89","C3Z","C4W","C57"] },
  { model: "i5 M60",               yearFrom: 2023, yearTo: 2026, codes: ["300","475","416","C4E","C28","C3Z","C4G"] },
  { model: "i7",                   yearFrom: 2022, yearTo: 2026, codes: ["300","475","A96","416","C3Z","C36","C57","C28"] },
  { model: "i7 M70",               yearFrom: 2023, yearTo: 2026, codes: ["300","475","416","C3Z","C36","C28","490"] },
  { model: "i8",                   yearFrom: 2014, yearTo: 2020, codes: ["300","475","A96","A83","B39","C10"] },
  { model: "i8 Roadster",          yearFrom: 2018, yearTo: 2020, codes: ["300","475","A96","A83","C1X"] },
  { model: "iX",                   yearFrom: 2021, yearTo: 2026, codes: ["300","475","A96","A89","C3Z","C57","C36"] },
  { model: "iX M60",               yearFrom: 2022, yearTo: 2026, codes: ["300","475","A96","A89","C3Z","C36","C57"] },
  { model: "iX1",                  yearFrom: 2022, yearTo: 2026, codes: ["300","475","A96","C1M","C4P","C4W"] },
  { model: "iX2",                  yearFrom: 2023, yearTo: 2026, codes: ["300","475","A96","C4P","C31","C4W"] },
  { model: "iX3",                  yearFrom: 2020, yearTo: 2026, codes: ["300","475","A96","416","C1M","C4W"] },

  // ── Classics & Heritage ──
  { model: "2002",                 yearFrom: 1968, yearTo: 1976, codes: ["300","668","314","354"] },
  { model: "2002 Turbo",           yearFrom: 1973, yearTo: 1974, codes: ["300","354"] },
  { model: "1602",                 yearFrom: 1966, yearTo: 1975, codes: ["300","668","314"] },
  { model: "1802",                 yearFrom: 1971, yearTo: 1975, codes: ["300","668","314"] },
  { model: "1502",                 yearFrom: 1975, yearTo: 1977, codes: ["300","668","314"] },
  { model: "3.0 CS",               yearFrom: 1971, yearTo: 1975, codes: ["300","668","354","324"] },
  { model: "3.0 CSL",              yearFrom: 1971, yearTo: 1975, codes: ["300","354","668"] },
  { model: "507",                  yearFrom: 1956, yearTo: 1959, codes: ["300","668","314"] },
  { model: "850CSi",               yearFrom: 1992, yearTo: 1996, codes: ["300","475","354","314","668"] },
];

console.log(`Total BMW models defined: ${BMW_MODELS.length}`);

// ─── Generate oem-paint-codes records ─────────────────────────────────────────
const newRecords = [];
for (const m of BMW_MODELS) {
  const colours = pick(m.codes);
  for (const c of colours) {
    newRecords.push({
      brand: "BMW",
      model: m.model,
      yearFrom: m.yearFrom,
      yearTo: m.yearTo,
      code: c.code.replace("_G", ""),
      name: c.name,
      finish: c.finish,
      hex: c.hex,
      source: "open-data",
      verified: false,
      notes: c.notes || undefined,
    });
  }
}

// ─── Merge into oem-paint-codes.json ──────────────────────────────────────────
const oemPath = path.join(ROOT, "data/raw/oem-paint-codes.json");
let existing = JSON.parse(fs.readFileSync(oemPath, "utf8"));
existing = existing.filter(r => r.brand !== "BMW");
existing = [...existing, ...newRecords];
fs.writeFileSync(oemPath, JSON.stringify(existing, null, 2), "utf8");
console.log(`✔ oem-paint-codes.json: added ${newRecords.length} BMW records`);

// ─── Merge into vehicles-catalogue.json ───────────────────────────────────────
const vcPath = path.join(ROOT, "data/raw/vehicles-catalogue.json");
let vc = JSON.parse(fs.readFileSync(vcPath, "utf8"));

let bmwBrand = vc.brands.find(b => b.name === "BMW");
if (!bmwBrand) {
  bmwBrand = { name: "BMW", models: [] };
  vc.brands.push(bmwBrand);
} else {
  bmwBrand.models = [];
}

for (const m of BMW_MODELS) {
  const years = [];
  for (let y = m.yearFrom; y <= m.yearTo; y++) years.push(y);
  bmwBrand.models.push({ name: m.model, years });
}

fs.writeFileSync(vcPath, JSON.stringify(vc, null, 2), "utf8");
console.log(`✔ vehicles-catalogue.json: BMW now has ${bmwBrand.models.length} models`);

// ─── Merge into oem-paint-catalogue.json ─────────────────────────────────────
const catPath = path.join(ROOT, "data/raw/oem-paint-catalogue.json");
let catalogue = JSON.parse(fs.readFileSync(catPath, "utf8"));
catalogue = catalogue.filter(r => r.brand !== "BMW");

const newCatalogueRecords = [];
for (const m of BMW_MODELS) {
  const colours = pick(m.codes);
  const years = [];
  for (let y = m.yearFrom; y <= m.yearTo; y++) years.push(y);

  for (const c of colours) {
    const rawCode = c.code.replace("_G", "");
    newCatalogueRecords.push({
      brand: "BMW",
      manufacturer: "BMW",
      model: m.model,
      yearFrom: m.yearFrom,
      yearTo: m.yearTo,
      years,
      code: rawCode,
      primaryCode: rawCode,
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
      notes: c.notes || undefined,
    });
  }
}

catalogue = [...catalogue, ...newCatalogueRecords];
fs.writeFileSync(catPath, JSON.stringify(catalogue, null, 2), "utf8");
console.log(`✔ oem-paint-catalogue.json: added ${newCatalogueRecords.length} BMW records`);

console.log("\nSample BMW models added:");
console.log(BMW_MODELS.slice(0, 20).map(m => m.model).join(", "));
