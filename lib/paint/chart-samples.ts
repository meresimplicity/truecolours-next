import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { createWorker, PSM, type Worker } from "tesseract.js";
import { sampleChipHex, segmentChartChips, type ChipRegion } from "./chart-segmentation.ts";

export interface HistoricalSample {
  id: string;
  name: string;
  swatchHex: string;
  sourceUrl: string;
  sourceLabel?: string;
  manufacturerCode?: string;
  chipReference?: string;
  chartIndex?: number;
  swatchSource?: "chart" | "name-reference";
  region?: { x: number; y: number; width: number; height: number };
}

interface TextLine { text: string; confidence: number; x: number; y: number; width: number; height: number; }
interface SampleCache { charts: Record<string, HistoricalSample[]>; named: Record<string, HistoricalSample>; }
let stored: SampleCache | null = null;
let storedMtime = 0;
export function historicalSampleCache(): SampleCache {
  const file = path.join(process.cwd(), "data/processed/historical-paint-samples.json");
  const mtime = fs.existsSync(file) ? fs.statSync(file).mtimeMs : 0;
  if (!stored || mtime !== storedMtime) {
    stored = mtime ? JSON.parse(fs.readFileSync(file, "utf8")) : { charts: {}, named: {} };
    storedMtime = mtime;
  }
  return stored!;
}

let ocrWorker: Promise<Worker> | null = null;
let ocrQueue: Promise<unknown> = Promise.resolve();
const chartJobs = new Map<string, Promise<HistoricalSample[]>>();

function worker() {
  if (!ocrWorker) ocrWorker = createWorker("eng", 1, {
    langPath: path.join(process.cwd(), "node_modules/@tesseract.js-data/eng/4.0.0_best_int"),
    cacheMethod: "none",
  }).then(async (instance) => {
    await instance.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT, user_defined_dpi: "150" });
    return instance;
  });
  return ocrWorker;
}

export async function terminateChartOCR() {
  await ocrQueue;
  if (ocrWorker) await (await ocrWorker).terminate();
  ocrWorker = null;
}

async function readLabels(image: Buffer, width: number, height: number, regions: ChipRegion[]): Promise<TextLine[]> {
  const job = ocrQueue.then(async () => {
    // Blank only the insides of the chips; textured paint must not become text.
    const scale = Math.min(2200 / width, 3000 / height);
    const mask = `<svg width="${Math.round(width * scale)}" height="${Math.round(height * scale)}"><g transform="scale(${scale})">${regions.map((r) => `<rect x="${r.x + 2}" y="${r.y + 2}" width="${Math.max(1, r.width - 4)}" height="${Math.max(1, r.height - 4)}" fill="white"/>`).join("")}</g></svg>`;
    const enlarged = await sharp(image).rotate().resize(Math.round(width * scale), Math.round(height * scale)).composite([{ input: Buffer.from(mask) }]).png().toBuffer();
    const { data } = await (await worker()).recognize(enlarged, {}, { blocks: true, text: false });
    return (data.blocks ?? []).flatMap((block) => block.paragraphs.flatMap((paragraph) => paragraph.lines.flatMap((line) => line.words.map((word) => ({
      text: word.text.trim(), confidence: word.confidence,
      x: word.bbox.x0 / scale, y: word.bbox.y0 / scale,
      width: (word.bbox.x1 - word.bbox.x0) / scale, height: (word.bbox.y1 - word.bbox.y0) / scale,
    }))))).filter((line) => line.confidence >= 30 && line.text.length > 0);
  });
  ocrQueue = job.then(() => undefined, () => undefined);
  return job;
}

