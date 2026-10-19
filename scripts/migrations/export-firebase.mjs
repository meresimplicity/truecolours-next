/** Read-only source export. Run while legacy writes are paused for final cutover. */
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldPath } from "firebase-admin/firestore";
import {
  mkdir,
  readFile,
  writeFile,
  appendFile,
  chmod,
} from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
if (existsSync(".env.local")) process.loadEnvFile(".env.local");
const output = path.resolve(
  process.argv.find((arg) => arg.startsWith("--output="))?.slice(9) ||
    "tmp/migration/firebase-export",
);
const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
  : JSON.parse(
      await readFile(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || "", "utf8"),
    );
if (
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
  credentials.project_id !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
)
  throw new Error(
    "Source project ID does not match the configured Firebase project.",
  );
const app = initializeApp({
  credential: cert(credentials),
  projectId: credentials.project_id,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});
const db = getFirestore(app);
// REST also works on networks that do not support long-lived gRPC streams.
db.settings({ preferRest: true });
const auth = getAuth(app);
if (process.argv.includes("--inspect")) {
  const collections = await db.listCollections();
  const result = {};
  for (const collection of collections)
    result[collection.id] = (await collection.count().get()).data().count;
  console.log(
    JSON.stringify(
      { sourceProjectId: credentials.project_id, collections: result },
      null,
      2,
    ),
  );
  process.exit(0);
}
await mkdir(output, { recursive: true, mode: 0o700 });
const docsFile = path.join(output, "documents.ndjson");
await writeFile(docsFile, "", { mode: 0o600 });
const counts = {};
let total = 0;
const identityIds = new Set();
const allowedCollections = new Set([
  "userProfiles",
  "staff",
  "managedProducts",
  "inventoryBalances",
  "inventoryReservations",
  "stockMovements",
  "businesses",
  "locations",
  "devices",
  "orders",
  "quotes",
  "messages",
  "invoices",
  "auditLogs",
  "cms",
  "counters",
]);
const skippedCollections = [];
function scalar(value) {
  if (value?.toDate instanceof Function) return value.toDate().toISOString();
  if (value?.path && value?.firestore) return { __reference: value.path };
  if (value?.toBase64 instanceof Function) return { __bytes: value.toBase64() };
  if (Array.isArray(value)) return value.map(scalar);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, scalar(item)]),
    );
  return value;
}
async function exportCollection(collection) {
  let after;
  for (;;) {
    let query = collection.orderBy(FieldPath.documentId()).limit(250);
    if (after) query = query.startAfter(after);
    const snapshot = await query.get();
    if (snapshot.empty) break;
    for (const doc of snapshot.docs) {
      await appendFile(
        docsFile,
        JSON.stringify({ path: doc.ref.path, data: scalar(doc.data()) }) + "\n",
      );
      total++;
      const data = doc.data();
      const parts = doc.ref.path.split("/");
      if (["userProfiles", "staff"].includes(parts[0]))
        identityIds.add(parts[1]);
      if (typeof data.userId === "string") identityIds.add(data.userId);
      const key = doc.ref.path
        .split("/")
        .filter((_, i) => i % 2 === 0)
        .join("/");
      counts[key] = (counts[key] || 0) + 1;
      for (const child of await doc.ref.listCollections())
        await exportCollection(child);
    }
    after = snapshot.docs.at(-1);
    if (snapshot.size < 250) break;
  }
}
for (const collection of await db.listCollections()) {
  if (allowedCollections.has(collection.id)) await exportCollection(collection);
  else skippedCollections.push(collection.id);
}
const users = [];
let token;
do {
  const result = await auth.listUsers(1000, token);
  for (const user of result.users)
    if (identityIds.has(user.uid))
      users.push({
        uid: user.uid,
        email: user.email,
        emailVerified: user.emailVerified,
        displayName: user.displayName,
        phoneNumber: user.phoneNumber,
        photoURL: user.photoURL,
        disabled: user.disabled,
        customClaims: user.customClaims,
        metadata: user.metadata,
        providerData: user.providerData,
      });
  token = result.pageToken;
} while (token);
await writeFile(path.join(output, "users.json"), JSON.stringify(users), {
  mode: 0o600,
});
const manifest = {
  sourceProjectId: credentials.project_id,
  exportedAt: new Date().toISOString(),
  documents: total,
  users: users.length,
  collections: counts,
  passwordsExported: false,
  skippedCollections,
  sourceWritesPaused: process.argv.includes("--writes-paused"),
};
await writeFile(
  path.join(output, "manifest.json"),
  JSON.stringify(manifest, null, 2),
  { mode: 0o600 },
);
await chmod(output, 0o700);
console.log(
  JSON.stringify(
    {
      output,
      documents: total,
      users: users.length,
      collections: counts,
      consistentCutoverSnapshot: manifest.sourceWritesPaused,
    },
    null,
    2,
  ),
);
await db.terminate();
