"use client";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { AccountUser } from "@/lib/supabase/auth";
import {
  emptyCustomerWorkspace,
  type AccountNotification,
  type CustomerCartItem,
  type CustomerMessage,
  type CustomerProfile,
  type CustomerQuote,
  type CustomerInvoice,
  type CustomerWorkspace,
  type FavouriteProduct,
  type RecentlyViewedProduct,
  type SavedAddress,
  type SavedColour,
  type UserRole,
  type Vehicle,
} from "@/lib/account-types";
export function unwrap<T>(
  rows: Array<{
    id: string;
    data: Record<string, unknown>;
    user_id?: string;
    created_at?: string;
    updated_at?: string;
  }> | null,
): T[] {
  return (rows || []).map(
    (row) =>
      ({
        ...row.data,
        id: row.id,
        userId: row.user_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }) as T,
  );
}
export function check<T>(result: {
  data: T;
  error: { message: string } | null;
}): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
export async function getCustomerRecords<T>(userId: string, kind: string) {
  return unwrap<T>(
    check(
      await getSupabaseBrowser()
        .from("customer_records")
        .select("*")
        .eq("user_id", userId)
        .eq("kind", kind)
        .order("updated_at", { ascending: false })
        .limit(500),
    ),
  );
}
export async function getBusinessRecords<T>(userId: string, kind: string) {
  if (kind === "invoices")
    return check(await getSupabaseBrowser().rpc("customer_invoices")) as T[];
  return unwrap<T>(
    check(
      await getSupabaseBrowser()
        .from("business_records")
        .select("*")
        .eq("user_id", userId)
        .eq("kind", kind)
        .order("created_at", { ascending: false })
        .limit(500),
    ),
  );
}
export async function writeCustomerRecord(
  userId: string,
  kind: string,
  patch: object,
  id = crypto.randomUUID(),
  remove = false,
): Promise<string> {
  const db = getSupabaseBrowser();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user || user.id !== userId)
    throw new Error("Sign in to update your account.");
  check(
    await db.rpc("customer_record_write", {
      p_kind: kind,
      p_id: id,
      p_patch: patch,
      p_delete: remove,
    }),
  );
  return id;
}
export async function createCustomerRequest(
  userId: string,
  kind: string,
  data: object,
): Promise<string> {
  const db = getSupabaseBrowser();
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user || user.id !== userId) throw new Error("Sign in to continue.");
  return check(
    await db.rpc("customer_request", { p_kind: kind, p_data: data }),
  );
}
export function watchRows<T>(
  table: string,
  userId: string,
  load: () => Promise<T>,
  callback: (value: T) => void,
  onError?: (error: Error) => void,
) {
  let active = true;
  const refresh = () => {
    void load()
      .then((value) => {
        if (active) callback(value);
      })
      .catch((error) => {
        if (active) onError?.(error);
      });
  };
  refresh();
  const db = getSupabaseBrowser();
  const filter =
    table === "profiles" ? `id=eq.${userId}` : `user_id=eq.${userId}`;
  const channel = db
    .channel(`account-${table}-${userId}-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table, filter },
      refresh,
    )
    .subscribe();
  return () => {
    active = false;
    void db.removeChannel(channel);
  };
}
export function getCustomerProfile(user: AccountUser): CustomerProfile {
  const displayName = user.displayName || "";
  const parts = displayName.split(" ");
  return {
    id: user.uid,
    customerId: "",
    displayName,
    firstName: parts[0] || "",
    surname: parts.slice(1).join(" ") || "",
    email: user.email || "",
    phone: "",
    alternativePhone: "",
    companyName: "",
    vatNumber: "",
    province: "",
    city: "",
    physicalAddress: "",
    deliveryAddress: "",
    customerType: "",
    favouriteProducts: [],
    favouritePaintSystem: "",
    preferredDelivery: "",
    preferredBranch: "",
    communicationPreferences: [],
    productInterests: [],
    photoURL: user.photoURL || "",
    onboardingComplete: false,
    role: "customer",
  };
}

export async function ensureCustomerProfile(
  user: AccountUser,
): Promise<CustomerProfile> {
  const db = getSupabaseBrowser();
  const row = check(
    await db.from("profiles").select("*").eq("id", user.uid).single(),
  );
  return {
    ...getCustomerProfile(user),
    ...row.data,
    id: row.id,
    customerId: row.customer_number,
  };
}
export function watchCustomerProfile(
  userId: string,
  callback: (value: CustomerProfile | null) => void,
  onError?: () => void,
) {
  return watchRows(
    "profiles",
    userId,
    async () => {
      const row = check(
        await getSupabaseBrowser()
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle(),
      );
      return row
        ? ({
            ...row.data,
            id: row.id,
            customerId: row.customer_number,
          } as CustomerProfile)
        : null;
    },
    callback,
    onError,
  );
}
export async function updateCustomerProfile(
  _userId: string,
  patch: Partial<Omit<CustomerProfile, "id" | "role" | "createdAt">>,
) {
  check(await getSupabaseBrowser().rpc("save_profile", { p_patch: patch }));
}
export async function completeOnboarding(
  userId: string,
  data: Partial<Omit<CustomerProfile, "id" | "role" | "createdAt">>,
) {
  await updateCustomerProfile(userId, { ...data, onboardingComplete: true });
}
export async function loadCustomerWorkspace(
  userId: string,
): Promise<CustomerWorkspace> {
  const db = getSupabaseBrowser();
  const [personal, business, invoiceResult] = await Promise.all([
    db
      .from("customer_records")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1000),
    db
      .from("business_records")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1000),
    db.rpc("customer_invoices"),
  ]);
  const rows = check(personal) || [];
  const records = check(business) || [];
  const result = { ...emptyCustomerWorkspace };
  for (const key of [
    "addresses",
    "cart",
    "downloads",
    "favourites",
    "savedColours",
    "vehicles",
    "recentlyViewed",
    "notifications",
  ] as const)
    Object.assign(result, {
      [key]: unwrap(rows.filter((row) => row.kind === key)),
    });
  for (const key of ["orders", "quotes", "messages", "invoices"] as const)
    Object.assign(result, {
      [key]: unwrap(records.filter((row) => row.kind === key)),
    });
  result.invoices = check(invoiceResult) as CustomerInvoice[];
  return result;
}
export const watchCustomerInvoices = (
  id: string,
  callback: (rows: CustomerInvoice[]) => void,
  onError?: (e: Error) => void,
) =>
  watchRows(
    "business_records",
    id,
    () => getBusinessRecords<CustomerInvoice>(id, "invoices"),
    callback,
    onError,
  );
export const watchCustomerNotifications = (
  id: string,
  callback: (rows: AccountNotification[]) => void,
  onError?: (e: Error) => void,
) =>
  watchRows(
    "customer_records",
    id,
    () => getCustomerRecords<AccountNotification>(id, "notifications"),
    callback,
    onError,
  );
export const saveVehicle = (
  id: string,
  input: Omit<Vehicle, "id" | "createdAt" | "updatedAt">,
) => writeCustomerRecord(id, "vehicles", input);
export const updateVehicle = (
  id: string,
  vehicleId: string,
  patch: Partial<Vehicle>,
) => writeCustomerRecord(id, "vehicles", patch, vehicleId);
export const deleteVehicle = (id: string, vehicleId: string) =>
  writeCustomerRecord(id, "vehicles", {}, vehicleId, true);
export const saveAddress = (
  id: string,
  input: Omit<SavedAddress, "id" | "createdAt" | "updatedAt">,
) => writeCustomerRecord(id, "addresses", input);
export const saveColour = (
  id: string,
  input: Omit<SavedColour, "id" | "createdAt" | "updatedAt">,
) => writeCustomerRecord(id, "savedColours", input);
export async function toggleFavourite(
  id: string,
  product: Omit<FavouriteProduct, "id" | "createdAt" | "updatedAt">,
) {
  const key = product.productId;
  const existing = (
    await getCustomerRecords<FavouriteProduct>(id, "favourites")
  ).some((item) => item.id === key);
  await writeCustomerRecord(id, "favourites", product, key, existing);
  return !existing;
}
export async function addToCustomerCart(
  id: string,
  item: Omit<CustomerCartItem, "id" | "createdAt" | "updatedAt" | "quantity">,
) {
  check(
    await getSupabaseBrowser().rpc("add_cart_item", {
      p_product_id: item.productId,
      p_data: item,
    }),
  );
}
export const updateCustomerCartQuantity = (
  id: string,
  productId: string,
  quantity: number,
) => writeCustomerRecord(id, "cart", { quantity }, productId, quantity <= 0);
export const removeCustomerSubcollectionItem = (
  id: string,
  kind: string,
  itemId: string,
) => writeCustomerRecord(id, kind, {}, itemId, true);
export const trackRecentlyViewed = (
  id: string,
  product: Omit<
    RecentlyViewedProduct,
    "id" | "createdAt" | "updatedAt" | "viewedAt"
  >,
) =>
  writeCustomerRecord(
    id,
    "recentlyViewed",
    { ...product, viewedAt: new Date().toISOString() },
    product.productId,
  );
export const createQuoteRequest = (
  id: string,
  input: Pick<
    CustomerQuote,
    "title" | "details" | "paintCode" | "attachmentUrl"
  >,
) => createCustomerRequest(id, "quotes", input);
export const createCustomerMessage = (
  id: string,
  input: Pick<CustomerMessage, "subject" | "body" | "attachmentUrl"> & {
    category?: string;
  },
) => createCustomerRequest(id, "messages", input);
export const markNotificationRead = (id: string, notificationId: string) =>
  writeCustomerRecord(id, "notifications", { read: true }, notificationId);
export async function uploadCustomerFile(userId: string, file: File) {
  if (file.size > 10 * 1024 * 1024)
    throw new Error("Files must be 10 MB or smaller.");
  const db = getSupabaseBrowser();
  const path = `${userId}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
  check(
    await db.storage
      .from("customer-uploads")
      .upload(path, file, { contentType: file.type }),
  );
  const signed = check(
    await db.storage.from("customer-uploads").createSignedUrl(path, 3600),
  );
  if (!signed) throw new Error("The uploaded file could not be opened.");
  return `/api/files?path=${encodeURIComponent(path)}`;
}
export async function resolveCustomerFile(value: string) {
  if (!value.startsWith("supabase-storage:customer-uploads/")) return value;
  const path = value.slice("supabase-storage:customer-uploads/".length);
  const signed = check(
    await getSupabaseBrowser()
      .storage.from("customer-uploads")
      .createSignedUrl(path, 300),
  );
  if (!signed) throw new Error("File unavailable");
  return signed.signedUrl;
}
export function roleLabel(role: UserRole) {
  return role
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
