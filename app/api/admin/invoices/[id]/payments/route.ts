import { commandEndpoint } from "@/lib/server/admin-command";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return commandEndpoint(request, "record-payment", { invoiceId: id });
}
