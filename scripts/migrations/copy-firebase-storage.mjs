/** Copies existing customer uploads and replaces their URLs with private Supabase links. */
import { cert, initializeApp } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
// SDK errors may contain authenticated HTTP request objects. Log only the message.
process.on("uncaughtException", (error) => {
  console.error(`Storage copy failed: ${error.message}`);
  process.exitCode = 1;
});
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const source = path.resolve(
  process.argv.find((arg) => arg.startsWith("--source="))?.slice(9) ||
    "tmp/migration/firebase-export",
);
const mapping = JSON.parse(
  await readFile(path.join(source, "supabase-user-map.json"), "utf8"),
);
if (mapping.target !== process.env.NEXT_PUBLIC_SUPABASE_URL)
  throw new Error("Wrong migration destination.");
const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : JSON.parse(
      await readFile(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "", "utf8"),
    );
const app = initializeApp({
  credential: cert(credentials),
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});
const bucket = getStorage(app).bucket();
const db = createClient(mapping.target, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
let copied = 0;
const links = new Map();
for await (const file of bucket.getFilesStream({
  prefix: "customer-uploads/",
})) {
  const [, uid, ...parts] = file.name.split("/");
  const newUid = mapping.users[uid];
  if (!newUid)
    throw new Error("An uploaded file belongs to an unmapped customer.");
  const destination = `${newUid}/${parts.join("/")}`;
  const [metadata] = await file.getMetadata();
  if (Number(metadata.size) > 10 * 1024 * 1024)
    throw new Error(
      "A source upload exceeds the configured storage limit; reconcile it before continuing.",
    );
  if (process.argv.includes("--apply")) {
    const [bytes] = await file.download();
    const { error } = await db.storage
      .from("customer-uploads")
      .upload(destination, bytes, {
        contentType: metadata.contentType,
        upsert: true,
      });
    if (error) throw error;
  }
  links.set(file.name, `/api/files?path=${encodeURIComponent(destination)}`);
  copied++;
}
function rewrite(value) {
  if (typeof value === "string") {
    try {
      const url = new URL(value);
      if (url.hostname === "firebasestorage.googleapis.com") {
        const file = decodeURIComponent(url.pathname.split("/o/")[1] || "");
        return links.get(file) || value;
      }
    } catch {}
    return value;
  }
  if (Array.isArray(value)) return value.map(rewrite);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, rewrite(item)]),
    );
  return value;
}
if (process.argv.includes("--apply"))
  for (const table of ["profiles", "customer_records", "business_records"]) {
    for (let offset = 0; ; offset += 250) {
      const { data, error } = await db
        .from(table)
        .select("*")
        .range(offset, offset + 249);
      if (error) throw error;
      if (!data.length) break;
      for (const row of data) {
        const updated = rewrite(row.data);
        if (JSON.stringify(updated) === JSON.stringify(row.data)) continue;
        let query = db.from(table).update({ data: updated }).eq("id", row.id);
        if (table === "customer_records")
          query = query.eq("user_id", row.user_id).eq("kind", row.kind);
        const result = await query;
        if (result.error) throw result.error;
      }
      if (data.length < 250) break;
    }
  }
console.log(
  JSON.stringify(
    {
      dryRun: !process.argv.includes("--apply"),
      files: copied,
      linksRewritten: process.argv.includes("--apply"),
    },
    null,
    2,
  ),
);
