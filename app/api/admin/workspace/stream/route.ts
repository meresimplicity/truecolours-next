import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json(
    {
      message:
        "Realtime subscriptions now connect directly to Supabase with your session permissions.",
    },
    { status: 410 },
  );
}
