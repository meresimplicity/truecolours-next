import { commandEndpoint } from "@/lib/server/admin-command";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ uid: string }> },
) {
  const { uid } = await context.params;
  return commandEndpoint(request, "update-role", { userId: uid });
}
export const POST = PATCH;
