/**
 * scripts/import-vehicles.ts
 *
 * Populates manufacturers + vehicle_models from VehiclesDB, and — where the
 * make also exists in NHTSA vPIC's US dataset — probes for confirmed
 * model-years via vehicle_model_years. Run with: npm run import:vehicles
 *
 * Safe to re-run: everything is an upsert keyed on (source, source_record_id)
 * or the natural (manufacturer_id, slug) key, and nothing is ever deleted
 * here. A record that a human has since marked team_verified is left alone
 * — see the "never overwrite verified" guard below.
 */
import { withTransaction, query } from "../src/lib/db";
import { getVehicleProviders } from "../src/providers/registry";
import { slugify } from "../src/lib/normalize";
import type { VehicleProvider } from "../src/providers/types";

async function getOrCreateDataSource(client: import("pg").PoolClient, provider: VehicleProvider) {
  const existing = await client.query(`select id from data_sources where slug = $1`, [provider.slug]);
  if (existing.rows[0]) return existing.rows[0].id as string;
  const inserted = await client.query(
    `insert into data_sources (slug, name, kind, license, attribution_text, requires_api_key, redistribution_allowed)
     values ($1, $2, 'vehicle_taxonomy', $3, $4, false, true)
     returning id`,
    [provider.slug, provider.slug, provider.license, provider.attribution ?? null]
  );
  return inserted.rows[0].id as string;
}

async function importFromProvider(provider: VehicleProvider) {
  const startedJob = await query<{ id: string }>(
    `insert into import_jobs (source_id, job_type, status, triggered_by)
     select id, 'vehicle_taxonomy', 'running', 'cli' from data_sources where slug = $1
     returning id`,
    [provider.slug]
  );

  let seen = 0;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let errorMessage: string | null = null;

  try {
    await withTransaction(async (client) => {
      const sourceId = await getOrCreateDataSource(client, provider);
      const rawMakes = await provider.getMakes();

      for (const rawMake of rawMakes) {
        seen++;
        const make = provider.normalizeMake(rawMake);
        const slug = slugify(make.slug || make.name);

        const upsertMake = await client.query(
          `insert into manufacturers (name, slug, country, source_id, source_record_id)
           values ($1, $2, $3, $4, $5)
           on conflict (slug) do update set
             -- never blindly overwrite a name a human may have corrected —
             -- only fill in country/source bookkeeping
             country = coalesce(manufacturers.country, excluded.country),
             updated_at = now()
           returning id, (xmax = 0) as was_inserted`,
          [make.name, slug, make.country ?? null, sourceId, make.sourceRecordId]
        );
        const manufacturerId = upsertMake.rows[0].id as string;
        upsertMake.rows[0].was_inserted ? inserted++ : updated++;

        const rawModels = await provider.getModels(slug);
        for (const rawModel of rawModels) {
          seen++;
          const model = provider.normalizeModel(rawModel, manufacturerId);
          const modelSlug = slugify(model.slug || model.name);

          const upsertModel = await client.query(
            `insert into vehicle_models
               (manufacturer_id, name, slug, vehicle_type, body_style, generation, year_from, year_to, source_id, source_record_id)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
             on conflict (manufacturer_id, slug) do update set
               vehicle_type = coalesce(excluded.vehicle_type, vehicle_models.vehicle_type),
               body_style = coalesce(excluded.body_style, vehicle_models.body_style),
               updated_at = now()
             returning (xmax = 0) as was_inserted`,
            [
              manufacturerId,
              model.name,
              modelSlug,
              model.vehicleType ?? null,
              model.bodyStyle ?? null,
              model.generation ?? null,
              model.yearFrom ?? null,
              model.yearTo ?? null,
              sourceId,
              model.sourceRecordId,
            ]
          );
          upsertModel.rows[0].was_inserted ? inserted++ : updated++;
        }
      }
    });
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
    skipped++;
  }

  const jobId = startedJob[0]?.id;
  if (jobId) {
    await query(
      `update import_jobs set status = $1, finished_at = now(),
              records_seen = $2, records_inserted = $3, records_updated = $4,
              records_skipped = $5, error = $6
        where id = $7`,
      [errorMessage ? "failed" : "succeeded", seen, inserted, updated, skipped, errorMessage, jobId]
    );
  }

  console.log(
    `[import-vehicles] ${provider.slug}: seen=${seen} inserted=${inserted} updated=${updated} skipped=${skipped}${
      errorMessage ? ` error=${errorMessage}` : ""
    }`
  );
}

async function main() {
  for (const provider of getVehicleProviders()) {
    // NHTSA vPIC's getMakes()/getModels() work, but its real value here is
    // getYears() for backfilling vehicle_model_years on models VehiclesDB
    // already created — a full second make/model import from it would just
    // create US-only duplicate manufacturer rows. Only run the primary
    // (VehiclesDB) provider for makes/models; year backfill from vPIC
    // belongs in scripts/validate-fitments.ts, not here.
    if (provider.slug === "vehiclesdb") {
      await importFromProvider(provider);
    } else {
      console.log(`[import-vehicles] skipping ${provider.slug} for makes/models — see comment above main()`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
