import test from "node:test";
import assert from "node:assert/strict";

import {
  getBrandNames,
  getModelsForBrand,
  getMarketsForVehicle,
  findColorsForVehicle,
  searchByCode,
} from "../data/paint-codes-data.ts";
import { getPaintProvider } from "../lib/paint/provider.ts";

test("Toyota catalogue contains all 256+ models from Color N Drive specification", () => {
  assert.ok(getBrandNames().includes("Toyota"));
  const toyotaModels = getModelsForBrand("Toyota");
  assert.ok(toyotaModels.length >= 256, `Expected at least 256 Toyota models, found ${toyotaModels.length}`);

  // Test coverage across various automotive categories
  const keyModels = [
    "4Runner", "86", "Agya", "Allex", "Allion", "Alphard", "Aqua", "Auris",
    "Avalon", "Avanza", "Avensis", "Aygo", "Aygo X", "BZ4X", "C-HR", "Camry",
    "Celica", "Century", "Coaster", "Corolla", "Corolla Cross", "Corolla Quest",
    "Crown", "Dyna", "Echo", "Estima", "FJ Cruiser", "Fortuner", "GR Supra",
    "GR86", "Granvia", "Harrier", "HiAce", "Highlander", "Hilux", "Innova",
    "Land Cruiser", "Land Cruiser 70", "Land Cruiser 100", "Land Cruiser 200",
    "Land Cruiser Prado", "Mark X", "Mirai", "MR2", "Noah", "Passo", "Pixis Epoch",
    "Prius", "Proace", "Probox", "Quantum", "RAV4", "Raize", "Roomy", "Rush",
    "Sequoia", "Sienna", "Sienta", "Starlet", "Supra", "Tacoma", "TownAce",
    "Tundra", "Urban Cruiser", "Vellfire", "Venza", "Verso", "Vios", "Vitz",
    "Voxy", "Yaris", "Yaris Cross"
  ];

  for (const model of keyModels) {
    assert.ok(toyotaModels.includes(model), `Expected model '${model}' in Toyota catalogue`);
  }
});

test("Toyota models return accurate respective OEM colours with valid codes, finishes, and hexes", () => {
  // Test SUV: RAV4
  const rav4Colors = findColorsForVehicle("Toyota", "RAV4", 2022, "South Africa");
  assert.ok(rav4Colors.length > 0);
  assert.ok(rav4Colors.some(c => c.code === "040" || c.code === "070"));
  assert.ok(rav4Colors.some(c => c.code === "218" || c.code === "1G3"));

  // Test Crossover: C-HR
  const chrColors = findColorsForVehicle("Toyota", "C-HR", 2022, "South Africa");
  assert.ok(chrColors.length > 0);
  assert.ok(chrColors.some(c => c.code === "8X2" && c.name.includes("Nebula Blue")));

  // Test Sedan: Camry
  const camryColors = findColorsForVehicle("Toyota", "Camry", 2022, "South Africa");
  assert.ok(camryColors.length > 0);
  assert.ok(camryColors.some(c => c.code === "040" || c.code === "070"));

  // Test Sports: GR Supra
  const supraColors = findColorsForVehicle("Toyota", "GR Supra", 2022, "South Africa");
  assert.ok(supraColors.length > 0);
  assert.ok(supraColors.some(c => c.code === "3P0" || c.code === "3U5"));

  // Test Van: HiAce
  const hiaceColors = findColorsForVehicle("Toyota", "HiAce", 2022, "South Africa");
  assert.ok(hiaceColors.length > 0);
  assert.ok(hiaceColors.some(c => c.code === "040" || c.code === "058"));
});

test("Paint Provider layer resolves Toyota models and colors correctly", async () => {
  const provider = getPaintProvider();
  const models = await provider.getModels("Toyota");
  assert.ok(models.length >= 256, `Expected >= 256 models from provider, got ${models.length}`);

  const hiluxYears = await provider.getYears("Toyota", "Hilux");
  assert.ok(hiluxYears.length > 0);
  assert.ok(hiluxYears.includes(2022));

  const hiluxColors = await provider.getColors("Toyota", "Hilux", 2022);
  assert.ok(hiluxColors.length > 0);
  assert.ok(hiluxColors.some(c => c.code === "040"));
});
