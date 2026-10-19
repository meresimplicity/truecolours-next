export type PosTotals = {
  salesCents: number;
  vatCents: number;
  transactions: number;
  refundsCents: number;
  refundVatCents: number;
  refundCount: number;
  netSalesCents: number;
  netVatCents: number;
  netExVatCents: number;
  cashCents: number;
  cardCents: number;
  eftCents: number;
  cashInCents: number;
  cashOutCents: number;
  expectedCashCents?: number;
  openingFloatCents?: number;
};
export type PosSale = {
  id: string;
  receipt_number: string;
  branch_id: string;
  created_at: string;
  total_cents: number;
  vat_cents: number;
  payment_method: string;
  tendered_cents: number;
  change_cents: number;
  payment_reference: string;
};
export type PosReturn = {
  id: string;
  return_number: string;
  sale_id: string;
  created_at: string;
  total_cents: number;
  vat_cents: number;
  payment_method: string;
  reference: string;
  reason: string;
};
export type PosShift = {
  id: string;
  branch_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_float_cents: number;
  expected_cash_cents?: number;
  counted_cash_cents?: number;
  discrepancy_cents?: number;
  totals?: PosTotals;
};
export type CashMovement = {
  id: string;
  created_at: string;
  direction: string;
  category: string;
  amount_cents: number;
  reason: string;
};
export type AccountingBook = {
  slipBook?: {
    salesCents: number;
    salesVatCents: number;
    saleCount: number;
    purchasesCents: number;
    supplierPaymentsCents: number;
    externalReceiptsCents: number;
    documents: Array<{
      id: string;
      kind: string;
      document_date: string;
      counterparty: string;
      reference: string;
      total_cents: number;
      vat_cents: number;
      stock_effect: string;
    }>;
    payments: Array<{
      kind: string;
      counterparty: string;
      reference: string;
      paid_on: string;
      method: string;
      amount_cents: number;
      payment_reference: string;
    }>;
  };
  branch: string;
  locationId: string;
  from: string;
  to: string;
  generatedAt: string;
  totals: PosTotals;
  sales: PosSale[];
  returns: PosReturn[];
  shifts: PosShift[];
  cashMovements: CashMovement[];
  outstandingCents: number;
  stockMovements: Array<{
    id: string;
    created_at: string;
    product_id: string;
    previous_quantity: number;
    new_quantity: number;
    reason: string;
    note: string;
  }>;
  invoiceCollections: Array<{
    id: string;
    invoiceNumber: string;
    paid_at: string;
    amount_cents: number;
    method: string;
    reference: string;
  }>;
};
export function accountingTotals(book: AccountingBook): PosTotals {
  const sales = Number(book.slipBook?.salesCents || 0),
    vat = Number(book.slipBook?.salesVatCents || 0);
  return {
    ...book.totals,
    salesCents: Number(book.totals.salesCents) + sales,
    vatCents: Number(book.totals.vatCents) + vat,
    transactions:
      Number(book.totals.transactions) + Number(book.slipBook?.saleCount || 0),
    netSalesCents: Number(book.totals.netSalesCents) + sales,
    netVatCents: Number(book.totals.netVatCents) + vat,
    netExVatCents: Number(book.totals.netExVatCents) + sales - vat,
  };
}
export const posMoney = (value: number) =>
  new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR" }).format(
    Number(value || 0) / 100,
  );
export const businessDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
