import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

interface RawPaintRecord {
  brand: string;
  model: string;
  yearFrom?: number;
  yearTo?: number;
  year?: number;
  code: string;
  name: string;
  finish?: string;
  hex?: string;
  source?: 'truecolours' | 'open-data' | 'api';
  verified?: boolean;
  notes?: string;
  formulaReference?: string;
  verifiedBy?: string;
  verifiedAt?: string;
}

function cleanString(str: string | undefined): string {
  if (!str) return '';
  return str.trim().replace(/\s+/g, ' ');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeFinish(finish?: string): string {
  const f = cleanString(finish).toLowerCase();
  if (f.includes('tri-coat') || f.includes('3-stage')) return 'Tri-Coat Pearl';
  if (f.includes('pearl')) return 'Pearl';
  if (f.includes('mica')) return 'Mica';
  if (f.includes('metallic')) return 'Metallic';
  if (f.includes('matte') || f.includes('matt')) return 'Matte';
  if (f.includes('satin')) return 'Satin';
  return 'Solid';
}

function isValidHex(hex?: string): boolean {
  if (!hex) return false;
  return /^#[0-9A-Fa-f]{6}$/.test(hex.trim());
}

async function runImport() {
  console.log("==================================================");
  console.log("TRUECOLOURS — VEHICLE PAINT DATA IMPORT PIPELINE");
  console.log("==================================================");

  const rawPath = path.join(process.cwd(), "data", "raw", "oem-paint-codes.json");
  if (!fs.existsSync(rawPath)) {
    console.error(`Error: Raw data file not found at ${rawPath}`);
    process.exit(1);
  }

  const rawContent = fs.readFileSync(rawPath, "utf-8");
  const rawList: RawPaintRecord[] = JSON.parse(rawContent);

  console.log(`Loaded ${rawList.length} raw input entries.`);

  let invalidCount = 0;
  let duplicateCount = 0;
  const cleanedRecords: any[] = [];
  const seenKeys = new Set<string>();

  const brandsSet = new Set<string>();
  const modelsMap = new Map<string, Set<string>>();
  const codesSet = new Set<string>();

  for (const raw of rawList) {
    const brand = cleanString(raw.brand);
    const model = cleanString(raw.model);
    const code = cleanString(raw.code).toUpperCase();
    const name = cleanString(raw.name);

    // Reject invalid records
    if (!brand || !model || !code || !name) {
      invalidCount++;
      continue;
    }

    // Absolute prohibition: Reject any fake or sample codes
    if (code.includes('SAMPLE-') || name.toLowerCase().includes('sample')) {
      console.warn(`[REJECTED FAKE DATA] ${brand} ${model} code: ${code}`);
      invalidCount++;
      continue;
    }

    const yearFrom = raw.yearFrom || raw.year || 1990;
    const yearTo = raw.yearTo || raw.year || new Date().getFullYear();

    if (yearFrom > yearTo || yearFrom < 1950 || yearTo > 2035) {
      invalidCount++;
      continue;
    }

    const dupKey = `${brand.toLowerCase()}|${model.toLowerCase()}|${code.toLowerCase()}|${yearFrom}|${yearTo}`;
    if (seenKeys.has(dupKey)) {
      duplicateCount++;
      continue;
    }
    seenKeys.add(dupKey);

    const recordId = `paint-${slugify(brand)}-${slugify(model)}-${slugify(code)}-${yearFrom}`;
    const hexVal = isValidHex(raw.hex) ? raw.hex!.trim().toUpperCase() : undefined;

    const record = {
      id: recordId,
      brand,
      model,
      yearFrom,
      yearTo,
      code,
      name,
      finish: normalizeFinish(raw.finish),
      hex: hexVal,
      source: raw.source || 'open-data',
      verified: Boolean(raw.verified),
      notes: cleanString(raw.notes) || undefined,
      formulaReference: cleanString(raw.formulaReference) || undefined,
      verifiedBy: cleanString(raw.verifiedBy) || undefined,
      verifiedAt: cleanString(raw.verifiedAt) || undefined,
    };

    cleanedRecords.push(record);

    brandsSet.add(brand);
    if (!modelsMap.has(brand)) {
      modelsMap.set(brand, new Set<string>());
    }
    modelsMap.get(brand)!.add(model);
    codesSet.add(code);
  }

  console.log(`\nValidation & Deduplication Summary:`);
  console.log(`- Cleaned Records Accepted: ${cleanedRecords.length}`);
  console.log(`- Invalid / Fake Records Rejected: ${invalidCount}`);
  console.log(`- Exact Duplicates Removed: ${duplicateCount}`);
  console.log(`- Total Unique Brands: ${brandsSet.size}`);
  console.log(`- Total Unique Models: ${Array.from(modelsMap.values()).reduce((acc, m) => acc + m.size, 0)}`);
  console.log(`- Total Unique OEM Paint Codes: ${codesSet.size}`);

  // 1. Generate SQLite Database
  const dbPath = path.join(process.cwd(), "data", "paint.db");
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }

  const db = new DatabaseSync(dbPath);

  db.exec(`
    CREATE TABLE vehicle_brands (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE vehicle_models (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      name TEXT NOT NULL,
      UNIQUE(brand_id, name)
    );

    CREATE TABLE vehicle_years (
      id TEXT PRIMARY KEY,
      model_id TEXT NOT NULL,
      year INTEGER NOT NULL,
      UNIQUE(model_id, year)
    );

    CREATE TABLE paint_colors (
      id TEXT PRIMARY KEY,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year_from INTEGER NOT NULL,
      year_to INTEGER NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      finish TEXT,
      hex TEXT,
      source TEXT NOT NULL,
      verified INTEGER NOT NULL,
      notes TEXT,
      formula_reference TEXT,
      verified_by TEXT,
      verified_at TEXT
    );

    CREATE TABLE paint_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      url TEXT,
      licence TEXT,
      attribution TEXT
    );

    CREATE TABLE truecolours_overrides (
      id TEXT PRIMARY KEY,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      finish TEXT,
      hex TEXT,
      formula TEXT,
      notes TEXT,
      physical_swatch_reference TEXT,
      verified_by TEXT,
      verified_at TEXT
    );

    CREATE INDEX idx_paint_brand ON paint_colors(brand);
    CREATE INDEX idx_paint_model ON paint_colors(model);
    CREATE INDEX idx_paint_vehicle ON paint_colors(brand, model, year_from, year_to);
    CREATE INDEX idx_paint_code ON paint_colors(code);
    CREATE INDEX idx_paint_name ON paint_colors(name);
  `);

  // Insert Brands
  const insertBrand = db.prepare(`INSERT INTO vehicle_brands (id, name) VALUES (?, ?)`);
  for (const b of Array.from(brandsSet).sort()) {
    insertBrand.run(slugify(b), b);
  }

  // Insert Models
  const insertModel = db.prepare(`INSERT INTO vehicle_models (id, brand_id, name) VALUES (?, ?, ?)`);
  for (const [brand, models] of modelsMap.entries()) {
    const brandId = slugify(brand);
    for (const m of Array.from(models).sort()) {
      insertModel.run(`${brandId}-${slugify(m)}`, brandId, m);
    }
  }

  // Insert Paint Colors
  const insertColor = db.prepare(`
    INSERT INTO paint_colors (
      id, brand, model, year_from, year_to, code, name, finish, hex, source, verified, notes, formula_reference, verified_by, verified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of cleanedRecords) {
    insertColor.run(
      c.id,
      c.brand,
      c.model,
      c.yearFrom,
      c.yearTo,
      c.code,
      c.name,
      c.finish,
      c.hex || null,
      c.source,
      c.verified ? 1 : 0,
      c.notes || null,
      c.formulaReference || null,
      c.verifiedBy || null,
      c.verifiedAt || null
    );
  }

  // Insert sources metadata
  const insertSource = db.prepare(`
    INSERT INTO paint_sources (id, name, description, url, licence, attribution) VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertSource.run(
    'oem-reference',
    'OEM Factory Technical Specifications',
    'Official automotive manufacturer paint code reference tables and service bulletins',
    'https://truecolours.vercel.app/docs/paint-data-sources.md',
    'Public Factual Data / Fair Use',
    'Manufacturer trade names referenced strictly for compatibility identification.'
  );
  insertSource.run(
    'nhtsa-vpic',
    'NHTSA VPIC API',
    'US Department of Transportation public vehicle database',
    'https://vpic.nhtsa.dot.gov/api/',
    'Public Domain / US Federal Government Work',
    'United States Department of Transportation'
  );

  db.close();
  console.log(`\nIndexed SQLite database created successfully at: ${dbPath}`);

  // 2. Generate optimized JSON fallback file for serverless environments
  const jsonPath = path.join(process.cwd(), "data", "paint-records.json");
  fs.writeFileSync(jsonPath, JSON.stringify(cleanedRecords, null, 2), "utf-8");
  console.log(`Portable server records JSON created successfully at: ${jsonPath}`);

  console.log("\n==================================================");
  console.log("IMPORT COMPLETE — READY FOR PRODUCTION");
  console.log("==================================================");
}

runImport().catch(err => {
  console.error("Import failed:", err);
  process.exit(1);
});
