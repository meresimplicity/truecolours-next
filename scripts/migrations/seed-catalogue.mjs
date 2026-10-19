/** Seed the existing catalogue; never invent authorised till prices or opening stock. */
import ts from "typescript";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const cache = new Map();
const root = process.cwd();
const packages = createRequire(import.meta.url);
function load(file) {
  const full = path.resolve(file);
  if (cache.has(full)) return cache.get(full).exports;
  const module = { exports: {} };
  cache.set(full, module);
  const source = readFileSync(full, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const require = (specifier) => {
    if (specifier.startsWith("@/") || specifier.startsWith(".")) {
      const candidate = specifier.startsWith("@/")
        ? path.join(root, specifier.slice(2))
        : path.resolve(path.dirname(full), specifier);
      const resolved = [
        candidate,
        candidate + ".ts",
        candidate + ".tsx",
        path.join(candidate, "index.ts"),
      ].find(existsSync);
      if (!resolved)
        throw new Error(`Cannot resolve catalogue module ${specifier}`);
      return load(resolved);
    }
    return packages(specifier);
  };
  new Function("require", "module", "exports", output)(
    require,
    module,
    module.exports,
  );
  return module.exports;
}
const { catalogueProducts } = load(path.join(root, "data/catalogue.ts"));
const rows = catalogueProducts.map((product) => ({
  id: product.id,
  name: product.name,
  code: product.code || product.id,
  category: product.category || "",
  brand: product.brand || "",
  supplier: product.supplier || "",
  visible: true,
  data: {
    price: product.price || "Quote on request",
    imageUrl: product.primaryImage,
    stockStatus: "Confirm availability",
  },
}));
if (!process.argv.includes("--apply")) {
  console.log(
    JSON.stringify({
      dryRun: true,
      products: rows.length,
      authorisedPricesSeeded: 0,
      stockSeeded: 0,
    }),
  );
  process.exit(0);
}
if (!process.env.SUPABASE_SECRET_KEY)
  throw new Error("Set the destination SUPABASE_SECRET_KEY.");
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);
let inserted = 0;
for (let offset = 0; offset < rows.length; offset += 100) {
  const { error } = await db
    .from("products")
    .upsert(rows.slice(offset, offset + 100), {
      onConflict: "id",
      ignoreDuplicates: true,
    });
  if (error) throw error;
  inserted += Math.min(100, rows.length - offset);
}
console.log(
  JSON.stringify({
    seeded: true,
    catalogueProducts: inserted,
    existingProductsPreserved: true,
  }),
);
