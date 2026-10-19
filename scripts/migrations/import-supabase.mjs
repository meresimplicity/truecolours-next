/** Idempotent data import. Dry run is the default; passwords and roles are never inferred from profile JSON. */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const source = path.resolve(
  process.argv.find((arg) => arg.startsWith("--source="))?.slice(9) ||
    "tmp/migration/firebase-export",
);
const apply = process.argv.includes("--apply");
const reconcile = process.argv.includes("--reconcile");
const initialCopy = process.argv.includes("--initial-copy");
const manifest = JSON.parse(
  await readFile(path.join(source, "manifest.json"), "utf8"),
);
const docs = (await readFile(path.join(source, "documents.ndjson"), "utf8"))
  .trim()
  .split("\n")
  .filter(Boolean)
  .map((line) => JSON.parse(line));
const users = JSON.parse(
  await readFile(path.join(source, "users.json"), "utf8"),
);
const counts = Object.fromEntries(
  [...new Set(docs.map((doc) => doc.path.split("/")[0]))].map((kind) => [
    kind,
    docs.filter((doc) => doc.path.split("/")[0] === kind).length,
  ]),
);
if (!apply && !reconcile) {
  console.log(
    JSON.stringify(
      {
        dryRun: true,
        sourceProject: manifest.sourceProjectId,
        users: users.length,
        documents: docs.length,
        rootCollections: counts,
        passwordResetRequired: true,
        consistentCutoverSnapshot: manifest.sourceWritesPaused,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
if (!manifest.sourceWritesPaused && !reconcile && !initialCopy)
  throw new Error(
    "Final import requires a fresh source export with --writes-paused after legacy writes have been stopped.",
  );
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
const projectRef = process.env.SUPABASE_PROJECT_REF;
if (!url || !key)
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and server-only SUPABASE_SECRET_KEY for the destination project.",
  );
if (!projectRef || new URL(url).hostname !== `${projectRef}.supabase.co`)
  throw new Error("Destination URL must match the explicitly configured SUPABASE_PROJECT_REF.");
const db = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
function check({ data, error }) {
  if (error) throw new Error(error.message);
  return data;
}
if (initialCopy) {
  // A preliminary snapshot is safe only before this destination begins trading.
  // It never claims that the source was paused or that final cutover is complete.
  for (const table of ["sales", "cashier_shifts", "invoice_payments"]) {
    const result = await db.from(table).select("id", { count: "exact", head: true });
    check(result);
    if (result.count) throw new Error("Initial copy is unavailable after destination trading starts. Reconcile a controlled cutover instead.");
  }
}
const stateFile = path.join(source, "supabase-user-map.json");
const state = existsSync(stateFile)
  ? JSON.parse(await readFile(stateFile, "utf8"))
  : { target: url, users: {} };
if (state.target !== url)
  throw new Error("This user map belongs to another destination project.");
const mapping = state.users;
const root = (kind) =>
  docs.filter(
    (doc) =>
      doc.path.split("/").length === 2 && doc.path.startsWith(kind + "/"),
  );
const profiles = new Map(
  root("userProfiles").map((doc) => [doc.path.split("/")[1], doc.data]),
);
if (!reconcile) {
  const existing = [];
  for (let page = 1; ; page++) {
    const data = check(await db.auth.admin.listUsers({ page, perPage: 1000 }));
    existing.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const emails = new Map(
    existing
      .filter((user) => user.email)
      .map((user) => [user.email.toLowerCase(), user]),
  );
  for (const uid of new Set([
    ...users.map((user) => user.uid),
    ...profiles.keys(),
  ])) {
    if (mapping[uid]) continue;
    const legacy = users.find((user) => user.uid === uid) || {};
    const profile = profiles.get(uid) || {};
    const email = legacy.email || profile.email;
    if (!email)
      throw new Error(
        `A source identity has no email; resolve it before import (legacy UID ${uid}).`,
      );
    const found = emails.get(email.toLowerCase());
    if (found && found.app_metadata?.legacy_firebase_uid !== uid)
      throw new Error(
        "An existing destination email belongs to an unmapped identity; reconcile it explicitly before importing.",
      );
    const user =
      found ||
      check(
        await db.auth.admin.createUser({
          email,
          email_confirm: Boolean(legacy.emailVerified),
          app_metadata: {
            legacy_firebase_uid: uid,
            migration_password_reset_required: true,
          },
          user_metadata: {
            display_name: legacy.displayName || profile.displayName || "",
            avatar_url: legacy.photoURL || profile.photoURL || "",
          },
          ...(legacy.disabled ? { ban_duration: "876000h" } : {}),
        }),
      ).user;
    mapping[uid] = user.id;
    await writeFile(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
  }
}
function remap(value) {
  if (typeof value === "string") return mapping[value] || value;
  if (Array.isArray(value)) return value.map(remap);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, remap(item)]),
    );
  return value;
}
if (!reconcile) {
  // Auth's profile trigger allocates temporary customer numbers. Move those
  // placeholders aside before preserving the source's established numbers.
  const reservedNumbers = new Map();
  for (const [uid, profile] of profiles) {
    if (!profile.customerId) continue;
    if (reservedNumbers.has(profile.customerId)) throw new Error("Duplicate customer numbers in the source require reconciliation.");
    reservedNumbers.set(profile.customerId, mapping[uid]);
  }
  const targetProfiles = check(await db.from("profiles").select("id,customer_number,legacy_uid"));
  for (const target of targetProfiles) {
    const intendedOwner = reservedNumbers.get(target.customer_number);
    if (!intendedOwner || intendedOwner === target.id) continue;
    const identity = check(await db.auth.admin.getUserById(target.id)).user;
    const migratedPlaceholder = Object.values(mapping).includes(target.id) && !target.legacy_uid;
    const bootstrap = identity.app_metadata?.truecolours_admin_username;
    if (!migratedPlaceholder && !bootstrap) throw new Error("An established destination customer number conflicts with the source.");
    check(await db.from("profiles").update({ customer_number: bootstrap ? `STAFF-${bootstrap}` : `MIG-${target.id}` }).eq("id", target.id));
  }
}
const canonical = docs.filter(
  (doc) =>
    doc.data.productId &&
    (doc.data.onHand !== undefined || doc.data.stockOnHand !== undefined) &&
    doc.path.includes("inventoryBalances"),
);
const branchIds = new Set([
  "main-store",
  ...canonical.map((doc) => doc.data.locationId || "main-store"),
  ...root("staff").flatMap((doc) => doc.data.locationIds || []),
]);
function legacyUuid(value) {
  const hash = createHash("sha256")
    .update(manifest.sourceProjectId + ":" + value)
    .digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}
const rawRecords = docs.map((doc) => ({
  source_project: manifest.sourceProjectId,
  path: doc.path,
  data: doc.data,
}));
async function upsert(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += 100)
    check(await db.from(table).upsert(rows.slice(i, i + 100), { onConflict, defaultToNull: false }));
}
if (!reconcile) {
  await upsert("legacy_documents", rawRecords, "source_project,path");
  await upsert(
    "branches",
    [...branchIds].map((id) => ({ id, name: id.replaceAll("-", " ") })),
    "id",
  );
  for (const [uid, data] of profiles) {
    const safe = remap(data);
    safe.role = "customer";
    await upsert(
      "profiles",
      [
        {
          id: mapping[uid],
          legacy_uid: uid,
          data: safe,
          ...(data.customerId ? { customer_number: data.customerId } : {}),
        },
      ],
      "id",
    );
  }
  const products = root("managedProducts").map((doc) => {
    const id = doc.path.split("/")[1];
    const data = doc.data;
    return {
      id,
      name: data.name || id,
      code: data.code || id,
      category: data.category || "",
      brand: data.brand || "",
      supplier: data.supplier || "",
      selling_price_cents: Number.isSafeInteger(data.sellingPriceCents)
        ? data.sellingPriceCents
        : null,
      visible: data.visible !== false,
      data: {
        price: data.marketReferencePrice || data.price || "Quote on request",
        imageUrl: data.imageUrl || "",
        stockStatus: data.stockStatus || "Confirm availability",
      },
    };
  });
  await upsert("products", products, "id");
  const balances = new Map();
  for (const product of root("managedProducts")) {
    const id = product.path.split("/")[1];
    const d = product.data;
    balances.set(`main-store:${id}`, {
      branch_id: "main-store",
      product_id: id,
      on_hand: Number(d.stockOnHand ?? d.stockQuantity ?? 0),
      reserved: Number(d.reservedStock || 0),
      damaged: Number(d.damagedStock || 0),
      incoming: Number(d.incomingStock || 0),
      returned: Number(d.returnedStock || 0),
      quarantined: Number(d.quarantinedStock || 0),
      minimum_stock: Number(d.minStock ?? 5),
      version: Number(d.inventoryVersion || 0),
    });
  }
  for (const doc of canonical) {
    const d = doc.data;
    const branch = d.locationId || "main-store";
    balances.set(`${branch}:${d.productId}`, {
      branch_id: branch,
      product_id: d.productId,
      on_hand: Number(d.onHand ?? d.stockOnHand ?? 0),
      reserved: Number(d.reserved || d.reservedStock || 0),
      damaged: Number(d.damaged || d.damagedStock || 0),
      incoming: Number(d.incoming || d.incomingStock || 0),
      returned: Number(d.returned || d.returnedStock || 0),
      quarantined: Number(d.quarantined || d.quarantinedStock || 0),
      minimum_stock: Number(d.minimumStock ?? d.minStock ?? 5),
      version: Number(d.version || 0),
    });
  }
  await upsert("inventory", [...balances.values()], "branch_id,product_id");
  const personal = docs
    .filter(
      (doc) =>
        doc.path.startsWith("userProfiles/") &&
        doc.path.split("/").length === 4,
    )
    .map((doc) => {
      const [, uid, kind, id] = doc.path.split("/");
      return {
        id,
        user_id: mapping[uid],
        kind,
        data: remap(doc.data),
        ...(doc.data.createdAt ? { created_at: doc.data.createdAt } : {}),
        ...(doc.data.updatedAt ? { updated_at: doc.data.updatedAt } : {}),
      };
    });
  await upsert("customer_records", personal, "user_id,kind,id");
  const business = ["orders", "quotes", "messages", "invoices"].flatMap(
    (kind) =>
      root(kind).map((doc) => {
        const data = remap(doc.data);
        const userId = doc.data.userId ? mapping[doc.data.userId] : null;
        if (doc.data.userId && !userId)
          throw new Error("A business record references an unmapped customer.");
        return {
          id: doc.path.split("/")[1],
          kind,
          user_id: userId,
          branch_id: doc.data.locationId || "main-store",
          data,
          ...(data.createdAt ? { created_at: data.createdAt } : {}),
          ...(data.updatedAt ? { updated_at: data.updatedAt } : {}),
        };
      }),
  );
  await upsert("business_records", business, "id");
  const staff = root("staff").map((doc) => {
    const uid = doc.path.split("/")[1];
    const d = doc.data;
    const aliases = {
      super_admin: "owner",
      admin: "administrator",
      staff: "manager",
      sales: "salesperson",
    };
    return {
      user_id: mapping[uid],
      name: d.name || d.email || "Staff",
      role: aliases[d.role] || d.role,
      branch_ids: d.locationIds || ["main-store"],
      active: d.active !== false && d.role !== "customer",
      session_version: Number(d.sessionVersion || 1),
    };
  });
  await upsert("staff", staff, "user_id");
  const movements = root("stockMovements").map((doc) => {
    const d = doc.data;
    return {
      id: legacyUuid(doc.path),
      branch_id: d.locationId || "main-store",
      product_id: d.productId,
      actor_id: mapping[d.actorId] || null,
      legacy_actor_id: d.actorId || null,
      previous_quantity: Number(d.previousQuantity || 0),
      new_quantity: Number(d.newQuantity || 0),
      reason: d.reason || "Legacy movement",
      note: d.note || "",
      ...(d.createdAt ? { created_at: d.createdAt } : {}),
    };
  });
  await upsert("stock_movements", movements, "id");
  const audit = root("auditLogs").map((doc) => {
    const d = doc.data;
    return {
      id: legacyUuid(doc.path),
      actor_id: mapping[d.actorId] || null,
      legacy_actor_id: d.actorId || null,
      branch_id: d.locationId || "main-store",
      action: d.action || "legacy_event",
      target_id: d.targetId || null,
      details: d.details || "",
      ...(d.createdAt ? { created_at: d.createdAt } : {}),
    };
  });
  await upsert("audit_logs", audit, "id");
  check(await db.rpc("finalize_migration"));
  const settings = root("cms").find((doc) => doc.path === "cms/admin-settings");
  if (settings)
    await upsert(
      "business_settings",
      [{ id: "business", data: settings.data }],
      "id",
    );
  console.log(
    JSON.stringify(
      {
        imported: true,
        users: Object.keys(mapping).length,
        profiles: profiles.size,
        businessRecords: business.length,
        personalRecords: personal.length,
        inventoryBalances: balances.size,
        archivedDocuments: rawRecords.length,
        passwordResetRequired: true,
        storageCopied: false,
        preliminaryCopy: initialCopy,
        sourceWritesPaused: manifest.sourceWritesPaused,
      },
      null,
      2,
    ),
  );
}
// Compare source and destination invoice balances and the archive count before cutover.
const invoiceIds = root("invoices").map((doc) => doc.path.split("/")[1]);
let importedInvoices = [];
for (let i = 0; i < invoiceIds.length; i += 100)
  importedInvoices.push(
    ...check(
      await db
        .from("business_records")
        .select("id,data")
        .eq("kind", "invoices")
        .in("id", invoiceIds.slice(i, i + 100)),
    ),
  );
const invoiceErrors = root("invoices").filter((doc) => {
  const row = importedInvoices.find(
    (item) => item.id === doc.path.split("/")[1],
  );
  return (
    !row ||
    ["total", "amountPaid", "balanceDue"].some(
      (key) =>
        Math.round(Number(doc.data[key] || 0) * 100) !==
        Math.round(Number(row.data[key] || 0) * 100),
    )
  );
});
const archive = await db
  .from("legacy_documents")
  .select("path", { count: "exact", head: true })
  .eq("source_project", manifest.sourceProjectId);
check(archive);
const report = {
  checkedAt: new Date().toISOString(),
  target: url,
  sourceDocuments: docs.length,
  archivedDocuments: archive.count,
  invoiceCount: invoiceIds.length,
  invoiceMismatches: invoiceErrors.length,
  financialRecordsMatch:
    archive.count === docs.length &&
    invoiceErrors.length === 0 &&
    manifest.sourceWritesPaused,
  readyForCutover: false,
  storageStillRequiresCopy: true,
  passwordResetRequired: true,
};
await writeFile(
  path.join(source, "reconciliation.json"),
  JSON.stringify(report, null, 2),
  { mode: 0o600 },
);
console.log(JSON.stringify(report, null, 2));
if (invoiceErrors.length || archive.count !== docs.length) process.exitCode = 1;
