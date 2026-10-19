export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "waiting_on_customer" | "resolved" | "closed";
export type TicketCategory =
  | "order_issue"
  | "delivery"
  | "product_quality"
  | "account"
  | "payment"
  | "colour_matching"
  | "general";

export type SupportTicket = {
  id: string;
  userId: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;

  /* References */
  orderId?: string;
  quoteId?: string;

  /* Attachments */
  attachmentUrls: string[];

  /* Resolution */
  assignedTo?: string;
  resolvedAt?: unknown;
  resolution?: string;

  /* Messages thread */
  messages: Array<{
    sender: "customer" | "staff";
    senderName: string;
    body: string;
    attachmentUrl?: string;
    createdAt: unknown;
  }>;

  createdAt?: unknown;
  updatedAt?: unknown;
};

export type SupportTicketInput = Omit<SupportTicket, "id" | "userId" | "createdAt" | "updatedAt">;

export const ticketCategories: { value: TicketCategory; label: string }[] = [
  { value: "order_issue", label: "Order Issue" },
  { value: "delivery", label: "Delivery" },
  { value: "product_quality", label: "Product Quality" },
  { value: "account", label: "Account" },
  { value: "payment", label: "Payment" },
  { value: "colour_matching", label: "Colour Matching" },
  { value: "general", label: "General Enquiry" },
];

export const ticketPriorities: { value: TicketPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];
