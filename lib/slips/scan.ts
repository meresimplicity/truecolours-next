import {
  slipTotal,
  type MatchProduct,
  type SlipDraft,
  type SlipKind,
} from "./types.ts";
import { exactProductMatches } from "../product-matching.ts";

/** Keyboard/USB scanners send the same barcode and Enter sequence as the POS. */
export function scanSlipProduct(
  draft: SlipDraft,
  products: MatchProduct[],
  code: string,
  kind: SlipKind,
): SlipDraft {
  const value = code.trim().toLowerCase();
  const matches = exactProductMatches(products, value);
  if (!value || matches.length !== 1)
    throw Error(
      matches.length > 1
        ? "This barcode belongs to several products. Fix the catalogue or select the correct product."
        : "Barcode not found. Add the product/barcode in Inventory, then refresh stock.",
    );
  const product = matches[0],
    existing = draft.items.find((i) => i.productId === product.id);
  if (existing && existing.quantity >= 1000000000)
    throw Error("Check the quantity before scanning again.");
  if (!existing && draft.items.length >= 200)
    throw Error("A slip can contain up to 200 lines.");
  const items = existing
    ? draft.items.map((i) =>
        i.id === existing.id
          ? { ...i, quantity: Math.round((i.quantity + 1) * 1000) / 1000 }
          : i,
      )
    : [
        ...draft.items,
        {
          id: crypto.randomUUID(),
          description: product.name,
          productId: product.id,
          quantity: 1,
          unitPriceCents:
            (kind === "purchase"
              ? product.lastCostCents
              : product.sellingPriceCents) ?? 0,
          discountCents: 0,
          stockVersion: product.version,
          matchLabel: "Scanned exact barcode/code",
        },
      ];
  const next = { ...draft, items };
  // A photographed receipt's printed amounts are never silently replaced.
  if (!draft.sourceName && !draft.rawText) {
    next.declaredTotalCents = slipTotal(next);
    if (
      items.every(
        (i) =>
          products.find((p) => p.id === i.productId)?.taxRate !== undefined,
      )
    )
      next.vatCents = items.reduce((n, i) => {
        const rate = products.find((p) => p.id === i.productId)!.taxRate!;
        return (
          n +
          Math.round(
            ((Math.round(i.quantity * i.unitPriceCents) - i.discountCents) *
              rate) /
              (100 + rate),
          )
        );
      }, 0);
  }
  return next;
}
