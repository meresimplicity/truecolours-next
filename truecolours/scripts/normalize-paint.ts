/**
 * scripts/normalize-paint.ts
 *
 * Idempotent housekeeping pass, safe to re-run any time:
 *   1. Recomputes code_normalized for every paint_colors row from the
 *      current normalizePaintCode() rules — so if the normalization logic
 *      in src/lib/normalize.ts changes, existing rows catch up without a
 *      full re-import.
 *   2. Splits any code that still looks like "LY9T / 0E" (i.e. an importer
 *      didn't already separate primary/aux) into code + aux_code.
 *
 * This does NOT touch fitments or attempt cross-source merging — that's
 * scripts/dedupe-paint.ts, deliberately kept separate (see its header).
 */
import { query } from "../src/lib/db";
import { normalizePaintCode, splitPrimaryAndAuxCode } from "../src/lib/normalize";

interface PaintColorRow {
  id: string;
  code: string;
  aux_code: string | null;
}

async function main() {
  const rows = await query<PaintColorRow>(`select id, code, aux_code from paint_colors`);

  let codeSplit = 0;
  let normalizedChanged = 0;

  for (const row of rows) {
    let code = row.code;
    let auxCode = row.aux_code;

    if (!auxCode) {
      const split = splitPrimaryAndAuxCode(row.code);
      if (split.auxCode) {
        code = split.code;
        auxCode = split.auxCode;
        codeSplit++;
      }
    }

    const codeNormalized = normalizePaintCode(code);
    await query(
      `update paint_colors set code = $1, aux_code = $2, code_normalized = $3, updated_at = now() where id = $4`,
      [code, auxCode, codeNormalized, row.id]
    );
    normalizedChanged++;
  }

  console.log(`[normalize-paint] processed=${rows.length} code_split=${codeSplit} normalized=${normalizedChanged}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
