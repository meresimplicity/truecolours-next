/**
 * Normalization rules (spec section 32-33). The goal is narrow: make
 * "AUDI"/"Audi"/"audi" and "LY9T"/"LY9T / 0E"/"ly9t-0e" comparable for
 * search and dedupe WITHOUT throwing away the original value a source
 * actually used — that original is what gets displayed and cited.
 */

/** Display-cased manufacturer/model name: trims, collapses whitespace, title-cases. */
export function normalizeName(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => (word.length ? word[0]!.toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(" ");
}

/** URL-safe slug: lowercase, ASCII, hyphenated. */
export function slugify(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * A code_normalized value for search/dedupe: uppercase, strip whitespace
 * and separator punctuation ('/', '-', '.', '_'). "LY9T / 0E" and "LY9T-0E"
 * both normalize to "LY9T0E" so they're recognized as candidates for the
 * SAME paint record (subject to conflict detection, not auto-merge — see
 * src/lib/conflict.ts) rather than silently treated as unrelated colours.
 */
export function normalizePaintCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[\s/\-._]+/g, "");
}

/**
 * Splits a combined "primary/aux" style code string ("LY9T / 0E",
 * "LY9T-0E") into { code, auxCode }. Returns auxCode: null when the input
 * doesn't look like a compound code — never guesses an aux code that
 * isn't actually present in the source string.
 */
export function splitPrimaryAndAuxCode(raw: string): { code: string; auxCode: string | null } {
  const match = raw.trim().match(/^([A-Za-z0-9]+)\s*[/\-]\s*([A-Za-z0-9]+)$/);
  if (!match) return { code: raw.trim(), auxCode: null };
  return { code: match[1]!, auxCode: match[2]! };
}
