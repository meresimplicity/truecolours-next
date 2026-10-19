"use client";
import { WorkspacePagination } from "@/components/admin/WorkspacePagination";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Loader2,
  MapPin,
  Package,
  Search,
  Truck,
} from "lucide-react";
import { updateAdminOrder, useAdminWorkspace } from "@/lib/use-admin-workspace";

const deliveryStatuses = [
  "confirmed",
  "processing",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export default function DeliveriesPage() {
  const { workspace, loading, error, refresh, page, hasMore, setPage } =
    useAdminWorkspace();
  const [query, setQuery] = useState("");
  const deliveries = useMemo(() => {
    const search = query.toLowerCase().trim();
    return (workspace?.orders || [])
      .filter(
        (order) =>
          order.fulfilment === "delivery" || Boolean(order.deliveryAddress),
      )
      .filter((order) => {
        const customer = workspace?.customers.find(
          (item) => item.id === order.userId,
        );
        return (
          !search ||
          [
            order.orderNumber,
            order.deliveryAddress,
            order.status,
            order.trackingNumber,
            customer?.displayName,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search)
        );
      });
  }, [query, workspace]);
  const counts = {
    transit: deliveries.filter((item) => item.status === "out_for_delivery")
      .length,
    pending: deliveries.filter((item) =>
      ["pending", "confirmed", "processing"].includes(String(item.status)),
    ).length,
    delivered: deliveries.filter((item) => item.status === "delivered").length,
    cancelled: deliveries.filter((item) => item.status === "cancelled").length,
  };
  return (
    <div className="mx-auto max-w-[1500px] space-y-5 sm:space-y-6">
      <WorkspacePagination page={page} hasMore={hasMore} onChange={setPage} />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">
          Order fulfilment
        </p>
        <h2 className="mt-2 text-[1.75rem] font-black leading-tight sm:text-3xl lg:text-4xl">
          Deliveries
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Track delivery orders, addresses and fulfilment status.
        </p>
      </div>
      {error ? <Notice text={error} /> : null}
      <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <Metric label="Out for delivery" value={counts.transit} />
        <Metric label="Preparing" value={counts.pending} />
        <Metric label="Delivered" value={counts.delivered} />
        <Metric label="Cancelled" value={counts.cancelled} />
      </div>
      <div className="relative max-w-xl">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          size={18}
        />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search order, customer, address or tracking"
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none focus:border-slate-400"
        />
      </div>
      <div className="space-y-4">
        {loading && !workspace
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                className="h-32 animate-pulse rounded-2xl bg-slate-50"
                key={index}
              />
            ))
          : deliveries.map((order) => (
              <DeliveryCard
                order={order}
                key={String(order.id)}
                enabled={Boolean(workspace?.configured)}
                customer={
                  workspace?.customers.find((item) => item.id === order.userId)
                    ?.displayName || "Unknown customer"
                }
                onSaved={refresh}
              />
            ))}
      </div>
      {!loading && !deliveries.length ? (
        <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-slate-200 text-center">
          <div>
            <Truck className="mx-auto text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-500">
              No actual delivery orders yet.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DeliveryCard({
  order,
  customer,
  enabled,
  onSaved,
}: {
  order: Record<string, unknown>;
  customer: string;
  enabled: boolean;
  onSaved: () => Promise<void>;
}) {
  const [status, setStatus] = useState(String(order.status || "confirmed"));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await updateAdminOrder(
        String(order.id),
        status,
        "Delivery status updated",
      );
      setSaved(true);
      await onSaved();
    } finally {
      setSaving(false);
    }
  };
  return (
    <article className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-5 md:grid-cols-[1fr_1.3fr_1fr] md:items-center">
      <div>
        <p className="font-black">{String(order.orderNumber || order.id)}</p>
        <p className="mt-1 text-sm font-semibold text-slate-500">{customer}</p>
        <span className="mt-3 inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black capitalize">
          {String(order.status || "pending").replaceAll("_", " ")}
        </span>
      </div>
      <div>
        <p className="flex gap-2 text-sm font-semibold text-slate-700">
          <MapPin className="shrink-0 text-slate-500" size={18} />
          {String(order.deliveryAddress || "No delivery address saved")}
        </p>
        {order.trackingNumber ? (
          <p className="mt-2 text-xs font-bold text-slate-500">
            Tracking: {String(order.trackingNumber)}
          </p>
        ) : null}
        {order.estimatedDelivery ? (
          <p className="mt-1 text-xs font-bold text-slate-500">
            Estimated: {String(order.estimatedDelivery)}
          </p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setSaved(false);
          }}
          className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold capitalize text-slate-950"
        >
          {deliveryStatuses.map((item) => (
            <option value={item} key={item}>
              {item.replaceAll("_", " ")}
            </option>
          ))}
        </select>
        <button
          disabled={!enabled || saving}
          onClick={() => void save()}
          className="grid size-11 place-items-center rounded-xl bg-slate-950 text-white disabled:opacity-30"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={17} />
          ) : saved ? (
            <Check size={17} />
          ) : (
            <Package size={17} />
          )}
        </button>
      </div>
    </article>
  );
}
function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
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