async function readIsolatedLabel(image: Buffer, width: number, height: number, chip: ChipRegion, chips: ChipRegion[]) {
  const next = chips.filter((other) => other.y > chip.y + chip.height && Math.abs(other.x - chip.x) < chip.width * .5).sort((a, b) => a.y - b.y)[0];
  const belowTop = Math.min(height - 1, Math.round(chip.y + chip.height));
  const belowHeight = Math.max(1, Math.min(height - belowTop, (next?.y ?? height) - belowTop, Math.max(28, chip.height * .9)));
  const rectangles = [
    ...(chip.x > 65 ? [{ left: Math.max(0, Math.floor(chip.x - Math.max(chip.width * 3, 240))), top: Math.floor(chip.y), width: Math.min(Math.floor(chip.x - 3), Math.floor(Math.max(chip.width * 3, 240))), height: Math.floor(chip.height) }] : []),
    { left: Math.max(0, Math.floor(chip.x - 8)), top: belowTop, width: Math.min(width - Math.max(0, Math.floor(chip.x - 8)), Math.ceil(chip.width + 16)), height: Math.floor(belowHeight) },
  ];
  const job = ocrQueue.then(async () => {
    for (const rectangle of rectangles) {
      if (rectangle.width < 1 || rectangle.height < 1) continue;
      const scale = Math.min(2200 / width, 3000 / height);
      const enlargedRectangle = { left: Math.round(rectangle.left * scale), top: Math.round(rectangle.top * scale), width: Math.max(1, Math.floor(rectangle.width * scale)), height: Math.max(1, Math.floor(rectangle.height * scale)) };
      const enlarged = await sharp(image).rotate().resize(Math.round(width * scale), Math.round(height * scale)).png().toBuffer();
      const cropped = await sharp(enlarged).extract(enlargedRectangle).resize({ width: Math.max(600, rectangle.width * 3) }).greyscale().normalise().png().toBuffer();
      const { data } = await (await worker()).recognize(cropped, { tessedit_pageseg_mode: PSM.SINGLE_BLOCK } as object, { text: true });
      const rows = data.text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const name = rows.find((line) => colourWords.test(line) && !/^(?:DAL|DDL|DQE)\b/i.test(line));
      if (name) return { name: name.replace(/\s+(?:TCP|DAL|DDL|DQE)\b.*$/i, "").replace(/\s+\d{3,}\s*$/, "").trim(), sourceLabel: rows.join(" · ") };
    }
    return null;
  });
  ocrQueue = job.then(() => undefined, () => undefined);
  return job;
}

/** A text-only listing still gets a visible, explicitly indicative preview. */
export function referenceHexForName(name: string): string {
  const palette: Array<[RegExp, string]> = [
    [/black/i, "#090a0b"], [/white|ivory/i, "#e9e6dc"], [/silver|gunmetal/i, "#889095"],
    [/turquoise|aqua/i, "#507d7d"], [/maroon|burgundy/i, "#603333"], [/red|vermilion/i, "#a34036"],
    [/blue/i, "#506b83"], [/green/i, "#52684f"], [/yellow|cream|straw/i, "#d9cb91"],
    [/gold|bronze|copper/i, "#a58a59"], [/tan|beige|fawn|saddle/i, "#b09c7c"],
    [/brown/i, "#806a56"], [/gr[ae]y|slate|stone/i, "#858780"], [/orange/i, "#b66e3d"],
    [/orchid|purple|violet|plum/i, "#8a7887"], [/pink/i, "#c99f9e"],
  ];
  const base = palette.find(([word]) => word.test(name))?.[1] ?? "#8a8a80";
  if (/black|white/i.test(name)) return base;
  const channels = base.slice(1).match(/../g)!.map((value) => parseInt(value, 16));
  if (/dark|deep|midnight/i.test(name)) return `#${channels.map((channel) => Math.round(channel * .57).toString(16).padStart(2, "0")).join("")}`;
  if (/light|pale/i.test(name)) return `#${channels.map((channel) => Math.round(channel + (242 - channel) * .4).toString(16).padStart(2, "0")).join("")}`;
  return base;
}

function referenceKey(reference: string) {
  return reference.replace(/TCP|DAL|DDL|DQE|IM/gi, "").replace(/[^a-z0-9]/gi, "").replace(/^0+(?=\d)/, "").toLowerCase();
}

function bookKey(sourceUrl: string) {
  return sourceUrl.match(/\/files\/(\d{4})[-_]([a-z]+)/i)?.slice(1).join("-").toLowerCase();
}

