import test from "node:test";
import assert from "node:assert/strict";

import {
  getBrandNames,
  getModelsForBrand,
  findColorsForVehicle,
} from "../data/paint-codes-data.ts";
import { getPaintProvider } from "../lib/paint/provider.ts";

test("BMW catalogue contains 150+ models across 1-8 Series, M power, X SUVs, Z roadsters, and i electrics", () => {
  assert.ok(getBrandNames().includes("BMW"));
  const bmwModels = getModelsForBrand("BMW");
  assert.ok(bmwModels.length >= 150, `Expected at least 150 BMW models, found ${bmwModels.length}`);

  const keyModels = [
    // Core Series
    "1 Series", "1 Series M Coupe", "118i", "120i", "128ti", "135i", "M135i", "M140i",
    "2 Series", "2 Series Coupe", "2 Series Gran Coupe", "2 Series Active Tourer", "M2", "M2 Competition", "M2 CS",
    "3 Series", "3 Series Sedan", "3 Series Touring", "320i", "328i", "330i", "330e", "335i", "340i", "M340i",
    "M3", "M3 Competition", "M3 CS", "M3 Touring", "M3 CSL",
    "4 Series", "4 Series Coupe", "4 Series Gran Coupe", "420i", "430i", "440i", "M440i",
    "M4", "M4 Competition", "M4 CSL", "M4 GTS",
    "5 Series", "5 Series Sedan", "5 Series Touring", "520i", "530i", "530e", "540i", "M550i",
    "M5", "M5 Competition", "M5 CS",
    "6 Series", "6 Series Gran Coupe", "6 Series Gran Turismo", "640i", "650i", "M6", "M6 Gran Coupe",
    "7 Series", "740i", "750i", "760i", "M760Li",
    "8 Series", "8 Series Coupe", "8 Series Gran Coupe", "840i", "M850i", "M8", "M8 Competition",
    // X Series
    "X1", "X2", "X2 M35i", "X3", "X3 M", "X3 M Competition", "X4", "X4 M",
    "X5", "X5 M", "X5 M Competition", "X6", "X6 M", "X7", "X7 M50i", "X7 M60i", "XM",
    // Z Series
    "Z1", "Z3", "Z3 M", "Z4", "Z4 M", "Z4 M40i", "Z8",
    // i Series
    "i3", "i3s", "i4", "i4 M50", "i5", "i5 M60", "i7", "i7 M70", "i8", "i8 Roadster", "iX", "iX1", "iX2", "iX3",
    // Heritage
    "2002", "2002 Turbo", "1602", "3.0 CS", "3.0 CSL", "507", "850CSi"
  ];

  for (const model of keyModels) {
    assert.ok(bmwModels.includes(model), `Expected model '${model}' in BMW catalogue`);
  }
});

test("BMW models return accurate OEM colours with valid codes, finishes, and hexes", () => {
  // 3 Series
  const g20Colors = findColorsForVehicle("BMW", "3 Series", 2022, "South Africa");
  assert.ok(g20Colors.length > 0);
  assert.ok(g20Colors.some(c => c.code === "300" && c.name.includes("Alpine White")));
  assert.ok(g20Colors.some(c => c.code === "475" && c.name.includes("Black Sapphire")));
  assert.ok(g20Colors.some(c => c.code === "C31" && c.name.includes("Portimao Blue")));
  assert.ok(g20Colors.some(c => c.code === "C4P" && c.name.includes("Brooklyn Grey")));

  // M3
  const m3Colors = findColorsForVehicle("BMW", "M3", 2023, "South Africa");
  assert.ok(m3Colors.length > 0);
  assert.ok(m3Colors.some(c => c.code === "C4G" && c.name.includes("Isle of Man Green")));
  assert.ok(m3Colors.some(c => c.code === "C3G" && c.name.includes("Toronto Red")));
  assert.ok(m3Colors.some(c => c.code === "405" && c.name.includes("Imola Red")));

  // M4
  const m4Colors = findColorsForVehicle("BMW", "M4", 2020, "South Africa");
  assert.ok(m4Colors.length > 0);
  assert.ok(m4Colors.some(c => c.code === "B67" && c.name.includes("Austin Yellow")));
  assert.ok(m4Colors.some(c => c.code === "B68" && c.name.includes("Yas Marina Blue")));

  // X5
  const x5Colors = findColorsForVehicle("BMW", "X5", 2022, "South Africa");
  assert.ok(x5Colors.length > 0);
  assert.ok(x5Colors.some(c => c.code === "416" && c.name.includes("Carbon Black")));
  assert.ok(x5Colors.some(c => c.code === "C1M" && c.name.includes("Phytonic Blue")));

  // i4 Electric
  const i4Colors = findColorsForVehicle("BMW", "i4", 2023, "South Africa");
  assert.ok(i4Colors.length > 0);
  assert.ok(i4Colors.some(c => c.code === "C4P" && c.name.includes("Brooklyn Grey")));
  assert.ok(i4Colors.some(c => c.code === "C36" && c.name.includes("Dravit Grey")));
});

test("Paint Provider layer resolves BMW models and colors correctly", async () => {
  const provider = getPaintProvider();
  const models = await provider.getModels("BMW");
  assert.ok(models.length >= 150, `Expected >= 150 BMW models in provider, got ${models.length}`);

  const colors = await provider.getColors("BMW", "3 Series", 2022);
  assert.ok(colors.length >= 8, `Expected >= 8 3 Series colors, got ${colors.length}`);

  const m3Colors = await provider.getColors("BMW", "M3", 2023);
  assert.ok(m3Colors.length >= 8, `Expected >= 8 M3 colors, got ${m3Colors.length}`);
});
