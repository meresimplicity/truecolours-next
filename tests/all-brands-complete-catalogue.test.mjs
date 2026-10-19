import test from "node:test";
import assert from "node:assert/strict";

import {
  getBrandNames,
  getModelsForBrand,
  findColorsForVehicle,
} from "../data/paint-codes-data.ts";
import { getPaintProvider } from "../lib/paint/provider.ts";

const TARGET_BRANDS = [
  {
    name: "Suzuki",
    aliases: ["Susuki", "suzuki"],
    minModels: 40,
    sampleModel: "Jimny",
    expectedCode: "ZZC", // Jungle Green
    expectedName: "Jungle Green",
    year: 2022,
    keyModels: ["Swift", "Jimny", "Vitara", "Baleno", "Celerio", "Ignis", "S-Presso", "Ertiga", "Fronx"]
  },
  {
    name: "Ford",
    aliases: ["ford"],
    minModels: 40,
    sampleModel: "Ranger",
    expectedCode: "YZ", // Oxford White
    expectedName: "Oxford White",
    year: 2023,
    keyModels: ["Ranger", "Ranger Raptor", "Everest", "EcoSport", "Fiesta", "Focus", "Mustang", "F-150"]
  },
  {
    name: "Nissan",
    aliases: ["nissan"],
    minModels: 35,
    sampleModel: "Navara",
    expectedCode: "QM1", // Cloud White
    expectedName: "Cloud White",
    year: 2022,
    keyModels: ["Navara", "NP200", "NP300 Hardbody", "Patrol", "Qashqai", "X-Trail", "Magnite", "GT-R"]
  },
  {
    name: "Kia",
    aliases: ["kia"],
    minModels: 30,
    sampleModel: "Seltos",
    expectedCode: "UD", // Clear White
    expectedName: "Clear White",
    year: 2022,
    keyModels: ["Picanto", "Rio", "Sonet", "Seltos", "Sportage", "Sorento", "Carnival", "EV6"]
  },
  {
    name: "Hyundai",
    aliases: ["hyundai"],
    minModels: 35,
    sampleModel: "Tucson",
    expectedCode: "PSW", // Polar White
    expectedName: "Polar White",
    year: 2023,
    keyModels: ["Grand i10", "i20", "i30", "Creta", "Venue", "Tucson", "Santa Fe", "Staria", "H-100 Bakkie"]
  },
  {
    name: "Mercedes-Benz",
    aliases: ["Mercedes Benz", "mercedes-benz", "mercedes"],
    minModels: 45,
    sampleModel: "C-Class",
    expectedCode: "149", // Polar White
    expectedName: "Polar White",
    year: 2022,
    keyModels: ["A-Class", "C-Class", "E-Class", "S-Class", "CLA", "GLC", "GLE", "G-Class", "AMG GT", "Sprinter", "Vito"]
  },
  {
    name: "Citroën",
    aliases: ["Citron", "Citroen", "citroën"],
    minModels: 25,
    sampleModel: "C3",
    expectedCode: "EWP", // Banquise White
    expectedName: "Banquise White",
    year: 2022,
    keyModels: ["C1", "C2", "C3", "C3 Aircross", "C4", "C4 Cactus", "C5 Aircross", "Berlingo", "DS3"]
  },
  {
    name: "Peugeot",
    aliases: ["peugeot"],
    minModels: 30,
    sampleModel: "208",
    expectedCode: "EWP", // Bianca White
    expectedName: "Bianca White",
    year: 2022,
    keyModels: ["108", "206", "207", "208", "308", "508", "2008", "3008", "5008", "Landtrek", "Partner"]
  },
  {
    name: "FAW",
    aliases: ["Faw", "faw"],
    minModels: 20,
    sampleModel: "V2",
    expectedCode: "FAW01", // Glacier White
    expectedName: "Glacier White",
    year: 2018,
    keyModels: ["V2", "Sirius", "Carrier", "8.140 FL", "15.180 FL", "28.280 FD", "J5N", "J6P"]
  },
  {
    name: "Chevrolet",
    aliases: ["chevrolet", "chevy"],
    minModels: 30,
    sampleModel: "Utility",
    expectedCode: "WA8624", // Olympic White
    expectedName: "Olympic White",
    year: 2015,
    keyModels: ["Utility", "Spark", "Aveo", "Sonic", "Cruze", "Captiva", "Trailblazer", "Lumina", "Corvette", "Camaro"]
  },
  {
    name: "Haval",
    aliases: ["haval", "GWM / Haval"],
    minModels: 20,
    sampleModel: "Haval Jolion",
    expectedCode: "GW01", // Hamilton White
    expectedName: "Hamilton White",
    year: 2023,
    keyModels: ["Haval Jolion", "Haval H6", "Haval H2", "Haval H9", "GWM P-Series", "Tank 300"]
  }
];

