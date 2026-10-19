import test from "node:test";
import assert from "node:assert/strict";
import {
  isDefinitiveCommandFailure,
  CommandResponseError,
  readPosAttempt,
  storePosAttempt,
} from "../lib/pos-pending.ts";
import {
  recoverSlipDraft,
  serializeSlipDraft,
} from "../lib/slips/draft-recovery.ts";
import { parseSlip } from "../lib/slips/parse.ts";
import { recoverInvoicePaymentAttempt } from "../lib/invoice-payment-pending.ts";
import { recordInvoicePayment } from "../lib/invoice-payment-command.ts";

const data = () => ({
  ...parseSlip("", []),
  counterparty: "Supplier",
  reference: "INV-1",
});
const document = (draft = data(), extra = {}) => ({
  id: "doc-1",
  branch_id: "main-store",
  kind: "purchase",
  status: "draft",
  data: draft,
  version: 1,
  document_date: null,
  counterparty: "Supplier",
  reference: "INV-1",
  total_cents: null,
  vat_cents: null,
  updated_at: "2026-10-16T00:00:00Z",
  ...extra,
});
const pending = (draft = data(), extra = {}) => ({
  action: "save",
  key: "pending-save-1",
  payload: {
    id: "doc-1",
    kind: "purchase",
    locationId: "main-store",
    expectedVersion: 1,
    data: draft,
    ...extra,
  },
});
const reordered = (value) =>
  JSON.parse(
    JSON.stringify(value, (_key, v) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v).reverse())
        : v,
    ),
  );

test("timeouts, throttling and early/retry responses preserve the exact transaction key", () => {
  for (const status of [0, 200, 401, 403, 408, 425, 429, 500, 502, 503, 504])
    assert.equal(isDefinitiveCommandFailure(status), false, String(status));
  for (const status of [400, 404, 409, 413, 415, 422])
    assert.equal(isDefinitiveCommandFailure(status), true, String(status));
});
test("persisted inspection/payment attempts survive reload without leaking across staff or branches", () => {
  const oldWindow = Object.getOwnPropertyDescriptor(globalThis, "window"),
    oldStorage = Object.getOwnPropertyDescriptor(globalThis, "sessionStorage");
  const values = new Map();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    configurable: true,
    value: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
  });
  try {
    const key = "staff-a:branch-a:product-a",
      intent = {
        key: "same-request-key",
        payload: { quantity: 2, mode: "writeoff", expectedVersion: 4 },
      };
    storePosAttempt(key, intent);
    assert.deepEqual(readPosAttempt(key), intent);
    assert.equal(readPosAttempt("staff-b:branch-a:product-a"), null);
    assert.equal(readPosAttempt("staff-a:branch-b:product-a"), null);
    for (const invalid of [
      { key: "short", payload: {} },
      { key: "same-request-key", payload: null },
      { key: "same-request-key", payload: [] },
    ]) {
      values.set(key, JSON.stringify(invalid));
      assert.equal(readPosAttempt(key), null);
    }
    storePosAttempt(key, intent);
    storePosAttempt(key, null);
    assert.equal(readPosAttempt(key), null);
    globalThis.sessionStorage.setItem = () => {
      throw Error("Storage unavailable");
    };
    assert.throws(() => storePosAttempt(key, intent), /Storage unavailable/);
  } finally {
    if (oldWindow) Object.defineProperty(globalThis, "window", oldWindow);
    else delete globalThis.window;
    if (oldStorage)
      Object.defineProperty(globalThis, "sessionStorage", oldStorage);
    else delete globalThis.sessionStorage;
  }
});
test("unsaved edits recover against the same server version", () => {
  const server = document(),
    local = { ...data(), reference: "LOCAL-2" };
  const result = recoverSlipDraft(server, { version: 1, data: local });
  assert.deepEqual(result.data, local);
  assert.equal(result.conflict, null);
  assert.equal(result.pendingSave, null);
  assert.equal(server.data.reference, "INV-1");
});
test("a reload retains the old uncertain save and the edits typed after it", () => {
  const original = data(),
    later = { ...original, counterparty: "New supplier label" },
    intent = pending(original);
  const result = recoverSlipDraft(document(), {
    version: 1,
    data: later,
    pendingSave: intent,
  });
  assert.deepEqual(result.data, later);
  assert.deepEqual(result.pendingSave, intent);
  assert.equal(result.conflict, null);
});
test("a committed save with a lost response recovers later edits despite JSONB key reordering", () => {
  const accepted = { ...data(), reference: "ACCEPTED" },
    later = { ...accepted, reference: "TYPED-AFTER-SEND" };
  const server = document(reordered(accepted), {
    version: 2,
    last_save_key: "pending-save-1",
  });
  const result = recoverSlipDraft(server, {
    version: 1,
    data: later,
    pendingSave: pending(accepted),
  });
  assert.deepEqual(result.data, later);
  assert.equal(result.pendingSave, null);
  assert.equal(result.conflict, null);
});
test("another writer or a later server version keeps the saved record and exposes a local recovery copy", () => {
  const local = { ...data(), reference: "LOCAL" },
    remote = { ...data(), reference: "OTHER-WINDOW" };
  for (const extra of [
    { version: 2, last_save_key: "someone-else" },
    { version: 3, last_save_key: "pending-save-1" },
  ]) {
    const result = recoverSlipDraft(document(remote, extra), {
      version: 1,
      data: local,
      pendingSave: pending(),
    });
    assert.deepEqual(result.data, remote);
    assert.deepEqual(result.conflict.data, local);
    assert.equal(result.pendingSave, null);
  }
});
test("a posted/archived/void record is never automatically overwritten by cached edits", () => {
  const local = { ...data(), reference: "UNSAVED" };
  for (const status of ["posted", "verified", "archived", "void"]) {
    const result = recoverSlipDraft(document(data(), { status, version: 2 }), {
      version: 1,
      data: local,
      pendingSave: pending(),
    });
    assert.equal(result.data.reference, "INV-1");
    assert.equal(result.conflict.data.reference, "UNSAVED");
    assert.equal(result.pendingSave, null);
  }
});
test("matching server content does not create a false recovery conflict from object key order", () => {
  const original = data(),
    server = document(reordered(original), { version: 5 });
  assert.equal(serializeSlipDraft(original), serializeSlipDraft(server.data));
  assert.equal(
    recoverSlipDraft(server, { version: 1, data: original }).conflict,
    null,
  );
});
test("malformed caches and attempts for another document or branch cannot become requests", () => {
  const server = document();
  for (const cache of [
    null,
    {},
    { version: -1, data: data() },
    { version: 1, data: { items: [] } },
    { version: 1, data: { ...data(), paidCents: null } },
  ])
    assert.deepEqual(recoverSlipDraft(server, cache), {
      data: server.data,
      pendingSave: null,
      conflict: null,
    });
  for (const intent of [
    pending(data(), { id: "other-doc" }),
    pending(data(), { locationId: "other-branch" }),
    { ...pending(), key: "bad" },
  ]) {
    const local = { ...data(), reference: "LOCAL" };
    const result = recoverSlipDraft(server, {
      version: 1,
      data: local,
      pendingSave: intent,
    });
    assert.equal(result.data.reference, "LOCAL");
    assert.equal(result.pendingSave, null);
  }
});

