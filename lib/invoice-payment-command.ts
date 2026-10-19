import { CommandResponseError } from "./pos-pending.ts";
import type { InvoicePaymentInput } from "./invoice-payment-pending.ts";

export async function recordInvoicePayment(
  invoiceId: string,
  input: InvoicePaymentInput,
  retryKey = crypto.randomUUID(),
) {
  let response: Response;
  try {
    response = await fetch(
      `/api/admin/invoices/${encodeURIComponent(invoiceId)}/payments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": retryKey,
          "X-Correlation-Id": retryKey,
        },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(15000),
      },
    );
  } catch {
    throw Error(
      "The payment outcome is unknown. Retrieve the same request before recording another payment; do not take payment again.",
    );
  }
  let result: Record<string, unknown>;
  try {
    result = await response.json();
  } catch {
    throw new CommandResponseError(
      "The payment result could not be read. Retry the same request safely.",
      502,
    );
  }
  if (!response.ok)
    throw new CommandResponseError(
      typeof result?.message === "string"
        ? result.message
        : "The payment could not be recorded.",
      response.status,
    );
  if (
    !result ||
    result.ok !== true ||
    result.invoiceId !== invoiceId ||
    !["paid", "partially_paid"].includes(String(result.status))
  )
    throw new CommandResponseError(
      "The server did not confirm this invoice payment. Retrieve the same request before continuing.",
      502,
    );
  return result;
}