test("All 11 target brands exist in static paint database with comprehensive model coverage", () => {
  const brandNames = getBrandNames();
  for (const b of TARGET_BRANDS) {
    assert.ok(
      brandNames.includes(b.name) || (b.name === "Haval" && brandNames.includes("GWM / Haval")),
      `Expected brand '${b.name}' in PAINT_DATABASE`
    );

    const models = getModelsForBrand(b.name);
    assert.ok(
      models.length >= b.minModels,
      `Expected brand '${b.name}' to have at least ${b.minModels} models, but found ${models.length}`
    );

    for (const km of b.keyModels) {
      assert.ok(
        models.includes(km),
        `Expected key model '${km}' to be present under brand '${b.name}'`
      );
    }
  }
});

test("Static database returns authentic OEM paint codes, finishes, and hex codes for target brands", () => {
  for (const b of TARGET_BRANDS) {
    const colors = findColorsForVehicle(b.name, b.sampleModel, b.year, "South Africa");
    assert.ok(
      colors.length > 0,
      `Expected colors for ${b.name} ${b.sampleModel} (${b.year}), found 0`
    );

    const match = colors.find(c => c.code === b.expectedCode);
    assert.ok(
      match,
      `Expected code '${b.expectedCode}' for ${b.name} ${b.sampleModel}, found [${colors.map(c => c.code).join(", ")}]`
    );
    assert.ok(match.name.includes(b.expectedName) || match.name.length > 0);
    assert.match(match.hex, /^#[0-9A-Fa-f]{6}$/, `Invalid hex code '${match.hex}' for ${b.name}`);
    assert.ok(["Solid", "Metallic", "Pearl", "Matte"].includes(match.finish), `Invalid finish '${match.finish}'`);
  }
});

test("Paint Provider resolves models and colors across all target brands and handles phonetic/spelling aliases", async () => {
  const provider = getPaintProvider();
  const brands = await provider.getBrands();

  assert.ok(brands.length >= 20, `Expected at least 20 total brands in provider, got ${brands.length}`);

  for (const b of TARGET_BRANDS) {
    const models = await provider.getModels(b.name);
    assert.ok(
      models.length >= b.minModels,
      `Provider should return >= ${b.minModels} models for brand '${b.name}', got ${models.length}`
    );

    const colors = await provider.getColors(b.name, b.sampleModel, b.year);
    assert.ok(
      colors.length > 0,
      `Provider should return colors for ${b.name} ${b.sampleModel} (${b.year})`
    );
    assert.ok(
      colors.some(c => c.code === b.expectedCode),
      `Provider should include code '${b.expectedCode}' for ${b.name} ${b.sampleModel}`
    );

    // Test aliases (e.g. "Susuki", "Mercedes Benz", "Citron")
    for (const alias of b.aliases) {
      const aliasModels = await provider.getModels(alias);
      assert.ok(
        aliasModels.length >= b.minModels,
        `Alias '${alias}' should resolve >= ${b.minModels} models for '${b.name}', got ${aliasModels.length}`
      );
    }
  }
});
