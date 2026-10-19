import test from "node:test";
import assert from "node:assert/strict";
import { getPaintProvider } from "../lib/paint/provider.ts";
import { hasPaintVerificationEvidence, restoreKnownHondaCode } from "../lib/paint/catalogue-quality.ts";
import { parseMultiCode } from "../scripts/normalize-paint-codes.ts";
import { searchMarketColours } from "../lib/paint/market-library.ts";

test("all distinct colours survive legacy ID collisions and provider merging", async () => {
  const provider = getPaintProvider();
  const chery = await provider.searchByCode("Chery Tiggo 4 Pro");
  assert.equal(chery.length, 4);
  assert.equal(new Set(chery.map((record) => record.id)).size, 4);
  assert.deepEqual(chery.map((record) => record.name).sort(), ["Bloodstone Red", "Carbon Black", "Khaki White", "Quantum Grey"]);
  const honda = await provider.searchByCode("Honda Civic");
  for (const code of ["NH-578", "NH-731P", "NH-830M", "NH-797M", "NH-883P", "R-513"]) {
    assert.ok(honda.some((record) => record.code === code), code);
  }
  assert.ok((await provider.searchByCode("Honda NH731P")).length > 0);
  const prius = await provider.searchByCode("Toyota Prius");
  assert.ok(prius.some((record) => record.model === "Prius"));
  assert.ok(prius.some((record) => record.model === "Prius+"), "A plus sign must not collapse a distinct model");
  assert.equal(prius.length, new Set(prius.map((record) => record.id)).size);
});

test("Honda code punctuation stays inside a code and only documented legacy names are corrected", () => {
  assert.deepEqual(parseMultiCode("NH-731P"), { primaryCode: "NH-731P", salesCodes: [] });
  assert.deepEqual(parseMultiCode("NH-731P / A2"), { primaryCode: "NH-731P", salesCodes: ["A2"] });
  const unknown = { brand: "Honda", name: "Unconfirmed", code: "NH", salesCodes: ["123"] };
  assert.equal(restoreKnownHondaCode(unknown), unknown);
});

test("verification badges need recorded evidence and conflicting references use labelled estimates", async () => {
  assert.equal(hasPaintVerificationEvidence({ verified: true }), false);
  assert.equal(hasPaintVerificationEvidence({ verified: true, verifiedBy: "Desk", verifiedAt: "invalid" }), false);
  const provider = getPaintProvider();
  const unsupported = (await provider.searchByCode("040")).find((record) => record.id === "paint-toyota-corolla-040-2007");
  assert.equal(unsupported.verified, false);
  const sanremo = provider.withIndicativeSwatches(searchMarketColours("C4E", "DE"))[0];
  assert.match(sanremo.swatchHex, /^#[0-9a-f]{6}$/i);
  assert.equal(sanremo.swatchEstimated, true);
  assert.equal(sanremo.swatchVerified, false);
  assert.match(sanremo.swatchSource, /Estimated/);
});

test("complete newly indexed Honda palettes include every published colour family and full codes", () => {
  const civic = searchMarketColours("Honda Civic Sedan 2026", "US");
  assert.equal(civic.length, 7);
  assert.ok(civic.some((record) => record.code === "B-645P" && record.name === "Blue Lagoon Pearl"));
  assert.ok(civic.some((record) => record.code === "R-513"));
  assert.ok(civic.some((record) => record.code === "NH-883P"));
  assert.equal(searchMarketColours("Honda HR-V 2026", "US").length, 8);
  assert.equal(searchMarketColours("Honda Accord 2023", "US").length, 8);
  assert.equal(searchMarketColours("Honda Civic Sedan 2025", "US").length, 0);
});