export function textOnlySamples(words: TextLine[], sourceUrl: string, chartIndex: number): HistoricalSample[] {
  const rows = wordRows(words.filter((word) => word.confidence >= 45));
  const known = [...Object.values(historicalSampleCache().named), ...Object.values(historicalSampleCache().charts).flat()].filter((sample) => sample.swatchSource !== "name-reference" && bookKey(sample.sourceUrl) === bookKey(sourceUrl));
  const normalise = (name: string) => name.toLowerCase().replace(/\bpoly\b/g, "").replace(/[^a-z0-9]/g, "");
  const records: HistoricalSample[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    // Split a table row at column gaps before pairing names with references.
    const tokens = row.sort((a, b) => a.x - b.x);
    const cells: TextLine[][] = [];
    for (const token of tokens) {
      const last = cells[cells.length - 1];
      const previous = last?.[last.length - 1];
      if (!previous || token.x - previous.x - previous.width > Math.max(35, token.height * 3)) cells.push([token]);
      else last.push(token);
    }
    for (const [index, cell] of cells.entries()) {
      const text = cell.map((word) => word.text).join(" ");
      if (!colourWords.test(text) || text.split(/\s+/).length > 9 || /\b(?:USED|COLORS|COLOURS|COMBINATIONS|ONLY|SPECIFY|SEE)\b/i.test(text)) continue;
      const name = text.replace(/^\(?\d[\d/-]*\)?\s+/, "").replace(/^(?:Upper|Lower|Moulding)\s*[—–-]?\s*/i, "").replace(/\s+(?:TCP|DAL|DDL|DQE|\(IM[-\s])\b.*$/i, "").replace(/\s+[*+]?\d[\d/-]*\s*$/, "").replace(/[.,;]+$/, "").trim();
      if (!name || name.length > 55) continue;
      const adjacent = cells[index + 1]?.map((word) => word.text).join(" ") ?? "";
      const explicit = text.match(/(?:TCP\s*(?:IM[-\s]*)?|(?:DAL|DDL|DQE)[-\s.]?|IM[-\s]*)\d{3,}[A-Z0-9*/+-]*/i)?.[0];
      const rightReference = /\d{3,}/.test(adjacent) && !colourWords.test(adjacent) ? adjacent : undefined;
      const inline = /\b(?:Upper|Lower)\b/i.test(text) ? undefined : text.match(/\d{3,}[A-Z0-9*/+-]*/i)?.[0];
      const chipReference = explicit || rightReference || inline;
      const key = `${normalise(name)}-${chipReference ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const exact = known.find((sample) => chipReference && sample.chipReference && referenceKey(sample.chipReference) === referenceKey(chipReference)) ?? known.find((sample) => !chipReference && normalise(sample.name) === normalise(name));
      records.push({ id: `chart-${chartIndex + 1}-listing-${records.length + 1}`, name, chipReference, swatchHex: exact?.swatchHex || referenceHexForName(name), swatchSource: exact ? "chart" : "name-reference", sourceUrl, sourceLabel: chipReference ? `${name} · ${chipReference}` : name, chartIndex });
    }
  }
  return records;
}

const colourWords = /\b(black|white|blue|green|red|brown|gray|grey|beige|yellow|gold|silver|maroon|ivory|cream|orange|pink|purple|turquoise|orchid|bronze|tan|copper|violet|aqua|fawn|saddle|gunmetal|slate|stone|poly\.?|metallic|pearl|crimson)\b/i;
function wordRows(words: TextLine[]): TextLine[][] {
  const groups: TextLine[][] = [];
  for (const word of [...words].sort((a, b) => a.y - b.y || a.x - b.x)) {
    const row = groups.find((group) => Math.abs(group[0].y + group[0].height / 2 - word.y - word.height / 2) < Math.min(group[0].height, word.height) * .6);
    if (row) row.push(word); else groups.push([word]);
  }
  return groups;
}
function groupWords(words: TextLine[]): TextLine[] {
  return wordRows(words).map((group) => {
    group.sort((a, b) => a.x - b.x);
    const x = Math.min(...group.map((w) => w.x)), y = Math.min(...group.map((w) => w.y));
    return { text: group.map((w) => w.text).join(" "), confidence: group.reduce((n, w) => n + w.confidence, 0) / group.length, x, y,
      width: Math.max(...group.map((w) => w.x + w.width)) - x, height: Math.max(...group.map((w) => w.y + w.height)) - y };
  });
}
function labelForChip(chip: ChipRegion, chips: ChipRegion[], lines: TextLine[]) {
  const bottom = chip.y + chip.height;
  const next = chips.filter((c) => c.y > bottom && Math.abs(c.x - chip.x) < chip.width * .5).sort((a, b) => a.y - b.y)[0];
  const below = groupWords(lines.filter((line) => line.y >= bottom - 3 && line.y < Math.min(next?.y ?? Infinity, bottom + Math.max(28, chip.height * .9)) && line.x >= chip.x - 12 && line.x + line.width <= chip.x + chip.width + 12));
  const beside = groupWords(lines.filter((line) => line.y + line.height / 2 >= chip.y && line.y + line.height / 2 <= bottom && line.x + line.width <= chip.x + 8 && chip.x - line.x < Math.max(chip.width * 3, 240)));
  const right = groupWords(lines.filter((line) => line.y + line.height / 2 >= chip.y && line.y + line.height / 2 <= bottom && line.x >= chip.x + chip.width - 3 && line.x < chip.x + chip.width + Math.max(110, chip.width * 1.5)));
  const sides = [beside, right].filter((rows) => rows.some((line) => colourWords.test(line.text))).sort((a, b) => {
    const distance = (rows: TextLine[]) => Math.min(...rows.filter((row) => colourWords.test(row.text)).map((row) => row.x > chip.x ? row.x - chip.x - chip.width : chip.x - row.x - row.width));
    return distance(a) - distance(b);
  });
  const nearby = below.some((line) => colourWords.test(line.text)) ? below : sides[0] ?? below;
  const names = nearby.filter((line) => colourWords.test(line.text));
  const chosen = names.sort((a, b) => a.y - b.y)[0];
  // These labels can supply a chart reference, but never an OEM code.
  const prefix = sides[0] === right && chosen ? nearby.filter((row) => row.y < chosen.y && !/\d|TCP|DAL|DDL|DQE/i.test(row.text)).map((row) => row.text).join(" ") : "";
  const name = chosen ? `${prefix ? `${prefix} ` : ""}${chosen.text}`.replace(/\s+(?:TCP|DAL|DDL|DQE)\b.*$/i, "").replace(/^\d[\d\s/-]*\s+/, "").replace(/\s+\d{3,}\s*$/, "").replace(/[,;]+$/, "").trim() : undefined;
  return { name, sourceLabel: nearby.map((line) => line.text).join(" · ") || undefined };
}

function recoverWhiteChips(rgb: Uint8Array, width: number, height: number, chips: ChipRegion[], lines: TextLine[]) {
  if (chips.length < 4) return;
  const sizes = chips.map((chip) => chip.width).sort((a, b) => a - b);
  const heights = chips.map((chip) => chip.height).sort((a, b) => a - b);
  const typicalWidth = sizes[Math.floor(sizes.length / 2)], typicalHeight = heights[Math.floor(heights.length / 2)];
  for (const line of lines.filter((line) => /\bwhite\b/i.test(line.text) && line.confidence >= 65)) {
    const centre = line.x + line.width / 2;
    if (chips.some((chip) => Math.abs(chip.x + chip.width / 2 - centre) < typicalWidth * .6 && line.y > chip.y && line.y < chip.y + chip.height + 35)) continue;
    const sameColumn = chips.filter((chip) => Math.abs(chip.x + chip.width / 2 - centre) < typicalWidth * .35);
    if (!sameColumn.length) continue;
    const x = Math.round(sameColumn[0].x);
    const codeLine = lines.filter((other) => other.y < line.y && other.y > line.y - 28 && /\d{3,}/.test(other.text) && Math.abs(other.x + other.width / 2 - centre) < typicalWidth * .5).sort((a, b) => b.y - a.y)[0];
    const y = Math.round((codeLine?.y ?? line.y - 12) - typicalHeight - 4);
    const region = { x, y, width: typicalWidth, height: typicalHeight };
    if (x < 0 || y < 0 || x + typicalWidth >= width || y + typicalHeight >= height) continue;
    const hex = sampleChipHex(rgb, width, region);
    const channels = hex.slice(1).match(/../g)!.map((v) => parseInt(v, 16));
    if (Math.min(...channels) > 175 && Math.max(...channels) - Math.min(...channels) < 55) chips.push({ ...region, hex });
  }
}

export async function extractChartSamples(image: Buffer, sourceUrl: string, chartIndex: number): Promise<HistoricalSample[]> {
  const { data: rgb, info } = await sharp(image, { limitInputPixels: 40_000_000 }).rotate().flatten({ background: "white" }).resize({ width: 1000, height: 1400, fit: "inside", withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const chips = segmentChartChips(rgb, info.width, info.height);
  const lines = await readLabels(image, info.width, info.height, chips);
  if (!chips.length) return textOnlySamples(lines, sourceUrl, chartIndex);
  recoverWhiteChips(rgb, info.width, info.height, chips, lines);
  chips.sort((a, b) => Math.abs(a.y - b.y) < Math.min(a.height, b.height) * .5 ? a.x - b.x : a.y - b.y);
  const samples: HistoricalSample[] = [];
  for (const [index, chip] of chips.entries()) {
    let label = labelForChip(chip, chips, lines);
    if (!label.name) label = await readIsolatedLabel(image, info.width, info.height, chip, chips) ?? label;
    samples.push({
      id: `chart-${chartIndex + 1}-sample-${index + 1}`, name: label.name || `Colour sample ${index + 1}`,
      swatchHex: chip.hex, swatchSource: "chart", sourceUrl, sourceLabel: label.sourceLabel,
      chipReference: label.sourceLabel?.match(/TCP\s*(?:IM\s*)?\d+|(?:DAL|DDL|DQE)[-\s.]?\d+|\b\d{4,5}\b/i)?.[0], chartIndex,
      region: { x: chip.x / info.width, y: chip.y / info.height, width: chip.width / info.width, height: chip.height / info.height },
    });
  }
  const normalise = (name: string) => name.toLowerCase().replace(/\bpoly\b/g, "").replace(/[^a-z0-9]/g, "");
  const listed = textOnlySamples(lines, sourceUrl, chartIndex).filter((entry) => {
    if (!entry.chipReference) return false;
    const match = samples.find((sample) => normalise(sample.name) === normalise(entry.name) || (sample.chipReference && referenceKey(sample.chipReference) === referenceKey(entry.chipReference!)));
    if (match && normalise(entry.name).startsWith(normalise(match.name)) && entry.name.length > match.name.length) match.name = entry.name;
    return !match;
  });
  return [...samples, ...listed];
}

async function downloadImage(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  if (!response.ok || !response.headers.get("content-type")?.startsWith("image/")) throw new Error("Original colour image unavailable");
  const image = Buffer.from(await response.arrayBuffer());
  if (image.length > 20_000_000) throw new Error("Colour chart exceeds the image limit");
  return image;
}

/** Only callers resolving a URL from the source catalogue can invoke this. */
export async function samplesForChart(sourceUrl: string, chartIndex: number): Promise<HistoricalSample[]> {
  const saved = historicalSampleCache().charts[sourceUrl];
  if (saved) return saved.map((sample) => ({ ...sample, chartIndex }));
  const existing = chartJobs.get(sourceUrl);
  if (existing) return existing;
  const job = downloadImage(sourceUrl).then((image) => extractChartSamples(image, sourceUrl, chartIndex));
  chartJobs.set(sourceUrl, job);
  if (chartJobs.size > 128) chartJobs.delete(chartJobs.keys().next().value!);
  try { return await job; } catch (error) { chartJobs.delete(sourceUrl); throw error; }
}

export async function sampleFromOrderingImage(sourceUrl: string): Promise<string> {
  const image = await downloadImage(sourceUrl);
  const { data, info } = await sharp(image).flatten({ background: "white" }).resize({ width: 350, height: 450, fit: "inside", withoutEnlargement: true }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const chips = segmentChartChips(data, info.width, info.height);
  const chip = chips.sort((a, b) => b.width * b.height - a.width * a.height)[0];
  return chip?.hex ?? sampleChipHex(data, info.width, { x: info.width * .1, y: info.height * .08, width: info.width * .8, height: info.height * .4 });
}
