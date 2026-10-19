import "server-only";
import { getSupabaseServer, checked } from "@/lib/supabase/server";
import { hasPermission, type Permission } from "@/lib/business/permissions";
import { requireAdminPermission } from "@/lib/server/admin-authorization";
import { normalizeInvoice, normalizeSettings } from "@/lib/invoice-server-data";
import type {
  LiveAdminWorkspace,
  LiveAdminProduct,
  LiveCustomer,
} from "@/lib/admin-live-types";
export const productColumns =
  "id,name,code,category,brand,supplier,barcodes,selling_price_cents,tax_rate,visible,featured,data,updated_at";
export async function loadAdminWorkspace(
  url: URL,
): Promise<
  LiveAdminWorkspace & {
    page: number;
    pageSize: number;
    branches: Array<{ id: string; name: string }>;
    locationId: string;
    hasMore: boolean;
  }
> {
  const section = url.searchParams.get("section") || "dashboard";
  const permissions: Record<string, Permission> = {
    dashboard: "dashboard.read",
    inventory: "inventory.read",
    pos: "pos.use",
    orders: "sales.read",
    deliveries: "sales.read",
    customers: "customers.read",
    messages: "customers.read",
    invoices: "documents.read",
    analytics: "reports.read",
    activity: "audit.read",
    settings: "settings.manage",
    paint: "products.read",
    help: "dashboard.read",
    offline: "dashboard.read",
  };
  const actor = await requireAdminPermission(
    permissions[section] || "dashboard.read",
  );
  const db = await getSupabaseServer();
  const locationId = url.searchParams.get("locationId") || actor.locationIds[0];
  if (!actor.locationIds.includes(locationId))
    throw new Error("This branch is not assigned to your account.");
  const page = Math.max(
    1,
    Math.min(Number(url.searchParams.get("page")) || 1, 100000),
  );
  const pageSize = 50;
  const offset = (page - 1) * pageSize;
  const branches =
    checked(await db.from("branches").select("id,name").order("name")) || [];
  let hasMore = false;
  const workspace: LiveAdminWorkspace = {
    configured: true,
    products: [],
    stockMovements: [],
    customers: [],
    orders: [],
    quotes: [],
    messages: [],
    invoices: [],
    auditLogs: [],
    settings: normalizeSettings(),
    totals: {
      cartItems: 0,
      customers: 0,
      lowStock: 0,
      orders: 0,
      outOfStock: 0,
      products: 0,
      quotes: 0,
      invoices: 0,
      grossBilled: 0,
      paidRevenue: 0,
      outstanding: 0,
      vatBilled: 0,
    },
  };
  const includeProducts = ["inventory", "pos", "invoices", "paint"].includes(
    section,
  );
  if (includeProducts) {
    const rows =
      checked(
        await db
          .from("products")
          .select(productColumns)
          .order("name")
          .order("id")
          .range(offset, offset + pageSize),
      ) || [];
    const balances = rows.length
      ? checked(
          await db
            .from("inventory")
            .select("*")
            .eq("branch_id", locationId)
            .in(
              "product_id",
              rows.map((row) => row.id),
            ),
        ) || []
      : [];
    hasMore = rows.length > pageSize;
    rows.splice(pageSize);
    workspace.products = rows.map((row) => {
      const balance = balances.find((item) => item.product_id === row.id);
      const quantity =
        Number(balance?.on_hand || 0) -
        Number(balance?.reserved || 0) -
        Number(balance?.damaged || 0) -
        Number(balance?.quarantined || 0);
      const minimum = Number(balance?.minimum_stock ?? 5);
      return {
        id: row.id,
        name: row.name,
        code: row.code,
        category: row.category,
        brand: row.brand,
        supplier: row.supplier,
        price: String(row.data.price || "Quote on request"),
        sellingPrice:
          row.selling_price_cents === null
            ? null
            : Number(row.selling_price_cents) / 100,
        priceVerified: row.selling_price_cents !== null,
        imageUrl: String(row.data.imageUrl || ""),
        stockOnHand: Number(balance?.on_hand || 0),
        stockQuantity: quantity,
        reservedStock: Number(balance?.reserved || 0),
        incomingStock: Number(balance?.incoming || 0),
        damagedStock: Number(balance?.damaged || 0),
        returnedStock: Number(balance?.returned || 0),
        quarantinedStock: Number(balance?.quarantined || 0),
        inventoryVersion: Number(balance?.version || 0),
        minStock: minimum,
        stockStatus: !balance
          ? "Confirm availability"
          : quantity <= 0
            ? "Out of Stock"
            : quantity <= minimum
              ? "Limited Stock"
              : "In Stock",
        visible: row.visible,
        managed: Boolean(balance),
        updatedAt: row.updated_at,
      } as LiveAdminProduct;
    });
    if (section === "inventory")
      workspace.stockMovements = (
        checked(
          await db
            .from("stock_movements")
            .select("*")
            .eq("branch_id", locationId)
            .order("created_at", { ascending: false })
            .limit(50),
        ) || []
      ).map((row) => ({
        id: row.id,
        productId: row.product_id,
        productName:
          workspace.products.find((p) => p.id === row.product_id)?.name ||
          row.product_id,
        productCode:
          workspace.products.find((p) => p.id === row.product_id)?.code ||
          row.product_id,
        previousQuantity: Number(row.previous_quantity),
        newQuantity: Number(row.new_quantity),
        delta: Number(row.new_quantity) - Number(row.previous_quantity),
        reason: row.reason,
        note: row.note,
        createdAt: row.created_at,
      }));
  }
  const kinds =
    section === "invoices"
      ? ["invoices"]
      : section === "messages"
        ? ["messages"]
        : ["orders", "deliveries"].includes(section)
          ? ["orders", "quotes"]
          : [];
  let records: Array<{
    id: string;
    user_id: string | null;
    kind: string;
    data: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }> = [];
  if (kinds.length) {
    let query = db
      .from("business_records")
      .select("id,user_id,kind,data,created_at,updated_at")
      .eq("branch_id", locationId)
      .in("kind", kinds)
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + pageSize);
    const recordId = url.searchParams.get("record");
    if (recordId) query = query.eq("id", recordId);
    records = checked(await query) || [];
    hasMore = records.length > pageSize;
    records.splice(pageSize);
    for (const kind of kinds) {
      const rows = records
        .filter((row) => row.kind === kind)
        .map((row) => ({
          ...row.data,
          id: row.id,
          userId: row.user_id,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      if (kind === "invoices")
        workspace.invoices = rows.map((row) => normalizeInvoice(row.id, row));
      else Object.assign(workspace, { [kind]: rows });
    }
  }
  if (
    hasPermission(actor.role, "customers.read") &&
    ["customers", "invoices", "orders", "deliveries", "messages"].includes(
      section,
    )
  ) {
    const rows =
      checked(
        await db
          .from("profiles")
          .select("*")
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize),
      ) || [];
    if (section === "customers") {
      hasMore = rows.length > pageSize;
    }
    rows.splice(pageSize);
    const ids = rows.map((row) => row.id);
    const personal = ids.length
      ? checked(
          await db
            .from("customer_records")
            .select("*")
            .in("user_id", ids)
            .in("kind", ["cart", "vehicles", "activities"])
            .limit(500),
        ) || []
      : [];
    workspace.customers = rows.map((row) => {
      const data = row.data;
      const related = (kind: string) =>
        personal
          .filter((item) => item.user_id === row.id && item.kind === kind)
          .map((item) => ({
            ...item.data,
            id: item.id,
            createdAt: item.created_at,
          }));
      return {
        id: row.id,
        customerId: row.customer_number,
        displayName: String(data.displayName || "Customer"),
        email: String(data.email || ""),
        phone: String(data.phone || ""),
        companyName: String(data.companyName || ""),
        city: String(data.city || ""),
        province: String(data.province || ""),
        physicalAddress: String(data.physicalAddress || ""),
        deliveryAddress: String(data.deliveryAddress || ""),
        role: "customer",
        provider: "supabase",
        createdAt: row.created_at,
        carts: related("cart"),
        vehicles: related("vehicles"),
        activities: related("activities"),
        orders: workspace.orders.filter((item) => item.userId === row.id),
        quotes: workspace.quotes.filter((item) => item.userId === row.id),
      } as LiveCustomer;
    });
  }
  if (section === "settings" || section === "invoices")
    workspace.settings = normalizeSettings(
      checked(
        await db
          .from("business_settings")
          .select("data")
          .eq("id", "business")
          .maybeSingle(),
      )?.data,
    );
  if (section === "activity")
    workspace.auditLogs = (
      checked(
        await db
          .from("audit_logs")
          .select("*")
          .eq("branch_id", locationId)
          .order("created_at", { ascending: false })
          .range(offset, offset + pageSize),
      ) || []
    ).map((row) => ({
      id: row.id,
      action: row.action,
      actorId: row.actor_id,
      targetId: row.target_id,
      details: row.details,
      createdAt: row.created_at,
    }));
  if (["dashboard", "analytics"].includes(section)) {
    const summary = checked(
      await db.rpc("dashboard_summary", { p_branch: locationId }),
    );
    workspace.totals = { ...workspace.totals, ...summary };
  }
  return { ...workspace, page, pageSize, branches, locationId, hasMore };
}
