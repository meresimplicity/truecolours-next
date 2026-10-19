import type { CodeSearchResult, PaintColor } from "../../types/paint.ts";
import { normalizeColorName, normalizePaintCode } from "../../scripts/normalize-paint-codes.ts";

/** Match every word against the same colour, including optional vehicle details. */
export function getPaintSearchMatch(record: PaintColor, query: string): Pick<CodeSearchResult, "matchType" | "relevanceScore"> | null {
  const textQuery = normalizeColorName(query);
  const codeQuery = normalizePaintCode(query);
  if (!textQuery || !codeQuery) return null;

  const codes = [record.primaryCode || record.code, ...(record.salesCodes || []), ...(record.aliases || [])].map(normalizePaintCode).filter(Boolean);
  const displayCode = normalizePaintCode(record.displayCode || codes.join(""));
  const name = normalizeColorName(record.name);
  const alternativeNames = (record.alternativeNames || []).map((alt) => normalizeColorName(alt.name));
  let matchType: CodeSearchResult["matchType"];
  let relevanceScore: number;

  if (codes.includes(codeQuery) || displayCode === codeQuery) {
    matchType = "exact_code";
    relevanceScore = 100;
  } else if (codes.some((code) => code.startsWith(codeQuery))) {
    matchType = "prefix_code";
    relevanceScore = 80;
  } else if (name === textQuery) {
    matchType = "exact_name";
    relevanceScore = 75;
  } else if (codes.some((code) => code.includes(codeQuery))) {
    matchType = "partial_code";
    relevanceScore = 65;
  } else if (name.includes(textQuery)) {
    matchType = "partial_name";
    relevanceScore = 50;
  } else if (alternativeNames.some((alt) => alt.includes(textQuery))) {
    matchType = "alias_name";
    relevanceScore = 45;
  } else {
    const searchable = normalizeColorName([record.brand, record.model, record.name, record.baseColor, record.finish, ...codes, ...alternativeNames].join(" "));
    const words = textQuery.split(" ");
    const matches = words.every((word) => {
      if (/^(18|19|20)\d{2}$/.test(word)) {
        const year = Number(word);
        return record.years?.includes(year) || (year >= (record.yearFrom ?? record.year ?? Infinity) && year <= (record.yearTo ?? record.year ?? -Infinity));
      }
      return searchable.includes(word);
    });
    if (!matches) return null;
    matchType = "vehicle";
    relevanceScore = 35;
  }
  return { matchType, relevanceScore: relevanceScore + (record.verified ? 10 : 0) };
}

export function paginatePaintSearch(results: CodeSearchResult[], { page = 1, limit = 24, sortBy = "relevance" }: { page?: number; limit?: number; sortBy?: string } = {}) {
  const pageSize = Number.isFinite(limit) ? Math.min(96, Math.max(1, Math.floor(limit))) : 24;
  const total = results.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Number.isFinite(page) ? Math.min(totalPages, Math.max(1, Math.floor(page))) : 1;
  const sorted = [...results];
  if (["name_asc", "name_desc", "code_asc", "code_desc"].includes(sortBy)) {
    sorted.sort((a, b) => {
      const aValue = sortBy.startsWith("name") ? a.name : a.primaryCode || a.code;
      const bValue = sortBy.startsWith("name") ? b.name : b.primaryCode || b.code;
      return (sortBy.endsWith("desc") ? -1 : 1) * aValue.localeCompare(bValue) || a.id.localeCompare(b.id);
    });
  }
  return {
    data: sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    pagination: { total, page: currentPage, limit: pageSize, totalPages },
  };
}
