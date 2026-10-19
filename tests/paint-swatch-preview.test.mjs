import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { MARKET_COLOURS } from "../lib/paint/market-library.ts";
import { paintSwatchPreview, paintSwatchStyle, withPaintSwatchPreview } from "../lib/paint/swatch-preview.ts";
import { LocalOpenDataProvider } from "../lib/paint/local-provider.ts";

test("every catalogue and regional colour has a valid digital preview", () => {
  const records = JSON.parse(fs.readFileSync(new URL("../data/paint-records.json", import.meta.url), "utf8"));
  for (const colour of [...records, ...MARKET_COLOURS]) {
    const preview = paintSwatchPreview(colour);
    assert.match(preview.hex, /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i, `${colour.brand} ${colour.name}`);
    assert.equal(paintSwatchStyle(colour).backgroundColor, preview.hex);
  }
  // Every currently added regional name has a recognised hue, including opaque
  // marketing names such as Ice Cap, Celestite and Molten Magenta.
  for (const colour of MARKET_COLOURS) {
    assert.notEqual(colour.swatchHex, "#8B9094", colour.name);
    assert.equal(colour.swatchEstimated, true);
    assert.equal(colour.swatchVerified, false);
  }
});

test("previously blank white listings show white rather than a grey placeholder", () => {
  for (const name of ["Arkonaweiß", "Nanuq White", "Cafe White", "Bianco Gelato", "Bianco Gelato Bi-Color"]) {
    const colour = MARKET_COLOURS.find((entry) => entry.name === name);
    assert.ok(colour, name);
    const { hex, estimated } = paintSwatchPreview(colour);
    assert.ok([1, 3, 5].every((offset) => parseInt(hex.slice(offset, offset + 2), 16) > 220), name);
    assert.equal(estimated, true);
    assert.match(colour.swatchSource, /not an OEM swatch/);
  }
});

test("existing valid reference swatches are preserved and invalid preferred fields cannot conceal them", () => {
  const reference = { name: "Special Green", hex: "#126B47", swatchVerified: true, swatchSource: "Recorded chip" };
  assert.equal(withPaintSwatchPreview(reference).swatchHex, "#126B47");
  assert.equal(withPaintSwatchPreview(reference).swatchVerified, true);
  assert.equal(withPaintSwatchPreview(reference).swatchEstimated, false);
  assert.equal(paintSwatchPreview({ ...reference, swatchHex: "invalid" }).hex, "#126B47");
  assert.equal(paintSwatchPreview({ ...reference, swatchHex: "#abc" }).hex, "#abc");
  const estimate = withPaintSwatchPreview({ name: "Verde Foresta", swatchVerified: true });
  assert.equal(estimate.swatchEstimated, true);
  assert.equal(estimate.swatchVerified, false);
  assert.equal(withPaintSwatchPreview(estimate).swatchEstimated, true);
});

test("explicit black roof previews retain the body colour and show both colours consistently", () => {
  for (const name of ["Cafe White with Black roof", "Glacier White with black roof", "Platinum White Pearl / Black", "Sportin Red with Black roof"]) {
    const colour = MARKET_COLOURS.find((entry) => entry.name === name);
    const preview = paintSwatchPreview(colour);
    assert.equal(preview.secondaryHex, "#1C1E21");
    assert.notEqual(preview.hex, preview.secondaryHex, name);
    assert.match(paintSwatchStyle(colour).backgroundImage, /linear-gradient/);
    assert.equal(paintSwatchStyle(colour).backgroundColor, preview.hex);
  }
  // A bi-colour name alone does not establish which second colour was sold.
  assert.equal(paintSwatchPreview({ name: "Bianco Gelato Bi-Color" }).secondaryHex, undefined);
});

test("regional reference reuse replaces an estimate only when catalogue references agree", () => {
  const provider = new LocalOpenDataProvider();
  const colours = provider.withIndicativeSwatches(MARKET_COLOURS);
  assert.equal(colours.length, MARKET_COLOURS.length);
  assert.ok(colours.some((colour) => !colour.swatchEstimated));
  for (const colour of colours) {
    assert.match(colour.swatchHex, /^#[0-9a-f]{6}$/i);
    assert.equal(colour.swatchVerified, false);
    assert.deepEqual(colour.marketEvidence, MARKET_COLOURS.find((entry) => entry.id === colour.id).marketEvidence);
  }
  assert.equal(colours.find((colour) => colour.code === "C4E").swatchEstimated, true);
});
