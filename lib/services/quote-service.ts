"use client";
import {
  createCustomerRequest,
  getBusinessRecords,
  watchRows,
} from "@/lib/customer-data";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Quote, QuoteLineItem } from "@/lib/types/quote";
export const createQuote = (
  id: string,
  input: {
    title: string;
    details: string;
    paintCode?: string;
    vehicleId?: string;
    vehicleDescription?: string;
    lineItems?: QuoteLineItem[];
    attachmentUrls?: string[];
    deliveryAddressId?: string;
    deliveryAddress?: string;
    contactPreference?: "email" | "phone" | "whatsapp";
  },
) => createCustomerRequest(id, "quotes", input);
export const getCustomerQuotes = (id: string) =>
  getBusinessRecords<Quote>(id, "quotes");
export const watchCustomerQuotes = (
  id: string,
  callback: (rows: Quote[]) => void,
) => watchRows("business_records", id, () => getCustomerQuotes(id), callback);
export async function updateQuoteStatus(
  quoteId: string,
  status: Quote["status"],
  adminNotes?: string,
) {
  const { error } = await getSupabaseBrowser().rpc("admin_command", {
    p_action: "update-quote",
    p_payload: { quoteId, status, adminNotes },
    p_key: crypto.randomUUID(),
  });
  if (error) throw new Error(error.message);
}
