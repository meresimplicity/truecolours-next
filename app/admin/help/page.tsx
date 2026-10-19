"use client";

import Link from "next/link";
import {
  Boxes,
  CircleHelp,
  FileText,
  RefreshCw,
  ShieldCheck,
  ShoppingCart,
  UsersRound,
} from "lucide-react";
import { useAdminWorkspace } from "@/lib/use-admin-workspace";

const guides = [
  {
    href: "/admin/customers",
    icon: UsersRound,
    title: "Customer profiles",
    text: "Open a customer to review their real account, current cart, orders and activity.",
  },
  {
    href: "/admin/inventory",
    icon: Boxes,
    title: "Inventory controls",
    text: "Adjust available stock, visibility and minimum levels; every save creates a movement record.",
  },
  {
    href: "/admin/orders",
    icon: ShoppingCart,
    title: "Orders and fulfilment",
    text: "Review actual website orders and update the status shown to customers.",
  },
  {
    href: "/admin/invoices",
    icon: FileText,
    title: "Invoices",
    text: "Create an invoice from an order or for a walk-in customer, then track payment status.",
  },
];

export default function HelpPage() {
  const { workspace, loading, error, refresh, offlineSnapshot } =
    useAdminWorkspace();
  return (
    <div className="mx-auto max-w-[1200px] space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">
            Support
          </p>
          <h2 className="mt-2 text-[1.75rem] font-black leading-tight text-slate-950 sm:text-3xl lg:text-4xl">
            Admin help
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            A practical guide to the live TRUECOLOURS administration workspace.
          </p>
        </div>
        <button
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white hover:bg-black sm:w-auto"
          onClick={() => void refresh()}
          type="button"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} size={17} />
          Refresh connection
        </button>
      </div>
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}
      <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:p-6">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-full ${workspace?.configured && !offlineSnapshot ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
        >
          {workspace?.configured && !offlineSnapshot ? (
            <ShieldCheck size={22} />
          ) : (
            <CircleHelp size={22} />
          )}
        </span>
        <div>
          <h3 className="font-black text-slate-950">
            {loading && !workspace
              ? "Checking Supabase connection…"
              : offlineSnapshot
                ? "Working from this device's offline snapshot"
                : workspace?.configured
                  ? "Supabase workspace connected"
                  : "Supabase connection needs attention"}
          </h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600">
            {offlineSnapshot
              ? workspace?.message
              : workspace?.configured
                ? "Admin pages are using real Supabase Auth and Postgres data. Changes refresh automatically across the workspace."
                : workspace?.message ||
                  "Live data is unavailable. Check the server environment and project URL and publishable key."}
          </p>
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-2">
        {guides.map(({ href, icon: Icon, title, text }) => (
          <Link
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60 sm:p-6"
            href={href}
            key={href}
          >
            <span className="grid size-10 place-items-center rounded-xl bg-slate-950 text-white">
              <Icon size={19} />
            </span>
            <h3 className="mt-4 font-black text-slate-950">{title}</h3>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
              {text}
            </p>
            <span className="mt-4 inline-flex text-xs font-black text-slate-950">
              Open section →
            </span>
          </Link>
        ))}
      </div>
      <section className="border-t border-slate-200 pt-5">
        <h3 className="font-black text-slate-950">How live updates work</h3>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-600">
          The dashboard listens for Supabase Realtime events and also refreshes
          when the browser regains focus. Empty states mean that no matching
          Supabase records exist; the admin never generates placeholder
          customers, carts, orders or revenue.
        </p>
      </section>
    </div>
  );
}
