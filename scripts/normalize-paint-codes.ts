/**
 * Paint Code Normalization Utility
 * Standardizes automotive paint codes and names for uniform indexing and search.
 */

export function normalizePaintCode(code: string | undefined): string {
  if (!code) return "";
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .trim();
}

export function parseMultiCode(codeStr: string): { primaryCode: string; salesCodes: string[] } {
  if (!codeStr) return { primaryCode: "", salesCodes: [] };

  // A hyphen can be part of one OEM code, e.g. Honda NH-731P.
  // Only explicit separators establish separate sales/order references.
  const parts = codeStr
    .split(/[\/,|]+/)
    .map((p) => p.trim().toUpperCase())
    .filter(Boolean);

  if (parts.length === 0) {
    return { primaryCode: "", salesCodes: [] };
  }

  const primaryCode = parts[0];
  const salesCodes = parts.slice(1);

  return { primaryCode, salesCodes };
}

export function formatDisplayCode(primaryCode: string, salesCodes?: string[]): string {
  if (!salesCodes || salesCodes.length === 0) {
    return primaryCode;
  }
  const cleanSales = salesCodes.filter((s) => s && s !== primaryCode);
  if (cleanSales.length === 0) return primaryCode;
  return `${primaryCode} / ${cleanSales.join(" / ")}`;
}

export function normalizeColorName(name: string | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cleanText(str: string | undefined): string {
  if (!str) return "";
  return str.trim().replace(/\s+/g, " ");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
