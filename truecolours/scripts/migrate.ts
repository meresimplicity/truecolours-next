/**
 * scripts/migrate.ts — usage: npm run migrate
 * Applies db/migrations/*.sql in filename order, skipping ones already
 * recorded in schema_migrations. Deliberately simple: no rollback support,
 * one file per logical change, add new files rather than editing old ones.
 */
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set — see .env.example");
  const pool = new Pool({ connectionString });

  await pool.query(`create table if not exists schema_migrations (filename text primary key, applied_at timestamptz not null default now())`);

  const dir = join(__dirname, "..", "db", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    const already = await pool.query(`select 1 from schema_migrations where filename = $1`, [file]);
    if (already.rows.length > 0) {
      console.log(`[migrate] skip ${file} (already applied)`);
      continue;
    }
    const sql = readFileSync(join(dir, file), "utf8");
    console.log(`[migrate] applying ${file}...`);
    await pool.query(sql);
    await pool.query(`insert into schema_migrations (filename) values ($1)`, [file]);
    console.log(`[migrate] applied ${file}`);
  }

  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
