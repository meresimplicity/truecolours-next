import { commandEndpoint } from "@/lib/server/admin-command";
export async function POST(request: Request) {
  return commandEndpoint(request, "update-stock");
}
