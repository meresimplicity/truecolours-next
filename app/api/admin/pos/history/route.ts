import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/server/admin-authorization";
import { apiFailure } from "@/lib/server/admin-command";
import { checked, getSupabaseServer } from "@/lib/supabase/server";
export async function GET(request: Request) {
  try {
    const actor = await requireAdminPermission("sales.read"),
      db = await getSupabaseServer();
    const params = new URL(request.url).searchParams,
      branch = params.get("locationId") || actor.locationIds[0];
    if (!actor.locationIds.includes(branch))
      return NextResponse.json(
        { message: "Branch access denied" },
        { status: 403 },
      );
    if (params.get("saleId")) {
      const sale = checked(
        await db
          .from("sales")
          .select("*")
          .eq("id", params.get("saleId"))
          .eq("branch_id", branch)
          .maybeSingle(),
      );
      if (!sale)
        return NextResponse.json(
          { message: "Sale not found" },
          { status: 404 },
        );
      const items =
        checked(
          await db
            .from("sale_items")
            .select(
              "id,product_id,name,code,quantity,unit_price_cents,total_cents,vat_cents",
            )
            .eq("sale_id", sale.id),
        ) || [];
      const returned = items.length
        ? checked(
            await db
              .from("sale_return_items")
              .select("sale_item_id,quantity")
              .in(
                "sale_item_id",
                items.map((i) => i.id),
              ),
          ) || []
        : [];
      return NextResponse.json(
        {
          sale,
          items: items.map((i) => ({
            ...i,
            remaining:
              Number(i.quantity) -
              returned
                .filter((r) => r.sale_item_id === i.id)
                .reduce((sum, r) => sum + Number(r.quantity), 0),
          })),
        },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    }
    let query = db
      .from("sales")
      .select("*")
      .eq("branch_id", branch)
      .order("created_at", { ascending: false })
      .limit(30);
    const q = (params.get("q") || "").replace(/[^a-z0-9-]/gi, "").slice(0, 40);
    if (q) query = query.ilike("receipt_number", `%${q}%`);
    const [sales, shifts] = await Promise.all([
      query,
      db
        .from("cashier_shifts")
        .select(
          "id,opened_at,closed_at,opening_float_cents,expected_cash_cents,counted_cash_cents,discrepancy_cents",
        )
        .eq("branch_id", branch)
        .order("opened_at", { ascending: false })
        .limit(10),
    ]);
    return NextResponse.json(
      { sales: checked(sales), shifts: checked(shifts) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
