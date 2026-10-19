import { NextResponse } from "next/server";
import { assertSameOriginMutation } from "@/lib/server/request-security";
import { getSupabaseServer } from "@/lib/supabase/server";
import { apiFailure } from "@/lib/server/admin-command";
export async function POST(request: Request) {
  try {
    assertSameOriginMutation(request);
    const db = await getSupabaseServer(),
      result = await db.rpc("inventory_disposition", {
        p_payload: await request.json(),
        p_key: request.headers.get("Idempotency-Key") || "",
      });
    if (result.error) throw result.error;
    return NextResponse.json(result.data);
  } catch (error) {
    return apiFailure(error);
  }
}
