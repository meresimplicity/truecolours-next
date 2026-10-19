import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path");
  if (!path) return new Response("Missing file", { status: 400 });
  const db = await getSupabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  const { data, error } = await db.storage
    .from("customer-uploads")
    .createSignedUrl(path, 60);
  if (error || !data) return new Response("File unavailable", { status: 404 });
  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
