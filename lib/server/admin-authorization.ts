import "server-only";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  hasPermission,
  normalizeBusinessRole,
  type BusinessRole,
  type Permission,
} from "@/lib/business/permissions";
export type AdminActor = {
  id: string;
  email: string;
  name: string;
  role: BusinessRole;
  locationIds: string[];
  sessionVersion: number;
};
export class AdminAuthorizationError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 403,
  ) {
    super(message);
  }
}
export const isAdminAuthorizationError = (
  error: unknown,
): error is AdminAuthorizationError => error instanceof AdminAuthorizationError;
export async function requireAdminPermission(
  permission: Permission,
): Promise<AdminActor> {
  const db = await getSupabaseServer();
  // Verify the signature locally using cached JWKS. staff_identity also checks
  // the live auth.sessions row, so revoked sessions still lose access at once.
  const { data, error } = await db.auth.getClaims();
  const user = data?.claims;
  if (error || !user?.sub)
    throw new AdminAuthorizationError("Sign in to continue.", 401);
  const { data: staff, error: staffError } = await db.rpc("staff_identity");
  if (staffError) throw new Error(staffError.message);
  const role = normalizeBusinessRole(staff?.role);
  if (!staff || !hasPermission(role, permission))
    throw new AdminAuthorizationError(
      "You do not have permission for this action.",
      403,
    );
  return {
    id: user.sub,
    email: user.email || "",
    name: staff.name || user.email || "Staff",
    role,
    locationIds: staff.branch_ids,
    sessionVersion: staff.session_version,
  };
}
