import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { mergeVehicleMakes, modelsForVehicleMake, normalizeVehicleMake } from "../lib/vehicles/makes.ts";
import { searchHistoricalLibrary } from "../lib/paint/historical-library.ts";

test("the combined finder keeps one make across vehicle and original chart sources", () => {
  const vehicleMakes = ["TOYOTA", "FORD", "ASTON MARTIN", "BMW"];
  const archiveMakes = ["Toyota", "Ford", "Aston Martin", "Astonmartin", "BMW", "Studebaker"];
  const combined = mergeVehicleMakes(vehicleMakes, archiveMakes);
  assert.equal(combined.length, 5);
  assert.equal(combined.filter((make) => normalizeVehicleMake(make) === "toyota").length, 1);
  assert.ok(combined.includes("TOYOTA"), "Keep the vehicle source name so model selection remains available");
  assert.ok(combined.includes("Studebaker"), "Retain makes only available from original charts");
});

test("a modern make opens both year-specific models and its original chart entry", () => {
  const selector = JSON.parse(fs.readFileSync(new URL("../data/processed/vehicle-selector.json", import.meta.url), "utf8"));
  const models = modelsForVehicleMake(selector.years[2015], "Toyota");
  assert.ok(models.some((model) => model.toLowerCase() === "corolla"));
  assert.deepEqual(models, modelsForVehicleMake(selector.years[2015], "TOYOTA"));
  assert.ok(searchHistoricalLibrary({ year: 2015, make: "TOYOTA" }).books.some((book) => book.make === "Toyota"));
  assert.deepEqual(modelsForVehicleMake(selector.years[2015], "Nonexistent make"), []);
});
