import fs from "node:fs";
import path from "node:path";
import type { HistoricalBook, HistoricalBookDetail } from "./historical-source.ts";
import { normalizeVehicleMake } from "../vehicles/makes.ts";

interface HistoricalLibrary {
  metadata: { retrievedAt: string; bookCount: number; historicBookCount: number; colourCount: number; detailedBookCount: number; failedBookIds: string[] };
  books: HistoricalBook[];
  details: Record<string, HistoricalBookDetail>;
}

let cached: HistoricalLibrary | null = null;
let loadedMtime = 0;

export function historicalLibrary(): HistoricalLibrary {
  const file = path.join(process.cwd(), "data", "processed", "historical-paint-library.json");
  const mtime = fs.statSync(file).mtimeMs;
  if (!cached || mtime !== loadedMtime) {
    cached = JSON.parse(fs.readFileSync(file, "utf8")) as HistoricalLibrary;
    loadedMtime = mtime;
  }
  return cached;
}

export function searchHistoricalLibrary({ era = "all", year, make, query = "", page = 1 }: { era?: string; year?: number; make?: string; query?: string; page?: number } = {}) {
  const library = historicalLibrary();
  const eraBooks = library.books.filter((book) => era === "all" || book.era === era);
  const yearBooks = eraBooks.filter((book) => !year || book.year === year);
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = yearBooks.filter((book) => {
    if (make && normalizeVehicleMake(book.make) !== normalizeVehicleMake(make)) return false;
    const details = library.details[book.id];
    const text = `${book.year} ${book.make} ${details?.colours.map((colour) => `${colour.name} ${colour.manufacturerCode ?? ""} ${colour.chipReference ?? ""}`).join(" ") ?? ""}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / 24));
  const currentPage = Math.min(totalPages, Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1));
  return {
    metadata: library.metadata,
    years: [...new Set(eraBooks.map((book) => book.year))].sort((a, b) => b - a),
    makes: [...new Set(yearBooks.map((book) => book.make))].sort((a, b) => a.localeCompare(b)),
    books: filtered.slice((currentPage - 1) * 24, currentPage * 24).map((book) => {
      const detail = library.details[book.id];
      return { ...book, colourCount: detail?.colours.length ?? 0, chartCount: detail?.charts.length ?? 0,
        previewUrl: detail?.charts[0] ?? detail?.colours.find((colour) => colour.imageUrl)?.imageUrl };
    }),
    pagination: { total: filtered.length, page: currentPage, totalPages },
  };
}
