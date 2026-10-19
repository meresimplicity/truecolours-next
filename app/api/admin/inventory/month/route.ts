import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/server/admin-authorization";
import { apiFailure } from "@/lib/server/admin-command";
import { checked, getSupabaseServer } from "@/lib/supabase/server";
import { businessDate } from "@/lib/pos-types";
export async function GET(request: Request) {
  try {
    const actor = await requireAdminPermission("inventory.read"),
      db = await getSupabaseServer(),
      params = new URL(request.url).searchParams;
    const branch = params.get("locationId") || actor.locationIds[0];
    if (!actor.locationIds.includes(branch))
      return NextResponse.json(
        { message: "Branch access denied" },
        { status: 403 },
      );
    const month = params.get("month") || businessDate().slice(0, 7) + "-01";
    const result = checked(
      await db.rpc("inventory_month", { p_branch: branch, p_month: month }),
    );
    if (params.get("format") === "pdf") {
      await requireAdminPermission("reports.export");
      const { renderInventoryMonthPdf } = await import("@/lib/pos-pdf");
      return new NextResponse(
        new Uint8Array(await renderInventoryMonthPdf(result)),
        {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `inline; filename="stock-book-${month.replace(/[^0-9-]/g, "")}.pdf"`,
            "Cache-Control": "private, no-store",
          },
        },
      );
    }
    return NextResponse.json(result, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
