/**
 * scripts/dedupe-paint.ts
 *
 * scripts/import-paint-provider.ts deliberately writes one paint_colors
 * row per (manufacturer, code, aux_code, SOURCE) — see its header. That
 * means after importing from two providers you'll have two rows for what
 * is probably the same real colour. This script finds those groups and
 * merges them:
 *
 *   1. Group by (manufacturer_id, code_normalized, aux_code).
 *   2. Skip any group containing a team_verified row that ISN'T the
 *      highest-priority row already — never demote a human-checked record.
 *   3. Pick a winner by source priority (src/lib/conflict.ts).
 *   4. For each differing field, resolveField() picks the value AND the
 *      disagreement is written to data_conflicts for admin review — a
 *      priority pick is not the same as the disagreement being resolved
 *      (spec section 31).
 *   5. Re-point paint_fitments and paint_aliases from the losing rows onto
 *      the winner, adding the losing rows' own names as aliases (a
 *      differing name across sources is a real alias candidate, not noise).
 *   6. Delete the now-empty losing rows.
 *
 * Re-run safe: once a group has one row, it's a no-op.
 */
import { withTransaction } from "../src/lib/db";
import { resolveField, looseStringEquals, type FieldCandidate } from "../src/lib/conflict";

interface GroupRow {
  id: string;
  manufacturer_id: string;
  code_normalized: string;
  aux_code: string | null;
  name: string;
  base_color: string | null;
  finish: string | null;
  hex: string | null;
  standard_number: string | null;
  verification_status: string;
  source_slug: string;
  source_id: string;
}

const MERGE_FIELDS = ["name", "base_color", "finish", "hex", "standard_number"] as const;

async function main() {
  let groupsProcessed = 0;
  let rowsMerged = 0;
  let conflictsLogged = 0;

  await withTransaction(async (client) => {
    const groups = await client.query<{ manufacturer_id: string; code_normalized: string; aux_code: string | null }>(
      `select manufacturer_id, code_normalized, aux_code, count(*) as n
         from paint_colors
        group by manufacturer_id, code_normalized, aux_code
       having count(*) > 1`
    );

    for (const g of groups.rows) {
      const rowsRes = await client.query<GroupRow>(
        `select pc.id, pc.manufacturer_id, pc.code_normalized, pc.aux_code, pc.name, pc.base_color,
                pc.finish, pc.hex, pc.standard_number, pc.verification_status, pc.source_id, ds.slug as source_slug
           from paint_colors pc
           join data_sources ds on ds.id = pc.source_id
          where pc.manufacturer_id = $1 and pc.code_normalized = $2
            and coalesce(pc.aux_code,'') = coalesce($3,'')`,
        [g.manufacturer_id, g.code_normalized, g.aux_code]
      );
      const rows = rowsRes.rows;
      if (rows.length < 2) continue;
      groupsProcessed++;

      const priority = (slug: string) =>
        ["truecolours_internal", "vehiclesdb", "paint_calculators", "mycarcolor", "nhtsa_vpic"].indexOf(slug);
      const sorted = [...rows].sort((a, b) => {
        const pa = priority(a.source_slug),
          pb = priority(b.source_slug);
        return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
      });
      const winner = sorted[0]!;
      const losers = sorted.slice(1);

      // Safety: never demote a team-verified record that isn't already the winner.
      if (losers.some((l) => l.verification_status === "team_verified")) {
        console.warn(
          `[dedupe-paint] skipping group ${g.manufacturer_id}/${g.code_normalized}: a team_verified row is not the priority winner — resolve manually`
        );
        continue;
      }

      const updates: Record<string, string | null> = {};
      for (const field of MERGE_FIELDS) {
        const candidates: FieldCandidate<string | null>[] = rows.map((r: GroupRow) => ({
          sourceSlug: r.source_slug,
          sourceRecordId: r.id,
          value: (r as any)[field],
        }));
        const resolution = resolveField(candidates, (a, b) => (a && b ? looseStringEquals(a, b) : a === b));
        updates[field] = resolution.value;

        if (resolution.status === "resolved_by_priority") {
          for (const c of resolution.conflicts) {
            await client.query(
              `insert into data_conflicts (paint_color_id, field_name, source_a_id, source_a_value, source_b_id, source_b_value, status)
               values ($1, $2,
                       (select id from data_sources where slug = $3), $4,
                       (select id from data_sources where slug = $5), $6,
                       'open')`,
              [
                winner.id,
                field,
                c.winner.sourceSlug,
                c.winner.value,
                c.loser.sourceSlug,
                c.loser.value,
              ]
            );
            conflictsLogged++;
          }
        }
      }

      await client.query(
        `update paint_colors set name=$1, base_color=$2, finish=$3, hex=$4, standard_number=$5, updated_at=now()
          where id = $6`,
        [updates.name, updates.base_color, updates.finish, updates.hex, updates.standard_number, winner.id]
      );

      for (const loser of losers) {
        if (!looseStringEquals(loser.name, updates.name ?? "")) {
          await client.query(
            `insert into paint_aliases (paint_color_id, alias, source_id)
             values ($1, $2, (select id from data_sources where slug = $3))
             on conflict (paint_color_id, alias, language) do nothing`,
            [winner.id, loser.name, loser.source_slug]
          );
        }
        await client.query(`update paint_fitments set paint_color_id = $1 where paint_color_id = $2`, [
          winner.id,
          loser.id,
        ]);
        await client.query(`update paint_aliases set paint_color_id = $1 where paint_color_id = $2`, [
          winner.id,
          loser.id,
        ]);
        await client.query(`delete from paint_colors where id = $1`, [loser.id]);
        rowsMerged++;
      }
    }
  });

  console.log(
    `[dedupe-paint] groups_processed=${groupsProcessed} rows_merged=${rowsMerged} conflicts_logged=${conflictsLogged}`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
