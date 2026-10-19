import type { CatalogueProduct } from "@/data/catalogue";

type SearchField = {
  value: string;
  compact: string;
  words: string[];
  weight: number;
};

export type CatalogueSearchEntry = {
  product: CatalogueProduct;
  position: number;
  fields: SearchField[];
  code?: SearchField;
  name?: SearchField;
};

const SEARCH_SYNONYMS: Record<string, string[]> = {
  adhesive: ["glue", "bond"],
  abrasive: ["sandpaper", "sanding"],
  colour: ["color"],
  color: ["colour"],
  disc: ["disk"],
  disk: ["disc"],
  gun: ["spraygun"],
  mask: ["masking"],
  putty: ["filler"],
  sandpaper: ["abrasive", "sanding"],
  thinner: ["solvent"],
};

const STOP_WORDS = new Set(["a", "an", "and", "for", "of", "the", "with"]);

export function normalizeCatalogueSearch(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/([a-z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([a-z])/g, "$1 $2")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchValue(value: string) {
  return value.replace(/\s+/g, "");
}

function makeField(value: string | undefined, weight: number): SearchField | null {
  if (!value) return null;

  const normalized = normalizeCatalogueSearch(value);
  if (!normalized) return null;

  return {
    value: normalized,
    compact: compactSearchValue(normalized),
    words: normalized.split(" "),
    weight,
  };
}

export function createCatalogueSearchIndex(products: CatalogueProduct[]) {
  return products.map<CatalogueSearchEntry>((product, position) => {
    const code = makeField(product.code, 120) ?? undefined;
    const name = makeField(product.name, 80) ?? undefined;
    const fields = [
      code,
      name,
      makeField(product.brand, 55),
      makeField(product.supplier, 50),
      makeField(product.subcategory, 36),
      makeField(product.category, 32),
      makeField(product.filter, 28),
      makeField(product.size, 24),
      makeField(product.colour, 24),
      makeField(product.tags.join(" "), 20),
      makeField(product.source, 8),
      product.isNewArrival ? makeField("new arrival featured", 12) : null,
    ].filter((field): field is SearchField => Boolean(field));

    return { product, position, fields, code, name };
  });
}

function queryTokens(normalizedQuery: string) {
  const tokens = normalizedQuery.split(" ").filter(Boolean);
  const usefulTokens = tokens.filter((token) => !STOP_WORDS.has(token));
  return usefulTokens.length > 0 ? usefulTokens : tokens;
}

function tokenVariants(token: string) {
  return [token, ...(SEARCH_SYNONYMS[token] ?? [])];
}

function fieldMatchScore(field: SearchField, token: string) {
  const variants = tokenVariants(token);

  for (const variant of variants) {
    const compactVariant = compactSearchValue(variant);

    if (field.words.includes(variant) || field.compact === compactVariant) {
      return field.weight + 18;
    }

    if (
      field.value.includes(variant) ||
      field.compact.includes(compactVariant) ||
      field.words.some((word) => word.startsWith(variant))
    ) {
      return field.weight;
    }
  }

  return 0;
}

function entryScore(entry: CatalogueSearchEntry, normalizedQuery: string, tokens: string[]) {
  const compactQuery = compactSearchValue(normalizedQuery);
  let score = 0;

  for (const token of tokens) {
    let bestTokenScore = 0;

    for (const field of entry.fields) {
      bestTokenScore = Math.max(bestTokenScore, fieldMatchScore(field, token));
    }

    // Every meaningful query word must match. This prevents unrelated products
    // from appearing just because they share one broad word such as "paint".
    if (bestTokenScore === 0) return 0;
    score += bestTokenScore;
  }

  const { code, name } = entry;

  if (code?.compact === compactQuery) score += 1_000;
  if (name?.value === normalizedQuery || name?.compact === compactQuery) score += 900;
  if (code?.compact.startsWith(compactQuery)) score += 520;
  if (name?.value.startsWith(normalizedQuery)) score += 420;
  if (name?.value.includes(normalizedQuery) || name?.compact.includes(compactQuery)) score += 260;

  return score;
}

export function searchCatalogue(
  index: CatalogueSearchEntry[],
  query: string
): CatalogueProduct[] {
  const normalizedQuery = normalizeCatalogueSearch(query);
  if (!normalizedQuery) return index.map((entry) => entry.product);

  const tokens = queryTokens(normalizedQuery);

  return index
    .map((entry) => ({ entry, score: entryScore(entry, normalizedQuery, tokens) }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.entry.position - right.entry.position)
    .map(({ entry }) => entry.product);
}
