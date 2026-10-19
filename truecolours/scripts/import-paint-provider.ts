/**
 * scripts/import-paint-provider.ts
 *
 * Usage: npm run import:paint -- --provider=paint_calculators
 *
 * For every manufacturer already in the database, asks the named paint
 * provider for its colours, and writes:
 *   - one paint_colors row per (manufacturer, code, aux_code) FOR THIS
 *     SOURCE specifically (the unique constraint includes source_id — see
 *     migration 0001) — this deliberately does not merge across sources.
 *   - one paint_fitments row per model the provider's own data says the
 *     colour is compatible with (never inferred from "same manufacturer").
 *
 * Cross-source consolidation (recognizing that paint_calculators' "LY9T"
 * and mycarcolor's "LY9T" are probably the same colour) is
 * scripts/dedupe-paint.ts's job, on purpose — keeping ingestion and
 * consolidation separate means a bug in matching logic can never corrupt
 * what a source actually said.
 */
import { withTransaction, query } from "../src/lib/db";
import { getPaintProviders } from "../src/providers/registry";
import { normalizePaintCode, slugify } from "../src/lib/normalize";
import { ProviderConfigError, ProviderUnavailableError, type PaintProvider } from "../src/providers/types";

function parseArgs() {
  const providerArg = process.argv.find((a) => a.startsWith("--provider="));
  const providerSlug = providerArg?.split("=")[1];
  if (!providerSlug) {
    console.error("Usage: import-paint-provider.ts --provider=<slug>");
    process.exit(1);
  }
  return { providerSlug };
}

async function getOrCreateDataSource(client: import("pg").PoolClient, provider: PaintProvider) {
  const existing = await client.query(`select id from data_sources where slug = $1`, [provider.slug]);
  if (existing.rows[0]) return existing.rows[0].id as string;
  const inserted = await client.query(
    `insert into data_sources (slug, name, kind, license, attribution_text, requires_api_key, redistribution_allowed)
     values ($1, $2, 'paint_catalogue', $3, $4, true, $5)
     returning id`,
    [provider.slug, provider.slug, provider.license, provider.attribution ?? null, provider.redistributionAllowed]
  );
  return inserted.rows[0].id as string;
}

