export type LiveStockStatus = "In Stock" | "Limited Stock" | "Out of Stock" | "On Order" | "Confirm availability";

export type LiveAdminProduct = {
  id: string;
  name: string;
  code: string;
  category: string;
  brand: string;
  supplier: string;
  /** Legacy/public market-reference label. Never use as an authoritative sale price. */
  price: string;
  /** TRUECOLOURS-authorised selling price, expressed in rand. */
  sellingPrice: number | null;
  priceVerified: boolean;
  imageUrl: string;
  stockOnHand: number;
  stockQuantity: number;
  reservedStock: number;
  incomingStock: number;
  damagedStock: number;
  returnedStock: number;
  quarantinedStock: number;
  inventoryVersion: number;
  minStock: number;
  stockStatus: LiveStockStatus;
  visible: boolean;
  managed: boolean;
  updatedAt?: string | null;
};

export type LiveStockMovement = {
  id: string;
  productId: string;
  productName: string;
  productCode: string;
  previousQuantity: number;
  newQuantity: number;
  delta: number;
  reason: string;
  note: string;
  createdAt?: string | null;
};

export type LiveCartItem = {
  id: string;
  productId: string;
  name: string;
  productCode: string;
  quantity: number;
  availability: string;
  price?: string;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type LiveCustomer = {
  id: string;
  customerId: string;
  displayName: string;
  email: string;
  phone: string;
  companyName: string;
  city: string;
  province: string;
  physicalAddress: string;
  deliveryAddress: string;
  role: string;
  photoURL?: string;
  emailVerified?: boolean;
  disabled?: boolean;
  provider: string;
  authCreatedAt?: string | null;
  lastSignInAt?: string | null;
  createdAt?: string | null;
  lastLoginAt?: string | null;
  updatedAt?: string | null;
  carts: LiveCartItem[];
  orders: Array<Record<string, unknown>>;
  quotes: Array<Record<string, unknown>>;
  vehicles: Array<Record<string, unknown>>;
  activities: Array<Record<string, unknown>>;
};

export type LiveInvoice = {
  id: string;
  userId: string;
  orderId: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  customerType?: "registered" | "walk-in";
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerCompany?: string;
  vatNumber?: string;
  customerAccountNumber?: string;
  billingAddress: string;
  orderNumber?: string;
  representative?: string;
  preparedBy?: string;
  items: LiveInvoiceItem[];
  subtotal: number;
  lineDiscountTotal?: number;
  discountType?: "none" | "percent" | "fixed";
  discountValue?: number;
  discountAmount?: number;
  vatRate: number;
  vatAmount: number;
  extraCharges?: number;
  deliveryFee: number;
  total: number;
  amountPaid?: number;
  balanceDue?: number;
  depositType?: "none" | "percent" | "fixed";
  depositValue?: number;
  depositAmount?: number;
  currency?: "ZAR";
  poNumber?: string;
  tags?: string[];
  publicNotes?: string;
  privateNotes?: string;
  paymentTerms?: string;
  terms?: string;
  footer?: string;
  customFields?: Array<{ label: string; value: string }>;
  payments?: LiveInvoicePayment[];
  activity?: LiveInvoiceActivity[];
  revisions?: LiveInvoiceRevision[];
  emailHistory?: LiveInvoiceEmail[];
  documents?: LiveInvoiceDocument[];
  shareToken?: string;
  viewedAt?: string | null;
  sentAt?: string | null;
  updatedAt?: string | null;
  deletedAt?: string | null;
  issuedAt?: string | null;
  dueDate?: string | null;
  paidAt?: string | null;
  createdAt?: string | null;
};

export type InvoiceStatus = "draft" | "sent" | "viewed" | "partially_paid" | "paid" | "overdue" | "cancelled" | "deleted";

export type InvoiceDiscountType = "none" | "percent" | "fixed";

export type LiveInvoiceItem = {
  id: string;
  productId?: string;
  code?: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discountType: InvoiceDiscountType;
  discountValue: number;
  baseAmount: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  lineTotal: number;
};

export type LiveInvoicePayment = {
  id: string;
  amount: number;
  method: string;
  reference: string;
  note: string;
  paidAt: string;
  createdAt?: string | null;
};

export type LiveInvoiceActivity = {
  id: string;
  type: string;
  description: string;
  actor: string;
  createdAt: string;
};

export type LiveInvoiceRevision = {
  id: string;
  version: number;
  summary: string;
  actor: string;
  createdAt: string;
};

export type LiveInvoiceEmail = {
  id: string;
  to: string;
  cc: string;
  subject: string;
  status: "sent" | "failed";
  sentAt: string;
  error?: string;
};

export type LiveInvoiceDocument = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
};

export type LiveAuditLog = {
  id: string;
  action: string;
  actorEmail?: string;
  actorId?: string;
  targetId?: string;
  userId?: string;
  details?: string;
  createdAt?: string | null;
};

export type LiveAdminSettings = {
  businessName: string;
  vatNumber: string;
  invoicePrefix: string;
  email: string;
  phone: string;
  address: string;
  vatRate: number;
  registrationNumber: string;
  website: string;
  country: string;
  bankAccountHolder: string;
  bankName: string;
  bankAccountNumber: string;
  bankAccountType: string;
  bankBranchCode: string;
  defaultPaymentTerms: number;
  defaultPublicNotes: string;
  invoiceFooter: string;
  invoiceAccentColor: string;
};

export type LiveAdminWorkspace = {
  configured: boolean;
  /** True when the browser reconstructed this bounded view from IndexedDB. */
  offlineSnapshot?: boolean;
  snapshotGeneratedAt?: string | null;
  message?: string;
  products: LiveAdminProduct[];
  stockMovements: LiveStockMovement[];
  customers: LiveCustomer[];
  orders: Array<Record<string, unknown>>;
  quotes: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
  invoices: LiveInvoice[];
  auditLogs: LiveAuditLog[];
  settings: LiveAdminSettings;
  totals: {
    cartItems: number;
    customers: number;
    lowStock: number;
    orders: number;
    outOfStock: number;
    products: number;
    quotes: number;
    invoices: number;
    grossBilled: number;
    paidRevenue: number;
    outstanding: number;
    vatBilled: number;
  };
};
