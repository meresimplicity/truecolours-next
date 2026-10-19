import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  cleanText,
  formatDisplayCode,
  normalizeColorName,
  normalizePaintCode,
  parseMultiCode,
  slugify,
} from "./normalize-paint-codes.ts";
import { importVehicles, initVehicleSchema } from "./import-vehicles.ts";
import { detectDuplicates } from "./detect-duplicates.ts";
import { validateAndDetectConflicts } from "./detect-conflicts.ts";
import { hasPaintVerificationEvidence, restoreKnownHondaCode } from "../lib/paint/catalogue-quality.ts";

export async function runPaintImport() {
  console.log("==================================================");
  console.log("TRUECOLOURS — VEHICLE PAINT IMPORT PIPELINE");
  console.log("==================================================");

  const dbPath = path.join(process.cwd(), "data", "paint.db");
  if (fs.existsSync(dbPath)) {
    try {
      fs.unlinkSync(dbPath);
    } catch {
      // Ignored
    }
  }

  const db = new DatabaseSync(dbPath);

  // 1. Initialize Vehicle Schema
  initVehicleSchema(db);

  // 2. Initialize Paint Schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS paint_sources (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      url TEXT,
      licence TEXT,
      attribution TEXT
    );

    CREATE TABLE IF NOT EXISTS paint_colors (
      id TEXT PRIMARY KEY,
      brand_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      generation_id TEXT,
      brand_name TEXT NOT NULL,
      model_name TEXT NOT NULL,
      name TEXT NOT NULL,
      normalized_name TEXT NOT NULL,
      finish TEXT,
      swatch_hex TEXT,
      swatch_source TEXT,
      swatch_verified INTEGER NOT NULL DEFAULT 0,
      year_from INTEGER NOT NULL,
      year_to INTEGER NOT NULL,
      years_json TEXT NOT NULL,
      source_id TEXT NOT NULL,
      source_url TEXT,
      source_license TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      formula_reference TEXT,
      verified_by TEXT,
      verified_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS paint_color_codes (
      id TEXT PRIMARY KEY,
      paint_color_id TEXT NOT NULL,
      code TEXT NOT NULL,
      normalized_code TEXT NOT NULL,
      code_type TEXT NOT NULL,
      is_primary INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY(paint_color_id) REFERENCES paint_colors(id)
    );

    CREATE TABLE IF NOT EXISTS paint_color_aliases (
      id TEXT PRIMARY KEY,
      paint_color_id TEXT NOT NULL,
      language TEXT NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY(paint_color_id) REFERENCES paint_colors(id)
    );

    CREATE TABLE IF NOT EXISTS truecolours_verified_colors (
      id TEXT PRIMARY KEY,
      paint_color_id TEXT,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER,
      primary_code TEXT NOT NULL,
      sales_code TEXT,
      name TEXT NOT NULL,
      finish TEXT,
      verified_swatch_hex TEXT,
      formula_notes TEXT,
      verified_by TEXT NOT NULL,
      verified_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_colors_brand_model ON paint_colors(brand_name, model_name);
    CREATE INDEX IF NOT EXISTS idx_colors_year ON paint_colors(year_from, year_to);
    CREATE INDEX IF NOT EXISTS idx_colors_name ON paint_colors(normalized_name);
    CREATE INDEX IF NOT EXISTS idx_codes_lookup ON paint_color_codes(normalized_code);
    CREATE INDEX IF NOT EXISTS idx_codes_color ON paint_color_codes(paint_color_id);
    CREATE INDEX IF NOT EXISTS idx_aliases_color ON paint_color_aliases(paint_color_id);
    CREATE INDEX IF NOT EXISTS idx_aliases_search ON paint_color_aliases(name);
  `);

  // 3. Load & Import Vehicles Hierarchy
  const vehiclesPath = path.join(process.cwd(), "data", "raw", "vehicles-catalogue.json");
  if (fs.existsSync(vehiclesPath)) {
    const rawVehicles = JSON.parse(fs.readFileSync(vehiclesPath, "utf-8"));
    await importVehicles(db, rawVehicles);
  }

  // 4. Insert Known Paint Sources
  const insertSource = db.prepare(`
    INSERT OR REPLACE INTO paint_sources (id, name, description, url, licence, attribution)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertSource.run(
    "truecolours",
    "TRUECOLOURS Verified Physical Matching",
    "Physical automotive colour formulations verified in-store at TRUECOLOURS Mankweng",
    "https://truecolourspaints.co.za",
    "TRUECOLOURS Proprietary Trade Desk Standard",
    "TRUECOLOURS Refinish Specialists (Mankweng, Limpopo)"
  );

  insertSource.run(
    "open-data",
    "Open Automotive Refinish Standards",
    "Publicly accessible technical vehicle paint codes and OEM standard databases",
    "https://code.peinturevoiture.fr",
    "Open Automotive Reference / Public Technical Bulletins",
    "Automotive OEM Paint Formulations & Public Archives"
  );

  // 5. Load Raw Paint Records
  const cataloguePath = path.join(process.cwd(), "data", "raw", "oem-paint-catalogue.json");
  if (!fs.existsSync(cataloguePath)) {
    console.error(`Error: File not found: ${cataloguePath}`);
    process.exit(1);
  }

  const rawRecords: any[] = JSON.parse(fs.readFileSync(cataloguePath, "utf-8"));
  console.log(`Loaded ${rawRecords.length} raw paint records from ${cataloguePath}.`);

  // 6. Validation and Conflict Detection
  console.log("-> Running data quality validation & conflict checks...");
  const conflictReport = validateAndDetectConflicts(rawRecords);
  if (!conflictReport.isValid) {
    console.warn(`[Validation Warning] Found ${conflictReport.issues.length} issues:`);
    for (const issue of conflictReport.issues.slice(0, 5)) {
      console.warn(`  - [${issue.type}] ${issue.message}`);
    }
  } else {
    console.log("✓ All records passed validation checks.");
  }

  // 7. Deduplication Detection
  const duplicateReport = detectDuplicates(rawRecords);
  console.log(`✓ Deduplication check complete: ${duplicateReport.totalDuplicates} exact duplicates detected.`);

  // 8. Prepared Statements for Paint Insertion
  const insertColor = db.prepare(`
    INSERT OR REPLACE INTO paint_colors (
      id, brand_id, model_id, generation_id, brand_name, model_name, name, normalized_name,
      finish, swatch_hex, swatch_source, swatch_verified, year_from, year_to, years_json,
      source_id, source_url, source_license, verified, notes, formula_reference, verified_by, verified_at,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCode = db.prepare(`
    INSERT OR REPLACE INTO paint_color_codes (
      id, paint_color_id, code, normalized_code, code_type, is_primary
    ) VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertAlias = db.prepare(`
    INSERT OR REPLACE INTO paint_color_aliases (
      id, paint_color_id, language, name
    ) VALUES (?, ?, ?, ?)
  `);

  const insertVerified = db.prepare(`
    INSERT OR REPLACE INTO truecolours_verified_colors (
      id, paint_color_id, brand, model, year, primary_code, sales_code, name, finish,
      verified_swatch_hex, formula_notes, verified_by, verified_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Ensure brand/model entries exist in vehicles tables if not previously seeded
  const insertBrandSafe = db.prepare("INSERT OR IGNORE INTO paint_brands (id, name, slug) VALUES (?, ?, ?)");
  const insertModelSafe = db.prepare("INSERT OR IGNORE INTO paint_models (id, brand_id, name, slug) VALUES (?, ?, ?, ?)");

  const storedRecords: any[] = [];
  const uniquePaintCodes = new Set<string>();
  let verifiedCount = 0;

  const now = new Date().toISOString();

  for (const rawRecord of rawRecords) {
    const r = restoreKnownHondaCode(rawRecord);
    const brand = cleanText(r.brand);
    const model = cleanText(r.model);
    if (!brand || !model) continue;

    const brandSlug = slugify(brand);
    const modelSlug = slugify(model);
    const brandId = `brand-${brandSlug}`;
    const modelId = `model-${brandSlug}-${modelSlug}`;

    insertBrandSafe.run(brandId, brand, brandSlug);
    insertModelSafe.run(modelId, brandId, model, modelSlug);

    const { primaryCode, salesCodes } = r.primaryCode
      ? { primaryCode: cleanText(r.primaryCode).toUpperCase(), salesCodes: (r.salesCodes || []).map((s: string) => cleanText(s).toUpperCase()) }
      : parseMultiCode(r.code);

    if (!primaryCode) continue;

    const normPrimary = normalizePaintCode(primaryCode);
    const yFrom = r.yearFrom || 2010;
    const yTo = r.yearTo || 2024;
    const years: number[] = r.years && r.years.length > 0 ? r.years : Array.from({ length: yTo - yFrom + 1 }, (_, i) => yFrom + i);

    const referenceCodes = [primaryCode, ...salesCodes].map(normalizePaintCode).join("-");
    const colorId = `paint-${encodeURIComponent(brand)}-${encodeURIComponent(model)}-${referenceCodes}-${yFrom}-${yTo}`;
    const name = cleanText(r.name);
    const normalizedName = normalizeColorName(name);
    const finish = cleanText(r.finish) || "Solid";
    const swatchHex = r.swatchHex && /^#[0-9A-Fa-f]{6}$/.test(r.swatchHex.trim()) ? r.swatchHex.trim().toUpperCase() : null;
    const isVerified = hasPaintVerificationEvidence(r) ? 1 : 0;
    if (isVerified) verifiedCount++;

    insertColor.run(
      colorId,
      brandId,
      modelId,
      r.generation ? slugify(r.generation) : null,
      brand,
      model,
      name,
      normalizedName,
      finish,
      swatchHex,
      r.swatchSource || (swatchHex ? "Digital Formulation Approximation" : null),
      r.swatchVerified && isVerified ? 1 : 0,
      yFrom,
      yTo,
      JSON.stringify(years),
      r.source || "open-data",
      r.sourceUrl || null,
      r.sourceLicense || "Open Automotive Reference",
      isVerified,
      r.notes || null,
      r.formulaReference || null,
      r.verifiedBy || null,
      r.verifiedAt || null,
      now,
      now
    );

    // Insert Primary Code
    const primaryCodeId = `code-${colorId}-primary-${normPrimary}`;
    insertCode.run(primaryCodeId, colorId, primaryCode, normPrimary, "primary", 1);
    uniquePaintCodes.add(normPrimary);

    // Insert Sales Codes
    for (let i = 0; i < salesCodes.length; i++) {
      const sc = salesCodes[i];
      if (!sc) continue;
      const normSc = normalizePaintCode(sc);
      const salesCodeId = `code-${colorId}-sales-${normSc}-${i}`;
      insertCode.run(salesCodeId, colorId, sc, normSc, "sales", 0);
      uniquePaintCodes.add(normSc);
    }

    // Insert Alternative Names
    const alternativeNames: { language: string; name: string }[] = [];
    if (r.alternativeNames && Array.isArray(r.alternativeNames)) {
      for (let i = 0; i < r.alternativeNames.length; i++) {
        const alt = r.alternativeNames[i];
        const altName = cleanText(alt.name);
        if (!altName) continue;
        const lang = cleanText(alt.language) || "en";
        const aliasId = `alias-${colorId}-${lang}-${i}`;
        insertAlias.run(aliasId, colorId, lang, altName);
        alternativeNames.push({ language: lang, name: altName });
      }
    }

    // Insert TRUECOLOURS verified override if applicable
    if (isVerified && r.source === "truecolours") {
      const verifiedId = `tc-verified-${colorId}`;
      insertVerified.run(
        verifiedId,
        colorId,
        brand,
        model,
        years[0] || yFrom,
        primaryCode,
        salesCodes.join(" / ") || null,
        name,
        finish,
        swatchHex,
        r.notes || "In-store spectrophotometer and spray-out panel verified.",
        r.verifiedBy || "TRUECOLOURS Refinish Team (Mankweng)",
        r.verifiedAt || now
      );
    }

    // Stored JSON representation
    storedRecords.push({
      id: colorId,
      brand,
      model,
      brandId,
      modelId,
      generation: r.generation,
      yearFrom: yFrom,
      yearTo: yTo,
      years,
      code: primaryCode,
      primaryCode,
      salesCodes,
      displayCode: formatDisplayCode(primaryCode, salesCodes),
      name,
      normalizedName,
      finish,
      hex: swatchHex || undefined,
      swatchHex: swatchHex || undefined,
      swatchSource: r.swatchSource,
      swatchVerified: Boolean(r.swatchVerified && isVerified),
      alternativeNames,
      source: r.source || "open-data",
      sourceUrl: r.sourceUrl,
      sourceLicense: r.sourceLicense,
      verified: Boolean(isVerified),
      notes: r.notes,
      formulaReference: r.formulaReference,
      verifiedBy: r.verifiedBy,
      verifiedAt: r.verifiedAt,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 9. Write JSON cache file for high speed Next.js reads
  const recordsJsonPath = path.join(process.cwd(), "data", "paint-records.json");
  fs.writeFileSync(recordsJsonPath, JSON.stringify(storedRecords, null, 2));

  console.log(`\nImport Pipeline Completed Successfully:`);
  console.log(`- Stored ${storedRecords.length} paint colors in SQLite and paint-records.json`);
  console.log(`- Unique Paint Codes: ${uniquePaintCodes.size}`);
  console.log(`- TRUECOLOURS Verified Records: ${verifiedCount}`);
}

runPaintImport().catch((err) => {
  console.error("Pipeline failure:", err);
  process.exit(1);
});
