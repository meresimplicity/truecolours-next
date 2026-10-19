import type { SlipDraft } from "./types.ts";

/** Payment evidence must describe this receipt, not the shop's banking footer. */
export function receiptPayment(
  rows: string[],
  total: number | null,
  moneyAtEnd: (text: string) => number | null,
) {
  const payments: Array<{ method: SlipDraft["paymentMethod"]; cents: number }> =
    [];
  let method: SlipDraft["paymentMethod"] = "credit",
    paid: number | null = null,
    change: number | null = null,
    balance: number | null = null,
    reference = "";
  const warnings: string[] = [];
  for (const row of rows) {
    const value = moneyAtEnd(row);
    if (/^(?:change|cash change)\b/i.test(row)) {
      change = value;
      continue;
    }
    if (/^(?:balance(?:\s+due)?|outstanding|amount owing)\b/i.test(row)) {
      balance = value;
      continue;
    }
    const ref = row.match(
      /^(?:payment\s*(?:reference|ref)|bank\s*(?:reference|ref)|transaction\s*(?:id|reference|ref)|auth(?:orisation|orization)?\s*(?:code|no)?|approval\s*(?:code|no))\s*[:#-]?\s*(\S.{1,99})$/i,
    );
    if (ref) {
      reference ||= ref[1].trim();
      continue;
    }
    if (/^(?:payment method|paid by|paid via)\s*[: -]/i.test(row)) {
      if (/\b(?:eft|bank transfer)\b/i.test(row)) method = "eft";
      else if (/\b(?:card|visa|mastercard)\b/i.test(row)) method = "card";
      else if (/\bcash\b/i.test(row)) method = "cash";
    }
    const tender = row.match(
      /^(?:(?:paid|payment received|payment|tender(?:ed)?)\s*[: -]?\s*)?(cash|(?:credit |debit )?card|visa|mastercard|eft|bank transfer)\b/i,
    );
    if (tender && value !== null) {
      const label = tender[1].toLowerCase();
      const tenderMethod = /eft|bank/.test(label)
        ? "eft"
        : /cash/.test(label)
          ? "cash"
          : "card";
      if (!payments.some((p) => p.method === tenderMethod && p.cents === value))
        payments.push({ method: tenderMethod, cents: value });
      continue;
    }
    if (
      /^(?:amount paid|paid|payment received|payment amount)\b/i.test(row) &&
      value !== null
    )
      paid = value;
  }
  const methods = new Set(payments.map((p) => p.method));
  if (methods.size > 1 || payments.length > 1) {
    warnings.push(
      "Several payment amounts were detected. Their printed details are retained below; confirm payments separately instead of guessing a combined payment.",
    );
    return {
      paymentMethod: "credit" as const,
      paidCents: 0,
      paymentReference: reference,
      warnings,
    };
  }
  if (payments.length) {
    method = payments[0].method;
    paid = payments.reduce((sum, p) => sum + p.cents, 0);
    if (method === "cash" && change !== null) paid -= change;
  }
  if (
    paid === null &&
    balance !== null &&
    total !== null &&
    method !== "credit"
  )
    paid = total - balance;
  if (method === "credit" || paid === null) {
    if (paid !== null && paid > 0)
      warnings.push(
        "A paid amount was read but its payment method is unclear. Confirm the method before recording that payment.",
      );
    return {
      paymentMethod: method,
      paidCents: 0,
      paymentReference: reference,
      warnings,
    };
  }
  if (paid < 0 || (total !== null && paid > total && method !== "cash")) {
    warnings.push(
      "The printed payment does not reconcile with the total. Confirm the payment before posting.",
    );
    return {
      paymentMethod: method,
      paidCents: 0,
      paymentReference: reference,
      warnings,
    };
  }
  // Tendered cash may include change; never create an overpayment from it.
  const paidCents = total === null ? 0 : Math.min(total, paid);
  if (balance !== null && total !== null && total - paidCents !== balance)
    warnings.push(
      "The printed balance and payment amounts disagree. Check the receipt's payment details.",
    );
  return {
    paymentMethod: method,
    paidCents,
    paymentReference: reference,
    warnings,
  };
}
