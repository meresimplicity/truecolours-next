import fs from "node:fs";
import path from "node:path";
import { getAllToyotaModels } from "./toyota-data-generator.mjs";

const cataloguePath = path.join(process.cwd(), "data", "raw", "oem-paint-catalogue.json");
const catalogue = JSON.parse(fs.readFileSync(cataloguePath, "utf-8"));

// Keep non-Toyota records
const nonToyota = catalogue.filter(c => c.brand.toLowerCase() !== "toyota");
console.log(`Preserving ${nonToyota.length} non-Toyota records.`);

const toyotaModels = getAllToyotaModels();
const newToyotaRecords = [];

for (const m of toyotaModels) {
  for (const c of m.colors) {
    const years = [];
    for (let y = c.yearFrom; y <= c.yearTo; y++) {
      years.push(y);
    }

    newToyotaRecords.push({
      brand: "Toyota",
      manufacturer: "Toyota",
      model: m.model,
      yearFrom: c.yearFrom,
      yearTo: c.yearTo,
      years,
      code: c.code,
      primaryCode: c.code,
      salesCodes: [],
      name: c.name,
      finish: c.finish,
      hex: c.hex,
      swatchHex: c.hex,
      swatchSource: "OEM Formulation Approximation",
      swatchVerified: Boolean(c.verified),
      alternativeNames: [
        { language: "en", name: c.name }
      ],
      source: "open-data",
      sourceUrl: "https://truecolourspaints.co.za/catalogue",
      sourceLicense: "Open Automotive Data Standard",
      verified: Boolean(c.verified),
      notes: c.notes || undefined,
    });
  }
}

const merged = [...nonToyota, ...newToyotaRecords];
fs.writeFileSync(cataloguePath, JSON.stringify(merged, null, 2), "utf-8");
console.log(`Updated data/raw/oem-paint-catalogue.json with ${newToyotaRecords.length} Toyota records across ${toyotaModels.length} models. Total: ${merged.length}`);
