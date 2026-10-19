import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { AUTO_COLOR_LIBRARY_ORIGIN, historicalBookFromUrl, parseHistoricalBook, sitemapLocations, type HistoricalBook, type HistoricalBookDetail } from "../lib/paint/historical-source.ts";

const destination = path.join(process.cwd(), "data", "processed", "historical-paint-library.json");

async function download(url: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(15000), headers: { "User-Agent": "TRUECOLOURS-Paint-Reference/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw new Error("Unable to download source");
}

export async function importHistoricalPaint() {
  const sitemap = await download(`${AUTO_COLOR_LIBRARY_ORIGIN}/sitemap.xml`);
  const sources = sitemapLocations(sitemap).filter((url) => new URL(url).origin === AUTO_COLOR_LIBRARY_ORIGIN && /\/sitemap_pages_\d+\.xml/.test(url));
  if (!sources.length) throw new Error("No public page sitemaps found; existing dataset preserved.");
  const booksById = new Map<string, HistoricalBook>();
  let sourcePageCount = 0;
  for (const source of sources) {
    for (const url of sitemapLocations(await download(source))) {
      sourcePageCount++;
      const book = historicalBookFromUrl(url);
      if (!book) continue;
      const previous = booksById.get(book.id);
      // The source retains both legacy scan pages and newer ordering pages.
      const rank = (url: string) => /-\d+$/.test(url) ? 0 : /car-colo[ur]+s$/.test(url) ? 1 : 2;
      if (!previous || rank(book.sourceUrl) > rank(previous.sourceUrl)) booksById.set(book.id, book);
    }
  }
  const books = [...booksById.values()].sort((a, b) => b.year - a.year || a.make.localeCompare(b.make));
  if (books.length < 1000) throw new Error("Unexpectedly incomplete source index; existing dataset preserved.");
  const previous = fs.existsSync(destination) ? JSON.parse(fs.readFileSync(destination, "utf8")) : { details: {} };
  const details: Record<string, HistoricalBookDetail> = previous.metadata?.parserVersion === 2 ? previous.details ?? {} : {};
  const failed: string[] = [];
  const pending = books.filter((book) => book.year < 1978 && (!details[book.id] || details[book.id].sourceUrl !== book.sourceUrl));
  let completed = 0;
  const metadata = {
    source: "Auto Color Library / TCP Global", sourceUrl: AUTO_COLOR_LIBRARY_ORIGIN, parserVersion: 2,
    retrievedAt: new Date().toISOString(), sitemapCount: sources.length, sourcePageCount,
    bookCount: books.length, historicBookCount: books.filter((book) => book.year < 1978).length,
    coverage: "Every year/make colour-book URL in the public page sitemaps; original scanned charts and published ordering-card identifiers. Model applicability and physical paint matching require confirmation.",
  };
  const save = () => {
    const output = { metadata: { ...metadata, detailedBookCount: Object.keys(details).length, colourCount: Object.values(details).reduce((sum, book) => sum + book.colours.length, 0), failedBookIds: failed }, books, details };
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(`${destination}.tmp`, JSON.stringify(output));
    fs.renameSync(`${destination}.tmp`, destination);
  };
  save();
  console.log(`Indexed ${books.length} colour books from ${sources.length} sitemaps; ${pending.length} historic books to inspect.`);
  // Three requests at a time; cache completed pages for resumable imports.
  await Promise.all(Array.from({ length: 3 }, async () => {
    while (pending.length) {
      const book = pending.shift()!;
      try { details[book.id] = parseHistoricalBook(await download(book.sourceUrl), book); }
      catch { failed.push(book.id); }
      completed++;
      if (completed % 50 === 0) { save(); console.log(`Inspected ${completed} books; ${Object.values(details).reduce((sum, item) => sum + item.colours.length, 0)} published colour records; ${failed.length} unavailable pages.`); }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }));
  save();
  console.log(`Saved ${books.length} books, ${Object.keys(details).length} detailed books and ${Object.values(details).reduce((sum, book) => sum + book.colours.length, 0)} colour records to ${destination}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  importHistoricalPaint().catch((error) => { console.error(error); process.exitCode = 1; });
}
