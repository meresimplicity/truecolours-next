import test from "node:test";
import assert from "node:assert/strict";

import {
  getBrandNames,
  getModelsForBrand,
  getMarketsForVehicle,
  findColorsForVehicle,
  searchByCode,
} from "../data/paint-codes-data.ts";

test("brand and model catalogues expose real vehicle entries", () => {
  assert.ok(getBrandNames().includes("Toyota"));
  assert.ok(getModelsForBrand("Toyota").includes("Hilux"));
  assert.ok(getModelsForBrand("Toyota").includes("4Runner"));
  assert.ok(getModelsForBrand("Toyota").includes("Agya"));
  assert.ok(getModelsForBrand("Toyota").includes("Alphard"));
  assert.ok(getModelsForBrand("Toyota").includes("Auris"));
  assert.ok(getModelsForBrand("Toyota").includes("Auris Touring"));
  assert.ok(getModelsForBrand("Toyota").includes("Avensis"));
});

test("market-aware queries resolve known OEM colour records", () => {
  const markets = getMarketsForVehicle("Toyota", "Hilux");
  assert.ok(markets.includes("South Africa"));

  const colors = findColorsForVehicle("Toyota", "Hilux", 2020, "South Africa");
  assert.ok(colors.some((entry) => entry.code === "040" || entry.code === "1D6"));
});

test("search by code still resolves OEM paint records and mark them as verified or unverified accordingly", () => {
  const results = searchByCode("040");
  assert.ok(results.some((entry) => entry.brand === "Toyota" && entry.model === "Hilux"));
  assert.ok(results.some((entry) => typeof entry.verified === "boolean"));
});
