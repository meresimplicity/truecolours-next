import test from "node:test";
import assert from "node:assert/strict";

import {
  DEFAULT_PROVIDER_CHAIN,
  mergePaintResults,
} from "../lib/paint/providers/index.ts";

const makeColor = (overrides = {}) => ({
  id: "color-1",
  brand: "Toyota",
  model: "Hilux",
  year: 2020,
  code: "040",
  name: "Glacier White",
  source: "open-data",
  verified: false,
  ...overrides,
});

test("default provider chain preserves production-safe source ordering", () => {
  assert.deepEqual(
    DEFAULT_PROVIDER_CHAIN.map((provider) => provider.name),
    ["truecolours", "open-vehicle", "local", "paint-calculators"]
  );
});

test("verified truecolours results are prioritized ahead of open-data and API matches", () => {
  const merged = mergePaintResults(
    [
      makeColor({ id: "api-1", source: "api", code: "040", verified: false }),
      makeColor({ id: "local-1", source: "open-data", code: "1D6", verified: false }),
    ],
    [
      makeColor({ id: "tc-1", source: "truecolours", code: "040", verified: true, notes: "Spectrophotometer confirmed" }),
    ]
  );

  assert.equal(merged[0].source, "truecolours");
  assert.equal(merged[0].verified, true);
  assert.equal(merged[0].code, "040");
  assert.ok(merged.some((entry) => entry.id === "local-1"));
});
