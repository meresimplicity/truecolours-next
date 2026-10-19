/** Read-only launch audit. Never posts stock, sales, payments or role changes. */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const options = process.argv.slice(2);
if (options.includes("--help")) {
  console.log(
    "Usage: npm run preflight:retail -- --project-ref=<intended Supabase ref>\nUses the private configured administrator login. Outputs aggregate counts only. Exit 2 means operational launch blockers remain; exit 1 means the audit could not complete.",
  );
  process.exit(0);
}
if (options.length !== 1 || !/^--project-ref=[a-z0-9]{20}$/.test(options[0]))
  throw Error("Supply exactly one intended --project-ref before connecting.");
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const intended = options[0].slice("--project-ref=".length);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const email = process.env.TRUECOLOURS_ADMIN_LOGIN_EMAIL,
  password = process.env.TRUECOLOURS_ADMIN_PASSWORD;
if (!url || !key || !email || !password)
  throw Error(
    "Configure the Supabase URL/publishable key and private administrator login before auditing.",
  );
const origin = new URL(url);
if (
  process.env.SUPABASE_PROJECT_REF !== intended ||
  origin.protocol !== "https:" ||
  origin.host !== intended + ".supabase.co" ||
  origin.username ||
  origin.password
)
  throw Error(
    "Configured credentials do not match the explicitly intended Supabase project.",
  );
const db = createClient(origin.origin, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: {
    fetch: (input, init) =>
      fetch(input, { ...init, signal: AbortSignal.timeout(30000) }),
  },
});
function checked(result) {
  if (result.error) throw Error(result.error.message);
  return result.data;
}
async function allRows(makePage) {
  const rows = [];
  for (let start = 0; start < 20000; start += 1000) {
    const page = checked(await makePage(start, start + 999)) || [];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
  throw Error(
    "Audit exceeded its safe catalogue limit; scope the catalogue before continuing.",
  );
}
async function main() {
  checked(await db.auth.signInWithPassword({ email, password }));
  try {
    const actor = checked(await db.rpc("staff_identity"));
    if (!actor || !["owner", "administrator"].includes(actor.role))
      throw Error(
        "A current owner or administrator must run the launch audit.",
      );
    const [products, stock, staff] = await Promise.all([
      allRows((from, to) =>
        db
          .from("products")
          .select("id,code,barcodes,selling_price_cents")
          .eq("visible", true)
          .order("id")
          .range(from, to),
      ),
      allRows((from, to) =>
        db
          .from("inventory")
          .select(
            "branch_id,product_id,on_hand,reserved,damaged,quarantined,version",
          )
          .in("branch_id", actor.branch_ids)
          .order("branch_id")
          .order("product_id")
          .range(from, to),
      ),
      allRows((from, to) =>
        db
          .from("staff")
          .select("user_id,role,active,branch_ids")
          .eq("active", true)
          .order("user_id")
          .range(from, to),
      ),
    ]);
    const missingPrices = products.filter(
      (p) => p.selling_price_cents === null,
    ).length;
    const invalidPrices = products.filter(
      (p) =>
        p.selling_price_cents !== null &&
        (!Number.isSafeInteger(Number(p.selling_price_cents)) ||
          Number(p.selling_price_cents) < 0),
    ).length;
    const identifiers = new Map();
    for (const p of products)
      for (const identifier of new Set(
        [p.code, ...p.barcodes]
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean),
      )) {
        const ids = identifiers.get(identifier) || new Set();
        ids.add(p.id);
        identifiers.set(identifier, ids);
      }
    const ambiguousIdentifiers = [...identifiers.values()].filter(
      (ids) => ids.size > 1,
    ).length;
    const violations = stock.filter(
      (s) =>
        ![s.on_hand, s.reserved, s.damaged, s.quarantined, s.version].every(
          (x) => Number.isFinite(Number(x)),
        ) ||
        [s.on_hand, s.reserved, s.damaged, s.quarantined].some(
          (x) => Number(x) < 0,
        ) ||
        Number(s.on_hand) <
          Number(s.reserved) + Number(s.damaged) + Number(s.quarantined),
    ).length;
    const branches = actor.branch_ids.map((branch) => ({
      branch,
      balancesWithoutRecordedChanges: products.filter(
        (p) =>
          !stock.some(
            (s) =>
              s.branch_id === branch &&
              s.product_id === p.id &&
              Number(s.version) > 0,
          ),
      ).length,
    }));
    let sourceWritesPaused = null;
    const manifestPath = "tmp/migration/firebase-export/manifest.json";
    if (existsSync(manifestPath)) {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      sourceWritesPaused = manifest.sourceWritesPaused === true;
    }
    const activeOwners = staff.filter((s) => s.role === "owner").length;
    const blockers = [];
    if (!products.length)
      blockers.push("No active catalogue products are available.");
    if (missingPrices || invalidPrices)
      blockers.push(
        "Confirm authorised selling prices for every active product before trading.",
      );
    if (ambiguousIdentifiers)
      blockers.push(
        "Resolve ambiguous product codes/barcodes before scanner checkout.",
      );
    if (violations)
      blockers.push("Reconcile invalid inventory balances before trading.");
    if (branches.some((b) => b.balancesWithoutRecordedChanges))
      blockers.push(
        "Some active stock balances have no recorded changes. Verify opening stock counts, including zero-stock products, before trading.",
      );
    if (!activeOwners)
      blockers.push(
        "Provision a named business owner through the trusted staff setup.",
      );
    if (sourceWritesPaused !== true)
      blockers.push(
        "The source migration manifest does not confirm a paused-source cutover snapshot.",
      );
    const report = {
      projectRef: intended,
      checkedAt: new Date().toISOString(),
      adminPath: "/admin",
      launchStatus: blockers.length ? "blocked" : "needs_operational_signoff",
      counts: {
        activeProducts: products.length,
        missingPrices,
        invalidPrices,
        ambiguousIdentifiers,
        inventoryViolations: violations,
        activeStaff: staff.length,
        activeOwners,
      },
      branches,
      sourceWritesPaused,
      blockers,
      manualChecks: [
        "Physical opening counts verified; a changed stock version alone does not prove a stocktake.",
        "Named staff credentials and devices accepted by the business.",
        "Database backup and restore recovery verified.",
        "Dashboard migrations registered in CLI history.",
        "Final source/destination reconciliation and public deployment accepted.",
      ],
    };
    console.log(JSON.stringify(report, null, 2));
    if (blockers.length) process.exitCode = 2;
  } finally {
    await db.auth.signOut({ scope: "local" });
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Launch audit failed");
  process.exitCode = 1;
});
