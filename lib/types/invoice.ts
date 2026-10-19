export type Invoice = {
  id: string;
  userId: string;
  orderId: string;
  invoiceNumber: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";

  /* Customer */
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerCompany?: string;
  vatNumber?: string;

  /* Billing */
  billingAddress: string;

  /* Items */
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;

  /* Totals */
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  deliveryFee: number;
  total: number;

  /* Payment */
  paymentMethod?: string;
  paymentReference?: string;
  paidAt?: unknown;

  /* PDF */
  pdfUrl?: string;

  /* Dates */
  issuedAt?: unknown;
  dueDate?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type InvoiceInput = Omit<Invoice, "id" | "createdAt" | "updatedAt">;
