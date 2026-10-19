/* ─── Roles ─────────────────────────────────────────────────────────────── */

export const roles = ["super_admin", "admin", "staff", "sales", "customer"] as const;
export type UserRole = (typeof roles)[number];
export type AdminRole = Exclude<UserRole, "customer">;

export function isAdminRole(role: UserRole | undefined) {
  return role === "super_admin" || role === "admin" || role === "staff" || role === "sales";
}

/* ─── Customer types ────────────────────────────────────────────────────── */

export const customerTypes = [
  "Private Vehicle Owner",
  "Panel Beater",
  "Spray Painter",
  "Dealership",
  "Workshop",
  "Fleet Company",
  "Parts Supplier",
  "Industrial Customer",
  "Government",
] as const;

export type CustomerType = (typeof customerTypes)[number];

/* ─── Provinces ──────────────────────────────────────────────────────────── */

export const provinces = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
] as const;

/* ─── Product interest categories ────────────────────────────────────────── */

export const productInterests = [
  "Automotive Paint",
  "Industrial Paint",
  "Primers",
  "Clear Coats",
  "Body Fillers",
  "Masking Tape",
  "Sandpaper",
  "Abrasives",
  "Spray Guns",
  "Compressors",
  "Consumables",
  "Colour Matching",
  "Paint Mixing",
  "Tools",
  "Accessories",
] as const;

export type ProductInterest = (typeof productInterests)[number];

/* ─── Communication preferences ──────────────────────────────────────────── */

export const communicationChannels = ["Email", "SMS", "WhatsApp", "Push Notifications"] as const;
export type CommunicationChannel = (typeof communicationChannels)[number];

/* ─── Vehicle / Garage ───────────────────────────────────────────────────── */

export type Vehicle = {
  id: string;
  manufacturer: string;
  model: string;
  year: string;
  bodyType: string;
  vin: string;
  registration: string;
  currentColour: string;
  factoryColourCode: string;
  fuelCapPhotoUrl: string;
  vehiclePhotoUrl: string;
  damagePhotoUrls: string[];
  preferredPaintBrand: string;
  previousRepairs: string;
  notes: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

/* ─── Customer Profile ───────────────────────────────────────────────────── */

export type CustomerProfile = {
  id: string;
  customerId: string; // TC000001
  displayName: string;
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  alternativePhone: string;
  birthday?: string;
  profilePictureUrl?: string;

  /* Business */
  companyName: string;
  vatNumber: string;
  businessRegNumber?: string;
  industry?: string;

  /* Location */
  province: string;
  city: string;
  physicalAddress: string;
  deliveryAddress: string;

  /* Customer classification */
  customerType: CustomerType | "";

  /* Preferences */
  favouriteProducts: string[];
  favouritePaintSystem: string;
  preferredDelivery: string;
  preferredBranch: string;
  communicationPreferences: CommunicationChannel[];
  productInterests: ProductInterest[];

  /* Legacy / compat */
  photoURL: string;

  /* Onboarding */
  onboardingComplete: boolean;

  /* System */
  role: UserRole;
  emailVerified?: boolean;
  lastLoginAt?: unknown;
  loginHistory?: Array<{
    timestamp: unknown;
    ip?: string;
    userAgent?: string;
  }>;

  createdAt?: unknown;
  updatedAt?: unknown;
};

/* ─── Dashboard sections ─────────────────────────────────────────────────── */

export const dashboardSections = [
  "home",
  "profile",
  "garage",
  "saved-colours",
  "orders",
  "quotes",
  "cart",
  "wishlist",
  "addresses",
  "messages",
  "notifications",
  "downloads",
  "support",
  "settings",
  "security",
] as const;

export type DashboardSection = (typeof dashboardSections)[number];

/* ─── Sub-collection records ─────────────────────────────────────────────── */

export type AccountRecord = {
  id: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type SavedAddress = AccountRecord & {
  label: string;
  recipient: string;
  phone: string;
  address: string;
  isDefault: boolean;
};

export type SavedColour = AccountRecord & {
  code: string;
  vehicle: string;
  colourName: string;
  paintSystem: string;
  manufacturer: string;
  mixFormula: string;
  notes: string;
};

export type FavouriteProduct = AccountRecord & {
  productId: string;
  name: string;
  productCode: string;
  image?: string;
};

export type CustomerCartItem = FavouriteProduct & {
  quantity: number;
  supplier: string;
  availability: string;
  estimatedDelivery: string;
  price?: string;
};

export type RecentlyViewedProduct = FavouriteProduct & {
  viewedAt?: unknown;
};

export type CustomerQuote = AccountRecord & {
  title: string;
  details: string;
  paintCode: string;
  status: "requested" | "reviewing" | "quoted" | "accepted" | "rejected";
  attachmentUrl?: string;
  quoteNumber?: string;
  total?: number;
};

export type CustomerOrder = AccountRecord & {
  orderNumber: string;
  status: "pending" | "approved" | "packed" | "shipped" | "collected" | "delivered" | "completed" | "cancelled";
  total?: number;
  items?: Array<{ name: string; quantity: number }>;
  timeline?: Array<{ status: string; date: unknown }>;
  invoiceUrl?: string;
};

export type CustomerMessage = AccountRecord & {
  subject: string;
  body: string;
  direction: "customer" | "team";
  read: boolean;
  attachmentUrl?: string;
  category?: "sales" | "support" | "colour-expert" | "general";
};

export type AccountNotification = AccountRecord & {
  title: string;
  body: string;
  kind: "order" | "quote" | "message" | "account" | "stock" | "promotion" | "price";
  read: boolean;
};

export type CustomerDownload = AccountRecord & {
  title: string;
  category: "invoice" | "quote" | "sds" | "tds" | "specification" | "mixing-guide";
  fileUrl: string;
  fileName: string;
};

export type CustomerInvoice = AccountRecord & {
  invoiceNumber: string;
  status: "draft" | "sent" | "viewed" | "partially_paid" | "paid" | "overdue" | "cancelled" | "deleted";
  total: number;
  amountPaid?: number;
  balanceDue?: number;
  issuedAt?: unknown;
  dueDate?: unknown;
  shareToken?: string;
};

/* ─── Customer workspace (loaded from Firestore) ─────────────────────────── */

export type CustomerWorkspace = {
  addresses: SavedAddress[];
  cart: CustomerCartItem[];
  downloads: CustomerDownload[];
  favourites: FavouriteProduct[];
  messages: CustomerMessage[];
  invoices: CustomerInvoice[];
  notifications: AccountNotification[];
  orders: CustomerOrder[];
  quotes: CustomerQuote[];
  recentlyViewed: RecentlyViewedProduct[];
  savedColours: SavedColour[];
  vehicles: Vehicle[];
};

export const emptyCustomerWorkspace: CustomerWorkspace = {
  addresses: [],
  cart: [],
  downloads: [],
  favourites: [],
  messages: [],
  invoices: [],
  notifications: [],
  orders: [],
  quotes: [],
  recentlyViewed: [],
  savedColours: [],
  vehicles: [],
};
