"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { FileSearch, Plus, Trash2, Save } from "lucide-react";
import { parseSlip } from "@/lib/slips/parse";
import { readSlipFile } from "@/lib/slips/read-file";
import { scanSlipProduct } from "@/lib/slips/scan";
import {
  recoverSlipDraft,
  serializeSlipDraft,
} from "@/lib/slips/draft-recovery";
import { isDefinitiveCommandFailure } from "@/lib/pos-pending";
import {
  slipCommand,
  SlipApiError,
  type PendingSlipCommand,
} from "@/lib/slips/api";
import {
  type SlipDraft,
  type SlipDocument,
  type MatchProduct,
  type ProductAlias,
  slipTotal,
} from "@/lib/slips/types";
import { businessDate, posMoney as money, type PosSale } from "@/lib/pos-types";
import { useSession } from "@/components/auth/StaffSessionProvider";
import { hasPermission } from "@/lib/business/permissions";
import { SlipScanSummary } from "@/components/admin/SlipScanSummary";
type Boot = {
  products: MatchProduct[];
  aliases: ProductAlias[];
  locationId: string;
};
export function SlipEditor({
  initial,
  bootstrap,
}: {
  initial: SlipDocument;
  bootstrap: Boot;
}) {
  const router = useRouter(),
    { data: session } = useSession();
  const cacheKey = `truecolours:slip-draft:${session?.user.id}:${initial.id}`;
  const commandKey = `truecolours:slip-command:${session?.user.id}:${initial.id}`;
  const [startup] = useState(() => {
    try {
      return recoverSlipDraft(
        initial,
        typeof window === "undefined"
          ? null
          : JSON.parse(sessionStorage.getItem(cacheKey) || "null"),
      );
    } catch {
      return recoverSlipDraft(initial, null);
    }
  });
  const [recoveryConflict, setRecoveryConflict] = useState(startup.conflict);
  const [doc, setDoc] = useState(initial),
    [draft, setDraft] = useState<SlipDraft>(startup.data),
    [products, setProducts] = useState(bootstrap.products),
    [saveState, setSaveState] = useState(
      startup.pendingSave ||
        serializeSlipDraft(startup.data) !== serializeSlipDraft(initial.data)
        ? "Recovered changes - saving…"
        : "Saved",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [reading, setReading] = useState(""),
    [manualEditing, setManualEditing] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [posQuery, setPosQuery] = useState(""),
    [posSales, setPosSales] = useState<PosSale[]>([]),
    [payAmount, setPayAmount] = useState(""),
    [payMethod, setPayMethod] = useState("cash"),
    [payRef, setPayRef] = useState(""),
    [payDate, setPayDate] = useState(businessDate),
    [scanCode, setScanCode] = useState(""),
    [voidReason, setVoidReason] = useState(""),
    [voidConfirmed, setVoidConfirmed] = useState(false),
    [pendingAction, setPendingAction] = useState<PendingSlipCommand | null>(
      () => {
        if (typeof window === "undefined") return null;
        try {
          const intent = JSON.parse(
            sessionStorage.getItem(commandKey) || "null",
          );
          return intent?.payload?.id === initial.id ? intent : null;
        } catch {
          return null;
        }
      },
    );
  const draftRef = useRef(draft),
    version = useRef(Number(initial.version)),
    saved = useRef(serializeSlipDraft(initial.data)),
    active = useRef(true),
    saving = useRef<Promise<void> | null>(null),
    pendingSave = useRef<PendingSlipCommand | null>(startup.pendingSave),
    reader = useRef<AbortController | null>(null),
    input = useRef<HTMLInputElement>(null);
  const canManage =
    !!session &&
    (initial.kind === "purchase"
      ? hasPermission(session.user.role, "purchasing.manage")
      : hasPermission(session.user.role, "sales.manage") &&
        hasPermission(session.user.role, "inventory.adjust"));
  const editable = doc.status === "draft" && canManage && !recoveryConflict,
    locked = !editable || busy || !!reading || !!pendingAction;
  const canPay =
    !!session &&
    canManage &&
    hasPermission(session.user.role, "payments.record");
  const persistDraft = useCallback(() => {
    if (
      !pendingSave.current &&
      saved.current === serializeSlipDraft(draftRef.current)
    ) {
      sessionStorage.removeItem(cacheKey);
    } else {
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({
          version: version.current,
          data: draftRef.current,
          pendingSave: pendingSave.current,
        }),
      );
    }
  }, [cacheKey]);
  const flush = useCallback(async () => {
    if (saving.current) return saving.current;
    const operation = (async () => {
      while (
        pendingSave.current ||
        saved.current !== serializeSlipDraft(draftRef.current)
      ) {
        const intent = pendingSave.current || {
          action: "save",
          key: crypto.randomUUID(),
          payload: {
            id: initial.id,
            kind: initial.kind,
            locationId: initial.branch_id,
            expectedVersion: version.current,
            data: structuredClone(draftRef.current),
          },
        };
        pendingSave.current = intent;
        if (active.current) setSaveState("Saving…");
        try {
          // Keep both the exact retry and any later local edits before sending.
          persistDraft();
          const result = await slipCommand(
            intent.action,
            intent.payload,
            intent.key,
          );
          version.current = Number(result.version);
          saved.current = serializeSlipDraft(intent.payload.data as SlipDraft);
          pendingSave.current = null;
          persistDraft();
        } catch (e) {
          if (
            e instanceof SlipApiError &&
            isDefinitiveCommandFailure(e.status)
          ) {
            pendingSave.current = null;
            try {
              persistDraft();
            } catch {}
          }
          if (active.current) setSaveState("Save failed - retry");
          throw e;
        }
      }
      if (active.current) setSaveState("Saved");
    })();
    saving.current = operation;
    try {
      await operation;
    } finally {
      saving.current = null;
    }
  }, [initial.id, initial.kind, initial.branch_id, persistDraft]);
  useEffect(() => {
    if (!startup.conflict) {
      try {
        persistDraft();
      } catch {}
    }
  }, [startup, persistDraft]);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      reader.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!editable) return;
    const timer = setTimeout(() => {
      void flush().catch((e) =>
        setError(e instanceof Error ? e.message : "Could not save draft"),
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [draft, editable, flush]);
  useEffect(() => {
    const leave = (e: BeforeUnloadEvent) => {
      if (
        editable &&
        (pendingSave.current ||
          saved.current !== serializeSlipDraft(draftRef.current))
      ) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", leave);
    return () => window.removeEventListener("beforeunload", leave);
  }, [editable]);
  useEffect(() => {
    if (draft.stockEffect !== "verify_pos") return;
    const c = new AbortController(),
      timer = setTimeout(() => {
        void fetch(
          `/api/admin/pos/history?${new URLSearchParams({ locationId: initial.branch_id, q: posQuery })}`,
          { signal: c.signal, cache: "no-store" },
        )
          .then(async (r) => {
            const b = await r.json();
            if (!r.ok) throw Error(b.message);
            setPosSales(b.sales);
          })
          .catch((e) => {
            if (!c.signal.aborted) setError(e.message);
          });
      }, 250);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [draft.stockEffect, posQuery, initial.branch_id]);
  function update(change: Partial<SlipDraft>) {
    setReviewed(false);
    setError("");
    const next = { ...draftRef.current, ...change };
    draftRef.current = next;
    setDraft(next);
    setSaveState("Unsaved changes");
    try {
      persistDraft();
    } catch {
      setError(
        "This browser cannot keep a recovery copy. Keep this tab open, free browser storage and retry saving.",
      );
    }
  }
  async function refreshStock() {
    setBusy(true);
    try {
      const r = await fetch(
          `/api/admin/inventory/slips?locationId=${initial.branch_id}`,
          { cache: "no-store" },
        ),
        b = await r.json();
      if (!r.ok) throw Error(b.message);
      setProducts(b.products);
      update({
        items: draftRef.current.items.map((i) => ({
          ...i,
          stockVersion: Number(
            b.products.find((p: MatchProduct) => p.id === i.productId)
              ?.version || 0,
          ),
        })),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh stock");
    } finally {
      setBusy(false);
    }
  }
  async function read(file: File) {
    setError("");
    const c = new AbortController();
    reader.current = c;
    setReading("Preparing reader…");
    try {
      const result = await readSlipFile(file, setReading, c.signal);
      if (c.signal.aborted) return;
      const extracted = parseSlip(result.text, products, bootstrap.aliases);
      update({
        ...extracted,
        sourceName: file.name.slice(0, 200),
        sourceSha256: result.sourceSha256,
        confidence: result.confidence,
        stockEffect: draftRef.current.stockEffect,
      });
      await flush();
      setManualEditing(false);
      setReading("");
    } catch (e) {
      setError(
        c.signal.aborted
          ? "Reading cancelled."
          : e instanceof Error
            ? e.message
            : "Could not read this file",
      );
    } finally {
      reader.current = null;
      setReading("");
      if (input.current) input.current.value = "";
    }
  }
  async function loadDoc() {
    const r = await fetch(
        `/api/admin/inventory/slips?${new URLSearchParams({ id: initial.id, locationId: initial.branch_id })}`,
        { cache: "no-store" },
      ),
      b = await r.json();
    if (!r.ok) throw Error(b.message);
    setDoc(b);
    version.current = Number(b.version);
    return b as SlipDocument;
  }
  async function copyCorrection(recoverLocal = false) {
    if (
      !canManage ||
      (recoverLocal ? !recoveryConflict : doc.status !== "void")
    )
      return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(
        `/api/admin/inventory/slips?locationId=${initial.branch_id}`,
        { cache: "no-store", signal: AbortSignal.timeout(30000) },
      );
      const boot = await response.json();
      if (!response.ok) throw Error(boot.message);
      const id = crypto.randomUUID();
      const source =
        recoverLocal && recoveryConflict ? recoveryConflict.data : doc.data;
      await slipCommand("save", {
        id,
        kind: initial.kind,
        locationId: initial.branch_id,
        expectedVersion: 0,
        data: {
          ...source,
          paidCents: 0,
          paymentMethod: "credit",
          paymentReference: "",
          items: source.items.map((i) => ({
            ...i,
            stockVersion:
              boot.products.find((p: MatchProduct) => p.id === i.productId)
                ?.version ?? 0,
          })),
          warnings: [
            ...source.warnings,
            recoverLocal
              ? "Recovered local edits: review against the original saved record before posting. This is a separate draft; do not count an existing transaction twice."
              : "Correction draft: review the cancelled record, quantities, prices and actual payments before posting.",
          ],
        },
      });
      if (recoverLocal) sessionStorage.removeItem(cacheKey);
      router.push(`/admin/stock-control/${id}?locationId=${initial.branch_id}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not create correction draft",
      );
    } finally {
      setBusy(false);
    }
  }
  async function act(action: string, payload: Record<string, unknown>) {
    if (!canManage) return;
    setBusy(true);
    setError("");
    try {
      if (action === "post" || action === "archive") await flush();
      const intent = pendingAction || {
        action,
        key: crypto.randomUUID(),
        payload: {
          ...payload,
          id: initial.id,
          ...(action === "post"
            ? { expectedVersion: version.current, reviewed }
            : {}),
        },
      };
      sessionStorage.setItem(commandKey, JSON.stringify(intent));
      setPendingAction(intent);
      const result = await slipCommand(
        intent.action,
        intent.payload,
        intent.key,
      );
      setPendingAction(null);
      sessionStorage.removeItem(commandKey);
      if (result.status === "posted" || result.status === "verified") {
        setDoc((d) => ({ ...d, status: result.status }));
        sessionStorage.removeItem(cacheKey);
      }
      if (result.status === "void") {
        sessionStorage.removeItem(cacheKey);
        setVoidConfirmed(false);
      }
      await loadDoc();
      if (action === "payment") {
        setPayAmount("");
        setPayRef("");
      }
      if (action === "archive" || action === "restore")
        router.push(`/admin/stock-control?locationId=${initial.branch_id}`);
    } catch (e) {
      if (e instanceof SlipApiError && isDefinitiveCommandFailure(e.status)) {
        setPendingAction(null);
        sessionStorage.removeItem(commandKey);
      }
      setError(e instanceof Error ? e.message : "Could not save this record");
    } finally {
      setBusy(false);
    }
  }
  const calculated = slipTotal(draft),
    paid = (doc.payments || []).reduce((n, p) => n + Number(p.amount_cents), 0),
    balance = Number(doc.total_cents || 0) - paid;
  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {initial.kind === "purchase"
              ? "Supplier purchase slip"
              : "Physical sales slip"}{" "}
            · {doc.status}
          </p>
          <h2 className="mt-2 text-3xl font-black">
            {editable
              ? "Scan slip & confirm"
              : `${doc.counterparty || "Slip"} · ${doc.reference || ""}`}
          </h2>
        </div>
        <button
          onClick={async () => {
            try {
              if (editable) await flush();
              router.push(
                `/admin/stock-control?locationId=${initial.branch_id}`,
              );
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Save draft before leaving",
              );
            }
          }}
          className="rounded-xl border px-4 py-3 text-sm font-bold"
        >
          Back to stock book
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      )}
      {recoveryConflict && (
        <section
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-5 text-sm"
        >
          <h3 className="font-black">Unsaved local changes need review</h3>
          <p className="mt-2 leading-6">
            The saved record changed in another window or was posted after your
            local edits. Your local copy is retained. Review it in a separate
            recovery draft to protect the saved version.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <p>
              Saved record: {doc.data.counterparty || "No supplier/customer"} ·{" "}
              {doc.data.reference || "No reference"} · {doc.data.items.length}{" "}
              lines
            </p>
            <p>
              Local copy:{" "}
              {recoveryConflict.data.counterparty || "No supplier/customer"} ·{" "}
              {recoveryConflict.data.reference || "No reference"} ·{" "}
              {recoveryConflict.data.items.length} lines
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {canManage && (
              <button
                disabled={busy || !!pendingAction}
                onClick={() => void copyCorrection(true)}
                className="rounded-lg border border-amber-600 bg-white px-4 py-2 font-bold"
              >
                Open local recovery draft
              </button>
            )}
            <button
              disabled={busy || !!pendingAction}
              onClick={() => {
                sessionStorage.removeItem(cacheKey);
                pendingSave.current = null;
                draftRef.current = doc.data;
                saved.current = serializeSlipDraft(doc.data);
                setDraft(doc.data);
                setRecoveryConflict(null);
                setSaveState("Saved");
              }}
              className="rounded-lg border px-4 py-2 font-bold"
            >
              Use current saved version
            </button>
          </div>
        </section>
      )}
      {doc.status === "void" && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm">
          <h3 className="font-black">
            Cancelled record — excluded from active books
          </h3>
          <p className="mt-2">
            {doc.void_reason} ·{" "}
            {doc.voided_at
              ? new Date(doc.voided_at).toLocaleString("en-ZA")
              : ""}
          </p>
          <p className="mt-2">
            Its stock change was reversed where applicable. The original entries
            and recorded payments remain in the audit trail. No money was
            transferred or refunded.
          </p>
          {canManage && (
            <button
              disabled={busy}
              onClick={() => void copyCorrection()}
              className="mt-4 rounded-lg border border-slate-400 bg-white px-4 py-2 font-bold"
            >
              Copy into corrected draft
            </button>
          )}
        </section>
      )}
      {pendingAction && !busy && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          <p>
            The save outcome is unknown. Retry the same request before changing
            this record. Do not repeat the physical payment.
          </p>
          <button
            onClick={() =>
              void act(pendingAction.action, pendingAction.payload)
            }
            className="mt-3 rounded-lg bg-slate-950 px-4 py-2 font-bold text-white"
          >
            Retry same request safely
          </button>
        </div>
      )}
      {editable && (
        <section className="rounded-2xl border bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">
              <FileSearch size={19} />
              Scan image or PDF
              <input
                ref={input}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                disabled={locked}
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void read(f);
                }}
              />
            </label>
            <p role="status" className="text-xs font-bold text-slate-600">
              {reading || saveState}
            </p>
            {reading && (
              <button
                onClick={() => reader.current?.abort()}
                className="text-sm underline"
              >
                Cancel reading
              </button>
            )}
            <button
              disabled={busy || !!reading}
              onClick={() => void flush().catch((e) => setError(e.message))}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
            >
              <Save size={16} />
              Save now
            </button>
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">
            Upload once to fill the slip automatically. Check the summary and
            confirm; only unclear details need correction.
          </p>
          <button
            disabled={locked}
            onClick={() => setManualEditing(!manualEditing)}
            className="mt-3 text-xs font-bold underline"
          >
            {manualEditing
              ? "Close manual corrections"
              : "Enter manually / correct an unreadable scan"}
          </button>
          <p className="mt-4 text-xs leading-5 text-slate-500">
            Up to 10 MB / 5 PDF pages. Reading happens on this device. No image
            or PDF is uploaded or kept in the database. The file selection is
            cleared after reading; saved text and records remain. Keep originals
            separately if your business needs them.
          </p>
          {draft.sourceName && (
            <p className="mt-2 text-xs text-slate-600">
              Read: {draft.sourceName}
              {draft.confidence !== null
                ? ` · OCR confidence ${Math.round(draft.confidence)}%`
                : ""}
            </p>
          )}
        </section>
      )}
      <SlipScanSummary
        draft={draft}
        products={products}
        paidCents={
          doc.status === "draft" || doc.status === "archived"
            ? draft.paidCents
            : paid
        }
        disabled={locked}
        onCorrect={editable ? () => setManualEditing(true) : undefined}
      />
      <section className="rounded-2xl border bg-white p-5">
        <Field label="How should this slip affect stock?">
          <select
            disabled={locked}
            value={draft.stockEffect}
            onChange={(e) =>
              update({
                stockEffect: e.target.value as SlipDraft["stockEffect"],
              })
            }
            className="control"
          >
            <option value="apply">
              {initial.kind === "purchase"
                ? "Receive these products into stock"
                : "Record sold products and deduct stock"}
            </option>
            <option value="already_counted">
              Already included in a stock count — record the slip only
            </option>
            {initial.kind === "physical_sale" && (
              <option value="verify_pos">
                Already sold through this POS — match the receipt
              </option>
            )}
          </select>
        </Field>
        <p className="mt-3 text-xs text-slate-500">
          Use the existing POS receipt option for sales already recorded at the
          till. A backdated slip also affects today’s stock when receiving or
          deducting products.
        </p>
      </section>
      {editable && draft.warnings.length > 0 && (
        <details
          className="rounded-xl border border-amber-200 bg-amber-50 p-4"
          open
        >
          <summary className="cursor-pointer text-sm font-bold">
            Review checks
          </summary>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-xs leading-5">
            {draft.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </details>
      )}
      {manualEditing && (
        <>
          {editable && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  update(
                    scanSlipProduct(
                      draftRef.current,
                      products,
                      scanCode,
                      initial.kind,
                    ),
                  );
                  setScanCode("");
                } catch (e) {
                  setError(
                    e instanceof Error ? e.message : "Could not match barcode",
                  );
                }
              }}
              className="rounded-2xl border bg-white p-5"
            >
              <fieldset
                disabled={locked}
                className="flex flex-wrap items-end gap-3"
              >
                <Field label="Scan product barcode or enter product code">
                  <input
                    autoComplete="off"
                    value={scanCode}
                    onChange={(e) => setScanCode(e.target.value)}
                    placeholder="Scan then press Enter"
                    className="control"
                  />
                </Field>
                <button className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white">
                  Add scanned item
                </button>
              </fieldset>
              <p className="mt-3 text-xs leading-5 text-slate-500">
                Each scan adds one unit; repeated scans increase its quantity.
                Adjust quantities for cases or litres. Supplier prices use the
                last confirmed cost; missing prices start at zero for review.
                Printed totals from a scanned slip stay unchanged.
              </p>
            </form>
          )}
          <fieldset
            disabled={locked}
            className="grid gap-4 rounded-2xl border bg-white p-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            <Field
              label={
                initial.kind === "purchase"
                  ? "Supplier"
                  : "Store / customer label"
              }
            >
              <input
                required
                value={draft.counterparty}
                maxLength={200}
                onChange={(e) => update({ counterparty: e.target.value })}
                className="control"
              />
            </Field>
            <Field label="Receipt / invoice reference">
              <input
                value={draft.reference}
                maxLength={100}
                onChange={(e) => update({ reference: e.target.value })}
                className="control"
              />
            </Field>
            <Field label="Document date">
              <input
                type="date"
                max={businessDate()}
                value={draft.documentDate}
                onChange={(e) => update({ documentDate: e.target.value })}
                className="control"
              />
            </Field>
            <Field label="Currency">
              <select
                value={draft.currency}
                onChange={(e) => update({ currency: e.target.value })}
                className="control"
              >
                <option value="ZAR">ZAR - South African rand</option>
                <option value="CHECK">Check currency before posting</option>
              </select>
            </Field>
          </fieldset>
          <section className="rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-black">
                Match slip lines to your products
              </h3>
              {editable && (
                <button
                  disabled={locked}
                  onClick={() => void refreshStock()}
                  className="rounded-lg border px-3 py-2 text-xs font-bold"
                >
                  Refresh stock check
                </button>
              )}
            </div>
            <div className="mt-4 space-y-4">
              {draft.items.map((line, index) => {
                const product = products.find((p) => p.id === line.productId),
                  cost = product?.lastCostCents;
                return (
                  <fieldset
                    key={line.id}
                    disabled={locked}
                    className="rounded-xl border bg-slate-50 p-4"
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Description on slip">
                        <input
                          value={line.description}
                          onChange={(e) =>
                            update({
                              items: draft.items.map((i, n) =>
                                n === index
                                  ? { ...i, description: e.target.value }
                                  : i,
                              ),
                            })
                          }
                          className="control"
                        />
                        {line.sourceCode ? (
                          <p className="mt-2 text-xs text-slate-600">
                            Supplier code: <strong>{line.sourceCode}</strong>
                          </p>
                        ) : null}
                      </Field>
                      <Field label={line.matchLabel || "Product match"}>
                        <select
                          value={line.productId}
                          onChange={(e) => {
                            const p = products.find(
                              (p) => p.id === e.target.value,
                            );
                            update({
                              items: draft.items.map((i, n) =>
                                n === index
                                  ? {
                                      ...i,
                                      productId: e.target.value,
                                      stockVersion: p?.version || 0,
                                      matchLabel: "Confirmed selection",
                                    }
                                  : i,
                              ),
                            });
                          }}
                          className="control"
                        >
                          <option value="">Choose product - required</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.code} · {p.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Field label="Quantity">
                        <input
                          type="number"
                          min=".001"
                          step=".001"
                          value={line.quantity}
                          onChange={(e) =>
                            update({
                              items: draft.items.map((i, n) =>
                                n === index
                                  ? { ...i, quantity: Number(e.target.value) }
                                  : i,
                              ),
                            })
                          }
                          className="control"
                        />
                      </Field>
                      <MoneyField
                        label="Unit price incl. VAT (R)"
                        cents={line.unitPriceCents}
                        onChange={(value) =>
                          update({
                            items: draft.items.map((i, n) =>
                              n === index ? { ...i, unitPriceCents: value } : i,
                            ),
                          })
                        }
                      />
                      <MoneyField
                        label="Line discount (R)"
                        cents={line.discountCents}
                        onChange={(value) =>
                          update({
                            items: draft.items.map((i, n) =>
                              n === index ? { ...i, discountCents: value } : i,
                            ),
                          })
                        }
                      />
                      <div className="text-xs">
                        <p className="font-bold">Line total</p>
                        <p className="mt-4 text-base font-black">
                          {money(
                            Math.round(line.quantity * line.unitPriceCents) -
                              line.discountCents,
                          )}
                        </p>
                        {editable && (
                          <button
                            aria-label={`Remove slip line ${index + 1}`}
                            onClick={() =>
                              update({
                                items: draft.items.filter(
                                  (_, n) => n !== index,
                                ),
                              })
                            }
                            className="mt-3 flex items-center gap-1 text-red-700"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                    {product && (
                      <p className="mt-3 text-xs text-slate-600">
                        Available now: {product.available} ·{" "}
                        {draft.stockEffect === "apply"
                          ? `After this slip: ${Number((product.available + (initial.kind === "purchase" ? 1 : -1) * draft.items.filter((i) => i.productId === product.id).reduce((n, i) => n + i.quantity, 0)).toFixed(3))}`
                          : "No stock change selected"}
                      </p>
                    )}
                    {initial.kind === "purchase" &&
                      cost !== null &&
                      cost !== undefined &&
                      line.unitPriceCents > cost * 1.15 && (
                        <p className="mt-2 text-xs font-bold text-amber-800">
                          Unit price is more than 15% above the last recorded
                          purchase ({money(cost)}). Check the pack size and
                          supplier price.
                        </p>
                      )}
                  </fieldset>
                );
              })}
            </div>
            {editable && (
              <button
                disabled={locked}
                onClick={() =>
                  update({
                    items: [
                      ...draft.items,
                      {
                        id: crypto.randomUUID(),
                        description: "",
                        productId: "",
                        quantity: 1,
                        unitPriceCents: 0,
                        discountCents: 0,
                        stockVersion: 0,
                      },
                    ],
                  })
                }
                className="mt-4 flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold"
              >
                <Plus size={16} />
                Add slip line
              </button>
            )}
          </section>
          <fieldset
            disabled={locked}
            className="rounded-2xl border bg-white p-5"
          >
            <h3 className="text-lg font-black">Amounts & payment check</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MoneyField
                label="Charges / delivery (R)"
                cents={draft.chargesCents}
                onChange={(n) => update({ chargesCents: n })}
              />
              <MoneyField
                label="Document discount (R)"
                cents={draft.discountCents}
                onChange={(n) => update({ discountCents: n })}
              />
              <MoneyField
                label="Rounding, ± R1 maximum"
                cents={draft.roundingCents}
                onChange={(n) => update({ roundingCents: n })}
                signed
              />
              <MoneyField
                label="Printed total (R)"
                cents={draft.declaredTotalCents}
                onChange={(n) => update({ declaredTotalCents: n })}
              />
              <MoneyField
                label="VAT amount printed on slip (R)"
                cents={draft.vatCents}
                onChange={(n) => update({ vatCents: n })}
              />
              <MoneyField
                label="Already paid (R)"
                cents={draft.paidCents}
                onChange={(n) => update({ paidCents: n })}
              />
              <Field label="Payment method">
                <select
                  value={draft.paymentMethod}
                  onChange={(e) =>
                    update({
                      paymentMethod: e.target
                        .value as SlipDraft["paymentMethod"],
                      ...(e.target.value === "credit" ? { paidCents: 0 } : {}),
                    })
                  }
                  className="control"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card - external terminal</option>
                  <option value="eft">EFT - verified externally</option>
                  <option value="credit">Credit / unpaid</option>
                </select>
              </Field>
              <Field label="Payment / bank reference">
                <input
                  value={draft.paymentReference}
                  onChange={(e) => update({ paymentReference: e.target.value })}
                  className="control"
                />
              </Field>
            </div>
            <div
              className={`mt-5 rounded-xl p-4 ${calculated === draft.declaredTotalCents ? "bg-emerald-50" : "bg-amber-50"}`}
            >
              <p className="font-black">
                Calculated {money(calculated)} · Printed{" "}
                {money(draft.declaredTotalCents)}
              </p>
              <p className="mt-2 text-xs">
                Difference {money(calculated - draft.declaredTotalCents)} ·
                Excl. VAT {money(calculated - draft.vatCents)} · Initial balance{" "}
                {money(calculated - draft.paidCents)}
              </p>
            </div>
          </fieldset>
        </>
      )}
      {draft.stockEffect === "verify_pos" && (
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="font-bold">Match the existing POS receipt</h3>
          <input
            disabled={locked}
            value={posQuery}
            onChange={(e) => setPosQuery(e.target.value)}
            placeholder="Search receipt number…"
            className="control mt-3"
          />
          <select
            aria-label="Existing POS receipt"
            disabled={locked}
            value={draft.linkedSaleId}
            onChange={(e) => update({ linkedSaleId: e.target.value })}
            className="control mt-3"
          >
            <option value="">Choose the existing receipt</option>
            {posSales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.receipt_number} · {money(s.total_cents)}
              </option>
            ))}
          </select>
        </section>
      )}
      <details className="rounded-2xl border bg-white p-5">
        <summary className="cursor-pointer text-sm font-bold">
          Everything read from the slip
        </summary>
        {manualEditing ? (
          <textarea
            disabled={locked}
            value={draft.rawText}
            onChange={(e) =>
              update({ rawText: e.target.value.slice(0, 40000) })
            }
            rows={10}
            className="control mt-4 font-mono text-xs"
          />
        ) : (
          <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap break-words font-mono text-xs leading-6">
            {draft.rawText || "No document scanned yet."}
          </pre>
        )}
        {editable && manualEditing && (
          <button
            disabled={locked}
            onClick={() => {
              const d = parseSlip(draft.rawText, products, bootstrap.aliases);
              update({
                ...d,
                sourceSha256: draft.sourceSha256,
                sourceName: draft.sourceName,
                confidence: draft.confidence,
                stockEffect: draft.stockEffect,
              });
            }}
            className="mt-3 rounded-lg border px-4 py-2 text-xs font-bold"
          >
            Extract fields from this text again
          </button>
        )}
        <p className="mt-3 break-all text-xs text-slate-500">
          SHA-256: {draft.sourceSha256 || "Manual entry - no source file"} ·
          Original image/PDF stored: no
        </p>
      </details>
      {editable && (
        <section className="rounded-2xl border bg-white p-5">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              disabled={locked}
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            <span>
              I checked every product match, quantity, date, total, VAT, payment
              and stock effect against the original slip. This document has not
              already been recorded elsewhere.
            </span>
          </label>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <button
              disabled={
                locked ||
                !reviewed ||
                calculated <= 0 ||
                calculated !== draft.declaredTotalCents ||
                draft.items.some((i) => !i.productId)
              }
              onClick={() => void act("post", {})}
              className="rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white disabled:opacity-40"
            >
              {busy
                ? "Saving…"
                : draft.stockEffect === "verify_pos"
                  ? "Verify POS receipt"
                  : "Post reviewed slip"}
            </button>
            <button
              disabled={locked}
              onClick={() => void act("archive", {})}
              className="text-xs font-bold text-slate-500 underline"
            >
              Archive draft
            </button>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Posting saves a permanent record. External slip payments stay
            separate from the POS cash drawer. No bank transfer, card charge or
            supplier order is made.
          </p>
        </section>
      )}
      {doc.status === "archived" && canManage && (
        <button
          disabled={busy}
          onClick={() => void act("restore", {})}
          className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
        >
          Restore draft
        </button>
      )}
      {doc.status === "posted" && (
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="text-lg font-black">
            Saved payments & outstanding balance
          </h3>
          <p className="mt-3 text-sm">
            Paid {money(paid)} · Remaining {money(balance)}
          </p>
          {doc.payments?.map((p) => (
            <p key={p.id} className="mt-3 text-xs">
              {p.paid_on} · {p.method} · {money(p.amount_cents)} ·{" "}
              {p.reference || "No reference"}
            </p>
          ))}
          {balance > 0 && canPay && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void act("payment", {
                  amountCents: Math.round(Number(payAmount) * 100),
                  method: payMethod,
                  reference: payRef,
                  paidOn: payDate,
                });
              }}
              className="mt-5 flex flex-wrap items-end gap-3"
            >
              <fieldset
                disabled={busy || !!pendingAction}
                className="flex flex-wrap items-end gap-3"
              >
                <Field label="Payment amount (R)">
                  <input
                    required
                    type="number"
                    min=".01"
                    step=".01"
                    max={balance / 100}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="control"
                  />
                </Field>
                <Field label="Paid date">
                  <input
                    required
                    type="date"
                    min={doc.document_date || undefined}
                    max={businessDate()}
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="control"
                  />
                </Field>
                <Field label="Method">
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="control"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="eft">EFT</option>
                  </select>
                </Field>
                <Field label="Reference">
                  <input
                    required={payMethod !== "cash"}
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    className="control"
                  />
                </Field>
                <button className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white">
                  Record confirmed payment
                </button>
              </fieldset>
            </form>
          )}
        </section>
      )}
      {(doc.status === "posted" || doc.status === "verified") &&
        canManage &&
        (!paid || canPay) && (
          <section className="rounded-2xl border border-red-200 bg-white p-5">
            <h3 className="text-lg font-black">Correct a mistaken record</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Cancel only an incorrect entry. This excludes its sales, purchases
              and recorded payments from active totals and reverses its stock
              change in the original month. A real supplier return, customer
              refund or bank payment must be handled separately. A verified POS
              attachment can be cancelled without changing its POS sale.
            </p>
            <label className="mt-4 block text-sm font-bold">
              Cancellation reason
              <textarea
                value={voidReason}
                maxLength={500}
                onChange={(e) => {
                  setVoidReason(e.target.value);
                  setVoidConfirmed(false);
                }}
                className="control mt-2"
                placeholder="Explain the duplicate, wrong product or other mistake"
              />
            </label>
            <label className="mt-4 flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                checked={voidConfirmed}
                onChange={(e) => setVoidConfirmed(e.target.checked)}
                className="mt-1"
              />
              I checked this is an incorrect record and understand that recorded
              payments will be excluded; no refund is sent.
            </label>
            <button
              disabled={
                busy ||
                !!pendingAction ||
                !voidConfirmed ||
                voidReason.trim().length < 3
              }
              onClick={() =>
                void act("void", {
                  reason: voidReason.trim(),
                  confirmed: true,
                  expectedVersion: doc.version,
                  expectedPaidCents: paid,
                })
              }
              className="mt-4 rounded-lg bg-red-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              Cancel incorrect record & reverse stock
            </button>
          </section>
        )}
      <style jsx global>{`
        .control {
          display: block;
          width: 100%;
          min-height: 42px;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background: white;
          padding: 10px 12px;
          font-size: 13px;
          margin-top: 6px;
        }
        .control:disabled {
          background: #f8fafc;
          color: #475569;
        }
      `}</style>
    </div>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-bold text-slate-600">
      {label}
      {children}
    </label>
  );
}
function MoneyField({
  label,
  cents,
  onChange,
  signed = false,
}: {
  label: string;
  cents: number;
  onChange: (n: number) => void;
  signed?: boolean;
}) {
  return (
    <Field label={label}>
      <input
        type="number"
        min={signed ? -1 : 0}
        step=".01"
        value={cents / 100}
        onChange={(e) => onChange(Math.round(Number(e.target.value) * 100))}
        className="control"
      />
    </Field>
  );
}
