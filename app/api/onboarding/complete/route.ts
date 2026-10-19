import { NextResponse } from "next/server";
import { getSupabaseServer, checked } from "@/lib/supabase/server";
import { assertSameOriginMutation } from "@/lib/server/request-security";
import { apiFailure } from "@/lib/server/admin-command";
export const dynamic = "force-dynamic";
import { onboardingCompleteSchema } from "@/lib/schemas/onboarding";
export async function POST(request: Request) {
  try {
    assertSameOriginMutation(request);
    const db = await getSupabaseServer();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "SESSION_EXPIRED" }, { status: 401 });
    const body = await request.json();
    const result = onboardingCompleteSchema.safeParse(body.data);
    if (!result.success)
      return NextResponse.json(
        { error: "Validation failed", issues: result.error.issues },
        { status: 422 },
      );
    const vehicles = Array.isArray(body.data.vehicles)
      ? body.data.vehicles.slice(0, 30)
      : [];
    const colours = Array.isArray(body.data.colours)
      ? body.data.colours.slice(0, 100)
      : [];
    checked(
      await db.rpc("complete_onboarding", {
        p_data: { ...result.data, vehicles, colours },
      }),
    );
    return NextResponse.json({
      success: true,
      redirectTo: "/account/dashboard",
    });
  } catch (error) {
    return apiFailure(error);
  }
}
