import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const candidate = url.searchParams.get("next") || "/account/dashboard";
  const next =
    candidate.startsWith("/") &&
    !candidate.startsWith("//") &&
    !candidate.includes("\\")
      ? candidate
      : "/account/dashboard";
  if (code) {
    const db = await getSupabaseServer();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(
    new URL("/account?error=authentication", url.origin),
  );
}
