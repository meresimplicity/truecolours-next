"use client";
import { WorkspacePagination } from "@/components/admin/WorkspacePagination";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  ChevronRight,
  CircleDollarSign,
  FilePlus2,
  FileText,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useAdminWorkspace } from "@/lib/use-admin-workspace";
import type { InvoiceStatus, LiveInvoice } from "@/lib/admin-live-types";
import { InvoiceStatus as Status } from "@/components/admin/invoices/InvoiceStatus";

const filters: Array<{ value: "all" | InvoiceStatus; label: string }> = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "viewed", label: "Viewed" },
  { value: "partially_paid", label: "Part paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
  { value: "cancelled", label: "Cancelled" },
];

export default function InvoicesPage() {
  const { workspace, loading, error, page, hasMore, setPage } =
    useAdminWorkspace();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | InvoiceStatus>("all");
  const [sortNewest, setSortNewest] = useState(true);
  const invoices = useMemo(
    () =>
      (workspace?.invoices || [])
        .filter((invoice) => invoice.status !== "deleted")
        .filter((invoice) => status === "all" || invoice.status === status)
        .filter(
          (invoice) =>
            !query.trim() ||
            [
              invoice.invoiceNumber,
              invoice.customerName,
              invoice.customerEmail,
              invoice.status,
            ]
              .join(" ")
              .toLowerCase()
              .includes(query.trim().toLowerCase()),
        )
        .sort(
          (a, b) =>
            (sortNewest ? -1 : 1) *
            dateValue(a.issuedAt || a.createdAt, b.issuedAt || b.createdAt),
        ),
    [query, sortNewest, status, workspace],
  );
  const summary = useMemo(
    () => ({
      billed: invoices.reduce((sum, item) => sum + item.total, 0),
      paid: invoices.reduce((sum, item) => sum + (item.amountPaid || 0), 0),
      due: invoices.reduce(
        (sum, item) => sum + (item.balanceDue ?? item.total),
        0,
      ),
    }),
    [invoices],
  );
  return (
    <div className="mx-auto max-w-[1500px] space-y-5 sm:space-y-6">
      <WorkspacePagination page={page} hasMore={hasMore} onChange={setPage} />
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">
            Sales documents
          </p>
          <h2 className="mt-2 text-[1.75rem] font-black leading-tight text-slate-950 sm:text-3xl lg:text-4xl">
            Invoices
          </h2>
          <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-600">
            Create, deliver and reconcile invoices from one live Supabase
            workspace.
          </p>
        </div>
        <Link
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white shadow-sm transition hover:bg-black active:scale-[.98]"
          href="/admin/invoices/new"
        >
          <FilePlus2 size={18} />
          New invoice
        </Link>
      </header>
      {error ? (
        <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          <AlertTriangle className="shrink-0" size={18} />
          {error}
        </div>
      ) : null}
      <section className="grid grid-cols-3 gap-2.5 sm:gap-4">
        <Summary
          label="Billed"
          value={summary.billed}
          icon={<FileText size={17} />}
        />
        <Summary
          label="Paid"
          value={summary.paid}
          icon={<CircleDollarSign size={17} />}
        />
        <Summary
          label="Outstanding"
          value={summary.due}
          icon={<CircleDollarSign size={17} />}
        />
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-3 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <Search
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                size={18}
              />
              <input
                aria-label="Search invoices"
                className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm font-semibold outline-none focus:border-slate-500 focus:bg-white"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search invoice or customer"
                value={query}
              />
            </label>
            <div
              className="flex min-w-0 gap-2 overflow-x-auto pb-1 lg:pb-0"
              aria-label="Invoice status filters"
            >
              {filters.map((filter) => (
                <button
                  className={`min-h-11 shrink-0 rounded-full px-4 text-xs font-black transition ${status === filter.value ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  key={filter.value}
                  onClick={() => setStatus(filter.value)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <button
              aria-label="Reverse invoice sorting"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 text-xs font-black text-slate-600 hover:bg-slate-50"
              onClick={() => setSortNewest((value) => !value)}
            >
              <ArrowDownUp size={16} />
              {sortNewest ? "Newest" : "Oldest"}
            </button>
          </div>
        </div>
        <div className="hidden grid-cols-[1fr_1.25fr_.65fr_.8fr_.7fr_2rem] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-500 md:grid">
          <span>Invoice</span>
          <span>Customer</span>
          <span>Status</span>
          <span>Total</span>
          <span>Balance</span>
          <span />
        </div>
        <div className="divide-y divide-slate-200">
          {loading && !workspace
            ? Array.from({ length: 6 }, (_, index) => (
                <div className="h-20 animate-pulse bg-slate-50" key={index} />
              ))
            : invoices.map((invoice) => (
                <InvoiceRow invoice={invoice} key={invoice.id} />
              ))}
        </div>
        {!loading && invoices.length === 0 ? (
          <div className="grid min-h-64 place-items-center p-8 text-center">
            <div>
              <span className="mx-auto grid size-12 place-items-center rounded-full bg-slate-100 text-slate-500">
                <SlidersHorizontal size={21} />
              </span>
              <p className="mt-4 font-black text-slate-950">
                No matching invoices
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-500">
                Change the filter or create a new invoice.
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: LiveInvoice }) {
  return (
    <Link
      className="group grid min-h-[5.25rem] gap-3 p-4 transition hover:bg-slate-50 md:grid-cols-[1fr_1.25fr_.65fr_.8fr_.7fr_2rem] md:items-center md:px-5"
      href={`/admin/invoices/${invoice.id}`}
    >
      <span>
        <span className="block text-sm font-black text-slate-950">
          {invoice.invoiceNumber}
        </span>
        <span className="mt-1 block text-xs font-semibold text-slate-500">
          {formatDate(invoice.issuedAt || invoice.createdAt)}
        </span>
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-bold text-slate-800">
          {invoice.customerName}
        </span>
        <span className="block truncate text-xs font-semibold text-slate-500">
          {invoice.customerCompany ||
            invoice.customerEmail ||
            "Walk-in customer"}
        </span>
      </span>
      <Status value={invoice.status} />
      <span className="flex justify-between text-sm font-black text-slate-950 md:block">
        <span className="text-xs font-semibold text-slate-500 md:hidden">
          Total
        </span>
        {money(invoice.total)}
      </span>
      <span className="flex justify-between text-sm font-black text-slate-950 md:block">
        <span className="text-xs font-semibold text-slate-500 md:hidden">
          Balance
        </span>
        {money(invoice.balanceDue ?? invoice.total)}
      </span>
      <ChevronRight
        className="hidden text-slate-400 transition group-hover:translate-x-0.5 md:block"
        size={18}
      />
    </Link>
  );
}
function Summary({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 sm:p-5">
      <span className="hidden size-8 place-items-center rounded-lg bg-slate-100 text-slate-700 sm:grid">
        {icon}
      </span>
      <p className="truncate text-base font-black text-slate-950 sm:mt-4 sm:text-2xl">
        {money(value)}
      </p>
      <p className="mt-1 truncate text-[10px] font-black uppercase tracking-wider text-slate-500 sm:text-xs">
        {label}
      </p>
    </article>
  );
}
function money(value: unknown) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(Number(value) || 0);
}
function formatDate(value: unknown) {
  if (!value) return "No date";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "No date"
    : date.toLocaleDateString("en-ZA", { dateStyle: "medium" });
}
function dateValue(a: unknown, b: unknown) {
  return (
    new Date(String(a || 0)).getTime() - new Date(String(b || 0)).getTime()
  );
}
