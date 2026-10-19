import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const ROOT = process.cwd();
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1980;
const OPEN_DIR = path.join(ROOT, "open-vehicle-db-master", "data");
const METER_FILE = path.join(ROOT, "vehicle-db-main", "data", "compact.json");
const OUTPUT_DIR = path.join(ROOT, "data", "processed");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "vehicle-catalogue.json");
const SELECTOR_FILE = path.join(OUTPUT_DIR, "vehicle-selector.json");
const REPORT_FILE = path.join(OUTPUT_DIR, "vehicle-coverage-report.json");
const DB_FILE = path.join(ROOT, "data", "vehicles.db");

function assertFile(file) {
  if (!fs.existsSync(file)) throw new Error(`Required source file is missing: ${path.relative(ROOT, file)}`);
}

function csvRows(file) {
  const [header, ...rows] = fs.readFileSync(file, "utf8").trim().split(/\r?\n/);
  const fields = parseCsv(header);
  return rows.filter(Boolean).map((line) => Object.fromEntries(fields.map((field, i) => [field, parseCsv(line)[i] ?? ""])));
}

function parseCsv(line) {
  const values = []; let value = ""; let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { value += '"'; i++; } else quoted = !quoted;
    } else if (char === "," && !quoted) { values.push(value); value = ""; } else value += char;
  }
  values.push(value);
  return values;
}

function years(value) {
  const found = new Set();
  for (const segment of String(value).split(",")) {
    const [fromText, toText] = segment.trim().split("-");
    const from = Number(fromText); const to = Number(toText ?? fromText);
    if (!Number.isInteger(from) || !Number.isInteger(to)) continue;
    for (let year = Math.max(MIN_YEAR, from); year <= Math.min(CURRENT_YEAR, to); year++) found.add(year);
  }
  return [...found];
}

function normalize(value) {
  return String(value ?? "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");
}

function id(value) { return normalize(value).replace(/ /g, "-"); }

function makeKey(make, model, year) { return `${year}|${normalize(make)}|${normalize(model)}`; }

function addRecord(records, input) {
  if (!input.make || !input.model || !Number.isInteger(input.year)) return false;
  const key = makeKey(input.make, input.model, input.year);
  const existing = records.get(key);
  if (!existing) {
    records.set(key, {
      id: `vehicle-${input.year}-${id(input.make)}--${id(input.model)}`,
      year: input.year,
      make: input.make,
      makeId: `make-${id(input.make)}`,
      normalizedMake: normalize(input.make),
      model: input.model,
      modelId: `model-${id(input.make)}--${id(input.model)}`,
      normalizedModel: normalize(input.model),
      bodyTypes: input.bodyType ? [input.bodyType] : [],
      styles: input.style ? [input.style] : [],
      sources: [{ source: input.source, sourceRecordId: input.sourceRecordId, market: input.market ?? null }],
    });
    return true;
  }
  if (input.bodyType && !existing.bodyTypes.includes(input.bodyType)) existing.bodyTypes.push(input.bodyType);
  if (input.style && !existing.styles.includes(input.style)) existing.styles.push(input.style);
  const sourceKey = `${input.source}|${input.sourceRecordId}`;
  if (!existing.sources.some((source) => `${source.source}|${source.sourceRecordId}` === sourceKey)) {
    existing.sources.push({ source: input.source, sourceRecordId: input.sourceRecordId, market: input.market ?? null });
  }
  return false;
}

function readOpenVehicle(records, stats) {
  const makes = csvRows(path.join(OPEN_DIR, "makes.csv"));
  const models = csvRows(path.join(OPEN_DIR, "models.csv"));
  const styles = csvRows(path.join(OPEN_DIR, "styles.csv"));
  const makeNames = new Map(makes.map((make) => [make.make_slug, make.make_name]));
  const modelBySlug = new Map(models.map((model) => [`${model.make_slug}|${model.model_slug}`, model]));
  stats.openVehicle = { originalRecords: models.length, makeRecords: makes.length, modelRecords: models.length, styleRecords: styles.length, fields: Object.keys(models[0] ?? {}) };

  for (const model of models) {
    const make = makeNames.get(model.make_slug);
    for (const year of years(model.years)) {
      stats.rawBySource.openVehicle++;
      addRecord(records, { make, model: model.model_name, year, bodyType: model.vehicle_type || null, source: "open-vehicle-db", sourceRecordId: model.model_id, market: "United States" });
    }
  }
  for (const style of styles) {
    const model = modelBySlug.get(`${style.make_slug}|${style.model_slug}`);
    const make = makeNames.get(style.make_slug);
    if (!model || !make) { stats.malformed.openVehicle++; continue; }
    for (const year of years(style.years)) {
      addRecord(records, { make, model: model.model_name, year, bodyType: model.vehicle_type || null, style: style.style_name, source: "open-vehicle-db-style", sourceRecordId: `${style.make_slug}:${style.model_slug}:${style.style_name}`, market: "United States" });
    }
  }
}

