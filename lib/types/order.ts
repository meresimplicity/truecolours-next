export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready_for_collection"
  | "out_for_delivery"
  | "delivered"
  | "completed"
  | "cancelled"
  | "refunded";

export type OrderLineItem = {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderPayment = {
  method: "eft" | "cash" | "card" | "account" | "other";
  status: "pending" | "partial" | "paid" | "refunded";
  reference?: string;
  paidAt?: unknown;
};

export type Order = {
  id: string;
  userId: string;
  orderNumber: string;
  quoteId?: string;
  status: OrderStatus;
  fulfilment: "collection" | "delivery";

  /* Items */
  items: OrderLineItem[];

  /* Pricing */
  subtotal: number;
  vatAmount: number;
  deliveryFee: number;
  total: number;

  /* Delivery */
  deliveryAddressId?: string;
  deliveryAddress?: string;

  /* Payment */
  payment: OrderPayment;

  /* Tracking */
  trackingNumber?: string;
  estimatedDelivery?: string;
  deliveredAt?: unknown;

  /* Admin */
  assignedTo?: string;
  adminNotes?: string;

  /* Timestamps */
  statusHistory: Array<{
    status: OrderStatus;
    timestamp: unknown;
    note?: string;
  }>;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type OrderInput = Omit<Order, "id" | "userId" | "createdAt" | "updatedAt">;

export const orderStatuses: { value: OrderStatus; label: string; colour: string }[] = [
  { value: "pending", label: "Pending", colour: "amber" },
  { value: "confirmed", label: "Confirmed", colour: "blue" },
  { value: "processing", label: "Processing", colour: "blue" },
  { value: "ready_for_collection", label: "Ready for Collection", colour: "emerald" },
  { value: "out_for_delivery", label: "Out for Delivery", colour: "emerald" },
  { value: "delivered", label: "Delivered", colour: "emerald" },
  { value: "completed", label: "Completed", colour: "emerald" },
  { value: "cancelled", label: "Cancelled", colour: "red" },
  { value: "refunded", label: "Refunded", colour: "red" },
];
