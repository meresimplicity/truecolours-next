import { NextResponse } from "next/server";
import { getSupabaseServer, checked } from "@/lib/supabase/server";
import { requireAdminPermission } from "@/lib/server/admin-authorization";
import { hasPermission } from "@/lib/business/permissions";
import { apiFailure } from "@/lib/server/admin-command";
export async function GET(request: Request) {
  try {
    const actor = await requireAdminPermission("dashboard.read");
    const db = await getSupabaseServer();
    const q = (new URL(request.url).searchParams.get("q") || "")
      .trim()
      .slice(0, 80)
      .replace(/[%_]/g, "");
    if (q.length < 2) return NextResponse.json({ results: [] });
    const results: Array<{
      id: string;
      label: string;
      detail: string;
      href: string;
    }> = [];
    if (hasPermission(actor.role, "inventory.read")) {
      const [names, codes] = await Promise.all([
        db
          .from("products")
          .select("id,name,code")
          .ilike("name", `%${q}%`)
          .limit(5),
        db
          .from("products")
          .select("id,name,code")
          .ilike("code", `%${q}%`)
          .limit(5),
      ]);
      for (const row of [...(checked(names) || []), ...(checked(codes) || [])])
        if (!results.some((item) => item.id === `product-${row.id}`))
          results.push({
            id: `product-${row.id}`,
            label: row.name,
            detail: `Product · ${row.code}`,
            href: `/admin/inventory?search=${encodeURIComponent(row.code)}`,
          });
    }
    if (hasPermission(actor.role, "customers.read"))
      for (const row of checked(
        await db
          .from("profiles")
          .select("id,data")
          .ilike("data->>displayName", `%${q}%`)
          .limit(5),
      ) || [])
        results.push({
          id: `customer-${row.id}`,
          label: row.data.displayName || "Customer",
          detail: "Customer",
          href: `/admin/customers?customer=${row.id}`,
        });
    for (const [kind, field, permission] of [
      ["orders", "orderNumber", "sales.read"],
      ["invoices", "invoiceNumber", "documents.read"],
    ] as const)
      if (hasPermission(actor.role, permission))
        for (const row of checked(
          await db
            .from("business_records")
            .select("id,data")
            .eq("kind", kind)
            .ilike(`data->>${field}`, `%${q}%`)
            .limit(5),
        ) || [])
          results.push({
            id: `${kind}-${row.id}`,
            label: row.data[field] || row.id,
            detail: kind === "orders" ? "Order" : "Invoice",
            href:
              kind === "invoices"
                ? `/admin/invoices/${row.id}`
                : `/admin/orders?order=${row.id}`,
          });
    return NextResponse.json(
      { results: results.slice(0, 20) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
