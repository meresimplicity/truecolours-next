import "server-only";
import { getSupabaseServer, checked } from "@/lib/supabase/server";
import {
  calculateInvoice,
  deriveInvoiceStatus,
  invoiceDeposit,
} from "@/lib/invoice-calculations";
import type { LiveAdminSettings, LiveInvoice } from "@/lib/admin-live-types";
import { siteConfig } from "@/config/site";

function scalar(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scalar);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        key,
        scalar(item),
      ]),
    );
  return value;
}
const text = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;
const number = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};
const date = (value: unknown) => {
  const parsed = scalar(value);
  return typeof parsed === "string" ? parsed : null;
};

export function normalizeInvoice(
  id: string,
  raw: Record<string, unknown>,
): LiveInvoice {
  const value = scalar(raw) as Record<string, unknown>;
  const rawItems = Array.isArray(value.items)
    ? (value.items as Array<Record<string, unknown>>)
    : [];
  const rawPayments = Array.isArray(value.payments)
    ? (value.payments as Array<Record<string, unknown>>)
    : [];
  const payments = rawPayments.map((item, index) => ({
    id: text(item.id, `payment-${index}`),
    amount: number(item.amount),
    method: text(item.method, "Other"),
    reference: text(item.reference),
    note: text(item.note),
    paidAt: text(item.paidAt),
    createdAt: date(item.createdAt),
  }));
  const calculation = calculateInvoice({
    items: rawItems.map((item, index) => ({
      ...item,
      id: text(item.id, `item-${index}`),
      name: text(item.name, text(item.description, "Item")),
      taxRate: number(item.taxRate, number(value.vatRate, 15)),
    })),
    discountType: text(value.discountType) as "none" | "percent" | "fixed",
    discountValue: number(value.discountValue),
    extraCharges: number(value.extraCharges),
    deliveryFee: number(value.deliveryFee),
    payments,
  });
  if (!rawPayments.length && Number.isFinite(Number(value.amountPaid))) {
    calculation.amountPaid = number(value.amountPaid);
    calculation.balanceDue = Math.max(
      0,
      calculation.total - calculation.amountPaid,
    );
  }
  const status = deriveInvoiceStatus({
    explicitStatus: text(value.status) as LiveInvoice["status"],
    total: calculation.total,
    amountPaid: calculation.amountPaid,
    dueDate: date(value.dueDate),
    sentAt: date(value.sentAt),
    viewedAt: date(value.viewedAt),
    deletedAt: date(value.deletedAt),
  });
  return {
    id,
    userId: text(value.userId),
    orderId: text(value.orderId),
    invoiceNumber: text(value.invoiceNumber, id),
    status,
    customerType:
      text(value.customerType) === "registered" ? "registered" : "walk-in",
    customerName: text(value.customerName, "Customer"),
    customerEmail: text(value.customerEmail),
    customerPhone: text(value.customerPhone),
    customerCompany: text(value.customerCompany),
    vatNumber: text(value.vatNumber),
    customerAccountNumber: text(value.customerAccountNumber),
    billingAddress: text(value.billingAddress),
    orderNumber: text(value.orderNumber),
    representative: text(value.representative),
    preparedBy: text(value.preparedBy),
    ...calculation,
    items: calculation.items,
    vatRate: number(value.vatRate, 15),
    discountType: text(
      value.discountType,
      "none",
    ) as LiveInvoice["discountType"],
    discountValue: number(value.discountValue),
    depositType: text(value.depositType, "none") as LiveInvoice["depositType"],
    depositValue: number(value.depositValue),
    depositAmount: invoiceDeposit(
      calculation.total,
      text(value.depositType) as LiveInvoice["depositType"],
      number(value.depositValue),
    ),
    currency: "ZAR",
    poNumber: text(value.poNumber),
    tags: Array.isArray(value.tags) ? value.tags.map(String) : [],
    publicNotes: text(value.publicNotes),
    privateNotes: text(value.privateNotes),
    paymentTerms: text(value.paymentTerms),
    terms: text(value.terms),
    footer: text(value.footer),
    customFields: Array.isArray(value.customFields)
      ? (value.customFields as LiveInvoice["customFields"])
      : [],
    payments,
    activity: Array.isArray(value.activity)
      ? (value.activity as LiveInvoice["activity"])
      : [],
    revisions: Array.isArray(value.revisions)
      ? (value.revisions as LiveInvoice["revisions"])
      : [],
    emailHistory: Array.isArray(value.emailHistory)
      ? (value.emailHistory as LiveInvoice["emailHistory"])
      : [],
    documents: Array.isArray(value.documents)
      ? (value.documents as LiveInvoice["documents"])
      : [],
    shareToken: text(value.shareToken),
    issuedAt: date(value.issuedAt),
    dueDate: date(value.dueDate),
    paidAt: date(value.paidAt),
    sentAt: date(value.sentAt),
    viewedAt: date(value.viewedAt),
    deletedAt: date(value.deletedAt),
    createdAt: date(value.createdAt),
    updatedAt: date(value.updatedAt),
  };
}

export function normalizeSettings(
  raw: Record<string, unknown> = {},
): LiveAdminSettings {
  return {
    businessName: text(raw.businessName, "TRUECOLOURS"),
    vatNumber: text(raw.vatNumber),
    invoicePrefix: text(raw.invoicePrefix, "INV-"),
    email: text(raw.email),
    phone: text(raw.phone, siteConfig.phonePrimary),
    address: text(raw.address, siteConfig.location),
    vatRate: number(raw.vatRate, 15),
    registrationNumber:
      text(raw.registrationNumber).trim() || siteConfig.registrationNumber,
    website: text(raw.website).trim() || siteConfig.siteUrl,
    country: text(raw.country, "South Africa"),
    bankAccountHolder: text(raw.bankAccountHolder),
    bankName: text(raw.bankName),
    bankAccountNumber: text(raw.bankAccountNumber),
    bankAccountType: text(raw.bankAccountType),
    bankBranchCode: text(raw.bankBranchCode),
    defaultPaymentTerms: number(raw.defaultPaymentTerms, 30),
    defaultPublicNotes: text(raw.defaultPublicNotes),
    invoiceFooter:
      text(raw.invoiceFooter).trim() ||
      `TRUECOLOURS is a trading name of ${siteConfig.legalName} · CIPC ${siteConfig.registrationNumber}`,
    invoiceAccentColor: text(raw.invoiceAccentColor, "#111827"),
  };
}

export async function loadInvoiceById(id: string) {
  const db = await getSupabaseServer();
  const [record, settings] = await Promise.all([
    db
      .from("business_records")
      .select("id,data,user_id,created_at,updated_at")
      .eq("id", id)
      .eq("kind", "invoices")
      .maybeSingle(),
    db
      .from("business_settings")
      .select("data")
      .eq("id", "business")
      .maybeSingle(),
  ]);
  const row = checked(record);
  if (!row) return null;
  return {
    invoice: normalizeInvoice(row.id, {
      ...row.data,
      userId: row.user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }),
    settings: normalizeSettings(checked(settings)?.data),
  };
}
export async function loadInvoiceByToken(token: string) {
  if (!/^[a-f0-9-]{36}$/i.test(token)) return null;
  const db = await getSupabaseServer();
  const value = checked(await db.rpc("shared_invoice", { p_token: token }));
  return value
    ? {
        invoice: normalizeInvoice(value.invoice.id, value.invoice),
        settings: normalizeSettings(value.settings || {}),
      }
    : null;
}
