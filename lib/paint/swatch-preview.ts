import type { PaintColor } from "../../types/paint.ts";
import { paintColourFamilies } from "./colour-families.ts";

type PreviewColour = Pick<PaintColor, "name"> & Partial<PaintColor>;

const normalize = (value: string) => value.replace(/ß/g, "ss").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const validHex = (value?: string): value is string => Boolean(value && /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value));

// Display estimates, not sampled OEM chips or mixing formulas. Keep them separate
// from existing catalogue references and never mark these values as verified.
const NAME_ESTIMATES: [string[], string][] = [
  [["ice cap", "blizzard", "bianco gelato", "wimbledon white"], "#F0EFE5"],
  [["arkonaweiss", "arkona white", "nanuq white", "cafe white"], "#EEEDE7"],
  [["liquid mercury", "precious metal", "heavy metal"], "#72787D"],
  [["celestite"], "#82939E"],
  [["zircon sand"], "#ACA88E"],
  [["platinum quartz"], "#C4BDB0"],
  [["ebony", "brillantschwarz", "nera black", "nero cinema", "noir perla nera"], "#17191B"],
  [["graphite", "modern steel", "carbonized gray", "meteorite gray", "machine grey"], "#555D61"],
  [["polymetal grey", "vapor blue"], "#7E8E98"],
  [["urban gray", "legend grey", "brooklyn grau", "selenium grey", "gris selenium"], "#A0A6A6"],
  [["manhattangrau", "dravitgrau"], "#68675C"],
  [["daytonagrau", "chronosgrau"], "#656C70"],
  [["skyscraper grau", "cumulus grey", "gris artense"], "#92979B"],
  [["copper grey"], "#9C8B78"],
  [["scarlet flare", "supersonic red", "emotional red", "feverish red", "elixir red", "rouge elixir", "soul red crystal"], "#9F1725"],
  [["rosso passione", "milano red", "rallye red", "race red", "chili red", "rebel red", "sportin red"], "#C1262D"],
  [["aventurinrot", "velvet red", "radiant red", "barcelona red"], "#7F2832"],
  [["arizona red"], "#9B4C3D"],
  [["molten magenta"], "#7A284E"],
  [["nordic forest"], "#597572"],
  [["british racing green"], "#18483E"],
  [["isle of man grun", "isle of man green"], "#167460"],
  [["sanremo green"], "#45675C"],
  [["distriktgrun", "district green"], "#777E60"],
  [["ocean wave green"], "#6C9692"],
  [["smokey green"], "#849089"],
  [["olivine green", "vert olivine"], "#647659"],
  [["verde foresta", "forest green"], "#4E6659"],
  [["mamba green"], "#80B83F"],
  [["highland green"], "#4C655D"],
  [["intense lime yellow"], "#CCD549"],
  [["sunnyside yellow", "giallo positano"], "#E9C547"],
  [["marina bay blau", "marina bay blue", "portimao blau", "ascariblau", "race blue", "vertigo blue"], "#2560A0"],
  [["tansanitblau", "navarrablau", "still night", "deep crystal blue", "blue print", "saturn blue"], "#203B59"],
  [["carbonschwarz", "blue ember"], "#243038"],
  [["canyon river blue", "storm blue", "boreal blue"], "#45677E"],
  [["boost blue", "grabber blue", "blazing blue", "energy blue", "blu italia", "speedy blue"], "#2285B9"],
  [["icy sunshine blue"], "#9DC1CA"],
  [["slate blue", "indigo sunset blue"], "#65798B"],
  [["avatar blue", "bleu avatar", "bleu obsession"], "#24536B"],
  [["sunset orange", "phoenix orange"], "#BB5D2C"],
  [["titan bronze", "oxide bronze"], "#8B8267"],
];

const FAMILY_ESTIMATES: [RegExp, string][] = [
  [/white/i, "#F1F0E9"], [/black/i, "#1C1E21"], [/silver/i, "#B8BDC1"],
  [/grey|gray/i, "#858B90"], [/green/i, "#3E6954"], [/blue/i, "#285A87"],
  [/red/i, "#AE2730"], [/yellow/i, "#E4BF42"], [/orange/i, "#C76B30"],
  [/brown/i, "#765A46"], [/bronze/i, "#968168"], [/purple|violet/i, "#6E4D7B"],
  [/pink/i, "#CC8DA3"], [/gold/i, "#B6A16B"], [/beige|cream/i, "#D3C8AF"],
  [/copper/i, "#A46D4C"], [/turquoise/i, "#438F93"],
];

function estimateBody(colour: PreviewColour): string {
  const bodyName = colour.name.replace(/\s*(?:\/\s*black|with\s+black\s+roof|bi[ -]?(?:tone|colou?r))\b.*$/i, "").trim();
  const names = [bodyName, ...(colour.alternativeNames || []).map((alt) => alt.name)];
  for (const name of names) {
    const normalized = normalize(name);
    const named = NAME_ESTIMATES.find(([aliases]) => aliases.some((alias) => ` ${normalized} `.includes(` ${alias} `)));
    if (named) return named[1];
  }
  const family = paintColourFamilies(bodyName) || colour.baseColor || paintColourFamilies(names.join(" "));
  return FAMILY_ESTIMATES.find(([pattern]) => pattern.test(family))?.[1] || "#8B9094";
}

export function paintSwatchPreview(colour: PreviewColour) {
  // An invalid preferred field must not conceal a usable legacy hex value.
  const referenceHex = [colour.swatchHex, colour.hex].find(validHex);
  const estimated = !referenceHex || Boolean(colour.swatchEstimated);
  const hex = referenceHex || estimateBody(colour);
  const explicitBlackRoof = /(?:\/\s*black\b|with\s+black\s+roof\b)/i.test(colour.name);
  const secondaryHex = validHex(colour.swatchSecondaryHex) ? colour.swatchSecondaryHex : explicitBlackRoof ? "#1C1E21" : undefined;
  return {
    hex,
    secondaryHex,
    estimated,
    source: estimated ? "Estimated digital preview from the colour name; not an OEM swatch" : colour.swatchSource || "Indicative catalogue preview",
  };
}

export function paintSwatchStyle(colour: PreviewColour) {
  const { hex, secondaryHex } = paintSwatchPreview(colour);
  return {
    backgroundColor: hex,
    ...(secondaryHex ? { backgroundImage: `linear-gradient(to bottom, ${secondaryHex} 0%, ${secondaryHex} 24%, ${hex} 24%, ${hex} 100%)` } : {}),
  };
}

export function withPaintSwatchPreview<T extends PreviewColour>(colour: T): T & Pick<PaintColor, "hex" | "swatchHex" | "swatchSecondaryHex" | "swatchEstimated" | "swatchSource" | "swatchVerified"> {
  const preview = paintSwatchPreview(colour);
  return {
    ...colour,
    hex: preview.hex,
    swatchHex: preview.hex,
    swatchSecondaryHex: preview.secondaryHex,
    swatchEstimated: preview.estimated,
    swatchSource: preview.source,
    swatchVerified: preview.estimated ? false : colour.swatchVerified,
  };
}
