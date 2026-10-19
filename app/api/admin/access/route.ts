import { NextResponse } from "next/server";
import {
  requireAdminPermission,
  isAdminAuthorizationError,
} from "@/lib/server/admin-authorization";
import {
  isDevelopmentAdminAccessEnabled,
  signInDevelopmentAdmin,
} from "@/lib/server/development-admin-access";

export async function GET(request: Request) {
  const developmentBypass =
    isDevelopmentAdminAccessEnabled() &&
    new URL(request.url).searchParams.get("checkOnly") !== "1";
  if (developmentBypass) {
    try {
      await signInDevelopmentAdmin(request);
    } catch {
      return NextResponse.json(
        {
          allowed: false,
          developmentBypass: true,
          message:
            "Local admin access could not start. Check the development setting and configured staff account.",
        },
        {
          status: 503,
          headers: { "Cache-Control": "private, no-store" },
        },
      );
    }
  }

  try {
    const user = await requireAdminPermission("dashboard.read");
    return NextResponse.json(
      { allowed: true, developmentBypass, role: user.role, user },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        allowed: false,
        developmentBypass,
        message: error instanceof Error ? error.message : "Access unavailable",
      },
      { status: isAdminAuthorizationError(error) ? error.status : 503 },
    );
  }
}
