"use client";
import { useState, type FormEvent } from "react";
import { useSession } from "@/components/auth/StaffSessionProvider";
import {
  hasPermission,
  normalizeBusinessRole,
} from "@/lib/business/permissions";
import type { LiveAdminProduct } from "@/lib/admin-live-types";
async function command(action: string, payload: Record<string, unknown>) {
  const response = await fetch("/api/admin/workspace", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({ action, ...payload }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Update failed.");
  return result;
}
export function ProductPricing({
  product,
  onSaved,
}: {
  product: LiveAdminProduct;
  onSaved: () => Promise<void>;
}) {
  const { data } = useSession();
  const allowed = hasPermission(
    normalizeBusinessRole(data?.user.role),
    "products.manage",
  );
  const [price, setPrice] = useState(
    product.sellingPrice === null ? "" : String(product.sellingPrice),
  );
  const [barcodes, setBarcodes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (!allowed) return null;
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await command("update-product", {
        productId: product.id,
        sellingPriceCents: Math.round(Number(price) * 100),
        ...(barcodes.trim()
          ? {
              barcodes: barcodes
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean),
            }
          : {}),
      });
      setMessage("Selling price saved.");
      await onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Price update failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={save}
      className="space-y-3 border-t border-slate-200 bg-slate-50 p-4"
    >
      <label className="block text-xs font-bold text-slate-600">
        Authorised selling price · VAT included (R)
        <input
          required
          min="0"
          step=".01"
          type="number"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3"
        />
      </label>
      <label className="block text-xs font-bold text-slate-600">
        Barcodes · comma separated
        <input
          value={barcodes}
          onChange={(event) => setBarcodes(event.target.value)}
          placeholder="Leave blank to keep existing barcodes"
          className="mt-2 w-full rounded-lg border border-slate-300 bg-white p-3"
        />
      </label>
      <button
        disabled={busy}
        className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm font-bold disabled:opacity-40"
      >
        {busy ? "Saving…" : "Save selling price / barcodes"}
      </button>
      {message && (
        <p role="status" className="text-xs font-semibold">
          {message}
        </p>
      )}
    </form>
  );
}
export function BranchSetup() {
  const [name, setName] = useState("");
  const [id, setId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await command("create-branch", { id, name });
      setMessage("Branch created. Reload to select it in the navigation.");
      setName("");
      setId("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Branch creation failed.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={save}
      className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h3 className="text-lg font-black">Add a branch</h3>
      <p className="text-sm text-slate-600">
        Each branch has its own stock and sales records. Stock starts at zero.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-bold">
          Branch name
          <input
            required
            maxLength={100}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-2 w-full rounded-lg border border-slate-300 p-3"
          />
        </label>
        <label className="text-xs font-bold">
          Branch ID
          <input
            required
            pattern="[a-z0-9-]{2,80}"
            value={id}
            onChange={(event) =>
              setId(
                event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
              )
            }
            placeholder="second-store"
            className="mt-2 w-full rounded-lg border border-slate-300 p-3"
          />
        </label>
      </div>
      <button
        disabled={busy}
        className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
      >
        Create branch
      </button>
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
export function StockTransfer({
  products,
  onSaved,
}: {
  products: LiveAdminProduct[];
  onSaved: () => Promise<void>;
}) {
  const { data } = useSession();
  const [product, setProduct] = useState("");
  const [destination, setDestination] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (
    !hasPermission(
      normalizeBusinessRole(data?.user.role),
      "inventory.transfer",
    ) ||
    (data?.user.locationIds.length || 0) < 2
  )
    return null;
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      await command("transfer-stock", {
        productId: product,
        toBranchId: destination,
        quantity: Number(quantity),
        locationId:
          new URLSearchParams(location.search).get("locationId") ||
          data?.user.locationIds[0],
      });
      setMessage("Stock transferred between branches.");
      await onSaved();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Transfer failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={save}
      className="rounded-2xl border border-slate-200 bg-white p-5"
    >
      <h3 className="font-black">Transfer stock to another branch</h3>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        <select
          aria-label="Product to transfer"
          required
          value={product}
          onChange={(event) => setProduct(event.target.value)}
          className="rounded-xl border border-slate-300 p-3 text-sm"
        >
          <option value="">Choose product</option>
          {products.map((row) => (
            <option key={row.id} value={row.id}>
              {row.code} · {row.name}
            </option>
          ))}
        </select>
        <select
          aria-label="Destination branch"
          required
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          className="rounded-xl border border-slate-300 p-3 text-sm"
        >
          <option value="">Destination branch</option>
          {data?.user.locationIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
        <input
          aria-label="Quantity to transfer"
          required
          type="number"
          min=".001"
          step=".001"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          className="rounded-xl border border-slate-300 p-3 text-sm"
        />
        <button
          disabled={busy}
          className="rounded-xl bg-slate-950 p-3 text-sm font-bold text-white disabled:opacity-40"
        >
          Transfer stock
        </button>
      </div>
      {message && (
        <p role="status" className="mt-3 text-sm">
          {message}
        </p>
      )}
    </form>
  );
}
