"use client";
import {
  ProductPricing,
  StockTransfer,
} from "@/components/admin/BusinessCommands";
import { WorkspacePagination } from "@/components/admin/WorkspacePagination";
import { StockInspection } from "@/components/admin/StockInspection";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useSession } from "@/components/auth/StaffSessionProvider";
import {
  Check,
  Eye,
  EyeOff,
  History,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Save,
  Search,
  TriangleAlert,
} from "lucide-react";
import type { LiveAdminProduct, LiveStockStatus } from "@/lib/admin-live-types";
import {
  hasPermission,
  normalizeBusinessRole,
} from "@/lib/business/permissions";
import { updateAdminStock, useAdminWorkspace } from "@/lib/use-admin-workspace";

const statuses: LiveStockStatus[] = [
  "In Stock",
  "Limited Stock",
  "Out of Stock",
  "On Order",
  "Confirm availability",
];

export default function InventoryPage() {
  const { data: session } = useSession();
  const {
    workspace,
    loading,
    error,
    refresh,
    offlineSnapshot,
    page,
    hasMore,
    setPage,
  } = useAdminWorkspace();
  const canAdjust = hasPermission(
    normalizeBusinessRole(session?.user?.role),
    "inventory.adjust",
  );
  const [search, setSearch] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("search") || ""
      : "",
  );
  const [statusFilter, setStatusFilter] = useState("All statuses");
  const [categoryFilter, setCategoryFilter] = useState("All categories");
  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          (workspace?.products || [])
            .map((product) => product.category)
            .filter(Boolean),
        ),
      ).sort(),
    [workspace],
  );
  const products = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (workspace?.products || []).filter(
      (product) =>
        (!query ||
          [
            product.name,
            product.code,
            product.brand,
            product.category,
            product.supplier,
          ]
            .join(" ")
            .toLowerCase()
            .includes(query)) &&
        (statusFilter === "All statuses" ||
          product.stockStatus === statusFilter) &&
        (categoryFilter === "All categories" ||
          product.category === categoryFilter),
    );
  }, [categoryFilter, search, statusFilter, workspace]);
  const allProducts = workspace?.products || [];
  const totalUnits = allProducts.reduce(
    (sum, product) => sum + product.stockOnHand,
    0,
  );
  const attention = allProducts.filter(
    (product) =>
      product.stockQuantity <= product.minStock ||
      product.stockStatus === "Out of Stock",
  ).length;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 sm:space-y-6">
      <WorkspacePagination page={page} hasMore={hasMore} onChange={setPage} />
      <Link
        href="/admin/stock-control"
        className="block rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-bold text-blue-950"
      >
        Open Stock & slips → Read supplier and physical sales slips, reconcile
        monthly stock and control spending.
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">
            Inventory
          </p>
          <h2 className="mt-2 text-[1.75rem] font-black leading-tight sm:text-3xl lg:text-4xl">
            Stock control
          </h2>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            Control what is available, low, on order, out of stock or hidden
            from customers.
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-bold hover:bg-slate-100 sm:w-auto"
        >
          <RefreshCw className={loading ? "animate-spin" : ""} size={17} />
          Refresh
        </button>
      </div>
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">
          {error}
        </p>
      ) : null}
      {offlineSnapshot ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
          Offline inventory snapshot. Quantity-only stock counts can be queued;
          product visibility, availability labels and low-stock settings require
          internet.
        </p>
      ) : null}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Products on this page" value={allProducts.length} />
        <Metric label="Units on this page" value={totalUnits} />
        <Metric
          label="Need attention"
          value={attention}
          alert={attention > 0}
        />
        <Metric
          label="Movements logged"
          value={workspace?.stockMovements.length || 0}
        />
      </div>
      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_13rem_13rem]">
        <div className="relative">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
            size={18}
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, product code, brand or supplier"
            className="min-h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none transition focus:border-slate-400"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950"
        >
          <option>All statuses</option>
          {statuses.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          className="min-h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950"
        >
          <option>All categories</option>
          {categories.map((category) => (
            <option key={category}>{category}</option>
          ))}
        </select>
      </div>
      {!canAdjust ? (
        <p className="rounded-xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-700">
          Your role can view inventory but cannot change stock.
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading && !workspace
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-50"
                key={index}
              />
            ))
          : products.map((product) => (
              <ProductControl
                key={product.id}
                product={product}
                enabled={Boolean(workspace?.configured) && canAdjust}
                onSaved={refresh}
              />
            ))}
      </div>
      {!loading && products.length === 0 ? (
        <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-slate-200">
          <div className="text-center">
            <Package className="mx-auto text-slate-600" />
            <p className="mt-3 text-sm font-semibold text-slate-500">
              No matching products.
            </p>
          </div>
        </div>
      ) : null}
      <StockTransfer products={products} onSaved={refresh} />
      <StockMovementHistory rows={workspace?.stockMovements || []} />
    </div>
  );
}

