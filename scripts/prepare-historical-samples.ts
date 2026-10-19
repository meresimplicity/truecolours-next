import fs from "node:fs";
import path from "node:path";
import { historicalLibrary } from "../lib/paint/historical-library.ts";
import { extractChartSamples, sampleFromOrderingImage, terminateChartOCR, type HistoricalSample } from "../lib/paint/chart-samples.ts";

const destination = path.join(process.cwd(), "data/processed/historical-paint-samples.json");
const output: { charts: Record<string, HistoricalSample[]>; named: Record<string, HistoricalSample> } = fs.existsSync(destination) ? JSON.parse(fs.readFileSync(destination, "utf8")) : { charts: {}, named: {} };
const library = historicalLibrary();
const save = () => { fs.writeFileSync(`${destination}.tmp`, JSON.stringify(output)); fs.renameSync(`${destination}.tmp`, destination); };
const pending = Object.values(library.details).flatMap((book) => book.colours.filter((colour) => colour.imageUrl && !output.named[colour.imageUrl]).map((colour) => ({ book, colour })));
let done = 0;
const failures: string[] = [];
await Promise.all(Array.from({ length: 3 }, async () => {
  while (pending.length) {
    const { book, colour } = pending.shift()!;
    try {
      const swatchHex = await sampleFromOrderingImage(colour.imageUrl!);
      output.named[colour.imageUrl!] = { id: `${book.id}-${colour.chipReference}`, name: colour.name, swatchHex, sourceUrl: colour.imageUrl!, manufacturerCode: colour.manufacturerCode, chipReference: colour.chipReference };
    } catch { failures.push(colour.imageUrl!); }
    done++;
    if (done % 50 === 0) { save(); console.log(`Prepared ${done} ordering swatches; ${failures.length} unavailable images.`); }
  }
}));
save();
const bookArgument = process.argv.find((arg) => arg.startsWith("--books="));
const requestedBooks = bookArgument?.slice(8).split(",") ?? [];
const books = Object.values(library.details).filter((book) => process.argv.includes("--all") || requestedBooks.includes(book.id));
for (const book of books) {
  for (const [index, url] of book.charts.entries()) {
    if (output.charts[url] && !process.argv.includes("--refresh")) continue;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      output.charts[url] = await extractChartSamples(Buffer.from(await response.arrayBuffer()), url, index);
      save();
      console.log(`${book.id} page ${index + 1}: ${output.charts[url].length} colour chips.`);
    } catch (error) { failures.push(url); console.log(`${book.id} page ${index + 1}: ${error instanceof Error ? error.message : "unavailable"}; original link preserved.`); }
  }
}
await terminateChartOCR();
console.log(`Saved ${Object.keys(output.named).length} named swatches and ${Object.keys(output.charts).length} chart pages. ${failures.length} failed images.`);
if (failures.length) process.exitCode = 1;
