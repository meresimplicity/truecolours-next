import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { cleanText, slugify } from "./normalize-paint-codes.ts";

export interface RawVehicleHierarchy {
  brands: {
    name: string;
    models: {
      name: string;
      generations?: {
        name: string;
        code?: string;
        yearFrom?: number;
        yearTo?: number;
      }[];
      years?: number[];
    }[];
  }[];
}

export function initVehicleSchema(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS paint_brands (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      slug TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS paint_models (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      UNIQUE(brand_id, name),
      FOREIGN KEY(brand_id) REFERENCES paint_brands(id)
    );

    CREATE TABLE IF NOT EXISTS paint_generations (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      name TEXT NOT NULL,
      code TEXT,
      year_from INTEGER,
      year_to INTEGER,
      FOREIGN KEY(model_id) REFERENCES paint_models(id)
    );

    CREATE TABLE IF NOT EXISTS paint_model_years (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      generation_id TEXT,
      year INTEGER NOT NULL,
      UNIQUE(model_id, year),
      FOREIGN KEY(model_id) REFERENCES paint_models(id),
      FOREIGN KEY(generation_id) REFERENCES paint_generations(id)
    );

    CREATE INDEX IF NOT EXISTS idx_models_brand ON paint_models(brand_id);
    CREATE INDEX IF NOT EXISTS idx_generations_model ON paint_generations(model_id);
    CREATE INDEX IF NOT EXISTS idx_years_model ON paint_model_years(model_id, year);
  `);
}

export async function importVehicles(db: DatabaseSync, rawData: RawVehicleHierarchy) {
  console.log("-> Initializing vehicle hierarchy tables...");
  initVehicleSchema(db);

  const insertBrand = db.prepare("INSERT OR REPLACE INTO paint_brands (id, name, slug) VALUES (?, ?, ?)");
  const insertModel = db.prepare("INSERT OR REPLACE INTO paint_models (id, brand_id, name, slug) VALUES (?, ?, ?, ?)");
  const insertGen = db.prepare("INSERT OR REPLACE INTO paint_generations (id, model_id, name, code, year_from, year_to) VALUES (?, ?, ?, ?, ?, ?)");
  const insertYear = db.prepare("INSERT OR REPLACE INTO paint_model_years (id, model_id, generation_id, year) VALUES (?, ?, ?, ?)");

  let brandCount = 0;
  let modelCount = 0;
  let genCount = 0;
  let yearCount = 0;

  for (const b of rawData.brands) {
    const brandName = cleanText(b.name);
    if (!brandName) continue;
    const brandSlug = slugify(brandName);
    const brandId = `brand-${brandSlug}`;

    insertBrand.run(brandId, brandName, brandSlug);
    brandCount++;

    for (const m of b.models) {
      const modelName = cleanText(m.name);
      if (!modelName) continue;
      const modelSlug = slugify(modelName);
      const modelId = `model-${brandSlug}-${modelSlug}`;

      insertModel.run(modelId, brandId, modelName, modelSlug);
      modelCount++;

      // Handle generations
      const genIdMap = new Map<string, string>();
      if (m.generations && Array.isArray(m.generations)) {
        for (const g of m.generations) {
          const genName = cleanText(g.name);
          const genSlug = slugify(g.code || genName);
          const genId = `gen-${modelSlug}-${genSlug}`;
          insertGen.run(genId, modelId, genName, g.code || null, g.yearFrom || null, g.yearTo || null);
          genIdMap.set(genName, genId);
          if (g.code) genIdMap.set(g.code, genId);
          genCount++;
        }
      }

      // Handle years
      const years = m.years && m.years.length > 0 ? m.years : [];
      for (const y of years) {
        let matchedGenId: string | null = null;
        if (m.generations) {
          for (const g of m.generations) {
            if (g.yearFrom && g.yearTo && y >= g.yearFrom && y <= g.yearTo) {
              matchedGenId = genIdMap.get(g.code || g.name) || null;
              break;
            }
          }
        }
        const yearId = `year-${modelSlug}-${y}`;
        insertYear.run(yearId, modelId, matchedGenId, y);
        yearCount++;
      }
    }
  }

  console.log(`Successfully imported vehicles: ${brandCount} brands, ${modelCount} models, ${genCount} generations, ${yearCount} model-years.`);
  return { brandCount, modelCount, genCount, yearCount };
}
