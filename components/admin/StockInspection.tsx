"use client";
import { useRef, useState } from "react";
import type { LiveAdminProduct } from "@/lib/admin-live-types";
import {
  isDefinitiveCommandFailure,
  readPosAttempt,
  storePosAttempt,
  type PosAttempt,
} from "@/lib/pos-pending";
import { useSession } from "@/components/auth/StaffSessionProvider";
export function StockInspection({
  product,
  onSaved,
  enabled,
}: {
  product: LiveAdminProduct;
  onSaved: () => Promise<void>;
  enabled: boolean;
}) {
  const { data: session } = useSession();
  const branch =
    (typeof window === "undefined"
      ? null
      : new URLSearchParams(window.location.search).get("locationId")) ||
    session?.user.locationIds[0] ||
    "";
  const storageKey = `truecolours:stock-inspection:${session?.user.id}:${branch}:${product.id}`;
  return (
    <InspectionForm
      key={storageKey}
      product={product}
      onSaved={onSaved}
      enabled={enabled && !!session && !!branch}
      branch={branch}
      storageKey={storageKey}
    />
  );
}
function InspectionForm({
  product,
  onSaved,
  enabled,
  branch,
  storageKey,
}: {
  product: LiveAdminProduct;
  onSaved: () => Promise<void>;
  enabled: boolean;
  branch: string;
  storageKey: string;
}) {
  const [restored] = useState(() => {
    const value = readPosAttempt(storageKey);
    return value?.payload.productId === product.id &&
      value.payload.locationId === branch
      ? value
      : null;
  });
  const [mode, setMode] = useState(String(restored?.payload.mode || "release")),
    [bucket, setBucket] = useState(
      String(restored?.payload.bucket || "quarantined"),
    ),
    [quantity, setQuantity] = useState(
      restored ? String(restored.payload.quantity) : "",
    ),
    [reason, setReason] = useState(String(restored?.payload.reason || "")),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [unknown, setUnknown] = useState(!!restored);
  const attempt = useRef<PosAttempt | null>(restored);
  async function save() {
    if (!enabled || busy) return;
    setBusy(true);
    setMessage("");
    try {
      attempt.current ??= {
        key: crypto.randomUUID(),
        payload: {
          productId: product.id,
          locationId: branch,
          expectedVersion: product.inventoryVersion,
          mode,
          bucket,
          quantity: Number(quantity),
          reason,
        },
      };
      storePosAttempt(storageKey, attempt.current);
      const r = await fetch("/api/admin/inventory/inspection", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": attempt.current.key,
          },
          body: JSON.stringify(attempt.current.payload),
          signal: AbortSignal.timeout(15000),
        }),
        b = await r.json();
      if (!r.ok) {
        if (isDefinitiveCommandFailure(r.status)) {
          storePosAttempt(storageKey, null);
          attempt.current = null;
          setUnknown(false);
        }
        throw Error(b.message);
      }
      storePosAttempt(storageKey, null);
      attempt.current = null;
      setUnknown(false);
      setQuantity("");
      setReason("");
      setMessage("Inspection saved.");
      await onSaved();
    } catch (e) {
      if (attempt.current) setUnknown(true);
      setMessage(e instanceof Error ? e.message : "Could not save inspection");
    } finally {
      setBusy(false);
    }
  }
  return (
    <details open={unknown || undefined} className="border-t p-4">
      <summary className="cursor-pointer text-xs font-black">
        Stock inspection · {product.quarantinedStock} quarantined ·{" "}
        {product.damagedStock} damaged
        {unknown ? " · Unconfirmed inspection - retry safely" : ""}
      </summary>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="mt-4 space-y-3"
      >
        <fieldset
          disabled={!enabled || busy || unknown}
          className="grid grid-cols-2 gap-3 text-xs"
        >
          <label>
            Action
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2"
            >
              <option value="release">Release to sellable</option>
              <option value="hold">Hold for inspection</option>
              <option value="writeoff">Write off held stock</option>
            </select>
          </label>
          <label>
            Stock bucket
            <select
              value={bucket}
              onChange={(e) => setBucket(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2"
            >
              <option value="quarantined">Quarantine</option>
              <option value="damaged">Damaged</option>
            </select>
          </label>
          <label>
            Quantity
            <input
              required
              min="0.001"
              step=".001"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2"
            />
          </label>
          <label>
            Inspection reason
            <input
              required
              minLength={3}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded-lg border p-2"
            />
          </label>
        </fieldset>
        {message && (
          <p role="status" className="text-xs">
            {message}
          </p>
        )}
        {unknown && (
          <p className="text-xs text-amber-800">
            Outcome unknown. Retry the same inspection before changing the form.
          </p>
        )}
        <button
          disabled={!enabled || busy}
          className="rounded-lg bg-slate-950 px-4 py-2 text-xs font-bold text-white disabled:opacity-40"
        >
          {busy
            ? "Saving…"
            : unknown
              ? "Retry same inspection"
              : "Save inspection"}
        </button>
      </form>
    </details>
  );
}
