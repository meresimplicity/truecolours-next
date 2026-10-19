import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/server/admin-authorization";
import { apiFailure } from "@/lib/server/admin-command";
import { checked, getSupabaseServer } from "@/lib/supabase/server";
import { businessDate } from "@/lib/pos-types";
export async function GET(request: Request) {
  try {
    const actor = await requireAdminPermission("reports.read");
    const db = await getSupabaseServer();
    const params = new URL(request.url).searchParams;
    const branch = params.get("locationId") || actor.locationIds[0];
    if (!actor.locationIds.includes(branch))
      return NextResponse.json(
        { message: "Branch access denied" },
        { status: 403 },
      );
    const from = params.get("from") || businessDate(),
      to = params.get("to") || from;
    const book = checked(
      await db.rpc("accounting_book", {
        p_branch: branch,
        p_from: from,
        p_to: to,
      }),
    );
    if (params.get("format") === "pdf") {
      await requireAdminPermission("reports.export");
      const { renderAccountingPdf } = await import("@/lib/pos-pdf");
      const bytes = await renderAccountingPdf(book);
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="truecolours-sales-book-${from}-${to}.pdf"`,
          "Cache-Control": "private, no-store",
        },
      });
    }
    return NextResponse.json(
      {
        ...book,
        branches: checked(
          await db
            .from("branches")
            .select("id,name")
            .in("id", actor.locationIds),
        ),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
