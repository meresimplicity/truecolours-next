export type SlipKind = "purchase" | "physical_sale";
export type StockEffect = "apply" | "already_counted" | "verify_pos";
export type SlipLine = {
  id: string;
  description: string;
  sourceCode?: string;
  productId: string;
  quantity: number;
  unitPriceCents: number;
  discountCents: number;
  stockVersion: number;
  matchLabel?: string;
  printedUnitPriceCents?: number;
  printedTotalCents?: number;
  priceBasis?: "inclusive" | "exclusive";
};
export type SlipDraft = {
  counterparty: string;
  reference: string;
  documentDate: string;
  currency: string;
  stockEffect: StockEffect;
  linkedSaleId: string;
  sourceSha256: string;
  sourceName: string;
  rawText: string;
  confidence: number | null;
  items: SlipLine[];
  chargesCents: number;
  discountCents: number;
  roundingCents: number;
  vatCents: number;
  declaredTotalCents: number;
  paidCents: number;
  paymentMethod: "cash" | "card" | "eft" | "credit";
  paymentReference: string;
  warnings: string[];
  receiptDetails?: Array<{ label: string; value: string }>;
};
export type SlipDocument = {
  id: string;
  branch_id: string;
  kind: SlipKind;
  status: "draft" | "posted" | "verified" | "archived" | "void";
  data: SlipDraft;
  version: number;
  last_save_key?: string | null;
  document_date: string | null;
  counterparty: string | null;
  reference: string | null;
  total_cents: number | null;
  vat_cents: number | null;
  updated_at: string;
  payments?: SlipPayment[];
  voided_at?: string | null;
  void_reason?: string | null;
};
export type SlipPayment = {
  id: string;
  amount_cents: number;
  method: string;
  reference: string;
  paid_on: string;
};
export type MatchProduct = {
  id: string;
  name: string;
  code: string;
  barcodes: string[];
  available: number;
  version: number;
  lastCostCents: number | null;
  sellingPriceCents?: number | null;
  taxRate?: number;
};
export type ProductAlias = {
  counterparty: string;
  description: string;
  product_id: string;
};
export type MonthProduct = {
  id: string;
  name: string;
  code: string;
  version: number;
  on_hand: number;
  available: number;
  incoming: number;
  minimum: number;
  opening: number;
  closing: number;
  received: number;
  pos_sold: number;
  slip_applied_sold: number;
  documented_slip_sold: number;
  returned: number;
  other: number;
  suggested_order: number;
  last_purchase_unit_cents: number | null;
};
export type InventoryMonth = {
  month: string;
  locationId: string;
  products: MonthProduct[];
  financeVisible: boolean;
  purchasesCents: number | null;
  spentCents: number | null;
  supplierBalanceCents: number | null;
  physicalSalesCents: number;
  posSalesCents: number;
  budgetCents: number | null;
};
export function slipTotal(d: SlipDraft) {
  return (
    d.items.reduce(
      (n, i) => n + Math.round(i.quantity * i.unitPriceCents) - i.discountCents,
      0,
    ) +
    d.chargesCents -
    d.discountCents +
    d.roundingCents
  );
}
