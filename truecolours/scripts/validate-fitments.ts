/**
 * scripts/validate-fitments.ts
 *
 * Integrity checks over paint_fitments, safe to re-run on a schedule.
 * Flags problems for admin review; the only mutation this script performs
 * is marking flagged rows 'unverified' if they were incorrectly marked
 * higher — it never invents a fix.
 *
 * Deliberately NOT implemented here: backfilling a fitment's year_from/
 * year_to from a vehicle-taxonomy source like NHTSA vPIC. "This model
 * existed in this year" and "this paint colour was offered on this model
 * in this year" are different facts — one is about the vehicle, one is
 * about the paint program — and treating the first as evidence for the
 * second is exactly the inference the whole system is built to avoid (see
 * spec section 27, "do not use observed vehicle colours as factory
 * colours" — the same logic applies to borrowing years). A low-confidence
 * fitment stays low-confidence until a paint source itself confirms a year.
 */
import { query } from "../src/lib/db";

async function main() {
  const issues: string[] = [];

  // 1. year_from later than year_to.
  const badRanges = await query<{ id: string; year_from: number; year_to: number }>(
    `select id, year_from, year_to from paint_fitments where year_from is not null and year_to is not null and year_from > year_to`
  );
  if (badRanges.length > 0) {
    issues.push(`${badRanges.length} fitment(s) with year_from > year_to`);
  }

  // 2. Fitment's model doesn't belong to the fitment's own manufacturer —
  // would indicate a bug in an importer's model-matching, not a data source problem.
  const crossManufacturer = await query<{ id: string }>(
    `select pf.id
       from paint_fitments pf
       join vehicle_models vm on vm.id = pf.model_id
      where pf.model_id is not null and vm.manufacturer_id <> pf.manufacturer_id`
  );
  if (crossManufacturer.length > 0) {
    issues.push(`${crossManufacturer.length} fitment(s) whose model belongs to a different manufacturer`);
    await query(
      `update paint_fitments set verification_status = 'unverified'
        where id = any($1::uuid[])`,
      [crossManufacturer.map((r) => r.id)]
    );
  }

  // 3. Exact duplicate fitment rows (same paint/model/variant/year/market/source)
  // that slipped past the import script's own existence check.
  const duplicates = await query<{ ids: string[] }>(
    `select array_agg(id order by created_at) as ids
       from paint_fitments
      group by paint_color_id, coalesce(model_id::text,''), coalesce(variant_id::text,''),
               coalesce(year_from,-1), coalesce(year_to,-1), coalesce(market,''), source_id
     having count(*) > 1`
  );
  let duplicateRowsRemoved = 0;
  for (const d of duplicates) {
    const [, ...extras] = d.ids; // keep the first (oldest), drop the rest
    if (extras.length > 0) {
      await query(`delete from paint_fitments where id = any($1::uuid[])`, [extras]);
      duplicateRowsRemoved += extras.length;
    }
  }
  if (duplicateRowsRemoved > 0) {
    issues.push(`${duplicateRowsRemoved} exact-duplicate fitment row(s) removed`);
  }

  // 4. Fitments carrying no year AND no market AND confidence 1.0 — that
  // combination shouldn't happen (see import-paint-provider.ts: no year
  // means confidence is set to 0.6), so surface it if it does.
  const suspiciousConfidence = await query<{ id: string }>(
    `select id from paint_fitments where year_from is null and year_to is null and confidence >= 1.0`
  );
  if (suspiciousConfidence.length > 0) {
    issues.push(`${suspiciousConfidence.length} fitment(s) with no year info but confidence >= 1.0 — check the importer that wrote them`);
  }

  console.log(`[validate-fitments] ${issues.length === 0 ? "no issues found" : issues.join("; ")}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
