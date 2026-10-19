"use client";
import { useCallback, useEffect, useState } from "react";
import type { PosSale, PosShift } from "@/lib/pos-types";
import { posMoney as money } from "@/lib/pos-types";
import { useSession } from "@/components/auth/StaffSessionProvider";
import { hasPermission } from "@/lib/business/permissions";
import {
  readPosAttempt,
  storePosAttempt,
  isDefinitiveCommandFailure,
} from "@/lib/pos-pending";
type Item = {
  id: string;
  name: string;
  quantity: number;
  remaining: number;
  total_cents: number;
};
type Attempt = { key: string; payload: Record<string, unknown> };
export function PosOperations({
  branch,
  shift,
  onChange,
  disabled,
  onPendingChange,
}: {
  branch: string;
  shift: PosShift | null;
  onChange: () => Promise<unknown>;
  disabled: boolean;
  onPendingChange: (value: boolean) => void;
}) {
  const { data: session } = useSession();
  const pendingKey = `truecolours:pos-operation:${session?.user.id}:${branch}`;
  const [history, setHistory] = useState<{
      sales: PosSale[];
      shifts: PosShift[];
    }>({ sales: [], shifts: [] }),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<{ sale: PosSale; items: Item[] } | null>(
      null,
    ),
    [quantities, setQuantities] = useState<Record<string, string>>({}),
    [condition, setCondition] = useState("quarantine"),
    [reason, setReason] = useState(""),
    [reference, setReference] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [cash, setCash] = useState(""),
    [direction, setDirection] = useState("out"),
    [category, setCategory] = useState("expense"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<Attempt | null>(null),
    [refundId, setRefundId] = useState("");
  const canRefund =
    session && hasPermission(session.user.role, "returns.manage");
  useEffect(() => {
    onPendingChange(!!pending || busy);
    return () => onPendingChange(false);
  }, [pending, busy, onPendingChange]);
  useEffect(() => {
    const intent = readPosAttempt(pendingKey);
    if (intent) queueMicrotask(() => setPending(intent));
  }, [pendingKey]);
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const r = await fetch(
        `/api/admin/pos/history?${new URLSearchParams({ locationId: branch, q: query })}`,
        { signal, cache: "no-store" },
      );
      const b = await r.json();
      if (!r.ok) throw Error(b.message);
      setHistory(b);
    },
    [branch, query],
  );
  useEffect(() => {
    const c = new AbortController(),
      t = setTimeout(() => {
        void load(c.signal).catch((e) => {
          if (!c.signal.aborted) setMessage(e.message);
        });
      }, 200);
    return () => {
      clearTimeout(t);
      c.abort();
    };
  }, [load]);
  async function run(payload: Record<string, unknown>) {
    if (busy || disabled) return;
    const attempt = pending || { key: crypto.randomUUID(), payload };
    setBusy(true);
    setMessage("");
    try {
      storePosAttempt(pendingKey, attempt);
      setPending(attempt);
      const r = await fetch("/api/admin/pos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": attempt.key,
        },
        body: JSON.stringify(attempt.payload),
        signal: AbortSignal.timeout(15000),
      });
      const b = await r.json();
      if (!r.ok) {
        if (isDefinitiveCommandFailure(r.status)) {
          storePosAttempt(pendingKey, null);
          setPending(null);
        }
        throw Error(b.message);
      }
      storePosAttempt(pendingKey, null);
      setPending(null);
      setSelected(null);
      setReason("");
      setCash("");
      setConfirmed(false);
      setMessage("Saved.");
      if (b.return) setRefundId(b.return.id);
      await Promise.all([onChange(), load()]);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }
  async function choose(sale: PosSale) {
    setMessage("");
    setBusy(true);
    try {
      const r = await fetch(
        `/api/admin/pos/history?${new URLSearchParams({ locationId: branch, saleId: sale.id })}`,
        { cache: "no-store" },
      );
      const b = await r.json();
      if (!r.ok) throw Error(b.message);
      setSelected(b);
      setQuantities({});
      setReference("");
      setConfirmed(false);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not load receipt");
    } finally {
      setBusy(false);
    }
  }
  const locked = disabled || busy || !!pending;
  return (
    <div className="space-y-5">
      {message && (
        <p role="status" className="rounded-xl border bg-slate-50 p-4 text-sm">
          {message}
        </p>
      )}
      {pending && !busy && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
          <p>
            The save outcome is unknown. Retry the same request to retrieve its
            result. Do not repeat the payment or refund.
          </p>
          <button
            disabled={disabled}
            onClick={() => void run(pending.payload)}
            className="mt-3 rounded-lg bg-slate-950 px-4 py-2 font-bold text-white"
          >
            Retry same request
          </button>
        </div>
      )}
      {refundId && (
        <a
          target="_blank"
          rel="noreferrer"
          className="inline-block rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800 underline"
          href={`/api/admin/pos/document?returnId=${refundId}`}
        >
          Open saved credit note PDF
        </a>
      )}
      {shift && (
        <section className="rounded-2xl border bg-white p-5">
          <h3 className="font-black">Cash paid in / paid out</h3>
          <p className="mt-2 text-xs text-slate-500">
            Record petty cash, banking and extra float so the day-end cash count
            balances.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run({
                action: "cash-movement",
                locationId: branch,
                shiftId: shift.id,
                direction,
                category,
                amountCents: Math.round(Number(cash) * 100),
                reason,
              });
            }}
            className="mt-4 flex flex-wrap items-end gap-3"
          >
            <fieldset
              disabled={locked}
              className="flex flex-wrap items-end gap-3"
            >
              <label className="text-xs font-bold">
                Direction
                <select
                  value={direction}
                  onChange={(e) => setDirection(e.target.value)}
                  className="mt-2 block rounded-lg border p-3"
                >
                  <option value="out">Cash out</option>
                  <option value="in">Cash in</option>
                </select>
              </label>
              <label className="text-xs font-bold">
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="mt-2 block rounded-lg border p-3"
                >
                  {["expense", "float", "banking", "other"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold">
                Amount (R)
                <input
                  type="number"
                  min="0.01"
                  step=".01"
                  required
                  value={cash}
                  onChange={(e) => setCash(e.target.value)}
                  className="mt-2 block w-32 rounded-lg border p-3"
                />
              </label>
              <label className="text-xs font-bold">
                Reason
                <input
                  required
                  minLength={3}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-2 block rounded-lg border p-3"
                />
              </label>
              <button className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white">
                Record cash movement
              </button>
            </fieldset>
          </form>
        </section>
      )}
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h3 className="font-black">Receipts & returns</h3>
            <p className="mt-2 text-xs text-slate-500">
              Reprint saved receipts. Managers can refund items to the original
              payment method.
            </p>
          </div>
          <input
            aria-label="Find receipt"
            placeholder="Find receipt number…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <div className="mt-4 divide-y">
          {history.sales.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
            >
              <span className="font-bold">{s.receipt_number}</span>
              <span>
                {money(s.total_cents)} · {s.payment_method}
              </span>
              <a
                target="_blank"
                rel="noreferrer"
                className="underline"
                href={`/api/admin/pos/document?saleId=${s.id}`}
              >
                Receipt PDF
              </a>
              {canRefund && shift && (
                <button
                  disabled={locked}
                  onClick={() => void choose(s)}
                  className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40"
                >
                  Return items
                </button>
              )}
            </div>
          ))}
          {!history.sales.length && (
            <p className="py-4 text-sm text-slate-500">No receipts found.</p>
          )}
        </div>
        {selected && shift && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void run({
                action: "refund-sale",
                locationId: branch,
                shiftId: shift.id,
                saleId: selected.sale.id,
                paymentMethod: selected.sale.payment_method,
                reason,
                reference,
                items: selected.items
                  .filter((i) => Number(quantities[i.id]) > 0)
                  .map((i) => ({
                    saleItemId: i.id,
                    quantity: Number(quantities[i.id]),
                    disposition: condition,
                  })),
              });
            }}
            className="mt-5 space-y-4 rounded-xl bg-slate-50 p-4"
          >
            <h4 className="font-black">
              Return from {selected.sale.receipt_number}
            </h4>
            <fieldset disabled={locked} className="space-y-4">
              {selected.items.map((i) => (
                <label
                  key={i.id}
                  className="flex flex-wrap items-center justify-between gap-3 text-sm"
                >
                  <span>
                    {i.name} · {Number(i.remaining).toFixed(3)} returnable
                  </span>
                  <input
                    aria-label={`Return quantity for ${i.name}`}
                    type="number"
                    min="0"
                    max={i.remaining}
                    step=".001"
                    value={quantities[i.id] || ""}
                    onChange={(e) =>
                      setQuantities((q) => ({ ...q, [i.id]: e.target.value }))
                    }
                    className="w-28 rounded-lg border p-2"
                  />
                </label>
              ))}
              <label className="block text-xs font-bold">
                Returned stock condition
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="mt-2 block w-full rounded-lg border p-3"
                >
                  <option value="quarantine">
                    Quarantine - inspect before resale
                  </option>
                  <option value="sellable">
                    Sellable - return to available stock
                  </option>
                </select>
              </label>
              <label className="block text-xs font-bold">
                Return reason
                <input
                  required
                  minLength={3}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="mt-2 block w-full rounded-lg border p-3"
                />
              </label>
              {selected.sale.payment_method !== "cash" && (
                <label className="block text-xs font-bold">
                  External refund reference
                  <input
                    required
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    className="mt-2 block w-full rounded-lg border p-3"
                  />
                </label>
              )}
              <p className="text-sm font-bold">
                Refund to {selected.sale.payment_method}:{" "}
                {money(
                  selected.items.reduce(
                    (sum, i) =>
                      sum +
                      Math.round(
                        (i.total_cents * Number(quantities[i.id] || 0)) /
                          Number(i.quantity),
                      ),
                    0,
                  ),
                )}{" "}
                estimated. Saved receipt determines the exact cents.
              </p>
              <label className="flex gap-2 text-xs">
                <input
                  type="checkbox"
                  required
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                I checked the returned items and confirmed the refund to the
                original payment method.
              </label>
              <button
                disabled={
                  !confirmed ||
                  !selected.items.some((i) => Number(quantities[i.id]) > 0)
                }
                className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
              >
                Save return & credit note
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="ml-3 text-sm underline"
              >
                Cancel
              </button>
            </fieldset>
          </form>
        )}
      </section>
      <section className="rounded-2xl border bg-white p-5">
        <h3 className="font-black">Recent cash-up documents</h3>
        <div className="mt-3 divide-y">
          {history.shifts.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap justify-between gap-3 py-3 text-sm"
            >
              <span>
                {new Date(s.opened_at).toLocaleString("en-ZA", {
                  timeZone: "Africa/Johannesburg",
                })}{" "}
                · {s.closed_at ? "Closed" : "Open"}
              </span>
              <a
                target="_blank"
                rel="noreferrer"
                className="font-bold underline"
                href={`/api/admin/pos/document?shiftId=${s.id}`}
              >
                Cash-up PDF
              </a>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
