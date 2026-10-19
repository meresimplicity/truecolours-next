import type { InvoiceDiscountType, LiveInvoiceItem, LiveInvoicePayment, InvoiceStatus } from "@/lib/admin-live-types";

export type InvoiceItemInput = Partial<LiveInvoiceItem> & { description?: string; name?: string };
export type InvoiceCalculationInput = {
  items: InvoiceItemInput[];
  discountType?: InvoiceDiscountType;
  discountValue?: number;
  extraCharges?: number;
  deliveryFee?: number;
  payments?: Array<Pick<LiveInvoicePayment, "amount">>;
};

const finite = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
export const toCents = (value: unknown) => Math.round(Math.max(0, finite(value)) * 100);
export const fromCents = (value: number) => Math.round(value) / 100;
const kind = (value: unknown): InvoiceDiscountType => value === "percent" || value === "fixed" ? value : "none";
const discountCents = (base: number, discountType: InvoiceDiscountType, value: number) => discountType === "percent" ? Math.round(base * Math.min(100, Math.max(0, value)) / 100) : discountType === "fixed" ? Math.min(base, toCents(value)) : 0;

export function calculateInvoice(input: InvoiceCalculationInput) {
  const normalized = input.items.map((raw, index) => {
    const quantity = Math.max(0.001, finite(raw.quantity, 1));
    const unitCents = toCents(raw.unitPrice);
    const baseCents = Math.round(unitCents * quantity);
    const discountType = kind(raw.discountType);
    const discountValue = Math.max(0, finite(raw.discountValue));
    const itemDiscountCents = discountCents(baseCents, discountType, discountValue);
    const taxableBeforeGlobal = Math.max(0, baseCents - itemDiscountCents);
    return { raw, index, quantity, unitCents, baseCents, discountType, discountValue, itemDiscountCents, taxableBeforeGlobal, taxRate: Math.min(100, Math.max(0, finite(raw.taxRate))) };
  });
  const subtotalBeforeGlobal = normalized.reduce((sum, item) => sum + item.taxableBeforeGlobal, 0);
  const invoiceDiscountType = kind(input.discountType);
  const invoiceDiscountValue = Math.max(0, finite(input.discountValue));
  const invoiceDiscountCents = discountCents(subtotalBeforeGlobal, invoiceDiscountType, invoiceDiscountValue);
  let allocated = 0;
  const items: LiveInvoiceItem[] = normalized.map((entry, index) => {
    const isLast = index === normalized.length - 1;
    const share = subtotalBeforeGlobal > 0 ? entry.taxableBeforeGlobal / subtotalBeforeGlobal : 0;
    const globalShare = isLast ? Math.max(0, invoiceDiscountCents - allocated) : Math.round(invoiceDiscountCents * share);
    allocated += globalShare;
    const taxableCents = Math.max(0, entry.taxableBeforeGlobal - globalShare);
    const taxCents = Math.round(taxableCents * entry.taxRate / 100);
    return {
      id: String(entry.raw.id || `item-${entry.index + 1}`), productId: entry.raw.productId || "", code: entry.raw.code || "",
      name: String(entry.raw.name || entry.raw.description || "Item"), description: String(entry.raw.description || entry.raw.name || "Item"),
      quantity: entry.quantity, unitPrice: fromCents(entry.unitCents), taxRate: entry.taxRate, discountType: entry.discountType,
      discountValue: entry.discountValue, baseAmount: fromCents(entry.baseCents), discountAmount: fromCents(entry.itemDiscountCents),
      taxableAmount: fromCents(taxableCents), taxAmount: fromCents(taxCents), lineTotal: fromCents(taxableCents + taxCents),
    };
  });
  const subtotalCents = normalized.reduce((sum, item) => sum + item.baseCents, 0);
  const lineDiscountCents = normalized.reduce((sum, item) => sum + item.itemDiscountCents, 0);
  const vatCents = items.reduce((sum, item) => sum + toCents(item.taxAmount), 0);
  const extraChargesCents = toCents(input.extraCharges);
  const deliveryCents = toCents(input.deliveryFee);
  const totalCents = Math.max(0, subtotalCents - lineDiscountCents - invoiceDiscountCents + vatCents + extraChargesCents + deliveryCents);
  const paidCents = (input.payments || []).reduce((sum, payment) => sum + toCents(payment.amount), 0);
  return { items, subtotal: fromCents(subtotalCents), lineDiscountTotal: fromCents(lineDiscountCents), discountAmount: fromCents(invoiceDiscountCents), vatAmount: fromCents(vatCents), extraCharges: fromCents(extraChargesCents), deliveryFee: fromCents(deliveryCents), total: fromCents(totalCents), amountPaid: fromCents(paidCents), balanceDue: fromCents(Math.max(0, totalCents - paidCents)) };
}

export function deriveInvoiceStatus(input: { explicitStatus?: InvoiceStatus; total: number; amountPaid: number; dueDate?: string | null; sentAt?: string | null; viewedAt?: string | null; deletedAt?: string | null }): InvoiceStatus {
  if (input.deletedAt || input.explicitStatus === "deleted") return "deleted";
  if (input.explicitStatus === "cancelled") return "cancelled";
  if (toCents(input.amountPaid) >= toCents(input.total) && toCents(input.total) > 0) return "paid";
  if (toCents(input.amountPaid) > 0) return "partially_paid";
  if (input.dueDate && new Date(input.dueDate).getTime() < Date.now() && (input.sentAt || input.viewedAt)) return "overdue";
  if (input.viewedAt) return "viewed";
  if (input.sentAt || ["sent", "viewed", "overdue"].includes(input.explicitStatus || "")) return "sent";
  return "draft";
}

export function invoiceDeposit(total: number, type: InvoiceDiscountType = "none", value = 0) {
  return fromCents(discountCents(toCents(total), type, value));
}