function readMeterApp(records, stats) {
  const data = JSON.parse(fs.readFileSync(METER_FILE, "utf8"));
  const makeById = new Map(data.makes.map((make) => [make.make_id, make.make_name]));
  const typeById = new Map(data.vehicleTypes.map((type) => [type.vehicle_type_id, type.vehicle_type_name]));
  stats.meterApp = { originalRecords: data.models.length, makeRecords: data.makes.length, modelNames: data.modelNames.length, fields: ["year", "make_id", "model_id", "model_name_index", "vehicle_type_id", "source_mask"] };
  for (const row of data.models) {
    const [year, makeId, modelSourceId, modelNameIndex, vehicleTypeId, sourceMask] = row;
    if (year < MIN_YEAR || year > CURRENT_YEAR) continue;
    const make = makeById.get(makeId); const model = data.modelNames[modelNameIndex];
    if (!make || !model) { stats.malformed.meterApp++; continue; }
    stats.rawBySource.meterApp++;
    addRecord(records, { make, model, year, bodyType: typeById.get(vehicleTypeId) ?? null, source: "meterapp-vehicle-db", sourceRecordId: `${modelSourceId}:${sourceMask}`, market: null });
  }
}

function writeDatabase(records) {
  const db = new DatabaseSync(DB_FILE);
  db.exec("PRAGMA foreign_keys = ON; DROP TABLE IF EXISTS vehicle_variants; DROP TABLE IF EXISTS vehicle_sources; DROP TABLE IF EXISTS vehicle_years; DROP TABLE IF EXISTS vehicle_models; DROP TABLE IF EXISTS vehicle_makes; CREATE TABLE vehicle_makes (id TEXT PRIMARY KEY, name TEXT NOT NULL, normalized_name TEXT UNIQUE NOT NULL); CREATE TABLE vehicle_models (id TEXT PRIMARY KEY, make_id TEXT NOT NULL, name TEXT NOT NULL, normalized_name TEXT NOT NULL, UNIQUE(make_id, normalized_name), FOREIGN KEY(make_id) REFERENCES vehicle_makes(id)); CREATE TABLE vehicle_years (id TEXT PRIMARY KEY, model_id TEXT NOT NULL, year INTEGER NOT NULL, source_count INTEGER NOT NULL, UNIQUE(model_id, year), FOREIGN KEY(model_id) REFERENCES vehicle_models(id)); CREATE TABLE vehicle_variants (id TEXT PRIMARY KEY, vehicle_year_id TEXT NOT NULL, style TEXT, body_type TEXT, generation TEXT, series TEXT, submodel TEXT, market TEXT, source TEXT NOT NULL, source_record_id TEXT NOT NULL, FOREIGN KEY(vehicle_year_id) REFERENCES vehicle_years(id)); CREATE TABLE vehicle_sources (vehicle_year_id TEXT NOT NULL, source TEXT NOT NULL, source_record_id TEXT NOT NULL, market TEXT, PRIMARY KEY(vehicle_year_id, source, source_record_id), FOREIGN KEY(vehicle_year_id) REFERENCES vehicle_years(id)); CREATE INDEX idx_vehicle_years_year ON vehicle_years(year); CREATE INDEX idx_vehicle_models_make ON vehicle_models(make_id); CREATE INDEX idx_vehicle_year_make ON vehicle_years(year, model_id); CREATE INDEX idx_vehicle_model_year ON vehicle_years(model_id, year);");
  const makeStmt = db.prepare("INSERT INTO vehicle_makes VALUES (?, ?, ?)");
  const modelStmt = db.prepare("INSERT INTO vehicle_models VALUES (?, ?, ?, ?)");
  const yearStmt = db.prepare("INSERT INTO vehicle_years VALUES (?, ?, ?, ?)");
  const sourceStmt = db.prepare("INSERT INTO vehicle_sources VALUES (?, ?, ?, ?)");
  const variantStmt = db.prepare("INSERT INTO vehicle_variants VALUES (?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?)");
  const insertedMakes = new Set(); const insertedModels = new Set();
  db.exec("BEGIN");
  try {
    for (const record of records) {
      if (!insertedMakes.has(record.makeId)) { makeStmt.run(record.makeId, record.make, record.normalizedMake); insertedMakes.add(record.makeId); }
      if (!insertedModels.has(record.modelId)) { modelStmt.run(record.modelId, record.makeId, record.model, record.normalizedModel); insertedModels.add(record.modelId); }
      yearStmt.run(record.id, record.modelId, record.year, record.sources.length);
      for (const source of record.sources) sourceStmt.run(record.id, source.source, source.sourceRecordId, source.market);
      record.styles.forEach((style, index) => variantStmt.run(`${record.id}-style-${index}`, record.id, style, record.bodyTypes[0] ?? null, record.sources[0]?.market ?? null, "open-vehicle-db-style", style));
      if (!record.styles.length) record.bodyTypes.forEach((bodyType, index) => variantStmt.run(`${record.id}-body-${index}`, record.id, null, bodyType, record.sources[0]?.market ?? null, record.sources[0]?.source ?? "unknown", record.sources[0]?.sourceRecordId ?? record.id));
    }
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; } finally { db.close(); }
}

