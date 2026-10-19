#!/usr/bin/env node

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const APPLY = process.argv.includes("--apply");
const MIGRATION_ID = "001-bootstrap-inventory-ledger";
const BUSINESS_ID = "truecolours";
const LOCATION_ID = "main-store";

function loadCredential() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const configuredPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (!raw && !configuredPath) {
    throw new Error("Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_PATH before running this migration.");
  }
  const value = raw
    ? JSON.parse(raw)
    : JSON.parse(readFileSync(resolve(process.cwd(), configuredPath), "utf8"));
  return cert({
    projectId: value.project_id,
    clientEmail: value.client_email,
    privateKey: value.private_key.replace(/\\n/g, "\n"),
  });
}

function documentId(...parts) {
  return parts.map((part) => encodeURIComponent(part || "default")).join("__");
}

function movementId(productId) {
  return createHash("sha256").update(`${MIGRATION_ID}:${BUSINESS_ID}:${LOCATION_ID}:${productId}`).digest("hex");
}

function explicitQuantity(value) {
  const source = value.stockOnHand ?? value.stockQuantity;
  if (source === undefined || source === null || source === "") return null;
  const parsed = Number(source);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 1000) / 1000 : null;
}

if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH && !existsSync(resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH))) {
  throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH does not point to a readable file.");
}

const app = getApps()[0] || initializeApp({ credential: loadCredential() });
const db = getFirestore(app);
const productsSnapshot = await db.collection("managedProducts").get();
const candidates = productsSnapshot.docs
  .map((snapshot) => ({ snapshot, quantity: explicitQuantity(snapshot.data()) }))
  .filter((item) => item.quantity !== null);

const report = {
  mode: APPLY ? "apply" : "dry-run",
  managedProducts: productsSnapshot.size,
  candidates: candidates.length,
  skippedWithoutKnownQuantity: productsSnapshot.size - candidates.length,
  created: 0,
  alreadyMigrated: 0,
  conflicts: 0,
};

for (const { snapshot } of candidates) {
  const balanceRef = db.collection("inventoryBalances").doc(documentId(BUSINESS_ID, LOCATION_ID, snapshot.id, "default"));
  const stockMovementRef = db.collection("stockMovements").doc(movementId(snapshot.id));
  const [balanceSnapshot, movementSnapshot] = await Promise.all([balanceRef.get(), stockMovementRef.get()]);
  if (movementSnapshot.exists) {
    report.alreadyMigrated += 1;
  } else if (balanceSnapshot.exists) {
    report.conflicts += 1;
  } else {
    report.created += 1;
  }
}

if (!APPLY) {
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write("Dry run only. Re-run with --apply after reviewing this report and taking a Firestore export.\n");
  process.exit(0);
}

if (report.conflicts > 0) {
  throw new Error(`Migration stopped: ${report.conflicts} existing balances have no matching deterministic opening movement.`);
}

await db.collection("businesses").doc(BUSINESS_ID).set({
  name: "TRUECOLOURS",
  schemaVersion: 1,
  updatedAt: FieldValue.serverTimestamp(),
}, { merge: true });
await db.collection("locations").doc(LOCATION_ID).set({
  businessId: BUSINESS_ID,
  name: "Main Store",
  type: "store",
  active: true,
  schemaVersion: 1,
  updatedAt: FieldValue.serverTimestamp(),
}, { merge: true });
await db.collection("schemaMigrations").doc(MIGRATION_ID).set({
  status: "running",
  startedAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
}, { merge: true });

let applied = 0;
let replayed = 0;
for (const { snapshot, quantity } of candidates) {
  const productId = snapshot.id;
  const balanceRef = db.collection("inventoryBalances").doc(documentId(BUSINESS_ID, LOCATION_ID, productId, "default"));
  const stockMovementRef = db.collection("stockMovements").doc(movementId(productId));
  const auditRef = db.collection("auditLogs").doc(`migration-${movementId(productId)}`);

  const outcome = await db.runTransaction(async (transaction) => {
    const [product, balance, movement] = await Promise.all([
      transaction.get(snapshot.ref),
      transaction.get(balanceRef),
      transaction.get(stockMovementRef),
    ]);
    if (movement.exists) return "replayed";
    if (balance.exists) throw new Error(`Conflicting balance for product ${productId}`);

    const productData = product.data() || {};
    const quantities = {
      onHand: quantity,
      reserved: 0,
      incoming: 0,
      damaged: 0,
      returned: 0,
      quarantined: 0,
      available: quantity,
    };
    const status = quantity === 0
      ? "Out of Stock"
      : quantity <= Number(productData.minStock || 5)
        ? "Limited Stock"
        : "In Stock";

    transaction.create(balanceRef, {
      businessId: BUSINESS_ID,
      locationId: LOCATION_ID,
      productId,
      variantId: null,
      ...quantities,
      version: 1,
      schemaVersion: 1,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    transaction.create(stockMovementRef, {
      businessId: BUSINESS_ID,
      locationId: LOCATION_ID,
      productId,
      variantId: null,
      productName: String(productData.name || productId),
      productCode: String(productData.code || productId),
      type: "OPENING_BALANCE",
      changes: { onHand: quantity },
      before: { onHand: 0, reserved: 0, incoming: 0, damaged: 0, returned: 0, quarantined: 0, available: 0 },
      after: quantities,
      previousQuantity: 0,
      newQuantity: quantity,
      delta: quantity,
      stockStatus: status,
      reason: "Legacy opening balance",
      note: `Created by ${MIGRATION_ID}`,
      referenceType: "schema_migration",
      referenceId: MIGRATION_ID,
      actorId: "system:migration",
      actorEmail: "",
      actorRole: "system",
      idempotencyHash: movementId(productId),
      requestHash: movementId(productId),
      schemaVersion: 1,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.create(auditRef, {
      action: "inventory_opening_balance_migrated",
      actorId: "system:migration",
      actorRole: "system",
      targetId: productId,
      relatedRecord: stockMovementRef.id,
      newValue: quantities,
      createdAt: FieldValue.serverTimestamp(),
    });
    transaction.set(snapshot.ref, {
      inventoryBalanceId: balanceRef.id,
      inventoryVersion: 1,
      stockOnHand: quantity,
      stockQuantity: quantity,
      stockStatus: status,
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    return "applied";
  });

  if (outcome === "applied") applied += 1;
  else replayed += 1;
}

await db.collection("schemaMigrations").doc(MIGRATION_ID).set({
  status: "completed",
  candidates: candidates.length,
  applied,
  replayed,
  completedAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
}, { merge: true });

process.stdout.write(`${JSON.stringify({ ...report, applied, replayed }, null, 2)}\n`);
