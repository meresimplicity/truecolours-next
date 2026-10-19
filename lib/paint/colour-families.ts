import { normalizeColorName } from "../../scripts/normalize-paint-codes.ts";

/** English search words for colour terms in regional manufacturer names. */
export function paintColourFamilies(name: string): string {
  const normalized = normalizeColorName(name.replace(/ß/g, "ss"));
  const families: [string, RegExp][] = [
    ["Green", /\b(green|vert|verde|groen|\w*grun)\b/],
    ["Blue", /\b(blue|bleu|blu|\w*blau)\b/],
    ["Red", /\b(red|rouge|rosso|rood|\w*rot)\b/],
    ["White", /\b(white|blanc|bianco|wit|\w*weiss)\b/],
    ["Black", /\b(black|noir|nero|zwart|\w*schwarz)\b/],
    ["Grey Gray", /\b(grey|gray|gris|grigio|grijs|\w*grau)\b/],
    ["Silver", /\b(silver|argent|argento|zilver|\w*silber)\b/],
    ["Yellow", /\b(yellow|jaune|giallo|geel|\w*gelb)\b/],
    ["Orange", /\b(orange|arancio)\b/],
    ["Brown", /\b(brown|bruin|marron|marrone|\w*braun)\b/],
    ["Bronze", /\b(bronze|bronzo)\b/],
    ["Purple Violet", /\b(purple|violet|violett|viola|paars|\w*violett)\b/],
    ["Pink", /\b(pink|rosa|rose|roze)\b/],
    ["Gold", /\b(gold|golden|oro|goud)\b/],
    ["Beige Cream", /\b(beige|cream|creme|crema)\b/],
    ["Copper", /\b(copper|kupfer|cuivre|rame|koper)\b/],
    ["Turquoise", /\b(turquoise|turkis|turchese|turkoois)\b/],
  ];
  return families.filter(([, pattern]) => pattern.test(normalized)).map(([family]) => family).join(" ");
}
