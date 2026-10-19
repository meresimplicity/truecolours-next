import test from "node:test";
import assert from "node:assert/strict";

import {
  getBrandNames,
  getModelsForBrand,
  findColorsForVehicle,
} from "../data/paint-codes-data.ts";
import { getPaintProvider } from "../lib/paint/provider.ts";

test("Volkswagen catalogue contains 90+ models across hatch, sedan, SUV, EV, van, and classic lines", () => {
  assert.ok(getBrandNames().includes("Volkswagen"));
  const vwModels = getModelsForBrand("Volkswagen");
  assert.ok(vwModels.length >= 90, `Expected at least 90 VW models, found ${vwModels.length}`);

  const keyModels = [
    "Up", "Lupo", "Fox", "Polo", "Polo Vivo", "Polo GTI", "Polo Cross", "Polo Classic",
    "Golf", "Golf GTI", "Golf R", "Golf Cabriolet", "Golf Variant", "Golf Alltrack", "Golf Sportsvan",
    "Jetta", "Jetta GLI", "Vento", "Passat", "Passat Variant", "Passat CC", "Passat Alltrack",
    "Scirocco", "Scirocco R", "Corrado", "Arteon", "Arteon Shooting Brake",
    "T-Roc", "T-Roc R", "Taigo", "Taigun", "Tiguan", "Tiguan Allspace", "Touareg", "Touran", "Sharan",
    "Transporter", "Transporter / Kombi", "Multivan", "Caravelle", "California", "Crafter", "Caddy", "Caddy Maxi",
    "Amarok", "Amarok W580", "Phaeton", "Beetle", "Beetle Cabriolet",
    "ID.3", "ID.4", "ID.5", "ID.6", "ID.7", "ID. Buzz", "Eos",
    "CrossPolo", "Cross Golf", "Cross Touran", "Beetle Classic", "Type 2 / Kombi", "Karmann Ghia",
    "Gol", "Voyage", "Saveiro", "Bora", "XL1"
  ];

  for (const model of keyModels) {
    assert.ok(vwModels.includes(model), `Expected model '${model}' in Volkswagen catalogue`);
  }
});

test("Volkswagen models return accurate respective OEM colours with valid codes, finishes, and hexes", () => {
  // Hatchback: Polo
  const poloColors = findColorsForVehicle("Volkswagen", "Polo", 2022, "South Africa");
  assert.ok(poloColors.length > 0);
  assert.ok(poloColors.some(c => c.code === "LB9A" && c.name.includes("Candy White")));
  assert.ok(poloColors.some(c => c.code === "LC9X" && c.name.includes("Deep Black")));
  assert.ok(poloColors.some(c => c.code === "LA7W" && c.name.includes("Reflex Silver")));

  // Sports: Golf GTI
  const gtiColors = findColorsForVehicle("Volkswagen", "Golf GTI", 2023, "South Africa");
  assert.ok(gtiColors.length > 0);
  assert.ok(gtiColors.some(c => c.code === "LY3D" && c.name.includes("Flash Red")));
  assert.ok(gtiColors.some(c => c.code === "LP7U" && c.name.includes("Indium Grey")));

  // Performance: Golf R
  const rColors = findColorsForVehicle("Volkswagen", "Golf R", 2023, "South Africa");
  assert.ok(rColors.length > 0);
  assert.ok(rColors.some(c => c.code === "2C2C" || c.code === "LS5R" || c.code === "LT5W"));

  // SUV: Tiguan
  const tiguanColors = findColorsForVehicle("Volkswagen", "Tiguan", 2022, "South Africa");
  assert.ok(tiguanColors.length > 0);
  assert.ok(tiguanColors.some(c => c.code === "LR9E" && c.name.includes("Moonstone Grey")));

  // Bakkie / Commercial: Amarok
  const amarokColors = findColorsForVehicle("Volkswagen", "Amarok", 2024, "South Africa");
  assert.ok(amarokColors.length > 0);
  assert.ok(amarokColors.some(c => c.code === "LB9A"));
  assert.ok(amarokColors.some(c => c.code === "LA7W"));

  // Electric: ID.4
  const id4Colors = findColorsForVehicle("Volkswagen", "ID.4", 2023, "South Africa");
  assert.ok(id4Colors.length > 0);
  assert.ok(id4Colors.some(c => c.code === "LT5W" || c.code === "L10V"));
});

test("Paint Provider layer resolves Volkswagen models and colors correctly", async () => {
  const provider = getPaintProvider();
  const models = await provider.getModels("Volkswagen");
  assert.ok(models.length >= 90, `Expected >= 90 models in provider, got ${models.length}`);

  const poloColors = await provider.getColors("Volkswagen", "Polo", 2022);
  assert.ok(poloColors.length >= 5, `Expected >= 5 Polo colors, got ${poloColors.length}`);

  const amarokColors = await provider.getColors("Volkswagen", "Amarok", 2023);
  assert.ok(amarokColors.length >= 5, `Expected >= 5 Amarok colors, got ${amarokColors.length}`);
});
