"use client";
import { useEffect, useState } from "react";
import { FileDown, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSession } from "@/components/auth/StaffSessionProvider";
import { hasPermission } from "@/lib/business/permissions";
import {
  type AccountingBook,
  businessDate,
  posMoney as money,
  accountingTotals,
} from "@/lib/pos-types";
type Book = AccountingBook & { branches: Array<{ id: string; name: string }> };
export default function AccountsPage() {
  const { data: session } = useSession();
  const canExport =
    !!session && hasPermission(session.user.role, "reports.export");
  const [from, setFrom] = useState(businessDate),
    [to, setTo] = useState(businessDate),
    [branch, setBranch] = useState(() =>
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("locationId") || ""
        : "",
    ),
    [book, setBook] = useState<Book | null>(null),
    [error, setError] = useState(""),
    [refresh, setRefresh] = useState(0),
    [loading, setLoading] = useState(true);
  const params = new URLSearchParams({
    from,
    to,
    ...(branch ? { locationId: branch } : {}),
  });
  useEffect(() => {
    const c = new AbortController();
    fetch(
      `/api/admin/accounts?${new URLSearchParams({ from, to, ...(branch ? { locationId: branch } : {}) })}`,
      { signal: c.signal, cache: "no-store" },
    )
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw Error(b.message);
        setBook(b);
        setError("");
      })
      .catch((e) => {
        if (!c.signal.aborted) {
          setError(e.message);
          setBook(null);
        }
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [from, to, branch, refresh]);
  const t = book ? accountingTotals(book) : undefined;
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Books & reconciliation
          </p>
          <h2 className="mt-2 text-3xl font-black">Accounts & day-end</h2>
          <p className="mt-2 text-sm text-slate-600">
            Sales, returns, VAT and till cash, calculated from saved
            transactions.
          </p>
        </div>
        <Link
          href="/admin/pos"
          className="rounded-xl border px-4 py-3 text-sm font-bold"
        >
          Open point of sale
        </Link>
      </div>
      <section className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-5">
        <label className="text-xs font-bold">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setLoading(true);
              setFrom(e.target.value);
            }}
            className="mt-2 block rounded-lg border p-3"
          />
        </label>
        <label className="text-xs font-bold">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setLoading(true);
              setTo(e.target.value);
            }}
            className="mt-2 block rounded-lg border p-3"
          />
        </label>
        <label className="text-xs font-bold">
          Branch
          <select
            value={branch || book?.locationId || ""}
            onChange={(e) => {
              setLoading(true);
              setBranch(e.target.value);
            }}
            className="mt-2 block rounded-lg border p-3"
          >
            {book?.branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </label>
        <button
          aria-label="Refresh accounts"
          onClick={() => {
            setLoading(true);
            setRefresh((n) => n + 1);
          }}
          className="rounded-xl border p-3"
        >
          <RefreshCw size={20} />
        </button>
        {canExport && (
          <a
            target="_blank"
            rel="noreferrer"
            href={`/api/admin/accounts?${params}&format=pdf`}
            aria-disabled={loading || !!error}
            className={`flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white ${loading || error ? "pointer-events-none opacity-40" : ""}`}
          >
            <FileDown size={18} />
            Sales book PDF
          </a>
        )}
      </section>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}
        </p>
      )}
      {loading && (
        <p className="text-sm text-slate-500" role="status">
          Updating accounts…
        </p>
      )}
      {book && (
        <div className={loading ? "space-y-6 opacity-50" : "space-y-6"}>
          {book.slipBook && (
            <section className="rounded-2xl border bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-black">
                  Connected supplier & physical-sales slips
                </h3>
                <Link
                  href={`/admin/stock-control?locationId=${book.locationId}`}
                  className="text-sm font-bold underline"
                >
                  Open stock & slip book
                </Link>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  ["Supplier purchases", book.slipBook.purchasesCents],
                  ["Supplier payments", book.slipBook.supplierPaymentsCents],
                  ["External physical sales", book.slipBook.salesCents],
                  ["External receipts", book.slipBook.externalReceiptsCents],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-xl bg-slate-50 p-4"
                  >
                    <p className="text-xs font-bold text-slate-500">{label}</p>
                    <p className="mt-2 text-xl font-black">
                      {money(Number(value))}
                    </p>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs leading-5 text-slate-500">
                External physical sales are included in the sales totals below.
                Their payments and supplier spending are kept outside the POS
                till. Cancelled records and verified POS attachments are
                excluded to prevent duplicate totals.
              </p>
            </section>
          )}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ["Net sales incl. VAT", t?.netSalesCents],
              ["Sales excl. VAT", t?.netExVatCents],
              ["Net output VAT", t?.netVatCents],
              ["Refunds", t?.refundsCents],
              ["POS cash receipts, net", t?.cashCents],
              ["POS card receipts, net", t?.cardCents],
              ["POS EFT receipts, net", t?.eftCents],
              ["Current invoice balances", book.outstandingCents],
            ].map(([label, value]) => (
              <article
                key={String(label)}
                className="rounded-xl border bg-white p-5"
              >
                <p className="text-xs font-bold text-slate-500">{label}</p>
                <p className="mt-3 text-2xl font-black">
                  {money(Number(value))}
                </p>
              </article>
            ))}
          </div>
          <p className="text-sm text-slate-600">
            {t?.transactions} sales · {t?.refundCount} returns · Cash paid in{" "}
            {money(t?.cashInCents || 0)} · Cash paid out{" "}
            {money(t?.cashOutCents || 0)}. Floats and cash transfers are
            excluded from sales.
          </p>
          <section className="rounded-2xl border bg-white p-5">
            <h3 className="text-lg font-black">Day-end cash-up register</h3>
            <p className="mt-2 text-xs text-slate-500">
              Each closed shift keeps its original counted cash and totals. Open
              shifts are provisional.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full whitespace-nowrap text-left text-sm">
                <thead>
                  <tr>
                    {[
                      "Opened",
                      "Status",
                      "Expected",
                      "Counted",
                      "Difference",
                      "Document",
                    ].map((h) => (
                      <th key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {book.shifts.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-3">
                        {new Date(s.opened_at).toLocaleString("en-ZA", {
                          timeZone: "Africa/Johannesburg",
                        })}
                      </td>
                      <td>{s.closed_at ? "Closed" : "Open"}</td>
                      <td>
                        {money(
                          s.expected_cash_cents ??
                            s.totals?.expectedCashCents ??
                            0,
                        )}
                      </td>
                      <td>
                        {s.closed_at
                          ? money(s.counted_cash_cents || 0)
                          : "Not counted"}
                      </td>
                      <td
                        className={
                          s.discrepancy_cents ? "font-bold text-amber-700" : ""
                        }
                      >
                        {s.closed_at ? money(s.discrepancy_cents || 0) : "—"}
                      </td>
                      <td>
                        <a
                          target="_blank"
                          rel="noreferrer"
                          className="font-bold underline"
                          href={`/api/admin/pos/document?shiftId=${s.id}`}
                        >
                          Cash-up PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!book.shifts.length && (
                <p className="p-6 text-sm text-slate-500">
                  No shifts in this period.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-2xl border bg-white p-5">
            <h3 className="text-lg font-black">Sales book</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    {[
                      "Receipt",
                      "Method",
                      "Sales excl. VAT",
                      "VAT",
                      "Total",
                      "Document",
                    ].map((h) => (
                      <th key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {book.sales.map((s) => (
                    <tr key={s.id} className="border-t">
                      <td className="p-3 font-bold">{s.receipt_number}</td>
                      <td className="uppercase">{s.payment_method}</td>
                      <td>{money(s.total_cents - s.vat_cents)}</td>
                      <td>{money(s.vat_cents)}</td>
                      <td>{money(s.total_cents)}</td>
                      <td>
                        <a
                          className="font-bold underline"
                          target="_blank"
                          rel="noreferrer"
                          href={`/api/admin/pos/document?saleId=${s.id}`}
                        >
                          Receipt PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!book.sales.length && (
                <p className="p-6 text-sm text-slate-500">
                  No recorded sales in this period.
                </p>
              )}
            </div>
          </section>
          <section className="rounded-2xl border bg-white p-5">
            <h3 className="font-black">Returns & credit notes</h3>
            {book.returns.map((r) => (
              <div
                key={r.id}
                className="mt-3 flex flex-wrap justify-between gap-3 border-t pt-3 text-sm"
              >
                <span>
                  {r.return_number} · {r.reason}
                </span>
                <strong>{money(r.total_cents)}</strong>
                <a
                  target="_blank"
                  rel="noreferrer"
                  href={`/api/admin/pos/document?returnId=${r.id}`}
                  className="font-bold underline"
                >
                  Credit note PDF
                </a>
              </div>
            ))}
            {!book.returns.length && (
              <p className="mt-3 text-sm text-slate-500">
                No returns in this period.
              </p>
            )}
          </section>
          <p className="text-xs leading-6 text-slate-500">
            The sales book PDF includes payment reconciliation, a POS journal
            control, stock movements and invoice collections. Invoice
            collections are separate from POS revenue and till cash. Purchases,
            cost of goods, payroll and bank fees need their own accounting
            records.
          </p>
        </div>
      )}
    </div>
  );
}
