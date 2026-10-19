import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const codes = JSON.parse(fs.readFileSync(path.join(ROOT, "data/raw/oem-paint-codes.json"), "utf8"));
const bmwRecords = codes.filter(r => r.brand === "BMW");

// Group by model
const modelMap = new Map();
for (const r of bmwRecords) {
  if (!modelMap.has(r.model)) {
    modelMap.set(r.model, []);
  }
  modelMap.get(r.model).push({
    code: r.code,
    name: r.name,
    hex: r.hex,
    yearFrom: r.yearFrom,
    yearTo: r.yearTo,
    verified: false,
    finish: r.finish,
    market: "South Africa",
    manufacturer: "BMW",
    notes: r.notes || undefined,
  });
}

let tsOutput = `  {\n    brand: 'BMW',\n    models: [\n`;
for (const [modelName, colors] of modelMap.entries()) {
  tsOutput += `      {\n        model: ${JSON.stringify(modelName)},\n        colors: [\n`;
  for (const c of colors) {
    tsOutput += `          { code: ${JSON.stringify(c.code)}, name: ${JSON.stringify(c.name)}, hex: ${JSON.stringify(c.hex)}, yearFrom: ${c.yearFrom}, yearTo: ${c.yearTo}, verified: false, finish: ${JSON.stringify(c.finish)}, market: 'South Africa', manufacturer: 'BMW'`;
    if (c.notes) {
      tsOutput += `, notes: ${JSON.stringify(c.notes)}`;
    }
    tsOutput += ` },\n`;
  }
  tsOutput += `        ],\n      },\n`;
}
tsOutput += `    ],\n  },`;

const tsPath = path.join(ROOT, "data/paint-codes-data.ts");
let tsContent = fs.readFileSync(tsPath, "utf8");

const startPattern = "  {\n    brand: 'BMW',";
const endPattern = "  {\n    brand: 'Mercedes-Benz',";

const startIndex = tsContent.indexOf(startPattern);
const endIndex = tsContent.indexOf(endPattern);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find markers in paint-codes-data.ts");
  process.exit(1);
}

const newTsContent = tsContent.substring(0, startIndex) + tsOutput + "\n" + tsContent.substring(endIndex);
fs.writeFileSync(tsPath, newTsContent, "utf8");
console.log(`✔ data/paint-codes-data.ts updated with ${modelMap.size} BMW models!`);
