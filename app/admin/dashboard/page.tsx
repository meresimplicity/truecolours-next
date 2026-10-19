"use client";
import Link from "next/link";
import { useAdminWorkspace } from "@/lib/use-admin-workspace";
import { useSession } from "@/components/auth/StaffSessionProvider";
import {
  hasPermission,
  normalizeBusinessRole,
} from "@/lib/business/permissions";
const money = (value: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(
    value,
  );
export default function AdminDashboardPage() {
  const { workspace, loading, error, refresh } = useAdminWorkspace();
  const { data } = useSession();
  const role = normalizeBusinessRole(data?.user.role);
  const totals = workspace?.totals as
    | (NonNullable<typeof workspace>["totals"] & {
        todaySales?: number;
        todayTransactions?: number;
        awaitingOrders?: number;
        unpaidInvoices?: number;
      })
    | undefined;
  const cards = [
    ...(hasPermission(role, "reports.read")
      ? [
          {
            label: "Today's sales",
            value: money(totals?.todaySales || 0),
            href: "/admin/analytics",
          },
          {
            label: "Today's transactions",
            value: totals?.todayTransactions || 0,
            href: "/admin/analytics",
          },
        ]
      : []),
    ...(hasPermission(role, "sales.read")
      ? [
          {
            label: "Orders awaiting action",
            value: totals?.awaitingOrders || 0,
            href: "/admin/orders",
          },
        ]
      : []),
    ...(hasPermission(role, "documents.read")
      ? [
          {
            label: "Unpaid invoices",
            value: totals?.unpaidInvoices || 0,
            href: "/admin/invoices",
          },
          {
            label: "Outstanding invoices",
            value: money(totals?.outstanding || 0),
            href: "/admin/invoices",
          },
        ]
      : []),
    ...(hasPermission(role, "inventory.read")
      ? [
          {
            label: "Stock needing attention",
            value: (totals?.lowStock || 0) + (totals?.outOfStock || 0),
            href: "/admin/inventory",
          },
        ]
      : []),
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Daily operations
          </p>
          <h2 className="mt-2 text-3xl font-black">
            What needs your attention
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Today&apos;s activity uses South African time. Select a task to
            continue.
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold"
        >
          Refresh
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-slate-400"
          >
            <p className="text-sm font-bold text-slate-500">{card.label}</p>
            <p className="mt-4 text-3xl font-black">
              {loading ? "—" : error ? "Unavailable" : card.value}
            </p>
            <p className="mt-4 text-xs font-bold">View details →</p>
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {hasPermission(role, "pos.use") && (
          <Link
            className="rounded-xl bg-slate-950 px-6 py-3 font-bold text-white"
            href="/admin/pos"
          >
            Open checkout
          </Link>
        )}
        {hasPermission(role, "documents.manage") && (
          <Link
            className="rounded-xl border border-slate-300 bg-white px-6 py-3 font-bold"
            href="/admin/invoices/new"
          >
            Create invoice
          </Link>
        )}
      </div>
    </div>
  );
}
