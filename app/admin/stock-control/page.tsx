"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus2, FileDown, RefreshCw, ScanLine } from "lucide-react";
import { businessDate, posMoney as money } from "@/lib/pos-types";
import {
  type InventoryMonth,
  type MatchProduct,
  type ProductAlias,
  type SlipDocument,
  type SlipKind,
} from "@/lib/slips/types";
import { parseSlip } from "@/lib/slips/parse";
import { slipCommand } from "@/lib/slips/api";
import { useSession } from "@/components/auth/StaffSessionProvider";
import { hasPermission } from "@/lib/business/permissions";
type Data = {
  locationId: string;
  branches: Array<{ id: string; name: string }>;
  products: MatchProduct[];
  aliases: ProductAlias[];
  documents: SlipDocument[];
  hasMore: boolean;
};
export default function StockControlPage() {
  const router = useRouter(),
    { data: session } = useSession();
  const [branch, setBranch] = useState(() =>
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("locationId") || ""
        : "",
    ),
    [month, setMonth] = useState(() => businessDate().slice(0, 7)),
    [data, setData] = useState<Data | null>(null),
    [report, setReport] = useState<InventoryMonth | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [search, setSearch] = useState(""),
    [budget, setBudget] = useState(""),
    [archived, setArchived] = useState(false),
    [page, setPage] = useState(0),
    [docSearch, setDocSearch] = useState(""),
    [docQuery, setDocQuery] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDocQuery(docSearch), 300);
    return () => clearTimeout(timer);
  }, [docSearch]);
  const canBuy =
      !!session && hasPermission(session.user.role, "purchasing.manage"),
    canSell =
      !!session &&
      hasPermission(session.user.role, "sales.manage") &&
      hasPermission(session.user.role, "inventory.adjust"),
    canExport = !!session && hasPermission(session.user.role, "reports.export");
  const load = useCallback(
    async (signal?: AbortSignal) => {
      const params = new URLSearchParams({
        ...(branch ? { locationId: branch } : {}),
        ...(archived ? { archived: "1" } : {}),
        month: month + "-01",
        page: String(page),
        q: docQuery,
      });
      const requestSignal = signal
        ? AbortSignal.any([signal, AbortSignal.timeout(30000)])
        : AbortSignal.timeout(30000);
      const responses = await Promise.all([
        fetch(`/api/admin/inventory/slips?${params}`, {
          cache: "no-store",
          signal: requestSignal,
        }),
        fetch(`/api/admin/inventory/month?${params}`, {
          cache: "no-store",
          signal: requestSignal,
        }),
      ]);
      const values = await Promise.all(responses.map((r) => r.json()));
      for (let i = 0; i < responses.length; i++)
        if (!responses[i].ok) throw Error(values[i].message);
      setData(values[0]);
      setReport(values[1]);
      setError("");
      setLoading(false);
    },
    [branch, month, archived, page, docQuery],
  );
  useEffect(() => {
    const c = new AbortController();
    void Promise.resolve()
      .then(() => load(c.signal))
      .catch((e) => {
        if (!c.signal.aborted) {
          setError(e.message);
          setLoading(false);
          setReport(null);
        }
      });
    return () => c.abort();
  }, [load]);
  async function create(kind: SlipKind) {
    if (!data) return;
    setBusy(true);
    setError("");
    try {
      const id = crypto.randomUUID();
      await slipCommand("save", {
        id,
        kind,
        locationId: data.locationId,
        expectedVersion: 0,
        data: parseSlip("", data.products, data.aliases),
      });
      router.push(`/admin/stock-control/${id}?locationId=${data.locationId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create draft");
    } finally {
      setBusy(false);
    }
  }
  const rows = (report?.products || []).filter((p) =>
    `${p.name} ${p.code}`.toLowerCase().includes(search.toLowerCase()),
  );
  const reorder = (report?.products || []).filter((p) => p.suggested_order > 0),
    projected = reorder.reduce(
      (n, p) => n + (p.last_purchase_unit_cents || 0) * p.suggested_order,
      0,
    ),
    missingCosts = reorder.filter(
      (p) => p.last_purchase_unit_cents === null,
    ).length;
  return (
    <div className="mx-auto max-w-[1600px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Stock, slips & spending
          </p>
          <h2 className="mt-2 text-3xl font-black">Stock control book</h2>
          <p className="mt-2 text-sm text-slate-600">
            Track supplier receipts, physical sales and your monthly stock
            position.
          </p>
        </div>
        <Link
          href="/admin/inventory"
          className="rounded-xl border px-4 py-3 text-sm font-bold"
        >
          Edit inventory
        </Link>
      </div>
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-bold">
            Month
            <input
              type="month"
              max={businessDate().slice(0, 7)}
              value={month}
              onChange={(e) => {
                setLoading(true);
                setMonth(e.target.value);
                setPage(0);
              }}
              className="mt-2 block rounded-lg border p-3"
            />
          </label>
          <label className="text-xs font-bold">
            Branch
            <select
              value={branch || data?.locationId || ""}
              onChange={(e) => {
                setLoading(true);
                setBranch(e.target.value);
                setPage(0);
              }}
              className="mt-2 block rounded-lg border p-3"
            >
              {data?.branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <button
            aria-label="Refresh stock book"
            onClick={() => {
              setLoading(true);
              void load().catch((e) => {
                setError(e.message);
                setLoading(false);
              });
            }}
            className="rounded-xl border p-3"
          >
            <RefreshCw size={19} />
          </button>
          {canExport && (
            <a
              target="_blank"
              rel="noreferrer"
              href={`/api/admin/inventory/month?${new URLSearchParams({ locationId: data?.locationId || branch, month: month + "-01", format: "pdf" })}`}
              className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold"
            >
              <FileDown size={18} />
              Monthly stock PDF
            </a>
          )}
          {canBuy && (
            <button
              disabled={busy || !data}
              onClick={() => void create("purchase")}
              className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
            >
              <FilePlus2 size={18} />
              Supplier purchase slip
            </button>
          )}
          {canSell && (
            <button
              disabled={busy || !data}
              onClick={() => void create("physical_sale")}
              className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-bold disabled:opacity-40"
            >
              <ScanLine size={18} />
              Physical sales slip
            </button>
          )}
        </div>
        <p className="mt-4 text-xs leading-5 text-slate-500">
          Read a JPG, PNG, WebP or PDF on this device. Confirm the extracted
          details before posting. Scans are never stored in Supabase; the text,
          matches and accounting records are saved.
        </p>
      </section>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {loading && (
        <p role="status" className="text-sm text-slate-500">
          Updating the stock book…
        </p>
      )}
      {report && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Supplier purchases", report.purchasesCents],
              ["Money spent this month", report.spentCents],
              ["Current supplier balance", report.supplierBalanceCents],
              ["Physical sales from slips", report.physicalSalesCents],
            ].map(([label, value]) => (
              <article
                key={String(label)}
                className="rounded-xl border bg-white p-5"
              >
                <p className="text-xs font-bold text-slate-500">{label}</p>
                <p className="mt-3 text-2xl font-black">
                  {value === null ? "—" : money(Number(value))}
                </p>
              </article>
            ))}
          </div>
          {report.financeVisible && (
            <section
              className={`rounded-2xl border p-5 ${report.budgetCents !== null && Number(report.spentCents) > report.budgetCents ? "border-amber-300 bg-amber-50" : "bg-white"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="font-black">Monthly purchase budget</h3>
                  <p className="mt-2 text-sm">
                    {report.budgetCents === null
                      ? "No budget set."
                      : `${money(report.spentCents || 0)} spent of ${money(report.budgetCents)} · ${money(report.budgetCents - (report.spentCents || 0))} remaining`}
                  </p>
                  {report.budgetCents !== null &&
                    Number(report.spentCents) > report.budgetCents && (
                      <p className="mt-2 text-sm font-bold text-amber-800">
                        Spending is over budget. Review the supplier payments
                        before placing another order.
                      </p>
                    )}
                </div>
                {canBuy && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setBusy(true);
                      try {
                        await slipCommand("budget", {
                          locationId: data?.locationId,
                          month: month + "-01",
                          amountCents: Math.round(Number(budget) * 100),
                        });
                        setBudget("");
                        await load();
                      } catch (e) {
                        setError(
                          e instanceof Error
                            ? e.message
                            : "Could not save budget",
                        );
                      } finally {
                        setBusy(false);
                      }
                    }}
                    className="flex items-end gap-2"
                  >
                    <label className="text-xs font-bold">
                      Budget (R)
                      <input
                        required
                        type="number"
                        min="0"
                        step=".01"
                        value={budget}
                        onChange={(e) => setBudget(e.target.value)}
                        className="mt-2 block w-36 rounded-lg border p-3"
                      />
                    </label>
                    <button
                      disabled={busy}
                      className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-bold text-white"
                    >
                      Save budget
                    </button>
                  </form>
                )}
              </div>
            </section>
          )}
          <section className="rounded-2xl border bg-white p-5">
            <h3 className="text-lg font-black">Reorder suggestions</h3>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Based on 30 days of recorded stock sales, a 14-day supply target,
              the minimum stock level and incoming stock. These are suggestions;
              no supplier order is placed.
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              <strong>{reorder.length} products need review</strong>
              {report.financeVisible && (
                <span>
                  {missingCosts === reorder.length && reorder.length > 0
                    ? "Purchase estimate unavailable until costs are confirmed"
                    : `${missingCosts ? "Known-cost subtotal" : "Estimated purchase value"} ${money(projected)}`}
                  {missingCosts > 0
                    ? ` · ${missingCosts} products have no confirmed purchase cost`
                    : ""}
                </span>
              )}
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {reorder.slice(0, 9).map((p) => (
                <div key={p.id} className="rounded-lg bg-slate-50 p-3 text-sm">
                  <p className="font-bold">{p.name}</p>
                  <p className="mt-1 text-xs">
                    Available {p.available} · Incoming {p.incoming} · Suggested{" "}
                    {p.suggested_order}
                  </p>
                </div>
              ))}
            </div>
          </section>
          <section className="rounded-2xl border bg-white p-5">
            <div className="flex flex-wrap justify-between gap-3">
              <div>
                <h3 className="text-lg font-black">
                  Monthly stock reconciliation
                </h3>
                <p className="mt-2 text-xs text-slate-500">
                  Opening + received + returns − POS sold − applied slip sales +
                  other movements = closing.
                </p>
              </div>
              <input
                aria-label="Search stock book"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search product / code…"
                className="rounded-lg border px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4 max-h-[600px] overflow-auto">
              <table className="w-full whitespace-nowrap text-left text-xs">
                <thead className="sticky top-0 bg-slate-100">
                  <tr>
                    {[
                      "Product",
                      "Opening",
                      "Received",
                      "POS sold",
                      "Slip sales applied",
                      "All documented slip units",
                      "Returns",
                      "Other",
                      "Closing",
                      "Available now",
                    ].map((h) => (
                      <th key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="max-w-64 whitespace-normal p-3">
                        <p className="font-bold">{p.name}</p>
                        <p className="mt-1 text-slate-500">{p.code}</p>
                      </td>
                      {[
                        p.opening,
                        p.received,
                        p.pos_sold,
                        p.slip_applied_sold,
                        p.documented_slip_sold,
                        p.returned,
                        p.other,
                        p.closing,
                        p.available,
                      ].map((n, i) => (
                        <td
                          key={i}
                          className={`p-3 ${n < 0 ? "font-bold text-amber-800" : ""}`}
                        >
                          {Number(n).toLocaleString("en-ZA", {
                            maximumFractionDigits: 3,
                          })}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Balances are reconstructed from recorded movements. Compare them
              with a physical count. “Stock already counted” slips record money
              and documented quantities without moving stock again. Verified POS
              slips do not add another sale.
            </p>
          </section>
        </>
      )}
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex justify-between gap-3">
          <h3 className="text-lg font-black">Saved slips & drafts</h3>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => {
                setArchived(e.target.checked);
                setPage(0);
              }}
            />
            Show discarded & cancelled
          </label>
        </div>
        <input
          aria-label="Find saved slip"
          value={docSearch}
          onChange={(e) => {
            setDocSearch(e.target.value);
            setPage(0);
          }}
          placeholder="Find supplier or slip reference…"
          className="mt-4 w-full rounded-lg border px-3 py-2 text-sm"
        />
        <div className="mt-4 divide-y">
          {data?.documents.map((d) => (
            <Link
              key={d.id}
              href={`/admin/stock-control/${d.id}?locationId=${data.locationId}`}
              className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm"
            >
              <div>
                <p className="font-bold">
                  {d.counterparty || "New draft"} ·{" "}
                  {d.reference || "No reference yet"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {d.kind === "purchase"
                    ? "Supplier purchase"
                    : "Physical sale"}{" "}
                  · {d.document_date || "Draft date pending"}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase">
                {d.status}
              </span>
              <strong>
                {d.total_cents === null ? "Review draft" : money(d.total_cents)}
              </strong>
            </Link>
          ))}
          {!data?.documents.length && (
            <p className="py-6 text-sm text-slate-500">
              No saved slips yet. Start with a supplier or physical sales slip.
            </p>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-xs">
          <button
            disabled={page === 0}
            onClick={() => setPage((n) => Math.max(0, n - 1))}
            className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40"
          >
            Previous
          </button>
          <span>Page {page + 1}</span>
          <button
            disabled={!data?.hasMore}
            onClick={() => setPage((n) => n + 1)}
            className="rounded-lg border px-3 py-2 font-bold disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </section>
    </div>
  );
}
