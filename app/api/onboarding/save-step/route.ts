import { NextResponse } from "next/server";
import { getSupabaseServer, checked } from "@/lib/supabase/server";
import { assertSameOriginMutation } from "@/lib/server/request-security";
import { apiFailure } from "@/lib/server/admin-command";
export const dynamic = "force-dynamic";
import {
  onboardingStepSchemas,
  type ValidatableStepId,
} from "@/lib/schemas/onboarding";
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
    const schema = onboardingStepSchemas[body.stepId as ValidatableStepId];
    if (!body.stepId || !body.data || typeof body.data !== "object")
      return NextResponse.json({ error: "Invalid step" }, { status: 422 });
    if (schema) {
      const parsed = schema.safeParse(body.data);
      if (!parsed.success)
        return NextResponse.json(
          { error: "Validation failed", issues: parsed.error.issues },
          { status: 422 },
        );
      body.data = parsed.data;
    }
    const current =
      checked(
        await db
          .from("customer_records")
          .select("data")
          .eq("user_id", user.id)
          .eq("kind", "onboarding")
          .eq("id", "status")
          .maybeSingle(),
      )?.data || {};
    const status = {
      ...current,
      currentStep: body.stepId,
      completedSteps: [
        ...new Set([...(current.completedSteps || []), body.stepId]),
      ],
      draftData: { ...current.draftData, ...body.data },
      startedAt: current.startedAt || new Date().toISOString(),
    };
    checked(
      await db.rpc("customer_record_write", {
        p_kind: "onboarding",
        p_id: "status",
        p_patch: status,
        p_delete: false,
      }),
    );
    return NextResponse.json({ success: true, status });
  } catch (error) {
    return apiFailure(error);
  }
}
