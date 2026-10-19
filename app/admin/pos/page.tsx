"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Barcode,
  Minus,
  Plus,
  Printer,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import { PosOperations } from "@/components/admin/PosOperations";
import type { PosTotals } from "@/lib/pos-types";
import { useSession } from "@/components/auth/StaffSessionProvider";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import {
  readPosAttempt,
  storePosAttempt,
  isDefinitiveCommandFailure,
  type PosAttempt,
} from "@/lib/pos-pending";
type Product = {
  id: string;
  name: string;
  code: string;
  barcodes: string[];
  sellingPriceCents: number | null;
  available: number;
  taxRate: number;
};
type Shift = {
  id: string;
  branch_id: string;
  opening_float_cents: number;
  closed_at: string | null;
  opened_at: string;
  expected_cash_cents?: number;
  counted_cash_cents?: number;
  discrepancy_cents?: number;
};
type Data = {
  locationId: string;
  branches: Array<{ id: string; name: string }>;
  products: Product[];
  shift: Shift | null;
  shiftTotals: PosTotals;
};
type CartItem = { product: Product; quantity: number };
type Receipt = {
  sale: {
    id: string;
    receipt_number: string;
    branch_id: string;
    created_at: string;
    total_cents: number;
    vat_cents: number;
    payment_method: string;
    tendered_cents: number;
    change_cents: number;
  };
  items: Array<{
    productId: string;
    name: string;
    code: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
  }>;
};
const money = (cents: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(
    cents / 100,
  );
const cents = (value: string) => Math.round(Number(value) * 100);
export default function PosPage() {
  const { data: session } = useSession();
  return session ? (
    <PosRegister key={session.user.id} staffId={session.user.id} />
  ) : (
    <p role="status">Opening secure register…</p>
  );
}
function PosRegister({ staffId }: { staffId: string }) {
  const pendingKey = `truecolours:pos-pending:${staffId}`;
  const [pendingMutation, setPendingMutation] = useState<PosAttempt | null>(
    () => readPosAttempt(pendingKey),
  );
  const [data, setData] = useState<Data | null>(null);
  const [branch, setBranch] = useState(() =>
    String(
      pendingMutation?.payload.locationId ||
        (typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("locationId") || ""
          : ""),
    ),
  );
  const [query, setQuery] = useState("");
  const cartKey = `truecolours:pos-cart:${staffId}`;
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const draft = JSON.parse(sessionStorage.getItem(cartKey) || "[]");
      return Array.isArray(draft)
        ? draft.filter(
            (i) =>
              typeof i?.product?.id === "string" &&
              Number.isFinite(i.quantity) &&
              i.quantity > 0,
          )
        : [];
    } catch {
      return [];
    }
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState("cash");
  const [tender, setTender] = useState("");
  const [reference, setReference] = useState("");
  const [externalConfirmed, setExternalConfirmed] = useState(false);
  const [opening, setOpening] = useState("0");
  const [counted, setCounted] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [closed, setClosed] = useState<Shift | null>(null);
  const [uncertain, setUncertain] = useState(!!pendingMutation);
  const [operationPending, setOperationPending] = useState(false);
  const dataRef = useRef<Data | null>(null);
  const scanInput = useRef<HTMLInputElement>(null);
  const attempt = useRef<{
    key: string;
    payload: Record<string, unknown>;
  } | null>(
    pendingMutation?.payload.action === "checkout" ? pendingMutation : null,
  );
  const total = cart.reduce(
    (sum, item) =>
      sum + Math.round((item.product.sellingPriceCents || 0) * item.quantity),
    0,
  );
  const vat = cart.reduce(
    (sum, item) =>
      sum +
      Math.round(
        (Math.round((item.product.sellingPriceCents || 0) * item.quantity) *
          item.product.taxRate) /
          (100 + item.product.taxRate),
      ),
    0,
  );
  useEffect(() => {
    try {
      sessionStorage.setItem(cartKey, JSON.stringify(cart));
    } catch {
      /* Cart drafts are optional; command retry storage is required before saving. */
    }
  }, [cart, cartKey]);
  const load = useCallback(
    async (signal?: AbortSignal, searchOnly = false) => {
      const params = new URLSearchParams({ q: query });
      if (searchOnly) params.set("search", "1");
      if (branch) params.set("locationId", branch);
      const response = await fetch(`/api/admin/pos?${params}`, {
        signal: AbortSignal.any([
          ...(signal ? [signal] : []),
          AbortSignal.timeout(12000),
        ]),
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message);
      if (body.redirectBranch) {
        setBranch(body.redirectBranch);
        return dataRef.current as Data;
      }
      const next =
        searchOnly && dataRef.current
          ? { ...dataRef.current, products: body.products }
          : body;
      dataRef.current = next;
      setData(next);
      setError("");
      return body as Data;
    },
    [branch, query],
  );
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(
      () => {
        void load(
          controller.signal,
          !!dataRef.current &&
            (!branch || dataRef.current.locationId === branch),
        ).catch((reason) => {
          if (!controller.signal.aborted) setError(reason.message);
        });
      },
      query ? 150 : 0,
    );
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [load, branch, query]);
  useEffect(() => {
    if (!data?.locationId) return;
    const db = getSupabaseBrowser();
    let timer: ReturnType<typeof setTimeout>;
    const changed = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void load().catch(() => {});
      }, 250);
    };
    const channel = db
      .channel(`pos-stock:${staffId}:${data.locationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "inventory",
          filter: `branch_id=eq.${data.locationId}`,
        },
        changed,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        changed,
      )
      .subscribe();
    return () => {
      clearTimeout(timer);
      void db.removeChannel(channel);
    };
  }, [load, data?.locationId, staffId]);
  useEffect(() => {
    const update = () => {
      void load().catch(() =>
        setError(
          "Reconnect to refresh the register. Saved transactions stay in Supabase.",
        ),
      );
    };
    const timer = setInterval(update, 30000);
    window.addEventListener("focus", update);
    window.addEventListener("online", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      window.removeEventListener("online", update);
    };
  }, [load]);
  const command = async (payload: Record<string, unknown>, key: string) => {
    const saved = readPosAttempt(pendingKey);
    if (saved && saved.key !== key)
      throw Error("Resolve the pending till request before starting another.");
    const intent = { payload, key };
    storePosAttempt(pendingKey, intent);
    setPendingMutation(intent);
    setUncertain(true);
    const response = await fetch("/api/admin/pos", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });
    const body = await response.json();
    if (!response.ok) {
      if (isDefinitiveCommandFailure(response.status)) {
        storePosAttempt(pendingKey, null);
        setPendingMutation(null);
        attempt.current = null;
        setUncertain(false);
      }
      throw new Error(body.message || "The command failed.");
    }
    storePosAttempt(pendingKey, null);
    setPendingMutation(null);
    setUncertain(false);
    return body;
  };
  function add(product: Product) {
    if (uncertain || busy || operationPending) return;
    if (product.sellingPriceCents === null) {
      setError(
        "Set an authorised selling price in inventory before selling this product.",
      );
      return;
    }
    setError("");
    setReceipt(null);
    setCart((items) => {
      const current = items.find((item) => item.product.id === product.id);
      const quantity = (current?.quantity || 0) + 1;
      if (quantity > product.available) {
        setError("There is not enough available stock in this branch.");
        return items;
      }
      return current
        ? items.map((item) =>
            item === current ? { ...item, product, quantity } : item,
          )
        : [...items, { product, quantity: 1 }];
    });
    setQuery("");
    scanInput.current?.focus();
  }
  async function scan(event: FormEvent) {
    event.preventDefault();
    if (busy || uncertain || operationPending || !query.trim()) return;
    setBusy(true);
    try {
      const r = await fetch(
        `/api/admin/pos?${new URLSearchParams({ q: query.trim(), locationId: data?.locationId || branch, search: "1" })}`,
        { cache: "no-store" },
      );
      const b = await r.json();
      if (!r.ok) throw Error(b.message);
      const matches = b.products as Product[];
      const exact = matches.filter(
        (product) =>
          product.code.toLowerCase() === query.trim().toLowerCase() ||
          product.barcodes.includes(query.trim()),
      );
      if (exact.length > 1)
        setError(
          "This barcode or code matches several products. Correct the catalogue or choose the intended product.",
        );
      else if (exact.length === 1) add(exact[0]);
      else if (matches.length === 1) add(matches[0]);
      else setError("Choose a product from the search results.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not find this barcode");
    } finally {
      setBusy(false);
    }
  }
  async function openShift(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await command(
        {
          action: "open-shift",
          locationId: data?.locationId,
          openingFloatCents: cents(opening),
        },
        crypto.randomUUID(),
      );
      setClosed(null);
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not open shift.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function checkout() {
    if (
      !data?.shift ||
      busy ||
      operationPending ||
      (!cart.length && !attempt.current)
    )
      return;
    if (!navigator.onLine) {
      setError("Reconnect before checkout.");
      return;
    }
    setBusy(true);
    setError("");
    const payload = {
      action: "checkout",
      locationId: data.locationId,
      shiftId: data.shift.id,
      items: cart.map((item) => ({
        productId: item.product.id,
        quantity: item.quantity,
      })),
      paymentMethod: method,
      tenderedCents: method === "cash" ? cents(tender) : total,
      reference,
      expectedTotalCents: total,
    };
    attempt.current ??= { key: crypto.randomUUID(), payload };
    try {
      const result = await command(
        attempt.current.payload,
        attempt.current.key,
      );
      setReceipt(result);
      setCart([]);
      setTender("");
      setReference("");
      setExternalConfirmed(false);
      attempt.current = null;
      setUncertain(false);
      try {
        await load();
      } catch {
        setError(
          "Sale saved. Refresh product availability before the next sale.",
        );
      }
      scanInput.current?.focus();
    } catch (reason) {
      if (attempt.current) {
        setUncertain(true);
        setError(
          "The checkout outcome is unknown. Retry this same checkout to retrieve its result safely. Do not take payment again.",
        );
      } else
        setError(reason instanceof Error ? reason.message : "Checkout failed.");
    } finally {
      setBusy(false);
    }
  }
  async function closeShift(event: FormEvent) {
    event.preventDefault();
    if (!data?.shift || cart.length || uncertain || operationPending) return;
    setBusy(true);
    setError("");
    try {
      const result = await command(
        {
          action: "close-shift",
          locationId: data.locationId,
          shiftId: data.shift.id,
          countedCashCents: cents(counted),
        },
        crypto.randomUUID(),
      );
      setClosed(result.shift);
      setCounted("");
      await load();
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not close shift.",
      );
    } finally {
      setBusy(false);
    }
  }
  function quantity(id: string, value: number) {
    if (uncertain || busy) return;
    setCart((items) =>
      items.map((item) =>
        item.product.id === id
          ? {
              ...item,
              quantity: Math.min(
                item.product.available,
                Math.max(
                  0.001,
                  Number.isFinite(value)
                    ? Math.round(value * 1000) / 1000
                    : 0.001,
                ),
              ),
            }
          : item,
      ),
    );
  }
  async function refreshCart() {
    if (busy || uncertain || operationPending) return;
    setBusy(true);
    try {
      const r = await fetch(
        `/api/admin/pos?${new URLSearchParams({ locationId: data?.locationId || branch, search: "1", ids: cart.map((i) => i.product.id).join(",") })}`,
        { cache: "no-store", signal: AbortSignal.timeout(12000) },
      );
      const b = await r.json();
      if (!r.ok) throw Error(b.message);
      setCart((items) =>
        items.map((i) => ({
          ...i,
          product: b.products.find((p: Product) => p.id === i.product.id) || {
            ...i.product,
            available: 0,
          },
        })),
      );
      setTender("");
      setExternalConfirmed(false);
      setError(
        "Prices and stock refreshed. Check quantities and confirm the payment total.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not refresh cart");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Register
          </p>
          <h2 className="mt-2 text-3xl font-black">Point of sale</h2>
          <p className="mt-2 text-sm text-slate-600">
            Scan a code, choose the quantity, take payment and print the
            receipt.
          </p>
        </div>
        <label className="text-xs font-bold">
          Branch
          <select
            aria-label="Checkout branch"
            disabled={
              busy ||
              uncertain ||
              operationPending ||
              cart.length > 0 ||
              Boolean(data?.shift)
            }
            className="ml-3 rounded-xl border border-slate-300 bg-white p-3 text-sm"
            value={data?.locationId || branch}
            onChange={(event) => setBranch(event.target.value)}
          >
            {data?.branches.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"
        >
          {error}
        </p>
      )}
      {pendingMutation &&
        (!data?.shift || pendingMutation.payload.action !== "checkout") && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
            <p>
              A till request needs its saved result retrieved. Retry it before
              continuing.
            </p>
            <button
              disabled={busy}
              className="mt-3 rounded-lg bg-slate-950 px-4 py-3 font-bold text-white"
              onClick={async () => {
                setBusy(true);
                try {
                  const result = await command(
                    pendingMutation.payload,
                    pendingMutation.key,
                  );
                  if (result.shift?.closed_at) setClosed(result.shift);
                  if (result.sale) {
                    setReceipt(result);
                    setCart([]);
                    attempt.current = null;
                  }
                  setUncertain(false);
                  setError("");
                  await load();
                } catch (e) {
                  setError(
                    e instanceof Error
                      ? e.message
                      : "Could not retrieve result",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              Retrieve pending till result
            </button>
          </div>
        )}
      {!data && !error && <p className="p-6">Loading register…</p>}
      {closed && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="font-black">Shift closed</h3>
          <p className="mt-2 text-sm">
            Expected cash {money(Number(closed.expected_cash_cents))} · Counted{" "}
            {money(Number(closed.counted_cash_cents))} · Difference{" "}
            {money(Number(closed.discrepancy_cents))}
          </p>
          <p className="mt-2 text-xs">Report saved to the branch records.</p>
          <a
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-block text-sm font-bold underline"
            href={`/api/admin/pos/document?shiftId=${closed.id}`}
          >
            Open day-end cash-up PDF
          </a>
        </section>
      )}
      {data && !data.shift && (
        <form
          onSubmit={openShift}
          className="max-w-lg rounded-2xl border border-slate-200 bg-white p-6"
        >
          <h3 className="text-xl font-black">Open your shift</h3>
          <label className="mt-5 block text-sm font-bold">
            Opening cash float (R)
            <input
              required
              type="number"
              min="0"
              step=".01"
              value={opening}
              onChange={(event) => setOpening(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 p-3"
            />
          </label>
          <button
            disabled={busy || !!pendingMutation}
            className="mt-4 w-full rounded-xl bg-slate-950 p-3 font-bold text-white disabled:opacity-40"
          >
            {busy ? "Opening…" : "Open shift"}
          </button>
        </form>
      )}
      {data?.shift && (
        <>
          <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
            <section className="space-y-4">
              <form
                onSubmit={scan}
                className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white p-3"
              >
                <Barcode size={22} />
                <input
                  ref={scanInput}
                  autoFocus
                  disabled={busy || uncertain}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Scan barcode or search product name / code"
                  aria-label="Scan barcode or search product"
                  className="min-h-10 min-w-0 flex-1 outline-none"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-bold"
                >
                  Add
                </button>
              </form>
              <div className="grid gap-3 sm:grid-cols-2">
                {data.products.map((product) => (
                  <button
                    key={product.id}
                    disabled={
                      busy ||
                      operationPending ||
                      uncertain ||
                      product.available <= 0 ||
                      product.sellingPriceCents === null
                    }
                    onClick={() => add(product)}
                    className="rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-slate-400 disabled:opacity-45"
                  >
                    <p className="font-bold">{product.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {product.code} · {product.available} available
                    </p>
                    <p className="mt-3 font-black">
                      {product.sellingPriceCents === null
                        ? "Selling price required"
                        : money(product.sellingPriceCents)}
                    </p>
                  </button>
                ))}
              </div>
              {!data.products.length && (
                <p className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">
                  No matching products. Imported products need an authorised
                  selling price and branch stock before checkout.
                </p>
              )}
            </section>
            <section className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
              <h3 className="flex items-center gap-2 text-xl font-black">
                <ShoppingCart size={21} />
                Current sale
              </h3>
              <div className="mt-4 divide-y divide-slate-200">
                {cart.map((item) => (
                  <article key={item.product.id} className="py-4">
                    <div className="flex justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold">{item.product.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.product.code} ·{" "}
                          {money(item.product.sellingPriceCents || 0)} each
                        </p>
                      </div>
                      <button
                        aria-label={`Remove ${item.product.name}`}
                        disabled={busy || uncertain}
                        onClick={() =>
                          setCart((items) =>
                            items.filter(
                              (row) => row.product.id !== item.product.id,
                            ),
                          )
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          aria-label="Decrease quantity"
                          disabled={busy || uncertain}
                          onClick={() =>
                            quantity(item.product.id, item.quantity - 1)
                          }
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          aria-label={`Quantity for ${item.product.name}`}
                          disabled={busy || uncertain}
                          type="number"
                          step=".001"
                          min=".001"
                          max={item.product.available}
                          value={item.quantity}
                          onChange={(event) =>
                            quantity(
                              item.product.id,
                              Number(event.target.value),
                            )
                          }
                          className="w-20 rounded-lg border border-slate-300 p-2 text-center"
                        />
                        <button
                          aria-label="Increase quantity"
                          disabled={busy || uncertain}
                          onClick={() =>
                            quantity(item.product.id, item.quantity + 1)
                          }
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                      <strong>
                        {money(
                          Math.round(
                            (item.product.sellingPriceCents || 0) *
                              item.quantity,
                          ),
                        )}
                      </strong>
                    </div>
                  </article>
                ))}
              </div>
              {!cart.length && (
                <p className="py-8 text-sm text-slate-500">
                  Scan or select a product to begin.
                </p>
              )}
              <div className="mt-4 flex justify-between border-t border-slate-200 pt-4 text-xl font-black">
                <span>Total · VAT included</span>
                <span>{money(total)}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                VAT {money(vat)} · Excl. VAT {money(total - vat)}
              </p>
              {!!cart.length && (
                <button
                  disabled={busy || uncertain || operationPending}
                  onClick={() => void refreshCart()}
                  className="mt-3 text-xs font-bold underline"
                >
                  Refresh cart prices & stock
                </button>
              )}
              <fieldset disabled={busy || uncertain} className="mt-5 space-y-3">
                <label className="block text-xs font-bold">
                  Payment method
                  <select
                    value={method}
                    onChange={(event) => {
                      setMethod(event.target.value);
                      setExternalConfirmed(false);
                    }}
                    className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card · external terminal</option>
                    <option value="eft">EFT · externally verified</option>
                  </select>
                </label>
                {method === "cash" ? (
                  <label className="block text-xs font-bold">
                    Cash received (R)
                    <input
                      type="number"
                      min="0"
                      step=".01"
                      value={tender}
                      onChange={(event) => setTender(event.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"
                    />
                    <span className="mt-2 block text-slate-500">
                      Change {money(Math.max(0, cents(tender) - total))}
                    </span>
                  </label>
                ) : (
                  <>
                    <label className="block text-xs font-bold">
                      Payment reference
                      <input
                        value={reference}
                        placeholder="Unique terminal transaction / EFT reference"
                        onChange={(event) => setReference(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 p-3 text-sm"
                      />
                    </label>
                    <label className="flex items-start gap-2 text-xs text-slate-600">
                      <input
                        type="checkbox"
                        checked={externalConfirmed}
                        onChange={(event) =>
                          setExternalConfirmed(event.target.checked)
                        }
                      />
                      I have confirmed this payment outside the app. This
                      records payment and does not charge the card or bank
                      account.
                    </label>
                  </>
                )}
              </fieldset>
              <button
                onClick={() => void checkout()}
                disabled={
                  busy ||
                  operationPending ||
                  (!uncertain &&
                    (!cart.length ||
                      (method === "cash"
                        ? cents(tender) < total || !tender
                        : !reference.trim() || !externalConfirmed)))
                }
                className="mt-5 w-full rounded-xl bg-slate-950 p-4 font-black text-white disabled:opacity-35"
              >
                {busy
                  ? "Saving…"
                  : uncertain
                    ? "Retry same checkout safely"
                    : "Complete sale"}
              </button>
            </section>
          </div>
          <section className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-black">Your shift</h3>
            <p className="mt-2 text-sm text-slate-600">
              {data.shiftTotals.transactions} sales ·{" "}
              {money(data.shiftTotals.netSalesCents)} net sales · Refunds{" "}
              {money(data.shiftTotals.refundsCents)} · Expected cash{" "}
              {money(data.shiftTotals.expectedCashCents || 0)}
            </p>
            <form
              onSubmit={closeShift}
              className="mt-4 flex flex-wrap items-end gap-3"
            >
              <label className="text-xs font-bold">
                Counted cash at close (R)
                <input
                  required
                  type="number"
                  min="0"
                  step=".01"
                  value={counted}
                  onChange={(event) => setCounted(event.target.value)}
                  className="ml-3 rounded-xl border border-slate-300 p-3 text-sm"
                />
              </label>
              <button
                disabled={
                  busy || uncertain || operationPending || cart.length > 0
                }
                className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold disabled:opacity-40"
              >
                Close shift and save day-end
              </button>
            </form>
          </section>
        </>
      )}
      {receipt && (
        <section className="rounded-2xl border border-emerald-200 bg-white p-6">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="font-black text-emerald-800">
              Sale saved · {receipt.sale.receipt_number}
            </p>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white"
            >
              <Printer size={16} />
              Print receipt
            </button>
            <a
              className="text-sm font-bold underline"
              target="_blank"
              rel="noreferrer"
              href={`/api/admin/pos/document?saleId=${receipt.sale.id}`}
            >
              Receipt PDF
            </a>
          </div>
          <div id="pos-receipt" className="mx-auto max-w-sm font-mono text-xs">
            <h3 className="text-center text-lg font-black">TRUECOLOURS</h3>
            <p className="mt-2 text-center">
              {receipt.sale.receipt_number}
              <br />
              {new Date(receipt.sale.created_at).toLocaleString("en-ZA", {
                timeZone: "Africa/Johannesburg",
              })}
              <br />
              {receipt.sale.branch_id}
            </p>
            <div className="my-4 border-y border-dashed border-slate-500 py-3">
              {receipt.items.map((item) => (
                <div key={item.productId} className="mb-3">
                  <p>{item.name}</p>
                  <p className="flex justify-between">
                    <span>
                      {item.quantity} × {money(item.unitPriceCents)}
                    </span>
                    <span>{money(item.totalCents)}</span>
                  </p>
                </div>
              ))}
            </div>
            <p className="flex justify-between font-bold">
              <span>Total</span>
              <span>{money(Number(receipt.sale.total_cents))}</span>
            </p>
            <p className="mt-2 flex justify-between">
              <span>VAT included</span>
              <span>{money(Number(receipt.sale.vat_cents))}</span>
            </p>
            <p className="mt-2 capitalize">
              {receipt.sale.payment_method} · Received{" "}
              {money(Number(receipt.sale.tendered_cents))}
            </p>
            <p className="mt-2">
              Change {money(Number(receipt.sale.change_cents))}
            </p>
            <p className="mt-5 text-center">
              Thank you for shopping with TRUECOLOURS.
            </p>
          </div>
        </section>
      )}
      {data && (
        <PosOperations
          key={data.locationId}
          branch={data.locationId}
          shift={data.shift}
          onChange={load}
          onPendingChange={setOperationPending}
          disabled={busy || uncertain || cart.length > 0}
        />
      )}
      <style>{`@media print { body * { visibility:hidden !important; } #pos-receipt,#pos-receipt * { visibility:visible !important; } #pos-receipt { position:absolute;top:0;left:0;width:72mm;max-width:72mm;margin:0;padding:3mm; } @page { margin:0; } }`}</style>
    </div>
  );
}