async function main() {
  const { providerSlug } = parseArgs();
  const provider = getPaintProviders().find((p) => p.slug === providerSlug);
  if (!provider) {
    console.error(`Unknown or unconfigured provider: ${providerSlug} (check .env for its API key)`);
    process.exit(1);
  }
  if (!provider.redistributionAllowed) {
    console.error(
      `[import-paint-provider] ${provider.slug} is marked redistributionAllowed: false — refusing to persist its ` +
        `data. This provider must be used as a live lookup only until its licence is confirmed. See its adapter file.`
    );
    process.exit(1);
  }

  const manufacturers = await query<{ id: string; name: string; slug: string }>(
    `select id, name, slug from manufacturers order by name`
  );

  const jobRow = await query<{ id: string }>(
    `insert into import_jobs (source_id, job_type, status, triggered_by)
     select id, 'paint_catalogue', 'running', 'cli' from data_sources where slug = $1
     returning id`,
    [provider.slug]
  );
  // Ensure the source row exists even if the insert above raced an empty table.
  let sourceId: string;
  await withTransaction(async (client) => {
    sourceId = await getOrCreateDataSource(client, provider);
  });

  let seen = 0;
  let inserted = 0;
  let updated = 0;
  let skippedNoModelMatch = 0;
  let errorMessage: string | null = null;

  try {
    for (const mf of manufacturers) {
      let rawColors;
      try {
        rawColors = await provider.searchColors({ make: mf.slug });
      } catch (err) {
        if (err instanceof ProviderConfigError || err instanceof ProviderUnavailableError) {
          console.warn(`[import-paint-provider] ${provider.slug} unavailable for ${mf.slug}: ${err.message}`);
          continue;
        }
        throw err;
      }

      const models = await query<{ id: string; name: string; slug: string }>(
        `select id, name, slug from vehicle_models where manufacturer_id = $1`,
        [mf.id]
      );

      for (const raw of rawColors) {
        seen++;
        const color = provider.normalizePaintColor(raw, mf.id);
        const codeNormalized = normalizePaintCode(color.code);

        await withTransaction(async (client) => {
          const upsert = await client.query(
            `insert into paint_colors
               (manufacturer_id, code, code_normalized, aux_code, standard_number, name, base_color, finish, hex,
                source_id, source_url, source_record_id, verification_status)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'source_verified')
             on conflict (manufacturer_id, code_normalized, aux_code, source_id) do update set
               name = excluded.name, hex = excluded.hex, finish = excluded.finish, updated_at = now()
             returning id, (xmax = 0) as was_inserted`,
            [
              mf.id,
              color.code,
              codeNormalized,
              color.auxCode ?? null,
              color.standardNumber ?? null,
              color.name,
              color.baseColor ?? null,
              color.finish ?? null,
              color.hex ?? null,
              sourceId,
              color.sourceUrl ?? null,
              color.sourceRecordId,
            ]
          );
          const paintColorId = upsert.rows[0].id as string;
          upsert.rows[0].was_inserted ? inserted++ : updated++;

          // Fitments: only from data the provider's OWN record actually
          // names (spec section 27 — never infer from "same manufacturer").
          const availability = (raw as any).availability as string[] | undefined;
          const candidateModelNames = availability && availability.length > 0 ? availability : [];

          for (const modelName of candidateModelNames) {
            const modelSlug = slugify(modelName);
            const match = models.find((m) => m.slug === modelSlug || slugify(m.name) === modelSlug);
            if (!match) {
              skippedNoModelMatch++;
              continue;
            }
            const fitment = provider.normalizeFitment(raw, {
              paintColorId,
              manufacturerId: mf.id,
              modelId: match.id,
            });

            const existing = await client.query(
              `select id from paint_fitments
                where paint_color_id = $1 and model_id = $2 and source_id = $3
                  and coalesce(year_from,-1) = coalesce($4,-1) and coalesce(year_to,-1) = coalesce($5,-1)`,
              [paintColorId, match.id, sourceId, fitment.yearFrom, fitment.yearTo]
            );
            if (existing.rows[0]) continue; // already recorded, nothing to change

            // year_from/year_to null (see paint-calculators.provider.ts) means
            // the source didn't actually confirm a year — reflected honestly
            // in a lower confidence + unverified status, not hidden.
            const confidence = fitment.yearFrom || fitment.yearTo ? 1.0 : 0.6;
            await client.query(
              `insert into paint_fitments
                 (paint_color_id, manufacturer_id, model_id, variant_id, year_from, year_to, market,
                  source_id, source_url, source_record_id, confidence, verification_status)
               values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'source_verified')`,
              [
                paintColorId,
                mf.id,
                match.id,
                fitment.variantId ?? null,
                fitment.yearFrom,
                fitment.yearTo,
                fitment.market ?? null,
                sourceId,
                fitment.sourceUrl ?? null,
                fitment.sourceRecordId,
                confidence,
              ]
            );
          }
        });
      }
    }
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : String(err);
  }

  const jobId = jobRow[0]?.id;
  if (jobId) {
    await query(
      `update import_jobs set status = $1, finished_at = now(),
              records_seen = $2, records_inserted = $3, records_updated = $4, records_skipped = $5, error = $6
        where id = $7`,
      [errorMessage ? "failed" : "succeeded", seen, inserted, updated, skippedNoModelMatch, errorMessage, jobId]
    );
  }

  console.log(
    `[import-paint-provider] ${provider.slug}: seen=${seen} inserted=${inserted} updated=${updated} ` +
      `skipped_no_model_match=${skippedNoModelMatch}${errorMessage ? ` error=${errorMessage}` : ""}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
