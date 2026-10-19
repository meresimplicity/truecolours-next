import type { PosAttempt } from "@/lib/pos-pending";
export class SlipApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
export async function slipCommand(
  action: string,
  payload: Record<string, unknown>,
  key = crypto.randomUUID(),
) {
  const response = await fetch("/api/admin/inventory/slips", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify({ action, ...payload }),
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json();
  if (!response.ok)
    throw new SlipApiError(
      body.message || "Could not save this record.",
      response.status,
    );
  return body;
}
export type PendingSlipCommand = PosAttempt & { action: string };
