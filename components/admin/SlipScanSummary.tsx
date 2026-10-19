import type { MatchProduct, SlipDraft } from "@/lib/slips/types";
import { slipTotal } from "@/lib/slips/types";
import { posMoney as money } from "@/lib/pos-types";

export function SlipScanSummary({
  draft,
  products,
  paidCents,
  onCorrect,
  disabled,
}: {
  draft: SlipDraft;
  products: MatchProduct[];
  paidCents: number;
  onCorrect?: () => void;
  disabled?: boolean;
}) {
  const calculated = slipTotal(draft),
    unmatched = draft.items.filter((i) => !i.productId).length;
  return (
    <section
      className="rounded-2xl border bg-white p-5"
      aria-label="Scanned slip summary"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
            {draft.sourceName
              ? "Automatically read from your slip"
              : "Slip summary"}
          </p>
          <h3 className="mt-2 text-xl font-black">
            {draft.counterparty || "Supplier / store not identified"}
          </h3>
          <p className="mt-2 text-sm text-slate-600">
            {draft.reference || "No printed reference identified"} ·{" "}
            {draft.documentDate} · {draft.currency}
          </p>
          {draft.sourceName && (
            <p className="mt-1 text-xs text-slate-500">
              {draft.sourceName}
              {draft.confidence !== null
                ? ` · Text recognition ${Math.round(draft.confidence)}%`
                : ""}
            </p>
          )}
        </div>
        {onCorrect && (
          <button
            disabled={disabled}
            onClick={onCorrect}
            className="rounded-lg border px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            {unmatched || calculated !== draft.declaredTotalCents
              ? "Resolve scan details"
              : "Correct a scanned detail"}
          </button>
        )}
      </div>
      {unmatched > 0 && (
        <p
          role="alert"
          className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-900"
        >
          {unmatched} product {unmatched === 1 ? "needs" : "matches need"}{" "}
          confirmation. No stock has changed.
        </p>
      )}
      <div className="mt-5 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-xs text-slate-500">
              <th className="px-2 py-3">Product on slip / stock match</th>
              <th className="px-2 py-3 text-right">Quantity</th>
              <th className="px-2 py-3 text-right">Printed unit price</th>
              <th className="px-2 py-3 text-right">Printed line total</th>
              <th className="px-2 py-3 text-right">Stock available</th>
            </tr>
          </thead>
          <tbody>
            {draft.items.map((line) => {
              const product = products.find((p) => p.id === line.productId);
              return (
                <tr
                  key={line.id}
                  className={`border-b align-top ${product ? "" : "bg-amber-50"}`}
                >
                  <td className="min-w-52 px-2 py-3">
                    <p className="font-bold">{line.description}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {product
                        ? `${product.code} · ${product.name}`
                        : "Product not identified"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {line.matchLabel}
                      {line.priceBasis === "exclusive"
                        ? " · Printed prices exclude VAT; stock book amounts include the printed VAT"
                        : ""}
                    </p>
                  </td>
                  <td className="px-2 py-3 text-right">{line.quantity}</td>
                  <td className="whitespace-nowrap px-2 py-3 text-right">
                    {money(line.printedUnitPriceCents ?? line.unitPriceCents)}
                  </td>
                  <td className="whitespace-nowrap px-2 py-3 text-right">
                    {money(
                      line.printedTotalCents ??
                        Math.round(line.quantity * line.unitPriceCents) -
                          line.discountCents,
                    )}
                  </td>
                  <td className="px-2 py-3 text-right">
                    {product?.available ?? "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!draft.items.length && (
        <p className="mt-4 text-sm text-slate-600">
          Upload a slip to fill its products and amounts automatically. Manual
          entry is available for unreadable documents.
        </p>
      )}
      <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Printed total", money(draft.declaredTotalCents)],
          ["VAT on slip", money(draft.vatCents)],
          ["Paid on slip", money(draft.paidCents)],
          [
            "Initial balance on slip",
            money(draft.declaredTotalCents - draft.paidCents),
          ],
          ["Charges / delivery", money(draft.chargesCents)],
          ["Discount", money(draft.discountCents)],
          ["Rounding", money(draft.roundingCents)],
          [
            "Payment method",
            draft.paymentMethod === "credit"
              ? "Unpaid / not confirmed"
              : draft.paymentMethod.toUpperCase(),
          ],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="mt-1 font-black">{value}</dd>
          </div>
        ))}
      </dl>
      {paidCents !== draft.paidCents && (
        <p className="mt-4 text-sm text-slate-600">
          Current recorded payments: {money(paidCents)}. Later payments are
          listed separately from the original slip.
        </p>
      )}
      {draft.paymentReference && (
        <p className="mt-4 text-sm">
          Payment reference: <strong>{draft.paymentReference}</strong>
        </p>
      )}
      <p
        role="status"
        className={`mt-5 rounded-lg p-3 text-sm font-bold ${calculated === draft.declaredTotalCents && draft.items.length ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}
      >
        {calculated === draft.declaredTotalCents && draft.items.length
          ? `Line amounts reconcile to ${money(calculated)}.`
          : `Calculated ${money(calculated)} · Printed ${money(draft.declaredTotalCents)} · Difference ${money(calculated - draft.declaredTotalCents)}.`}
      </p>
      {!!draft.receiptDetails?.length && (
        <details className="mt-5 rounded-lg border p-4">
          <summary className="cursor-pointer text-sm font-bold">
            Other details read from the slip
          </summary>
          <dl className="mt-3 grid gap-3 text-xs sm:grid-cols-2">
            {draft.receiptDetails.map((field, index) => (
              <div key={index}>
                <dt className="font-bold text-slate-500">{field.label}</dt>
                <dd className="mt-1 whitespace-pre-wrap break-words">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      )}
    </section>
  );
}
