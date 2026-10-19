import fs from "node:fs";
import path from "node:path";
import { getAllToyotaModels } from "./toyota-data-generator.mjs";

console.log("=== APPLYING ALL TOYOTA MODELS & COLOURS ===");

const toyotaModels = getAllToyotaModels();
console.log(`Generated ${toyotaModels.length} Toyota models.`);

// 1. Update data/paint-codes-data.ts
console.log("\n[1/4] Updating data/paint-codes-data.ts...");
const paintCodesPath = path.join(process.cwd(), "data", "paint-codes-data.ts");
const paintCodesContent = fs.readFileSync(paintCodesPath, "utf-8");

const toyotaStart = paintCodesContent.indexOf("  {\n    brand: 'Toyota',");
const vwStart = paintCodesContent.indexOf("  {\n    brand: 'Volkswagen',");

if (toyotaStart === -1 || vwStart === -1) {
  throw new Error("Could not find Toyota or Volkswagen markers in data/paint-codes-data.ts");
}

let newToyotaBlock = "  {\n    brand: 'Toyota',\n    models: [\n";
for (const m of toyotaModels) {
  newToyotaBlock += `      {\n        model: ${JSON.stringify(m.model)},\n        colors: [\n`;
  for (const c of m.colors) {
    const fields = [
      `code: ${JSON.stringify(c.code)}`,
      `name: ${JSON.stringify(c.name)}`,
      `hex: ${JSON.stringify(c.hex)}`,
      `yearFrom: ${c.yearFrom}`,
      `yearTo: ${c.yearTo}`,
      `verified: ${c.verified ? "true" : "false"}`,
      `finish: ${JSON.stringify(c.finish)}`,
      `market: ${JSON.stringify(c.market)}`,
      `manufacturer: ${JSON.stringify(c.manufacturer)}`,
    ];
    if (c.notes) {
      fields.push(`notes: ${JSON.stringify(c.notes)}`);
    }
    newToyotaBlock += `          { ${fields.join(", ")} },\n`;
  }
  newToyotaBlock += `        ],\n      },\n`;
}
newToyotaBlock += "    ],\n  },\n";

const updatedPaintCodes = paintCodesContent.slice(0, toyotaStart) + newToyotaBlock + paintCodesContent.slice(vwStart);
fs.writeFileSync(paintCodesPath, updatedPaintCodes, "utf-8");
console.log(`Updated data/paint-codes-data.ts successfully (${(updatedPaintCodes.length / 1024).toFixed(1)} KB)`);

// 2. Update data/raw/oem-paint-codes.json
console.log("\n[2/4] Updating data/raw/oem-paint-codes.json...");
const rawCodesPath = path.join(process.cwd(), "data", "raw", "oem-paint-codes.json");
const rawCodes = JSON.parse(fs.readFileSync(rawCodesPath, "utf-8"));

// Keep non-Toyota records
const nonToyotaCodes = rawCodes.filter(r => r.brand.toLowerCase() !== "toyota");

// Create new Toyota records from our 257 models
const newToyotaRawCodes = [];
for (const m of toyotaModels) {
  for (const c of m.colors) {
    newToyotaRawCodes.push({
      brand: "Toyota",
      model: m.model,
      yearFrom: c.yearFrom,
      yearTo: c.yearTo,
      code: c.code,
      name: c.name,
      finish: c.finish,
      hex: c.hex,
      source: "open-data",
      verified: Boolean(c.verified),
      notes: c.notes || undefined,
    });
  }
}

const mergedRawCodes = [...nonToyotaCodes, ...newToyotaRawCodes];
fs.writeFileSync(rawCodesPath, JSON.stringify(mergedRawCodes, null, 2), "utf-8");
console.log(`Updated data/raw/oem-paint-codes.json with ${newToyotaRawCodes.length} Toyota records (Total: ${mergedRawCodes.length})`);

// 3. Update data/raw/vehicles-catalogue.json
console.log("\n[3/4] Updating data/raw/vehicles-catalogue.json...");
const vehiclesPath = path.join(process.cwd(), "data", "raw", "vehicles-catalogue.json");
const vehiclesData = JSON.parse(fs.readFileSync(vehiclesPath, "utf-8"));

const toyotaIndex = vehiclesData.brands.findIndex(b => b.name.toLowerCase() === "toyota");
const existingToyotaModels = toyotaIndex !== -1 ? vehiclesData.brands[toyotaIndex].models : [];
const existingModelMap = new Map(existingToyotaModels.map(m => [m.name.toLowerCase(), m]));

const completeToyotaModels = toyotaModels.map(m => {
  const existing = existingModelMap.get(m.model.toLowerCase());
  if (existing) {
    return existing;
  }
  // Generate appropriate year list
  const years = [];
  const minYear = Math.min(...m.colors.map(c => c.yearFrom));
  const maxYear = Math.max(...m.colors.map(c => c.yearTo));
  for (let y = minYear; y <= maxYear; y++) {
    years.push(y);
  }
  return {
    name: m.model,
    years,
  };
});

if (toyotaIndex !== -1) {
  vehiclesData.brands[toyotaIndex].models = completeToyotaModels;
} else {
  vehiclesData.brands.push({
    name: "Toyota",
    models: completeToyotaModels,
  });
}

fs.writeFileSync(vehiclesPath, JSON.stringify(vehiclesData, null, 2), "utf-8");
console.log(`Updated data/raw/vehicles-catalogue.json with ${completeToyotaModels.length} Toyota models`);

console.log("\nDone updating seed files!");
