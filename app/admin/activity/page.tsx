"use client";
import { WorkspacePagination } from "@/components/admin/WorkspacePagination";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Download,
  FileText,
  LogIn,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { useAdminWorkspace } from "@/lib/use-admin-workspace";

type ActivityRow = {
  id: string;
  action: string;
  actor: string;
  target: string;
  details: string;
  createdAt: string;
  type: string;
};

export default function ActivityPage() {
  const { workspace, loading, error, page, hasMore, setPage } =
    useAdminWorkspace();
  const [query, setQuery] = useState("");
  const rows = useMemo<ActivityRow[]>(() => {
    const audit = (workspace?.auditLogs || []).map((item) => ({
      id: item.id,
      action: item.action.replaceAll("_", " "),
      actor: item.actorEmail || "System",
      target: item.targetId || item.userId || "—",
      details: item.details || "",
      createdAt: item.createdAt || "",
      type: item.action.split("_")[0],
    }));
    const logins = (workspace?.customers || []).flatMap((customer) =>
      customer.activities.map((item) => ({
        id: `${customer.id}-${String(item.id)}`,
        action: String(item.label || "customer login"),
        actor: customer.email || customer.displayName,
        target: customer.customerId,
        details: customer.provider,
        createdAt: String(item.createdAt || ""),
        type: "login",
      })),
    );
    const search = query.trim().toLowerCase();
    return [...audit, ...logins]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .filter(
        (item) =>
          !search ||
          Object.values(item).join(" ").toLowerCase().includes(search),
      );
  }, [query, workspace]);
  const exportCsv = () => {
    const csv = [
      ["Action", "Actor", "Target", "Details", "Timestamp"],
      ...rows.map((item) => [
        item.action,
        item.actor,
        item.target,
        item.details,
        item.createdAt,
      ]),
    ]
      .map((line) =>
        line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","),
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "truecolours-activity.csv";
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="mx-auto max-w-[1500px] space-y-5 sm:space-y-6">
      <WorkspacePagination page={page} hasMore={hasMore} onChange={setPage} />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">
            Audit trail
          </p>
          <h2 className="mt-2 text-[1.75rem] font-black leading-tight sm:text-3xl lg:text-4xl">
            Activity
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Admin changes and customer sign-ins, newest first.
          </p>
        </div>
        <button
          disabled={!rows.length}
          onClick={exportCsv}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-bold disabled:opacity-30 sm:w-auto"
        >
          <Download size={17} />
          Export data
        </button>
      </div>
      {error ? <Notice text={error} /> : null}
      <div className="relative max-w-xl">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          size={18}
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search action, user, target or detail"
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none focus:border-slate-400"
        />
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[1.2fr_1fr_1fr_1.2fr_10rem] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500 md:grid">
          <span>Action</span>
          <span>User / administrator</span>
          <span>Target</span>
          <span>Details</span>
          <span>Time</span>
        </div>
        <div className="divide-y divide-slate-200">
          {loading && !workspace
            ? Array.from({ length: 6 }).map((_, index) => (
                <div className="h-20 animate-pulse" key={index} />
              ))
            : rows.map((item) => (
                <article
                  className="grid gap-2 p-4 md:grid-cols-[1.2fr_1fr_1fr_1.2fr_10rem] md:items-center md:px-5"
                  key={item.id}
                >
                  <span className="flex items-center gap-3 text-sm font-black capitalize">
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-950 text-white">
                      <ActionIcon type={item.type} />
                    </span>
                    {item.action}
                  </span>
                  <span className="truncate text-sm font-semibold text-slate-700">
                    {item.actor}
                  </span>
                  <span className="truncate text-sm text-slate-600">
                    {item.target}
                  </span>
                  <span className="text-sm text-slate-500">
                    {item.details || "—"}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">
                    {formatDate(item.createdAt)}
                  </span>
                </article>
              ))}
        </div>
        {!loading && !rows.length ? (
          <div className="grid min-h-48 place-items-center text-center">
            <div>
              <Activity className="mx-auto text-slate-600" />
              <p className="mt-3 text-sm font-semibold text-slate-500">
                No recorded activity yet.
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function ActionIcon({ type }: { type: string }) {
  if (type === "login") return <LogIn size={16} />;
  if (type === "stock" || type === "product") return <Package size={16} />;
  if (type === "order") return <ShoppingCart size={16} />;
  if (type === "invoice") return <FileText size={16} />;
  if (type === "role") return <ShieldCheck size={16} />;
  return <UserRound size={16} />;
}
function Notice({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
      <AlertTriangle className="shrink-0" size={19} />
      {text}
    </div>
  );
}
function formatDate(value: string) {
  if (!value) return "No date";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "No date"
    : date.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}