function Metric({
  label,
  value,
  alert = false,
}: {
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-black ${alert ? "text-amber-700" : "text-slate-950"}`}
      >
        {value.toLocaleString("en-ZA")}
      </p>
    </div>
  );
}

function ProductControl({
  product,
  enabled,
  onSaved,
}: {
  product: LiveAdminProduct;
  enabled: boolean;
  onSaved: () => Promise<void>;
}) {
  const [quantity, setQuantity] = useState(product.stockOnHand);
  const [expectedVersion, setExpectedVersion] = useState(
    product.inventoryVersion,
  );
  const [minimum, setMinimum] = useState(product.minStock);
  const [status, setStatus] = useState<LiveStockStatus>(product.stockStatus);
  const [visible, setVisible] = useState(product.visible);
  const [reason, setReason] = useState("Stocktake");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const save = async () => {
    setSaving(true);
    setNotice("");
    try {
      const result = await updateAdminStock({
        product: { ...product, inventoryVersion: expectedVersion },
        productId: product.id,
        stockQuantity: quantity,
        minStock: minimum,
        stockStatus: status,
        visible,
        reason,
        note,
      });
      if (result.stockStatus) setStatus(result.stockStatus);
      setExpectedVersion(result.inventoryVersion ?? expectedVersion + 1);
      setNotice("Saved");
      if (!result.queued) await onSaved();
    } catch (reason) {
      setNotice(reason instanceof Error ? reason.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {product.inventoryVersion !== expectedVersion && !saving && (
        <div className="bg-amber-50 p-4 text-xs font-bold text-amber-900">
          Stock changed while this card was open.{" "}
          <button
            onClick={() => {
              setExpectedVersion(product.inventoryVersion);
              setQuantity(product.stockOnHand);
              setMinimum(product.minStock);
              setStatus(product.stockStatus);
              setVisible(product.visible);
            }}
            className="underline"
          >
            Load the latest stock before saving
          </button>
        </div>
      )}
      <div className="flex gap-4 border-b border-slate-200 p-4">
        <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-white p-2">
          <Image
            src={product.imageUrl}
            alt=""
            fill
            sizes="64px"
            className="object-contain p-1"
          />
        </div>
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-black leading-5 text-slate-950">
            {product.name}
          </p>
          <p className="mt-1 truncate text-xs font-semibold text-slate-500">
            {product.code} · {product.brand || product.supplier}
          </p>
          <span
            className={`mt-2 inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${product.managed ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}
          >
            {product.managed ? "Branch stock configured" : "Not configured"}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 min-[380px]:grid-cols-2">
        <label className="text-xs font-bold text-slate-600">
          Counted stock on hand
          <div className="mt-2 flex min-h-11 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            <button
              type="button"
              aria-label="Remove one unit"
              onClick={() => setQuantity((value) => Math.max(0, value - 1))}
              className="grid w-10 place-items-center border-r border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            >
              <Minus size={15} />
            </button>
            <input
              type="number"
              min={0}
              value={quantity}
              onChange={(event) =>
                setQuantity(Math.max(0, Number(event.target.value)))
              }
              className="min-w-0 flex-1 bg-transparent px-2 text-center text-base font-black text-slate-950 outline-none"
            />
            <button
              type="button"
              aria-label="Add one unit"
              onClick={() => setQuantity((value) => value + 1)}
              className="grid w-10 place-items-center border-l border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            >
              <Plus size={15} />
            </button>
          </div>
          <span className="mt-1 block text-[10px] font-semibold text-slate-400">
            {product.stockQuantity} currently available
          </span>
        </label>
        <label className="text-xs font-bold text-slate-600">
          Low-stock level
          <input
            type="number"
            min={0}
            value={minimum}
            onChange={(event) =>
              setMinimum(Math.max(0, Number(event.target.value)))
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-base font-black text-slate-950 outline-none focus:border-slate-400"
          />
        </label>
        <label className="text-xs min-[380px]:col-span-2 font-bold text-slate-600">
          Availability shown to customers
          <select
            disabled
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as LiveStockStatus)
            }
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950 outline-none focus:border-slate-400"
          >
            {statuses.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">
          Movement reason
          <select
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-950"
          >
            <option>Stocktake</option>
            <option>Stock received</option>
            <option>Damaged stock</option>
            <option>Supplier return</option>
            <option>Correction</option>
          </select>
        </label>
        <label className="text-xs font-bold text-slate-600">
          Reference / note
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="PO, invoice or reason"
            className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-950 outline-none"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4">
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="inline-flex min-h-10 items-center gap-2 text-xs font-black text-slate-700"
        >
          {visible ? <Eye size={16} /> : <EyeOff size={16} />}
          {visible ? "Visible in catalogue" : "Hidden"}
        </button>
        <button
          type="button"
          disabled={
            !enabled || saving || product.inventoryVersion !== expectedVersion
          }
          onClick={() => void save()}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-4 text-xs font-black text-white disabled:cursor-not-allowed disabled:opacity-35"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={15} />
          ) : notice === "Saved" ? (
            <Check size={15} />
          ) : (
            <Save size={15} />
          )}
          {saving ? "Saving" : "Save stock"}
        </button>
        {notice && notice !== "Saved" ? (
          <p className="w-full text-xs font-bold text-red-700">{notice}</p>
        ) : null}
      </div>
      <ProductPricing product={product} onSaved={onSaved} />
      <StockInspection product={product} onSaved={onSaved} enabled={enabled} />
    </article>
  );
}

