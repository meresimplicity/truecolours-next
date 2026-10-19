import { NextResponse } from "next/server";
import { getSupabaseServer, checked } from "@/lib/supabase/server";
import { apiFailure } from "@/lib/server/admin-command";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const db = await getSupabaseServer();
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "SESSION_EXPIRED" }, { status: 401 });
    const [profileResult, statusResult] = await Promise.all([
      db.from("profiles").select("data").eq("id", user.id).single(),
      db
        .from("customer_records")
        .select("data")
        .eq("user_id", user.id)
        .eq("kind", "onboarding")
        .eq("id", "status")
        .maybeSingle(),
    ]);
    const profile = checked(profileResult)?.data || {};
    const status = checked(statusResult)?.data;
    return NextResponse.json({
      status: status || {
        completed: profile.onboardingComplete || false,
        currentStep: "welcome",
        completedSteps: [],
        draftData: {},
        visitCount: 0,
      },
      profile: {
        displayName: profile.displayName || "",
        email: user.email,
        photoURL: profile.photoURL || "",
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
