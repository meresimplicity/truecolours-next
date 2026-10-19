"use client";
import { WorkspacePagination } from "@/components/admin/WorkspacePagination";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Clock,
  Loader2,
  MapPin,
  Package,
  Search,
  ShoppingBag,
  Truck,
  X,
} from "lucide-react";
import { updateAdminOrder, useAdminWorkspace } from "@/lib/use-admin-workspace";

const statuses = [
  "pending",
  "confirmed",
  "processing",
  "ready_for_collection",
  "out_for_delivery",
  "delivered",
  "completed",
  "cancelled",
  "refunded",
];

export default function OrdersPage() {
  const { workspace, loading, error, refresh, page, hasMore, setPage } =
    useAdminWorkspace();
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const orders = useMemo(() => {
    const search = query.toLowerCase().trim();
    return [...(workspace?.orders || [])]
      .sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
      )
      .filter((order) => {
        const customer = workspace?.customers.find(
          (item) => item.id === order.userId,
        );
        return (
          !search ||
          [
            order.orderNumber,
            order.status,
            customer?.displayName,
            customer?.email,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search)
        );
      });
  }, [query, workspace]);
  const selected = orders.find((order) => order.id === selectedId);

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 sm:space-y-6">
      <WorkspacePagination page={page} hasMore={hasMore} onChange={setPage} />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">
          Orders
        </p>
        <h2 className="mt-2 text-[1.75rem] font-black leading-tight sm:text-3xl lg:text-4xl">
          Orders and fulfilment
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Manage customer orders, line items and fulfilment.
        </p>
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
          placeholder="Search order number, customer, email or status"
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none focus:border-slate-400"
        />
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_27rem]">
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="hidden grid-cols-[1fr_1.3fr_8rem_8rem_3rem] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-500 md:grid">
            <span>Order</span>
            <span>Customer</span>
            <span>Status</span>
            <span>Total</span>
            <span />
          </div>
          <div className="divide-y divide-slate-200">
            {loading && !workspace
              ? Array.from({ length: 5 }).map((_, index) => (
                  <div className="h-20 animate-pulse" key={index} />
                ))
              : orders.map((order) => {
                  const customer = workspace?.customers.find(
                    (item) => item.id === order.userId,
                  );
                  return (
                    <button
                      type="button"
                      key={String(order.id)}
                      onClick={() => setSelectedId(String(order.id))}
                      className={`grid w-full gap-3 p-4 text-left transition hover:bg-slate-50 md:grid-cols-[1fr_1.3fr_8rem_8rem_3rem] md:items-center md:px-5 ${selectedId === order.id ? "bg-slate-50" : ""}`}
                    >
                      <span>
                        <span className="block text-sm font-black">
                          {String(
                            order.orderNumber ||
                              `Order ${String(order.id).slice(0, 8)}`,
                          )}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {formatDate(order.createdAt)}
                        </span>
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-700">
                          {customer?.displayName || "Unknown customer"}
                        </span>
                        <span className="block truncate text-xs text-slate-500">
                          {customer?.email ||
                            String(order.userId || "No user ID")}
                        </span>
                      </span>
                      <Status value={String(order.status || "pending")} />
                      <span className="text-sm font-black">
                        {money(order.total)}
                      </span>
                      <ChevronRight
                        className="hidden text-slate-600 md:block"
                        size={18}
                      />
                    </button>
                  );
                })}
          </div>
          {!loading && !orders.length ? (
            <Empty text="No customer orders have been created yet." />
          ) : null}
        </section>
        <aside
          className={`${selected ? "fixed inset-0 z-40 block overflow-y-auto bg-white p-4 pt-20" : "hidden xl:block"} xl:static xl:z-auto xl:overflow-visible xl:bg-transparent xl:p-0`}
        >
          <OrderDetails
            key={String(selected?.id || "empty")}
            order={selected}
            workspace={workspace}
            enabled={Boolean(workspace?.configured)}
            onClose={() => setSelectedId(null)}
            onSaved={refresh}
          />
        </aside>
      </div>
    </div>
  );
}

