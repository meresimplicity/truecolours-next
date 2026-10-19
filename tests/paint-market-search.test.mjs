import test from "node:test";
import assert from "node:assert/strict";
import { MARKET_COLOURS, paintMarketCoverage, searchMarketColours } from "../lib/paint/market-library.ts";
import { matchesPaintMarket, resolvePaintMarketQuery } from "../lib/paint/markets.ts";
import { LocalOpenDataProvider } from "../lib/paint/local-provider.ts";
import { paintColourFamilies } from "../lib/paint/colour-families.ts";

test("country queries search documented sales markets, independently of manufacturer origin", () => {
  const germany = searchMarketColours("", "DE");
  assert.equal(germany.length, 50);
  assert.ok(germany.every((record) => record.marketEvidence.countryCode === "DE"));
  assert.ok(germany.some((record) => record.brand === "Toyota"), "A sales market also contains imported manufacturers");
  assert.ok(searchMarketColours("white", "DE").length > 0);
  assert.equal(searchMarketColours("Mustang", "DE").length, 0);
  assert.ok(searchMarketColours("Mustang", "US").every((record) => record.marketEvidence.countryCode === "US"));
});

test("Europe includes its documented countries and excludes US and Japanese palettes", () => {
  const europe = searchMarketColours("", "EUROPE");
  assert.equal(europe.length, 170);
  assert.deepEqual([...new Set(europe.map((record) => record.marketEvidence.countryCode))].sort(), ["AT", "DE", "FR", "GB", "IT", "NL", "UA"]);
  assert.equal(matchesPaintMarket("US", "EUROPE"), false);
  assert.equal(matchesPaintMarket("JP", "EUROPE"), false);
  assert.deepEqual(resolvePaintMarketQuery("European blue"), { country: "EUROPE", query: "blue" });
  assert.deepEqual(resolvePaintMarketQuery("America blue"), { country: "US", query: "blue" });
  assert.deepEqual(resolvePaintMarketQuery("Germany white"), { country: "DE", query: "white" });
  assert.deepEqual(resolvePaintMarketQuery("Europe Germany white"), { country: "DE", query: "white" });
  assert.deepEqual(resolvePaintMarketQuery("Germany white", "EUROPE"), { country: "DE", query: "white" });
  assert.deepEqual(resolvePaintMarketQuery("LY9B / A2"), { country: "", query: "LY9B / A2" });
  assert.deepEqual(resolvePaintMarketQuery("British Racing Green"), { country: "", query: "British Racing Green" });
});

test("European green searches include verified regional names and translations across makes", () => {
  const greens = searchMarketColours("green", "EUROPE");
  assert.equal(greens.length, 17);
  for (const brand of ["BMW", "Audi", "MINI", "Peugeot", "Fiat", "Škoda"]) assert.ok(greens.some((record) => record.brand === brand), brand);
  for (const name of ["M Isle of Man Grün", "Distriktgrün Metallic", "Vert Olivine", "Verde Foresta", "British Racing Green IV", "Highland Green"]) assert.ok(greens.some((record) => record.name === name), name);
  assert.ok(searchMarketColours("green", "DE").some((record) => record.code === "C4G"));
  assert.ok(searchMarketColours("green", "FR").some((record) => record.name === "Vert Olivine"));
  assert.ok(searchMarketColours("green", "IT").some((record) => record.name === "Verde Foresta"));
  assert.ok(searchMarketColours("green", "NL").some((record) => record.name === "Mamba Green"));
  assert.ok(searchMarketColours("blue", "FR").some((record) => record.name === "Bleu Obsession"));
  assert.ok(searchMarketColours("white", "DE").some((record) => record.name === "Alpinweiß"));
  assert.ok(!greens.some((record) => record.name === "Vertigo Blue"), "French vert must not match Vertigo Blue");
  assert.equal(paintColourFamilies("Red with Black roof"), "Red Black", "Dutch wit must not match the English word with");
});

test("regional editions preserve names, evidence and unknown codes without inventing model years", () => {
  const australia = searchMarketColours("040", "AU");
  const canada = searchMarketColours("040", "CA");
  assert.ok(australia.some((colour) => colour.name === "Glacier White"));
  assert.ok(canada.some((colour) => colour.name === "Super White"));
  assert.ok(australia.every((colour) => colour.yearFrom === undefined), "A brochure date is not a model-year claim");
  assert.ok(canada.every((colour) => colour.yearFrom === 2020));
  assert.ok(searchMarketColours("", "IN").every((colour) => colour.code === "" && colour.displayCode === "Code not published"));
  for (const colour of MARKET_COLOURS) {
    assert.ok(colour.marketEvidence.sourceUrl.startsWith("https://"));
    assert.ok(colour.marketEvidence.sourceTitle && colour.marketEvidence.edition);
    assert.equal(colour.verified, false, "Published regional availability is not a physical paint verification");
  }
  assert.equal(paintMarketCoverage().reduce((total, market) => total + market.colourCount, 0), MARKET_COLOURS.length);
});

test("untagged general records stay untagged; regional previews do not invent country provenance", async () => {
  const provider = new LocalOpenDataProvider();
  const general = await provider.searchByCode("LY9B");
  assert.ok(general.length > 0);
  assert.ok(general.every((record) => !record.market && !record.marketEvidence));
  const regional = provider.withIndicativeSwatches(searchMarketColours("040", "DE"));
  assert.ok(regional.length > 0);
  assert.equal(regional[0].marketEvidence.countryCode, "DE");
  if (regional[0].swatchHex) assert.equal(regional[0].swatchVerified, false);
});
