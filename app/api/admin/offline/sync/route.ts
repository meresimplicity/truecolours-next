import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json(
    {
      message:
        "This workspace is online only. Reconnect before making changes.",
    },
    { status: 410 },
  );
}
export const GET = POST;
