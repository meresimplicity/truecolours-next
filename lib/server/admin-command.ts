import "server-only";
import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { isAdminAuthorizationError } from "@/lib/server/admin-authorization";
import {
  assertSameOriginMutation,
  isCommandRequestError,
} from "@/lib/server/request-security";
export function apiFailure(error: unknown) {
  const status =
    error instanceof SyntaxError
      ? 400
      : isAdminAuthorizationError(error) || isCommandRequestError(error)
        ? error.status
        : typeof error === "object" && error && "code" in error
          ? { "42501": 403, "23505": 409, "40001": 409, P0002: 404 }[
              String(error.code)
            ] || 422
          : 503;
  return NextResponse.json(
    {
      message:
        error instanceof Error
          ? error.message
          : typeof error === "object" && error && "message" in error
            ? String(error.message)
            : "The request could not be completed.",
    },
    { status },
  );
}
export async function runAdminCommand(
  request: Request,
  action: string,
  payload: Record<string, unknown>,
) {
  assertSameOriginMutation(request);
  const db = await getSupabaseServer();
  const result = await db.rpc("admin_command", {
    p_action: action,
    p_payload: payload,
    p_key: request.headers.get("idempotency-key") || "",
  });
  if (result.error) throw result.error;
  return result.data;
}
export async function commandEndpoint(
  request: Request,
  action: string,
  extra: Record<string, unknown> = {},
) {
  try {
    const payload = { ...(await request.json()), ...extra };
    return NextResponse.json(await runAdminCommand(request, action, payload));
  } catch (error) {
    return apiFailure(error);
  }
}
