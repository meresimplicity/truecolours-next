import "server-only";

import { createClient } from "@supabase/supabase-js";
import { hasPermission, normalizeBusinessRole } from "@/lib/business/permissions";
import { supabaseConfig } from "@/lib/supabase/config";
import { getSupabaseServer } from "@/lib/supabase/server";

export function isDevelopmentAdminAccessEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ADMIN_DEV_BYPASS === "true"
  );
}

function isLocalSameOriginRequest(request: Request) {
  const requestUrl = new URL(request.url);
  const hostname = requestUrl.hostname.toLowerCase();
  const isLoopback =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]";
  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  return (
    isLoopback &&
    (!origin || origin === requestUrl.origin) &&
    (!fetchSite || fetchSite === "same-origin" || fetchSite === "none")
  );
}

/**
 * Creates a real Supabase session for the already-configured active staff
 * account. This helper is intentionally limited to same-origin localhost
 * requests in explicitly-enabled development mode.
 */
export async function signInDevelopmentAdmin(request: Request) {
  if (!isDevelopmentAdminAccessEnabled()) return;

  const sessionClient = await getSupabaseServer();
  const { data: currentSession } = await sessionClient.auth.getClaims();
  if (currentSession?.claims?.sub) return;

  if (!isLocalSameOriginRequest(request)) {
    throw new Error("Development admin access is restricted to localhost.");
  }

  const email = process.env.TRUECOLOURS_ADMIN_LOGIN_EMAIL?.trim();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!email || !secretKey) {
    throw new Error("Local admin access is missing its server configuration.");
  }

  const { url } = supabaseConfig();
  const adminClient = createClient(url, secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });

  // Check for an existing Auth account first. generateLink can create users,
  // and this temporary convenience must never create a new business identity.
  const { data: userPage, error: usersError } =
    await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError)
    throw new Error("Could not verify the configured staff account.");
  const account = userPage.users.find(
    (user) => user.email?.toLowerCase() === email.toLowerCase(),
  );
  if (!account) throw new Error("The configured admin account does not exist.");

  const { data: staff, error: staffError } = await adminClient
    .from("staff")
    .select("active, role")
    .eq("user_id", account.id)
    .maybeSingle();
  if (staffError)
    throw new Error("Could not verify the configured staff account.");
  if (
    !staff?.active ||
    !hasPermission(normalizeBusinessRole(staff.role), "dashboard.read")
  ) {
    throw new Error("The configured account is not active admin staff.");
  }

  const { data: link, error: linkError } =
    await adminClient.auth.admin.generateLink({ type: "magiclink", email });
  const tokenHash = link?.properties?.hashed_token;
  if (linkError || !tokenHash) {
    throw new Error("Could not start local admin access.");
  }

  const { error: verificationError } = await sessionClient.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });
  if (verificationError) throw new Error("Could not start local admin access.");
}
