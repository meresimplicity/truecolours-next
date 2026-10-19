import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

export function generateCoverageReport() {
  const dbPath = path.join(process.cwd(), "data", "paint.db");
  if (!fs.existsSync(dbPath)) {
    console.error(`Database not found at ${dbPath}. Please run import first.`);
    process.exit(1);
  }

  const db = new DatabaseSync(dbPath);

  // Queries
  const brandCountRow = db.prepare("SELECT COUNT(*) as count FROM paint_brands").get() as { count: number };
  const modelCountRow = db.prepare("SELECT COUNT(*) as count FROM paint_models").get() as { count: number };
  const genCountRow = db.prepare("SELECT COUNT(*) as count FROM paint_generations").get() as { count: number };
  const yearCountRow = db.prepare("SELECT COUNT(*) as count FROM paint_model_years").get() as { count: number };
  const colorCountRow = db.prepare("SELECT COUNT(*) as count FROM paint_colors").get() as { count: number };
  const uniqueCodesRow = db.prepare("SELECT COUNT(DISTINCT normalized_code) as count FROM paint_color_codes").get() as { count: number };
  const tcVerifiedRow = db.prepare("SELECT COUNT(*) as count FROM truecolours_verified_colors").get() as { count: number };

  const sources = db.prepare("SELECT id, name, url, licence FROM paint_sources").all() as {
    id: string;
    name: string;
    url: string;
    licence: string;
  }[];

  const report = {
    totalBrands: brandCountRow.count,
    totalModels: modelCountRow.count,
    totalGenerations: genCountRow.count,
    totalModelYears: yearCountRow.count,
    totalPaintRecords: colorCountRow.count,
    totalUniquePaintCodes: uniqueCodesRow.count,
    totalVerifiedTruecoloursRecords: tcVerifiedRow.count,
    dataSources: sources.map((s) => ({ name: s.name, url: s.url })),
    licences: sources.map((s) => ({ source: s.name, licence: s.licence })),
  };

  console.log("==================================================");
  console.log("TRUECOLOURS AUTOMOTIVE PAINT COVERAGE REPORT");
  console.log("==================================================");
  console.log(`1. Total Brands Imported:           ${report.totalBrands}`);
  console.log(`2. Total Models Imported:           ${report.totalModels}`);
  console.log(`3. Total Generations:               ${report.totalGenerations}`);
  console.log(`4. Total Model-Years:               ${report.totalModelYears}`);
  console.log(`5. Total Paint Colours:             ${report.totalPaintRecords}`);
  console.log(`6. Total Unique Paint Codes:        ${report.totalUniquePaintCodes}`);
  console.log(`7. TRUECOLOURS Verified Records:    ${report.totalVerifiedTruecoloursRecords}`);
  console.log("--------------------------------------------------");
  console.log("8. Data Sources:");
  for (const s of report.dataSources) {
    console.log(`   - ${s.name} (${s.url})`);
  }
  console.log("9. Licences:");
  for (const l of report.licences) {
    console.log(`   - ${l.source}: ${l.licence}`);
  }
  console.log("==================================================");

  return report;
}

generateCoverageReport();
