import type { PosAttempt } from "./pos-pending.ts";
export type InvoicePaymentInput = {
  amount: number;
  method: string;
  reference?: string;
  note?: string;
  paidAt?: string;
};
export type InvoicePaymentAttempt = PosAttempt & {
  payload: InvoicePaymentInput & { invoiceId: string };
};

export function recoverInvoicePaymentAttempt(
  invoiceId: string,
  value: PosAttempt | null,
): InvoicePaymentAttempt | null {
  if (
    !value ||
    typeof value.key !== "string" ||
    value.key.length < 8 ||
    value.key.length > 200 ||
    !value.payload ||
    value.payload.invoiceId !== invoiceId
  )
    return null;
  const p = value.payload;
  if (
    typeof p.amount !== "number" ||
    !Number.isFinite(p.amount) ||
    p.amount <= 0 ||
    typeof p.method !== "string" ||
    !["Cash", "Card", "EFT", "Bank transfer", "Bank deposit", "Other"].includes(
      p.method,
    )
  )
    return null;
  if (
    ["reference", "note", "paidAt"].some(
      (key) => p[key] !== undefined && typeof p[key] !== "string",
    )
  )
    return null;
  return value as InvoicePaymentAttempt;
}