assertFile(METER_FILE); assertFile(path.join(OPEN_DIR, "makes.csv"));
const records = new Map();
const stats = { rawBySource: { openVehicle: 0, meterApp: 0 }, malformed: { openVehicle: 0, meterApp: 0 } };
readOpenVehicle(records, stats);
const afterOpen = records.size;
readMeterApp(records, stats);
const canonical = [...records.values()].sort((a, b) => b.year - a.year || a.make.localeCompare(b.make) || a.model.localeCompare(b.model));
const sourceCounts = { openVehicle: 0, meterApp: 0, both: 0 };
for (const record of canonical) {
  const hasOpen = record.sources.some((source) => source.source.startsWith("open-vehicle-db"));
  const hasMeter = record.sources.some((source) => source.source === "meterapp-vehicle-db");
  if (hasOpen && hasMeter) sourceCounts.both++; else if (hasOpen) sourceCounts.openVehicle++; else sourceCounts.meterApp++;
}
const uniqueModels = new Set(canonical.map((record) => `${record.normalizedMake}|${record.normalizedModel}`));
const earliestYear = canonical.reduce((lowest, record) => Math.min(lowest, record.year), CURRENT_YEAR);
const latestYear = canonical.reduce((highest, record) => Math.max(highest, record.year), MIN_YEAR);
const report = {
  generatedAt: new Date().toISOString(),
  policy: "Union of valid records from the two supplied datasets; records are only merged when year, normalized make, and normalized model match. No paint codes were imported.",
  sources: stats,
  coverage: { canonicalRecords: canonical.length, uniqueMakes: new Set(canonical.map((record) => record.normalizedMake)).size, uniqueModels: uniqueModels.size, uniqueModelYearCombinations: canonical.length, uniqueVariantsStyles: new Set(canonical.flatMap((record) => record.styles)).size, earliestYear, latestYear, recordsUniqueToOpenVehicleDb: sourceCounts.openVehicle, recordsUniqueToMeterApp: sourceCounts.meterApp, recordsInBoth: sourceCounts.both, duplicatesRemoved: stats.rawBySource.openVehicle + stats.rawBySource.meterApp - canonical.length },
  retainedFields: ["year", "make", "makeId", "normalizedMake", "model", "modelId", "normalizedModel", "bodyTypes", "styles", "sources"],
  removedFromProcessedDataset: ["source-specific implementation metadata", "duplicate make/model strings", "unneeded source columns"],
  limitations: ["The supplied vehicle datasets do not provide OEM paint codes.", "MeterApp source rows do not provide trim, style, generation, series, or submodel fields.", "Country/market is retained only where directly known from a source."],
};
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(OUTPUT_FILE, JSON.stringify({ schemaVersion: 1, generatedAt: report.generatedAt, minYear: MIN_YEAR, maxYear: CURRENT_YEAR, records: canonical }));
const selector = {};
for (const record of canonical) {
  selector[record.year] ??= {};
  selector[record.year][record.make] ??= [];
  selector[record.year][record.make].push(record.model);
}
for (const makes of Object.values(selector)) for (const models of Object.values(makes)) models.sort((a, b) => a.localeCompare(b));
fs.writeFileSync(SELECTOR_FILE, JSON.stringify({ schemaVersion: 1, generatedAt: report.generatedAt, years: selector }));
fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2));
writeDatabase(canonical);
console.log(JSON.stringify(report.coverage, null, 2));
