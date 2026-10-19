import fs from "node:fs";
import { MARKET_COLOURS, paintMarketCoverage } from "../lib/paint/market-library.ts";
import { hasPaintVerificationEvidence, preserveDistinctPaintIds, restoreKnownHondaCode } from "../lib/paint/catalogue-quality.ts";
import { paintColourFamilies } from "../lib/paint/colour-families.ts";
import type { PaintColor } from "../types/paint.ts";

const records: PaintColor[] = JSON.parse(fs.readFileSync("data/paint-records.json", "utf8"));
const ids = new Map<string, PaintColor[]>();
const swatches = new Map<string, Set<string>>();
for (const record of records) {
  ids.set(record.id, [...(ids.get(record.id) || []), record]);
  const hex = record.swatchHex || record.hex;
  if (hex) {
    const key = `${record.brand}|${record.code}`;
    const values = swatches.get(key) || new Set<string>();
    values.add(hex.toUpperCase());
    swatches.set(key, values);
  }
}
const runtime = preserveDistinctPaintIds(records.map(restoreKnownHondaCode));
const report = {
  checkedAt: "2026-10-15",
  scope: "Structural audit of all stored records plus manufacturer-source regional expansion. This does not independently certify every legacy code, model-year fitment or digital swatch.",
  generalCatalogue: {
    records: records.length,
    brands: new Set(records.map((record) => record.brand)).size,
    noDocumentedSalesCountry: records.filter((record) => !record.marketEvidence).length,
    selfReferencingCatalogueSource: records.filter((record) => record.sourceUrl === "https://truecolourspaints.co.za/catalogue").length,
    collidingIds: [...ids].filter(([, entries]) => entries.length > 1).map(([id, entries]) => ({ id, records: entries.length, names: [...new Set(entries.map((record) => record.name))] })),
    correctedHondaCodeRecords: records.filter((record) => restoreKnownHondaCode(record) !== record).length,
    verificationClaimsWithoutEvidence: records.filter((record) => record.verified && !hasPaintVerificationEvidence(record)).map((record) => record.id),
    conflictingSwatchReferences: [...swatches].filter(([, values]) => values.size > 1).map(([reference, values]) => ({ reference, hexValues: [...values] })),
    distinctRuntimeIds: new Set(runtime.map((record) => record.id)).size,
    runtimeRecords: runtime.length,
    remainingRepeatedIds: runtime.length - new Set(runtime.map((record) => record.id)).size,
  },
  regionalCatalogue: {
    listings: MARKET_COLOURS.length,
    palettes: new Set(MARKET_COLOURS.map((record) => record.sourceId)).size,
    countries: paintMarketCoverage().length,
    namesWithoutPublishedCodes: MARKET_COLOURS.filter((record) => !record.code).length,
    namesWithColourFamilySearchTerms: MARKET_COLOURS.filter((record) => record.baseColor || paintColourFamilies(record.name)).length,
    coverage: paintMarketCoverage(),
  },
  appliedSafeguards: [
    "Search and pagination preserve all distinct references rather than stopping at fifty.",
    "Different colours sharing an old identifier retain separate stable runtime identifiers and sales references.",
    "Honda's six documented code/name pairs restore fifteen split codes without inferring sales-country or model-year evidence.",
    "A verification badge requires a recorded verifier and valid verification date.",
    "A regional reference swatch is reused only when same-brand/code hex references agree; otherwise a clearly labelled, unverified name-based estimate supplies the digital preview.",
    "Country searches require manufacturer-published regional evidence; absent countries and missing codes remain unconfirmed.",
  ],
};

const output = JSON.stringify(report, null, 2) + "\n";
const outputIndex = process.argv.indexOf("--output");
if (outputIndex >= 0 && process.argv[outputIndex + 1]) fs.writeFileSync(process.argv[outputIndex + 1], output);
else process.stdout.write(output);