function StockMovementHistory({
  rows,
}: {
  rows: NonNullable<
    ReturnType<typeof useAdminWorkspace>["workspace"]
  >["stockMovements"];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
        <History size={18} />
        <div>
          <h3 className="text-sm font-black">Stock movement history</h3>
          <p className="text-xs font-semibold text-slate-500">
            Every saved adjustment is recorded with the before and after
            quantity.
          </p>
        </div>
      </div>
      {rows.length ? (
        <div className="divide-y divide-slate-200">
          {rows.slice(0, 30).map((row) => (
            <div
              key={row.id}
              className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_8rem_10rem_10rem] sm:items-center sm:px-5"
            >
              <div className="min-w-0">
                <p className="truncate font-black text-slate-950">
                  {row.productName}
                </p>
                <p className="truncate text-xs font-semibold text-slate-500">
                  {row.productCode}
                  {row.note ? ` · ${row.note}` : ""}
                </p>
              </div>
              <p
                className={`font-black ${row.delta > 0 ? "text-emerald-700" : row.delta < 0 ? "text-amber-700" : "text-slate-700"}`}
              >
                {row.delta > 0 ? "+" : ""}
                {row.delta}
              </p>
              <p className="font-semibold text-slate-700">
                {row.previousQuantity} → {row.newQuantity}
              </p>
              <p className="text-xs font-semibold text-slate-500">
                <span className="block text-slate-700">{row.reason}</span>
                {formatDate(row.createdAt)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid min-h-36 place-items-center p-6 text-center">
          <div>
            <TriangleAlert className="mx-auto text-slate-600" size={22} />
            <p className="mt-2 text-sm font-semibold text-slate-500">
              No stock movements recorded yet.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "Just now";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}
