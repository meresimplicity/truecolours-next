import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiFailure, commandEndpoint } from "@/lib/server/admin-command";
export async function GET(request: Request) {
  try {
    const db = await getSupabaseServer();
    const { data, error } = await db.auth.getClaims();
    if (error || !data?.claims)
      return NextResponse.json(
        { message: "Sign in to continue." },
        { status: 401 },
      );
    const params = new URL(request.url).searchParams;
    const result = await db.rpc("pos_register", {
      p_branch: params.get("locationId") || null,
      p_query: (params.get("q") || "")
        .trim()
        .slice(0, 100)
        .replace(/[%_,()*]/g, ""),
      p_ids: (params.get("ids") || "").split(",").filter(Boolean).slice(0, 200),
      p_search: params.get("search") === "1",
    });
    if (result.error) throw result.error;
    return NextResponse.json(result.data, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  const clone = request.clone();
  try {
    const body = await clone.json();
    if (
      ![
        "open-shift",
        "close-shift",
        "checkout",
        "cash-movement",
        "refund-sale",
      ].includes(body.action)
    )
      return NextResponse.json(
        { message: "Unknown POS command" },
        { status: 400 },
      );
    return commandEndpoint(request, body.action);
  } catch (error) {
    return apiFailure(error);
  }
}
