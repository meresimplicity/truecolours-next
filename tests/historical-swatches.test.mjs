import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { segmentChartChips, sampleChipHex } from "../lib/paint/chart-segmentation.ts";
import { textOnlySamples } from "../lib/paint/chart-samples.ts";
import { historicalLibrary } from "../lib/paint/historical-library.ts";

const cache = JSON.parse(fs.readFileSync(new URL("../data/processed/historical-paint-samples.json", import.meta.url), "utf8"));

test("chart extraction keeps dark, pale and saturated chips while excluding labels and rules", () => {
  const width = 480, height = 420;
  const rgb = new Uint8Array(width * height * 3);
  const fill = (x, y, w, h, colour) => {
    for (let row = y; row < y + h; row++) for (let col = x; col < x + w; col++) rgb.set(colour, (row * width + col) * 3);
  };
  fill(0, 0, width, height, [245, 244, 238]);
  const colours = [[5, 10, 12], [90, 35, 25], [216, 219, 210], [48, 94, 143]];
  for (let i = 0; i < colours.length; i++) {
    const x = 35 + (i % 2) * 230, y = 60 + Math.floor(i / 2) * 150;
    fill(x, y, 100, 65, colours[i]);
    for (let letter = 0; letter < 6; letter++) fill(x + letter * 13, y + 78, 5, 8, [20, 20, 20]);
  }
  fill(15, 20, 450, 2, [15, 15, 15]);
  const chips = segmentChartChips(rgb, width, height);
  assert.equal(chips.length, 4);
  assert.deepEqual(chips.map(chip => chip.hex), ["#050a0c", "#5a2319", "#d8dbd2", "#305e8f"]);
  assert.equal(sampleChipHex(rgb, width, chips[0]), "#050a0c");
});

test("text-only combinations use the paint reference, not the combination number", () => {
  const word = (text, x, width) => ({ text, x, width, y: 100, height: 10, confidence: 95 });
  const samples = textOnlySamples([word("696", 10, 20), word("Upper", 36, 30), word("ONYX", 72, 28), word("BLACK", 106, 32), word("9200", 250, 32)], "https://cdn.shopify.com/s/files/1/0271/7931/9375/files/1956-chevrolet-test.jpg", 0);
  assert.equal(samples.length, 1);
  assert.equal(samples[0].name, "ONYX BLACK");
  assert.equal(samples[0].chipReference, "9200");
  assert.equal(samples[0].manufacturerCode, undefined);
});

test("every published historic ordering image has a natural sampled swatch", () => {
  const urls = new Set(Object.values(historicalLibrary().details).flatMap(book => book.colours.map(colour => colour.imageUrl).filter(Boolean)));
  assert.ok(urls.size >= 320);
  for (const url of urls) {
    assert.ok(cache.named[url], `Missing named swatch: ${url}`);
    assert.match(cache.named[url].swatchHex, /^#[0-9a-f]{6}$/i);
  }
});

test("scanned and document-only colours remain available with their original references", () => {
  const library = historicalLibrary();
  const ford = cache.charts[library.details["1926-ford"].charts[0]];
  assert.equal(ford.filter(sample => sample.region).length, 8);
  const textPage = cache.charts[library.details["1965-chevrolet"].charts[1]];
  assert.ok(textPage.length > 25);
  assert.ok(textPage.some(sample => sample.chipReference === "22596"));
  for (const samples of Object.values(cache.charts)) for (const sample of samples) {
    assert.match(sample.swatchHex, /^#[0-9a-f]{6}$/i);
    assert.equal(sample.manufacturerCode, undefined, "OCR chart references must not be presented as OEM codes");
    assert.ok(sample.sourceUrl.startsWith("https://cdn.shopify.com/"));
  }
});
