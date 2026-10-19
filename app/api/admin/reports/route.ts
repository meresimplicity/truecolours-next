import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/server/admin-authorization";
import { getSupabaseServer, checked } from "@/lib/supabase/server";
import { apiFailure } from "@/lib/server/admin-command";
export async function GET(request: Request) {
  try {
    const actor = await requireAdminPermission("reports.read");
    const db = await getSupabaseServer();
    const branch =
      new URL(request.url).searchParams.get("locationId") ||
      actor.locationIds[0];
    const reports = checked(
      await db.rpc("branch_reports", { p_branch: branch }),
    );
    if (!reports)
      return NextResponse.json(
        { message: "Branch access denied" },
        { status: 403 },
      );
    return NextResponse.json(reports, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
