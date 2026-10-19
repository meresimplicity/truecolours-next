export type QuoteStatus =
  | "requested"
  | "reviewing"
  | "quoted"
  | "accepted"
  | "rejected"
  | "expired";

export type QuoteLineItem = {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  unitPrice?: number;
  lineTotal?: number;
  notes?: string;
};

export type Quote = {
  id: string;
  userId: string;
  quoteNumber?: string;
  title: string;
  details: string;
  paintCode: string;
  status: QuoteStatus;

  /* Vehicle reference */
  vehicleId?: string;
  vehicleDescription?: string;

  /* Products */
  lineItems: QuoteLineItem[];

  /* Images and attachments */
  attachmentUrls: string[];

  /* Delivery */
  deliveryAddressId?: string;
  deliveryAddress?: string;
  contactPreference?: "email" | "phone" | "whatsapp";

  /* Pricing */
  subtotal?: number;
  vatAmount?: number;
  deliveryFee?: number;
  total?: number;
  validUntil?: unknown;

  /* Admin */
  assignedTo?: string;
  adminNotes?: string;

  createdAt?: unknown;
  updatedAt?: unknown;
};

export type QuoteInput = Omit<Quote, "id" | "userId" | "createdAt" | "updatedAt">;

export const quoteStatuses: { value: QuoteStatus; label: string; colour: string }[] = [
  { value: "requested", label: "Requested", colour: "amber" },
  { value: "reviewing", label: "Reviewing", colour: "blue" },
  { value: "quoted", label: "Quoted", colour: "emerald" },
  { value: "accepted", label: "Accepted", colour: "emerald" },
  { value: "rejected", label: "Rejected", colour: "red" },
  { value: "expired", label: "Expired", colour: "slate" },
];
