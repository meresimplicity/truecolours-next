import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { resolveAdminLoginEmail } from "@/lib/business/admin-login";
import {
  hasPermission,
  normalizeBusinessRole,
} from "@/lib/business/permissions";
import { assertSameOriginMutation } from "@/lib/server/request-security";
import { apiFailure } from "@/lib/server/admin-command";

const credentialsSchema = z
  .object({
    username: z.string().trim().min(1).max(254),
    password: z.string().min(1).max(1024),
  })
  .strict();
const denied = () =>
  NextResponse.json(
    {
      message:
        "The username or password is incorrect, or this account has no admin access.",
    },
    { status: 401, headers: { "Cache-Control": "private, no-store" } },
  );

export async function POST(request: Request) {
  try {
    assertSameOriginMutation(request);
    const input = credentialsSchema.safeParse(await request.json());
    if (!input.success) return denied();
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        {
          message:
            "Admin sign-in is waiting for the Supabase project connection.",
        },
        { status: 503 },
      );
    }
    const email = resolveAdminLoginEmail(
      input.data.username,
      process.env.TRUECOLOURS_ADMIN_USERNAME,
      process.env.TRUECOLOURS_ADMIN_LOGIN_EMAIL,
    );
    if (!email) return denied();
    const db = await getSupabaseServer();
    const { error } = await db.auth.signInWithPassword({
      email,
      password: input.data.password,
    });
    if (error) return denied();
    const { data: staff, error: staffError } = await db.rpc("staff_identity");
    if (
      staffError ||
      !staff ||
      !hasPermission(normalizeBusinessRole(staff.role), "dashboard.read")
    ) {
      await db.auth.signOut({ scope: "local" });
      return denied();
    }
    return NextResponse.json(
      { ok: true, redirectTo: "/admin/dashboard" },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
