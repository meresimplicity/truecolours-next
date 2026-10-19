"use client";
import { WorkspacePagination } from "@/components/admin/WorkspacePagination";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  FileText,
  Loader2,
  Mail,
  MapPin,
  Package,
  Phone,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type {
  LiveAdminProduct,
  LiveCartItem,
  LiveCustomer,
  LiveInvoice,
} from "@/lib/admin-live-types";
import { updateAdminRole, useAdminWorkspace } from "@/lib/use-admin-workspace";

type CustomerTab = "overview" | "cart" | "orders" | "invoices" | "activity";
type OrderRecord = Record<string, unknown>;
const tabs: Array<{ id: CustomerTab; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "cart", label: "Cart" },
  { id: "orders", label: "Orders" },
  { id: "invoices", label: "Invoices" },
  { id: "activity", label: "Activity" },
];

export function CustomersClient() {
  const {
    workspace,
    loading,
    error,
    refresh,
    offlineSnapshot,
    page,
    hasMore,
    setPage,
  } = useAdminWorkspace();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const selectedId = searchParams.get("customer");
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!selectedId) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedId]);
  useEffect(() => {
    if (!selectedId) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape")
        router.replace("/admin/customers", { scroll: false });
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [router, selectedId]);

  const customers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return (workspace?.customers || []).filter(
      (customer) =>
        !query ||
        [
          customer.displayName,
          customer.email,
          customer.phone,
          customer.companyName,
          customer.customerId,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query),
    );
  }, [search, workspace]);
  const selected = workspace?.customers.find(
    (customer) => customer.id === selectedId,
  );
  const openCustomer = (customerId: string) =>
    router.replace(
      `/admin/customers?customer=${encodeURIComponent(customerId)}`,
      { scroll: false },
    );
  const closeCustomer = () =>
    router.replace("/admin/customers", { scroll: false });

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 sm:space-y-6">
      <WorkspacePagination page={page} hasMore={hasMore} onChange={setPage} />
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-600">
          Accounts
        </p>
        <h2 className="mt-2 text-[1.75rem] font-black leading-tight text-slate-950 sm:text-3xl lg:text-4xl">
          Customers
        </h2>
        <p className="mt-2 text-sm font-semibold text-slate-600">
          Manage customer profiles, current carts, purchase history and account
          access.
        </p>
      </div>
      {error ? <Notice text={error} /> : null}
      {offlineSnapshot ? (
        <Notice
          text="Offline customer lookup shows the last approved minimal snapshot. Account roles, orders, carts, invoices and newly registered users require internet."
          tone="amber"
        />
      ) : null}
      <div className="relative max-w-xl">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
          size={18}
        />
        <input
          aria-label="Search customers"
          className="min-h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-950 outline-none placeholder:text-slate-500 focus:border-slate-500"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, email, phone or company"
          value={search}
        />
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem_6rem_3rem] gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600 md:grid">
          <span>Customer</span>
          <span>Contact</span>
          <span>Cart</span>
          <span>Role</span>
          <span />
        </div>
        <div className="divide-y divide-slate-200">
          {loading && !workspace
            ? Array.from({ length: 6 }).map((_, index) => (
                <div className="h-20 animate-pulse bg-slate-50" key={index} />
              ))
            : null}
          {customers.map((customer) => (
            <button
              aria-label={`Open ${customer.displayName} customer profile`}
              className={`grid min-h-[5rem] w-full gap-3 p-4 text-left transition-colors hover:bg-slate-50 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_7rem_6rem_3rem] md:items-center md:px-5 ${selectedId === customer.id ? "bg-slate-50" : ""}`}
              key={customer.id}
              onClick={() => openCustomer(customer.id)}
              type="button"
            >
              <span className="flex min-w-0 items-center gap-3">
                <Avatar customer={customer} size="small" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-slate-950">
                    {customer.displayName}
                  </span>
                  <span className="block truncate text-xs font-semibold text-slate-600">
                    {customer.provider.includes("google")
                      ? "Google account"
                      : customer.provider}{" "}
                    ·{" "}
                    {relativeDate(
                      customer.lastSignInAt || customer.lastLoginAt,
                    )}
                  </span>
                </span>
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-slate-800">
                  {customer.email || "No email saved"}
                </span>
                <span className="block truncate text-xs font-semibold text-slate-600">
                  {customer.phone ||
                    (customer.emailVerified
                      ? "Verified email"
                      : "Email not verified")}
                </span>
              </span>
              <span className="text-sm font-black text-slate-950">
                <ShoppingCart className="mr-2 inline md:hidden" size={15} />
                {cartQuantity(customer)} items
              </span>
              <span className="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black capitalize text-slate-700">
                {customer.role}
              </span>
              <ChevronRight
                className="hidden text-slate-500 md:block"
                size={18}
              />
            </button>
          ))}
        </div>
        {!loading && customers.length === 0 ? (
          <EmptyState
            icon={<UserRound size={25} />}
            text="No customer accounts found."
          />
        ) : null}
      </section>
      <AnimatePresence>
        {selected ? (
          <CustomerDrawer
            customer={selected}
            enabled={Boolean(workspace?.configured && !offlineSnapshot)}
            invoices={(workspace?.invoices || []).filter(
              (invoice) =>
                invoice.userId === selected.id && invoice.status !== "deleted",
            )}
            key={selected.id}
            onClose={closeCustomer}
            onUpdated={refresh}
            products={workspace?.products || []}
            reducedMotion={Boolean(reducedMotion)}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function CustomerDrawer({
  customer,
  enabled,
  invoices,
  onClose,
  onUpdated,
  products,
  reducedMotion,
}: {
  customer: LiveCustomer;
  enabled: boolean;
  invoices: LiveInvoice[];
  onClose: () => void;
  onUpdated: () => Promise<void>;
  products: LiveAdminProduct[];
  reducedMotion: boolean;
}) {
  const [tab, setTab] = useState<CustomerTab>("overview");
  const metrics = useMemo(
    () => customerMetrics(customer, products),
    [customer, products],
  );
  const transition = reducedMotion
    ? { duration: 0 }
    : {
        duration: 0.2,
        ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
      };
  return (
    <motion.div
      animate={{ opacity: 1 }}
      aria-label={`${customer.displayName} customer profile`}
      aria-modal="true"
      className="fixed inset-0 z-[70] bg-slate-950/35 backdrop-blur-[2px]"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      transition={transition}
    >
      <motion.aside
        animate={{ x: 0 }}
        className="absolute inset-y-0 right-0 flex w-full flex-col overflow-hidden bg-white shadow-2xl shadow-slate-950/20 sm:max-w-[36rem] sm:border-l sm:border-slate-200"
        exit={{ x: reducedMotion ? 0 : "100%" }}
        initial={{ x: reducedMotion ? 0 : "100%" }}
        onClick={(event) => event.stopPropagation()}
        transition={transition}
      >
        <header className="shrink-0 border-b border-slate-200 bg-white px-4 pb-0 pt-[max(1rem,env(safe-area-inset-top))] sm:px-5">
          <div className="flex items-center gap-3">
            <button
              autoFocus
              aria-label="Close customer profile"
              className="grid size-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-800 hover:bg-slate-200"
              onClick={onClose}
              type="button"
            >
              <ArrowLeft className="sm:hidden" size={20} />
              <X className="hidden sm:block" size={19} />
            </button>
            <Avatar customer={customer} size="large" />
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-black text-slate-950">
                {customer.displayName}
              </h3>
              <p className="truncate text-xs font-semibold text-slate-600">
                {customer.email || customer.customerId}
              </p>
            </div>
            <StatusPill disabled={Boolean(customer.disabled)} />
          </div>
          <div
            aria-label="Customer profile sections"
            className="mt-4 flex overflow-x-auto"
            role="tablist"
          >
            {tabs.map((item) => (
              <button
                aria-selected={tab === item.id}
                className={`relative min-h-12 min-w-20 flex-1 px-2 text-xs font-black sm:text-sm ${tab === item.id ? "text-slate-950" : "text-slate-500 hover:text-slate-800"}`}
                key={item.id}
                onClick={() => setTab(item.id)}
                role="tab"
                type="button"
              >
                {item.label}
                {tab === item.id ? (
                  <motion.span
                    className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-slate-950"
                    layoutId="customer-tab-indicator"
                    transition={transition}
                  />
                ) : null}
              </button>
            ))}
          </div>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[#fafafa] px-4 py-5 sm:px-5">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reducedMotion ? 0 : -3 }}
              initial={{ opacity: 0, y: reducedMotion ? 0 : 3 }}
              key={tab}
              transition={{ duration: reducedMotion ? 0 : 0.16 }}
            >
              {tab === "overview" ? (
                <OverviewTab
                  customer={customer}
                  enabled={enabled}
                  metrics={metrics}
                  onUpdated={onUpdated}
                />
              ) : null}
              {tab === "cart" ? (
                <CartTab customer={customer} products={products} />
              ) : null}
              {tab === "orders" ? (
                <OrdersTab
                  customer={customer}
                  products={products}
                  reducedMotion={reducedMotion}
                />
              ) : null}
              {tab === "invoices" ? <InvoicesTab invoices={invoices} /> : null}
              {tab === "activity" ? <ActivityTab customer={customer} /> : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.aside>
    </motion.div>
  );
}

function InvoicesTab({ invoices }: { invoices: LiveInvoice[] }) {
  const billed = invoices
    .filter((item) => !["cancelled", "deleted"].includes(item.status))
    .reduce((sum, item) => sum + item.total, 0);
  const due = invoices.reduce((sum, item) => sum + (item.balanceDue || 0), 0);
  return (
    <section>
      <SectionHeading
        eyebrow={`${invoices.length} documents`}
        title="Customer invoices"
      />
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <Metric label="Total billed" value={money(billed)} />
        <Metric label="Outstanding" value={money(due)} />
      </div>
      {invoices.length ? (
        <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {invoices.map((invoice) => (
            <a
              className="flex min-h-16 items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50"
              href={`/admin/invoices/${invoice.id}`}
              key={invoice.id}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-950">
                  {invoice.invoiceNumber}
                </span>
                <span className="mt-1 block text-xs font-semibold capitalize text-slate-500">
                  {invoice.status.replaceAll("_", " ")} ·{" "}
                  {formatDate(invoice.issuedAt || invoice.createdAt, false)}
                </span>
              </span>
              <span className="shrink-0 text-sm font-black">
                {money(invoice.total)}
              </span>
            </a>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FileText size={25} />}
          text="No invoices for this customer"
        />
      )}
    </section>
  );
}

function OverviewTab({
  customer,
  enabled,
  metrics,
  onUpdated,
}: {
  customer: LiveCustomer;
  enabled: boolean;
  metrics: ReturnType<typeof customerMetrics>;
  onUpdated: () => Promise<void>;
}) {
  const [role, setRole] = useState(customer.role || "customer");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const saveRole = async () => {
    setSaving(true);
    setNotice("");
    try {
      await updateAdminRole(customer.id, role);
      await onUpdated();
      setNotice("Account permission saved.");
    } catch (reason) {
      setNotice(
        reason instanceof Error
          ? reason.message
          : "Account permission could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="space-y-5">
      <section>
        <SectionHeading eyebrow="Customer value" title="Business overview" />
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Metric label="Total spent" value={money(metrics.totalSpent)} />
          <Metric
            label="Completed orders"
            value={String(metrics.completedOrders.length)}
          />
          <Metric label="Average order" value={money(metrics.averageOrder)} />
          <Metric
            label="Current cart"
            value={
              metrics.cartQuoteRequired
                ? "Quote required"
                : money(metrics.cartValue)
            }
          />
          <Metric
            label="Last purchase"
            value={
              metrics.lastPurchase
                ? formatDate(metrics.lastPurchase, false)
                : "No purchases"
            }
          />
          <Metric label="Cart items" value={String(cartQuantity(customer))} />
        </div>
      </section>
      <section className="border-t border-slate-200 pt-5">
        <SectionHeading
          eyebrow="Customer overview"
          title="Contact and account"
        />
        <dl className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-4">
          <InfoRow label="Name" value={customer.displayName} />
          <InfoRow label="Email" value={customer.email || "Not provided"} />
          <InfoRow label="Phone" value={customer.phone || "Not provided"} />
          <InfoRow
            label="Created"
            value={formatDate(customer.authCreatedAt || customer.createdAt)}
          />
          <InfoRow
            label="Last active"
            value={formatDate(latestCustomerActivity(customer))}
          />
          <InfoRow
            label="Status"
            value={customer.disabled ? "Disabled" : "Active"}
          />
        </dl>
        <div className="mt-3 space-y-2 text-sm font-semibold text-slate-700">
          {customer.companyName ? (
            <p className="flex gap-3">
              <ShoppingBag
                className="mt-0.5 shrink-0 text-slate-500"
                size={17}
              />
              <span>{customer.companyName}</span>
            </p>
          ) : null}
          {customer.email ? (
            <p className="flex gap-3">
              <Mail className="mt-0.5 shrink-0 text-slate-500" size={17} />
              <span className="break-all">{customer.email}</span>
            </p>
          ) : null}
          {customer.phone ? (
            <p className="flex gap-3">
              <Phone className="mt-0.5 shrink-0 text-slate-500" size={17} />
              <span>{customer.phone}</span>
            </p>
          ) : null}
          {customer.physicalAddress ||
          customer.deliveryAddress ||
          customer.city ||
          customer.province ? (
            <p className="flex gap-3">
              <MapPin className="mt-0.5 shrink-0 text-slate-500" size={17} />
              <span>
                {customer.physicalAddress ||
                  customer.deliveryAddress ||
                  [customer.city, customer.province].filter(Boolean).join(", ")}
              </span>
            </p>
          ) : null}
        </div>
      </section>
      <section className="border-t border-slate-200 pt-5">
        <SectionHeading
          eyebrow="Purchase patterns"
          title="Frequently purchased"
        />
        {metrics.frequentProducts.length ? (
          <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-4">
            {metrics.frequentProducts.map((item) => (
              <div
                className="flex items-center justify-between gap-4 py-3"
                key={item.name}
              >
                <p className="min-w-0 truncate text-sm font-bold text-slate-900">
                  {item.name}
                </p>
                <span className="shrink-0 text-xs font-black text-slate-600">
                  {item.quantity} items
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyInline text="Purchase patterns will appear after completed orders contain products." />
        )}
      </section>
      <section className="border-t border-slate-200 pt-5">
        <SectionHeading eyebrow="Account access" title="Permission" />
        <div className="mt-3 flex gap-2">
          <select
            aria-label="Customer account role"
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold capitalize text-slate-950"
            onChange={(event) => {
              setRole(event.target.value);
              setNotice("");
            }}
            value={normalizedRoleOption(role)}
          >
            <option value="customer">Customer</option>
            <option value="cashier">Cashier</option>
            <option value="salesperson">Salesperson</option>
            <option value="stock_controller">Stock controller</option>
            <option value="accountant">Accountant</option>
            <option value="manager">Manager</option>
            <option value="administrator">Administrator</option>
            <option value="owner">Owner</option>
          </select>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40"
            disabled={
              !enabled ||
              saving ||
              normalizedRoleOption(role) === normalizedRoleOption(customer.role)
            }
            onClick={() => void saveRole()}
            type="button"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Check size={17} />
            )}
            Save
          </button>
        </div>
        {notice ? (
          <p className="mt-2 text-xs font-bold text-slate-600">{notice}</p>
        ) : null}
        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-slate-600">
          <ShieldCheck size={15} />
          {customer.emailVerified
            ? "Supabase-verified email"
            : "Email has not been verified"}
        </p>
      </section>
    </div>
  );
}

function CartTab({
  customer,
  products,
}: {
  customer: LiveCustomer;
  products: LiveAdminProduct[];
}) {
  const rows = customer.carts.map((item) => cartRow(item, products));
  const subtotal = rows.reduce((sum, row) => sum + (row.lineTotal || 0), 0);
  const quoteRequired = rows.some((row) => row.unitPrice === null);
  return (
    <section>
      <SectionHeading
        eyebrow={`${cartQuantity(customer)} items`}
        title="Current cart"
      />
      {rows.length ? (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <article
              className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3"
              key={row.item.id}
            >
              <ProductImage alt={row.item.name} src={row.imageUrl} />
              <div className="min-w-0 flex-1">
                <h4 className="line-clamp-2 text-sm font-black text-slate-950">
                  {row.item.name}
                </h4>
                <p className="mt-1 text-xs font-semibold text-slate-600">
                  {row.item.productCode || row.item.availability}
                </p>
                <p className="mt-2 text-xs font-semibold text-slate-600">
                  Quantity {row.item.quantity} ·{" "}
                  {row.unitPrice === null
                    ? "Quote required"
                    : `${money(row.unitPrice)} each`}
                </p>
                {row.item.createdAt || row.item.updatedAt ? (
                  <p className="mt-1 text-[11px] font-semibold text-slate-500">
                    {row.item.createdAt ? "Added" : "Last updated"}{" "}
                    {formatDate(row.item.createdAt || row.item.updatedAt)}
                  </p>
                ) : null}
              </div>
              <p className="shrink-0 text-sm font-black text-slate-950">
                {row.lineTotal === null ? "—" : money(row.lineTotal)}
              </p>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState icon={<ShoppingCart size={25} />} text="Cart is empty" />
      )}
      {rows.length ? (
        <div className="mt-5 flex items-start justify-between gap-4 border-t border-slate-300 pt-4">
          <div>
            <p className="text-sm font-black text-slate-950">Cart subtotal</p>
            {quoteRequired ? (
              <p className="mt-1 text-xs font-semibold text-slate-600">
                Excludes products requiring a quote.
              </p>
            ) : null}
          </div>
          <p className="text-lg font-black text-slate-950">{money(subtotal)}</p>
        </div>
      ) : null}
    </section>
  );
}

function OrdersTab({
  customer,
  products,
  reducedMotion,
}: {
  customer: LiveCustomer;
  products: LiveAdminProduct[];
  reducedMotion: boolean;
}) {
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const orders = [...customer.orders].sort(
    (a, b) => dateValue(b.createdAt) - dateValue(a.createdAt),
  );
  return (
    <section>
      <SectionHeading
        eyebrow={`${orders.length} actual orders`}
        title="Purchase history"
      />
      {orders.length ? (
        <div className="mt-4 space-y-3">
          {orders.map((order, index) => {
            const orderId = String(order.id || index);
            const open = openOrderId === orderId;
            const items = orderItems(order);
            const payment = statusText(
              order.paymentStatus || order.payment || "Not recorded",
            );
            const delivery = statusText(
              order.deliveryStatus ||
                order.fulfilmentStatus ||
                order.status ||
                "Not recorded",
            );
            return (
              <article
                className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                key={orderId}
              >
                <button
                  aria-expanded={open}
                  className="flex min-h-16 w-full items-center gap-3 p-4 text-left hover:bg-slate-50"
                  onClick={() => setOpenOrderId(open ? null : orderId)}
                  type="button"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-slate-950">
                      {String(
                        order.orderNumber || `Order ${orderId.slice(0, 8)}`,
                      )}
                    </span>
                    <span className="mt-1 block text-xs font-semibold text-slate-600">
                      {formatDate(asString(order.createdAt), false)} ·{" "}
                      {items.length}{" "}
                      {items.length === 1 ? "product" : "products"}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-sm font-black text-slate-950">
                      {money(order.total)}
                    </span>
                    <span className="mt-1 block text-[11px] font-bold capitalize text-slate-600">
                      {statusText(order.status || "Pending")}
                    </span>
                  </span>
                  <ChevronDown
                    className={`shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
                    size={18}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div
                      animate={{ height: "auto", opacity: 1 }}
                      className="overflow-hidden"
                      exit={{ height: 0, opacity: 0 }}
                      initial={{ height: 0, opacity: 0 }}
                      transition={{ duration: reducedMotion ? 0 : 0.18 }}
                    >
                      <div className="border-t border-slate-200 p-4">
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <OrderStatus
                            label="Order"
                            value={statusText(order.status || "Pending")}
                          />
                          <OrderStatus label="Payment" value={payment} />
                          <OrderStatus label="Delivery" value={delivery} />
                        </div>
                        <div className="mt-4 divide-y divide-slate-200">
                          {items.length ? (
                            items.map((item, itemIndex) => {
                              const details = orderItemDetails(item, products);
                              return (
                                <div
                                  className="flex gap-3 py-3 first:pt-0"
                                  key={String(
                                    item.productId || item.id || itemIndex,
                                  )}
                                >
                                  <ProductImage
                                    alt={details.name}
                                    src={details.imageUrl}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="line-clamp-2 text-sm font-bold text-slate-950">
                                      {details.name}
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-600">
                                      Quantity {details.quantity}
                                      {details.unitPrice === null
                                        ? ""
                                        : ` · ${money(details.unitPrice)} each`}
                                    </p>
                                  </div>
                                  <p className="shrink-0 text-sm font-black text-slate-950">
                                    {details.lineTotal === null
                                      ? "—"
                                      : money(details.lineTotal)}
                                  </p>
                                </div>
                              );
                            })
                          ) : (
                            <EmptyInline text="No line items were saved on this order." />
                          )}
                        </div>
                        <dl className="mt-4 space-y-2 border-t border-slate-300 pt-4 text-sm">
                          <SummaryRow
                            label="Order total"
                            value={money(order.total)}
                          />
                          <SummaryRow
                            label="Total paid"
                            value={orderPaidTotal(order)}
                          />
                          {order.deliveryAddress ? (
                            <SummaryRow
                              label="Delivery address"
                              value={String(order.deliveryAddress)}
                            />
                          ) : null}
                        </dl>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </article>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Package size={25} />} text="No previous orders" />
      )}
    </section>
  );
}

function ActivityTab({ customer }: { customer: LiveCustomer }) {
  return (
    <section>
      <SectionHeading
        eyebrow="Secondary account information"
        title="Activity"
      />
      <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4">
        <ActivityRow
          icon={<Clock3 size={17} />}
          label="Account created"
          value={formatDate(customer.authCreatedAt || customer.createdAt)}
        />
        <ActivityRow
          icon={<Activity size={17} />}
          label="Last active"
          value={formatDate(latestCustomerActivity(customer))}
        />
        <ActivityRow
          icon={<ShieldCheck size={17} />}
          label="Sign-in provider"
          value={
            customer.provider.includes("google") ? "Google" : customer.provider
          }
        />
      </div>
      <h4 className="mt-6 text-xs font-black uppercase tracking-[.14em] text-slate-600">
        Recorded account events
      </h4>
      {customer.activities.length ? (
        <div className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white px-4">
          {customer.activities.map((item, index) => (
            <div className="py-3" key={String(item.id || index)}>
              <p className="text-sm font-bold text-slate-900">
                {String(
                  item.label || item.type || item.action || "Account activity",
                )}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                {formatDate(asString(item.createdAt || item.updatedAt))}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <EmptyInline text="No recorded account activity yet." />
      )}
    </section>
  );
}

function Avatar({
  customer,
  size,
}: {
  customer: LiveCustomer;
  size: "small" | "large";
}) {
  const className = size === "large" ? "size-11" : "size-10";
  return customer.photoURL ? (
    <img
      alt={`${customer.displayName} profile`}
      className={`${className} shrink-0 rounded-full object-cover ring-1 ring-slate-200`}
      referrerPolicy="no-referrer"
      src={customer.photoURL}
    />
  ) : (
    <span
      className={`grid ${className} shrink-0 place-items-center rounded-full bg-slate-950 text-sm font-black text-white`}
    >
      {initials(customer.displayName)}
    </span>
  );
}
function ProductImage({ alt, src }: { alt: string; src?: string }) {
  return (
    <span className="relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-50">
      {src ? (
        <Image
          alt={alt}
          className="object-contain p-1.5"
          fill
          sizes="64px"
          src={src}
        />
      ) : (
        <Package className="text-slate-400" size={21} />
      )}
    </span>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
      <p className="truncate text-[10px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-1.5 truncate text-sm font-black text-slate-950 sm:text-base">
        {value}
      </p>
    </div>
  );
}
function SectionHeading({
  eyebrow,
  title,
}: {
  eyebrow: string;
  title: string;
}) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[.14em] text-slate-500">
        {eyebrow}
      </p>
      <h4 className="mt-1 text-lg font-black text-slate-950">{title}</h4>
    </div>
  );
}
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-3 text-sm">
      <dt className="font-semibold text-slate-600">{label}</dt>
      <dd className="break-words text-right font-bold text-slate-950">
        {value}
      </dd>
    </div>
  );
}
function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="font-semibold text-slate-600">{label}</dt>
      <dd className="max-w-[65%] text-right font-black text-slate-950">
        {value}
      </dd>
    </div>
  );
}
function OrderStatus({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-slate-50 p-2.5">
      <p className="font-bold text-slate-500">{label}</p>
      <p className="mt-1 truncate font-black capitalize text-slate-900">
        {value}
      </p>
    </div>
  );
}
function ActivityRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-200 py-3 last:border-0">
      <span className="text-slate-500">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-slate-500">
          {label}
        </span>
        <span className="block truncate text-sm font-bold text-slate-900">
          {value}
        </span>
      </span>
    </div>
  );
}
function StatusPill({ disabled }: { disabled: boolean }) {
  return (
    <span
      className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[11px] font-black sm:inline-flex ${disabled ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}
    >
      {disabled ? "Disabled" : "Active"}
    </span>
  );
}
function EmptyInline({ text }: { text: string }) {
  return (
    <p className="mt-3 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm font-semibold text-slate-600">
      {text}
    </p>
  );
}
function EmptyState({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="grid min-h-44 place-items-center p-6 text-center">
      <div className="text-slate-400">
        {icon}
        <p className="mt-3 text-sm font-semibold text-slate-600">{text}</p>
      </div>
    </div>
  );
}
function Notice({
  text,
  tone = "red",
}: {
  text: string;
  tone?: "red" | "amber";
}) {
  return (
    <div
      className={`rounded-xl border p-4 text-sm font-bold ${tone === "amber" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-700"}`}
    >
      {text}
    </div>
  );
}

function customerMetrics(customer: LiveCustomer, products: LiveAdminProduct[]) {
  const completedOrders = customer.orders.filter(isCompletedOrder);
  const totalSpent = completedOrders.reduce(
    (sum, order) => sum + numeric(order.total),
    0,
  );
  const averageOrder = completedOrders.length
    ? totalSpent / completedOrders.length
    : 0;
  const cartRows = customer.carts.map((item) => cartRow(item, products));
  const cartValue = cartRows.reduce(
    (sum, row) => sum + (row.lineTotal || 0),
    0,
  );
  const lastPurchase =
    completedOrders
      .map((order) =>
        asString(
          order.completedAt ||
            order.deliveredAt ||
            order.updatedAt ||
            order.createdAt,
        ),
      )
      .filter(Boolean)
      .sort()
      .at(-1) || null;
  const counts = new Map<string, number>();
  completedOrders.forEach((order) =>
    orderItems(order).forEach((item) => {
      const name = String(
        item.productName || item.name || item.description || "Product",
      );
      counts.set(
        name,
        (counts.get(name) || 0) + Math.max(1, numeric(item.quantity, 1)),
      );
    }),
  );
  const frequentProducts = Array.from(counts, ([name, quantity]) => ({
    name,
    quantity,
  }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 3);
  return {
    averageOrder,
    cartQuoteRequired: cartRows.some((row) => row.unitPrice === null),
    cartValue,
    completedOrders,
    frequentProducts,
    lastPurchase,
    totalSpent,
  };
}
function cartRow(item: LiveCartItem, products: LiveAdminProduct[]) {
  const product = products.find(
    (candidate) =>
      candidate.id === item.productId || candidate.code === item.productCode,
  );
  const unitPrice = product?.priceVerified ? product.sellingPrice : null;
  return {
    imageUrl: product?.imageUrl,
    item,
    lineTotal: unitPrice === null ? null : unitPrice * item.quantity,
    unitPrice,
  };
}
function orderItemDetails(item: OrderRecord, products: LiveAdminProduct[]) {
  const product = products.find(
    (candidate) =>
      candidate.id === item.productId ||
      candidate.code === item.productCode ||
      candidate.name === item.productName ||
      candidate.name === item.name,
  );
  const quantity = Math.max(1, numeric(item.quantity, 1));
  const unitPrice = nullableNumber(item.unitPrice ?? item.price);
  const explicitTotal = nullableNumber(item.lineTotal ?? item.total);
  return {
    imageUrl: asString(item.imageUrl || item.image || product?.imageUrl),
    lineTotal:
      explicitTotal ?? (unitPrice === null ? null : unitPrice * quantity),
    name: String(
      item.productName ||
        item.name ||
        item.description ||
        product?.name ||
        "Product",
    ),
    quantity,
    unitPrice,
  };
}
function orderItems(order: OrderRecord) {
  return Array.isArray(order.items) ? (order.items as OrderRecord[]) : [];
}
function isCompletedOrder(order: OrderRecord) {
  return ["completed", "delivered"].includes(
    String(order.status || "").toLowerCase(),
  );
}
function orderPaidTotal(order: OrderRecord) {
  const explicit = nullableNumber(order.totalPaid ?? order.amountPaid);
  const paid =
    String(order.paymentStatus || order.payment || "").toLowerCase() === "paid";
  return explicit !== null
    ? money(explicit)
    : paid
      ? money(order.total)
      : "Not recorded as paid";
}
function cartQuantity(customer: LiveCustomer) {
  return customer.carts.reduce((sum, item) => sum + item.quantity, 0);
}
function latestCustomerActivity(customer: LiveCustomer) {
  return (
    [
      customer.lastSignInAt,
      customer.lastLoginAt,
      ...customer.activities.map((item) =>
        asString(item.createdAt || item.updatedAt),
      ),
    ]
      .filter(Boolean)
      .sort()
      .at(-1) || null
  );
}
function parsePrice(value?: string) {
  if (!value) return null;
  const compact = value.replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
  if (!compact || /\d-\d/.test(compact)) return null;
  const normalized = compact
    .replace(/,(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}
function nullableNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : parsePrice(value);
  }
  return null;
}
function numeric(value: unknown, fallback = 0) {
  const result = nullableNumber(value);
  return result === null ? fallback : result;
}
function dateValue(value: unknown) {
  const parsed = new Date(String(value || "")).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}
function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}
function statusText(value: unknown) {
  return String(value || "Not recorded").replaceAll("_", " ");
}
function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "TC"
  );
}
function normalizedRoleOption(role: string) {
  if (role === "sales") return "salesperson";
  if (role === "staff") return "manager";
  if (role === "admin" || role === "super_admin")
    return role === "admin" ? "administrator" : "owner";
  return role || "customer";
}
function relativeDate(value?: string | null) {
  if (!value) return "Never signed in";
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return "Unknown activity";
  const days = Math.floor((Date.now() - time) / 86_400_000);
  if (days <= 0) return "Active today";
  if (days === 1) return "Active yesterday";
  if (days < 30) return `Active ${days} days ago`;
  return formatDate(value, false);
}
function formatDate(value?: string | null, includeTime = true) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Unknown"
    : date.toLocaleString(
        "en-ZA",
        includeTime
          ? { dateStyle: "medium", timeStyle: "short" }
          : { dateStyle: "medium" },
      );
}
function money(value: unknown) {
  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(numeric(value));
}