function OrderDetails({
  order,
  workspace,
  enabled,
  onClose,
  onSaved,
}: {
  order?: Record<string, unknown>;
  workspace: ReturnType<typeof useAdminWorkspace>["workspace"];
  enabled: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [status, setStatus] = useState(String(order?.status || "pending"));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  if (!order)
    return (
      <Empty text="Choose an order to view its real line items, customer and status history." />
    );
  const customer = workspace?.customers.find(
    (item) => item.id === order.userId,
  );
  const items = Array.isArray(order.items)
    ? (order.items as Array<Record<string, unknown>>)
    : [];
  const history = Array.isArray(order.statusHistory)
    ? (order.statusHistory as Array<Record<string, unknown>>)
    : [];
  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateAdminOrder(String(order.id), status);
      setSaved(true);
      await onSaved();
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 xl:sticky xl:top-24">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-500">
            Order record
          </p>
          <h3 className="mt-1 text-xl font-black">
            {String(order.orderNumber || order.id)}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="grid size-9 place-items-center rounded-lg border border-slate-200 xl:hidden"
        >
          <X size={17} />
        </button>
      </div>
      <div className="mt-5">
        <label className="text-xs font-black uppercase tracking-wider text-slate-500">
          Update fulfilment status
        </label>
        <div className="mt-2 flex gap-2">
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setSaved(false);
            }}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold capitalize text-slate-950"
          >
            {statuses.map((item) => (
              <option key={item} value={item}>
                {item.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <button
            disabled={!enabled || saving}
            onClick={() => void save()}
            className="grid min-w-16 place-items-center rounded-xl bg-slate-950 px-3 text-xs font-black text-white disabled:opacity-30"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={17} />
            ) : saved ? (
              <Check size={17} />
            ) : (
              "Save"
            )}
          </button>
        </div>
      </div>
      <Panel title="Customer" icon={ShoppingBag}>
        <p className="font-black">
          {customer?.displayName || "Unknown customer"}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {customer?.email || "No email"}
        </p>
        {order.deliveryAddress ? (
          <p className="mt-3 flex gap-2 text-sm text-slate-600">
            <MapPin className="shrink-0" size={16} />
            {String(order.deliveryAddress)}
          </p>
        ) : null}
      </Panel>
      <Panel title={`Line items · ${items.length}`} icon={Package}>
        {items.length ? (
          items.map((item, index) => (
            <div
              className="flex justify-between gap-3 border-t border-slate-200 py-3 first:border-0 first:pt-0"
              key={String(item.productId || index)}
            >
              <div>
                <p className="text-sm font-black">
                  {String(item.productName || item.name || "Product")}
                </p>
                <p className="text-xs text-slate-500">
                  {Number(item.quantity || 1)} ×{" "}
                  {money(item.unitPrice || item.price)}
                </p>
              </div>
              <p className="text-sm font-black">
                {money(
                  item.lineTotal ||
                    Number(item.quantity || 1) *
                      Number(item.unitPrice || item.price || 0),
                )}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">
            No line items saved on this order.
          </p>
        )}
        <div className="mt-2 flex justify-between border-t border-slate-200 pt-3 text-base font-black">
          <span>Total</span>
          <span>{money(order.total)}</span>
        </div>
      </Panel>
      <Panel title={`Status history · ${history.length}`} icon={Clock}>
        {history.length ? (
          [...history].reverse().map((item, index) => (
            <div
              className="border-t border-slate-200 py-2 first:border-0 first:pt-0"
              key={index}
            >
              <p className="text-sm font-bold capitalize">
                {String(item.status || "Updated").replaceAll("_", " ")}
              </p>
              <p className="text-xs text-slate-500">
                {formatDate(item.timestamp)}
                {item.note ? ` · ${String(item.note)}` : ""}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-500">No history recorded yet.</p>
        )}
      </Panel>
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Package;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h4 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500">
        <Icon size={15} />
        {title}
      </h4>
      {children}
    </section>
  );
}
function Status({ value }: { value: string }) {
  const complete = ["delivered", "completed"].includes(value);
  const failed = ["cancelled", "refunded"].includes(value);
  return (
    <span
      className={`w-fit rounded-full px-2.5 py-1 text-xs font-black capitalize ${complete ? "bg-emerald-50 text-emerald-700" : failed ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-700"}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="grid min-h-44 place-items-center rounded-2xl border border-dashed border-slate-200 p-6 text-center">
      <div>
        <Truck className="mx-auto text-slate-600" />
        <p className="mt-3 text-sm font-semibold text-slate-500">{text}</p>
      </div>
    </div>
  );
}
function Notice({ text }: { text: string }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
      <AlertTriangle className="shrink-0" size={19} />
      {text}
    </div>
  );
}
function formatDate(value: unknown) {
  if (!value) return "No date";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime())
    ? "No date"
    : date.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}
function money(value: unknown) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(Number(value) || 0);
}
