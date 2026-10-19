import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, supabaseConfig } from "@/lib/supabase/config";
export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const fetchSite = request.headers.get("sec-fetch-site");
  const localAdminBuildAccess =
    process.env.NODE_ENV === "development" &&
    process.env.ADMIN_DEV_BYPASS === "true" &&
    path.startsWith("/admin/") &&
    ["localhost", "127.0.0.1", "::1", "[::1]"].includes(
      request.nextUrl.hostname.toLowerCase(),
    ) &&
    (!request.headers.get("origin") ||
      request.headers.get("origin") === request.nextUrl.origin) &&
    (!fetchSite || ["same-origin", "none"].includes(fetchSite));
  const protectedPage =
    path.startsWith("/admin") &&
    !["/admin/login", "/admin/denied"].includes(path);
  if (!isSupabaseConfigured())
    return protectedPage
      ? NextResponse.redirect(new URL("/admin/login", request.url))
      : NextResponse.next();
  let response = NextResponse.next({ request });
  const { url, key } = supabaseConfig();
  const db = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values, headers) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers || {}).forEach(([name, value]) =>
          response.headers.set(name, value),
        );
      },
    },
  });
  const { data } = await db.auth.getClaims();
  if (protectedPage && !data?.claims && !localAdminBuildAccess) {
    const redirect = NextResponse.redirect(
      new URL("/admin/login", request.url),
    );
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/api/:path*", "/auth/:path*"],
};
