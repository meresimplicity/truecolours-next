import { commandEndpoint, apiFailure } from "@/lib/server/admin-command";
export async function POST(request: Request) {
  try {
    const body = await request.clone().json();
    return commandEndpoint(
      request,
      body.action === "release" || body.action === "release-reservation"
        ? "release-reservation"
        : "reserve-stock",
    );
  } catch (error) {
    return apiFailure(error);
  }
}
