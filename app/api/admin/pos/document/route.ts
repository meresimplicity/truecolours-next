import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/server/admin-authorization";
import { apiFailure } from "@/lib/server/admin-command";
import { checked, getSupabaseServer } from "@/lib/supabase/server";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    await requireAdminPermission("sales.read");
    const db = await getSupabaseServer();
    const params = new URL(request.url).searchParams;
    const { renderShiftPdf, renderReceiptPdf } = await import("@/lib/pos-pdf");
    let bytes: Buffer, filename: string;
    if (params.get("shiftId")) {
      const result = checked(
        await db.rpc("pos_shift_document", { p_shift: params.get("shiftId") }),
      );
      if (!result)
        return NextResponse.json(
          { message: "Shift not found" },
          { status: 404 },
        );
      bytes = await renderShiftPdf(result);
      filename = `cash-up-${result.shift.id}`;
    } else if (params.get("returnId")) {
      const refund = checked(
        await db
          .from("sale_returns")
          .select("*")
          .eq("id", params.get("returnId"))
          .maybeSingle(),
      );
      if (!refund)
        return NextResponse.json(
          { message: "Return not found" },
          { status: 404 },
        );
      const items =
        checked(
          await db
            .from("sale_return_items")
            .select("*,sale_items(name,code)")
            .eq("return_id", refund.id),
        ) || [];
      bytes = await renderReceiptPdf(
        refund,
        items.map((x) => ({
          ...x,
          name: x.sale_items?.name,
          code: x.sale_items?.code,
        })),
        true,
      );
      filename = refund.return_number;
    } else {
      const sale = checked(
        await db
          .from("sales")
          .select("*")
          .eq("id", params.get("saleId") || "")
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
            .select("name,code,quantity,unit_price_cents,total_cents,vat_cents")
            .eq("sale_id", sale.id),
        ) || [];
      bytes = await renderReceiptPdf(sale, items);
      filename = sale.receipt_number;
    }
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename.replace(/[^a-z0-9_-]/gi, "-")}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
