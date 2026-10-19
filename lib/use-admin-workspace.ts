"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { LiveAdminWorkspace } from "@/lib/admin-live-types";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
export { recordInvoicePayment as recordAdminInvoicePayment } from "@/lib/invoice-payment-command";
export function useAdminWorkspace() {
  const pathname = usePathname();
  const [page, setPageState] = useState(() =>
    typeof window !== "undefined"
      ? Math.max(
          1,
          Number(new URLSearchParams(window.location.search).get("page")) || 1,
        )
      : 1,
  );
  const [hasMore, setHasMore] = useState(false);
  const setPage = (next: number) => {
    setPageState(next);
    const url = new URL(window.location.href);
    url.searchParams.set("page", String(next));
    window.history.replaceState(null, "", url);
  };
  const [workspace, setWorkspace] = useState<LiveAdminWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("section", pathname.split("/")[2] || "dashboard");
      params.set("page", String(page));
      if (pathname.startsWith("/admin/invoices/") && !pathname.endsWith("/new"))
        params.set("record", pathname.split("/")[3]);
      const response = await fetch(`/api/admin/workspace?${params}`, {
        cache: "no-store",
      });
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.message || "Business data could not be loaded.");
      setWorkspace(body);
      setHasMore(Boolean(body.hasMore));
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Connection unavailable.",
      );
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }, [pathname, page]);
  useEffect(() => {
    const initial = setTimeout(() => {
      void refresh();
    }, 0);
    const focus = () => {
      if (!document.hidden) void refresh();
    };
    const timer = setInterval(focus, 60_000);
    window.addEventListener("focus", focus);
    window.addEventListener("online", focus);
    if (!isSupabaseConfigured())
      return () => {
        clearTimeout(initial);
        clearInterval(timer);
        window.removeEventListener("focus", focus);
        window.removeEventListener("online", focus);
      };
    const db = getSupabaseBrowser();
    let pending: ReturnType<typeof setTimeout> | undefined;
    const changed = () => {
      if (!pending)
        pending = setTimeout(() => {
          pending = undefined;
          focus();
        }, 500);
    };
    const channel = db.channel(`admin-${pathname}-${crypto.randomUUID()}`);
    for (const table of [
      "business_records",
      "inventory",
      "sales",
      "customer_records",
      "profiles",
    ])
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        changed,
      );
    channel.subscribe();
    return () => {
      clearTimeout(initial);
      clearInterval(timer);
      clearTimeout(pending);
      window.removeEventListener("focus", focus);
      window.removeEventListener("online", focus);
      void db.removeChannel(channel);
    };
  }, [refresh, pathname]);
  return {
    workspace,
    loading,
    error,
    refresh,
    offlineSnapshot: false,
    page,
    hasMore,
    setPage,
  };
}
async function updateWorkspace(body: Record<string, unknown>) {
  const response = await fetch("/api/admin/workspace", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "The update failed.");
  return result;
}
export type UpdateAdminStockInput = {
  product: import("@/lib/admin-live-types").LiveAdminProduct;
  productId: string;
  stockQuantity: number;
  minStock: number;
  stockStatus: import("@/lib/admin-live-types").LiveStockStatus;
  visible: boolean;
  reason?: string;
  note?: string;
  locationId?: string;
};
export async function updateAdminStock(input: UpdateAdminStockInput) {
  if (!navigator.onLine) throw new Error("Reconnect before updating stock.");
  const response = await fetch("/api/admin/inventory/adjustments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": crypto.randomUUID(),
    },
    body: JSON.stringify({
      ...input,
      product: undefined,
      locationId:
        input.locationId ||
        new URLSearchParams(window.location.search).get("locationId") ||
        undefined,
      expectedVersion: input.product.inventoryVersion,
    }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.message || "Stock update failed.");
  return { ...result, queued: false };
}
export function updateAdminRole(userId: string, role: string) {
  return updateWorkspace({ action: "update-role", userId, role });
}

export function updateAdminOrder(orderId: string, status: string, note = "") {
  return updateWorkspace({ action: "update-order", orderId, status, note });
}

export function createAdminInvoice(input: {
  orderId?: string;
  userId?: string;
  items?: Array<{ description: string; quantity: number; unitPrice: number }>;
  deliveryFee?: number;
  dueDays?: number;
  vatRate?: number;
  status?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCompany?: string;
  billingAddress?: string;
}) {
  return updateWorkspace({ action: "create-invoice", ...input });
}

export function updateAdminInvoice(invoiceId: string, status: string) {
  return updateWorkspace({ action: "update-invoice", invoiceId, status });
}

export function saveAdminInvoice(input: Record<string, unknown>) {
  return updateWorkspace({
    action: input.invoiceId ? "save-invoice" : "create-invoice",
    ...input,
  });
}

export function duplicateAdminInvoice(invoiceId: string) {
  return updateWorkspace({ action: "duplicate-invoice", invoiceId });
}

export function sendAdminInvoice(
  invoiceId: string,
  input: { to?: string; cc?: string; subject?: string; message?: string },
) {
  return updateWorkspace({ action: "send-invoice", invoiceId, ...input });
}

export function sendAdminCustomerMessage(
  userId: string,
  subject: string,
  body: string,
) {
  return updateWorkspace({ action: "send-message", userId, subject, body });
}

export function updateAdminSettings(settings: Record<string, unknown>) {
  return updateWorkspace({ action: "update-settings", ...settings });
}
