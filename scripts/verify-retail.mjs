/** Release checks do not require cloud credentials or write business records. */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = new Set(process.argv.slice(2));
if (args.has("--help")) {
  console.log(
    "Usage: npm run verify:retail -- [--audit]\nRun on Node 22. Checks tests, generated route types, TypeScript, retail lint and the production build. --audit also checks production dependency advisories.",
  );
  process.exit(0);
}
if ([...args].some((arg) => arg !== "--audit"))
  throw Error("Unknown verification option. Use --help.");
if (Number(process.versions.node.split(".")[0]) !== 22)
  throw Error(
    "Release verification requires Node 22, as configured in .nvmrc and package.json. Select Node 22 before running this command.",
  );
const root = fileURLToPath(new URL("../", import.meta.url));
const env = {
  ...process.env,
  PATH:
    path.dirname(process.execPath) + path.delimiter + (process.env.PATH || ""),
  NEXT_TELEMETRY_DISABLED: "1",
};
function run(label, command, commandArgs) {
  console.log("\n" + label);
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
function node(label, nodeArgs) {
  run(label, process.execPath, nodeArgs);
}
node("Retail database, authentication and recovery tests", [
  "--experimental-strip-types",
  "--test",
  "tests/supabase-backend.test.mjs",
  "tests/slip-reader.test.mjs",
  "tests/retail-recovery.test.mjs",
  "tests/admin-login.test.mjs",
  "tests/request-security.test.mjs",
]);
node("Generate current Next.js route types", [
  "node_modules/next/dist/bin/next",
  "typegen",
]);
node("TypeScript", ["node_modules/typescript/bin/tsc", "--noEmit"]);
node("Retail runtime lint", [
  "node_modules/eslint/bin/eslint.js",
  "--max-warnings=0",
  "app/admin/pos/page.tsx",
  "app/admin/accounts/page.tsx",
  "app/admin/stock-control",
  "app/api/admin/inventory",
  "app/api/admin/pos",
  "app/api/admin/accounts",
  "app/api/admin/login",
  "app/api/admin/invoices",
  "components/admin/SlipEditor.tsx",
  "components/admin/SlipScanSummary.tsx",
  "components/admin/StockInspection.tsx",
  "components/admin/PosOperations.tsx",
  "components/admin/invoices/InvoiceWorkspace.tsx",
  "components/auth/StaffSessionProvider.tsx",
  "lib/pos-pending.ts",
  "lib/invoice-payment-pending.ts",
  "lib/invoice-payment-command.ts",
  "lib/use-admin-workspace.ts",
  "lib/pos-types.ts",
  "lib/pos-pdf.tsx",
  "lib/slips",
  "lib/product-matching.ts",
  "lib/server/admin-command.ts",
  "lib/server/admin-authorization.ts",
  "lib/server/request-security.ts",
  "lib/business/admin-login.ts",
  "lib/business/permissions.ts",
  "lib/supabase",
]);
node("Prepare local OCR and PDF workers", ["scripts/prepare-slip-reader.mjs"]);
node("Optimized production build", [
  "node_modules/next/dist/bin/next",
  "build",
  "--webpack",
]);
if (args.has("--audit"))
  run("Production dependency advisory check", "npm", ["audit", "--omit=dev"]);
console.log(
  "\nRetail release checks passed on Node " +
    process.versions.node +
    ". No cloud transactions were made.",
);