const invoiceAttempt = () => ({
  key: "invoice-payment-same-key",
  payload: {
    invoiceId: "invoice-1",
    amount: 120.5,
    method: "Cash",
    paidAt: "2026-10-16",
    reference: "receipt-1",
    note: "Part payment",
  },
});
test("invoice payment recovery rejects a different invoice or malformed payment", () => {
  const valid = invoiceAttempt();
  assert.deepEqual(recoverInvoicePaymentAttempt("invoice-1", valid), valid);
  for (const value of [
    null,
    { ...valid, key: "short" },
    { ...valid, payload: { ...valid.payload, invoiceId: "invoice-2" } },
    ...[0, -1, Infinity, NaN, "120.50"].map((amount) => ({
      ...valid,
      payload: { ...valid.payload, amount },
    })),
    { ...valid, payload: { ...valid.payload, method: "unknown" } },
    { ...valid, payload: { ...valid.payload, reference: 123 } },
  ]) {
    assert.equal(recoverInvoicePaymentAttempt("invoice-1", value), null);
  }
});
test("a payment committed before a timeout replays the same key and body after recovery", async () => {
  const originalFetch = globalThis.fetch,
    requests = [],
    receipts = new Map();
  let first = true;
  globalThis.fetch = async (url, init) => {
    requests.push({
      url,
      key: init.headers["Idempotency-Key"],
      body: init.body,
    });
    assert.equal(
      init.headers["X-Correlation-Id"],
      init.headers["Idempotency-Key"],
    );
    const key = init.headers["Idempotency-Key"];
    if (!receipts.has(key)) receipts.set(key, init.body);
    else assert.equal(receipts.get(key), init.body);
    if (first) {
      first = false;
      return Response.json(
        { message: "Gateway timeout after commit" },
        { status: 408 },
      );
    }
    return Response.json({
      ok: true,
      invoiceId: "invoice-1",
      status: "partially_paid",
    });
  };
  try {
    const attempt = invoiceAttempt();
    await assert.rejects(
      recordInvoicePayment("invoice-1", attempt.payload, attempt.key),
      (error) =>
        error instanceof CommandResponseError &&
        !isDefinitiveCommandFailure(error.status),
    );
    const recovered = recoverInvoicePaymentAttempt(
      "invoice-1",
      JSON.parse(JSON.stringify(attempt)),
    );
    const result = await recordInvoicePayment(
      "invoice-1",
      recovered.payload,
      recovered.key,
    );
    assert.equal(result.ok, true);
    assert.equal(receipts.size, 1);
    assert.equal(requests.length, 2);
    assert.deepEqual(requests[0], requests[1]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
test("an unreadable or mismatched payment response remains unconfirmed", async () => {
  const originalFetch = globalThis.fetch,
    attempt = invoiceAttempt();
  try {
    for (const reply of [
      () => new Response("not-json"),
      () => Response.json(null),
      () => Response.json({ ok: false }),
      () => Response.json({ ok: true, invoiceId: "other", status: "paid" }),
      () =>
        Response.json({ ok: true, invoiceId: "invoice-1", status: "draft" }),
    ]) {
      globalThis.fetch = async () => reply();
      await assert.rejects(
        recordInvoicePayment("invoice-1", attempt.payload, attempt.key),
        (error) =>
          error instanceof CommandResponseError &&
          error.status === 502 &&
          !isDefinitiveCommandFailure(error.status),
      );
    }
    globalThis.fetch = async () => {
      throw Error("Connection closed");
    };
    await assert.rejects(
      recordInvoicePayment("invoice-1", attempt.payload, attempt.key),
      /outcome is unknown/,
    );
    globalThis.fetch = async () =>
      Response.json({ message: "Amount exceeds balance" }, { status: 422 });
    await assert.rejects(
      recordInvoicePayment("invoice-1", attempt.payload, attempt.key),
      (error) =>
        error instanceof CommandResponseError &&
        isDefinitiveCommandFailure(error.status),
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
