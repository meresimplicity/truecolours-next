"use client";
import {
  createCustomerRequest,
  getBusinessRecords,
  watchRows,
} from "@/lib/customer-data";
import type { Order, OrderStatus, OrderLineItem } from "@/lib/types/order";
export function createOrder(
  userId: string,
  input: {
    quoteId?: string;
    items: OrderLineItem[];
    fulfilment: "collection" | "delivery";
    deliveryAddressId?: string;
    deliveryAddress?: string;
    subtotal: number;
    vatAmount: number;
    deliveryFee: number;
    total: number;
  },
) {
  return createCustomerRequest(userId, "orders", input);
}
export const getCustomerOrders = (id: string) =>
  getBusinessRecords<Order>(id, "orders");
export const watchCustomerOrders = (
  id: string,
  callback: (rows: Order[]) => void,
) => watchRows("business_records", id, () => getCustomerOrders(id), callback);
export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  note?: string,
) {
  const { updateAdminOrder } = await import("@/lib/use-admin-workspace");
  return updateAdminOrder(orderId, status, note);
}
