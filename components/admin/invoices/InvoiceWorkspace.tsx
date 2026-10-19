"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Bold,
  CircleDollarSign,
  Copy,
  Download,
  Eye,
  FileText,
  GripVertical,
  Italic,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  PackagePlus,
  Plus,
  Printer,
  RotateCcw,
  Save,
  Send,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  InvoiceDiscountType,
  LiveAdminProduct,
  LiveAdminSettings,
  LiveAdminWorkspace,
  LiveCustomer,
  LiveInvoice,
  LiveInvoiceItem,
} from "@/lib/admin-live-types";
import { calculateInvoice, invoiceDeposit } from "@/lib/invoice-calculations";
import {
  duplicateAdminInvoice,
  recordAdminInvoicePayment,
  saveAdminInvoice,
  sendAdminInvoice,
  updateAdminInvoice,
  useAdminWorkspace,
} from "@/lib/use-admin-workspace";
import { InvoicePreview } from "@/components/admin/invoices/InvoicePreview";
import { useSession } from "@/components/auth/StaffSessionProvider";
import { InvoiceStatus as Status } from "@/components/admin/invoices/InvoiceStatus";
import {
  readPosAttempt,
  storePosAttempt,
  isDefinitiveCommandFailure,
  CommandResponseError,
} from "@/lib/pos-pending";
import {
  recoverInvoicePaymentAttempt,
  type InvoicePaymentAttempt,
} from "@/lib/invoice-payment-pending";

type Tab =
  | "edit"
  | "documents"
  | "settings"
  | "activity"
  | "history"
  | "email"
  | "schedule";
const tabs: Array<{ id: Tab; label: string }> = [
  { id: "edit", label: "Edit" },
  { id: "documents", label: "Documents" },
  { id: "settings", label: "Settings" },
  { id: "activity", label: "Activity" },
  { id: "history", label: "History" },
  { id: "email", label: "Email History" },
  { id: "schedule", label: "Payment Schedule" },
];

export function InvoiceWorkspace({ mode }: { mode: "new" | "edit" }) {
  const { workspace, loading, error, refresh } = useAdminWorkspace();
  const params = useParams<{ id?: string }>();
  const invoiceId = mode === "edit" ? String(params.id || "") : "";
  const source = workspace?.invoices.find((item) => item.id === invoiceId);
  const { data: session } = useSession();
  if (!workspace || !session) {
    return (
      <p className="p-6 text-sm font-semibold text-slate-600">
        {error || (loading ? "Loading invoice…" : "Sign in to load invoices.")}
      </p>
    );
  }
  if (mode === "edit" && !source) return <EmptyMissing />;
  return (
    <InvoiceEditor
      key={`${session.user.id}:${invoiceId || "new"}`}
      mode={mode}
      source={source}
      workspace={workspace}
      error={error}
      refresh={refresh}
      draftStorageKey={`truecolours:new-invoice:${session.user.id}`}
    />
  );
}

function InvoiceEditor({
  mode,
  source,
  workspace,
  error,
  refresh,
  draftStorageKey,
}: {
  mode: "new" | "edit";
  source?: LiveInvoice;
  workspace: LiveAdminWorkspace;
  error: string;
  refresh: () => Promise<void>;
  draftStorageKey: string;
}) {
  const router = useRouter();
  const { data: staffSession } = useSession();
  const [draft, setDraft] = useState<LiveInvoice>(() => {
    if (source) return source;
    try {
      const saved = window.localStorage.getItem(draftStorageKey);
      if (saved) return reviveDraft(saved, workspace.settings);
    } catch {
      /* Private browser modes can deny local draft storage. */
    }
    return emptyInvoice(workspace.settings);
  });
  const [tab, setTab] = useState<Tab>("edit");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(false);
  const [modal, setModal] = useState<"send" | "payment" | null>(() =>
    source &&
    recoverInvoicePaymentAttempt(
      source.id,
      readPosAttempt(
        `truecolours:invoice-payment:${staffSession?.user.id}:${source.id}`,
      ),
    )
      ? "payment"
      : null,
  );
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (mode !== "new" || !dirty) return;
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    } catch {
      /* Saving online remains available. */
    }
  }, [dirty, draft, mode, draftStorageKey]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [dirty]);

  const currentDraft = source && !dirty ? source : draft;
  const currentPayments = source?.payments || draft.payments;
  const computed = useMemo(
    () =>
      currentDraft
        ? calculateInvoice({
            items: currentDraft.items,
            discountType: currentDraft.discountType,
            discountValue: currentDraft.discountValue,
            extraCharges: currentDraft.extraCharges,
            deliveryFee: currentDraft.deliveryFee,
            payments: currentPayments,
          })
        : null,
    [currentDraft, currentPayments],
  );
  const invoice = useMemo(
    () =>
      currentDraft && computed
        ? {
            ...currentDraft,
            ...computed,
            payments: currentPayments,
            depositAmount: invoiceDeposit(
              computed.total,
              currentDraft.depositType,
              currentDraft.depositValue,
            ),
          }
        : currentDraft,
    [computed, currentDraft, currentPayments],
  );
  const update = useCallback(
    (changes: Partial<LiveInvoice>) => {
      setDraft((value) => ({
        ...(source && !dirty ? source : value),
        ...changes,
      }));
      setDirty(true);
      setNotice("");
    },
    [source, dirty],
  );
  const save = useCallback(
    async (silent = false) => {
      if (!invoice || !workspace?.configured) return;
      if (
        !invoice.customerName.trim() ||
        !invoice.items.some((item) => item.name.trim())
      ) {
        if (!silent)
          setNotice("Add a customer and at least one item before saving.");
        return;
      }
      setSaving(true);
      if (!silent) setNotice("");
      try {
        const result = await saveAdminInvoice({
          ...invoice,
          invoiceId: invoice.id || undefined,
        });
        setDirty(false);
        try {
          window.localStorage.removeItem(draftStorageKey);
        } catch {
          /* No persisted draft. */
        }
        if (!silent) setNotice("Invoice saved to Supabase.");
        if (!invoice.id && result.invoiceId) {
          router.replace(`/admin/invoices/${result.invoiceId}`);
          return;
        }
        await refresh();
      } catch (reason) {
        setNotice(
          reason instanceof Error
            ? reason.message
            : "Invoice could not be saved.",
        );
      } finally {
        setSaving(false);
      }
    },
    [invoice, refresh, router, workspace.configured, draftStorageKey],
  );
  useEffect(() => {
    if (!dirty || !invoice?.id || saving) return;
    const timer = window.setTimeout(() => void save(true), 1200);
    return () => window.clearTimeout(timer);
  }, [dirty, invoice?.id, save, saving]);

  const settings = workspace.settings;
  return (
    <div className="invoice-workspace mx-auto max-w-[1600px] space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            aria-label="Back to invoices"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
            href="/admin/invoices"
          >
            <ArrowLeft size={19} />
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-black sm:text-xl">
                {invoice.id ? invoice.invoiceNumber : "New invoice"}
              </h2>
              <Status value={invoice.status} />
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {saving
                ? "Saving changes…"
                : dirty
                  ? "Unsaved changes"
                  : invoice.updatedAt
                    ? `Saved ${relative(invoice.updatedAt)}`
                    : "Draft not saved yet"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-black hover:bg-slate-50"
            onClick={() => setPreview(true)}
          >
            <Eye size={17} />
            Preview
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40"
            disabled={saving || !workspace.configured}
            onClick={() => void save(false)}
          >
            {saving ? (
              <Loader2 className="animate-spin" size={17} />
            ) : (
              <Save size={17} />
            )}
            Save
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-40"
            disabled={!invoice.id}
            onClick={() => setModal("send")}
          >
            <Send size={17} />
            Send
          </button>
          <div className="relative">
            <button
              aria-label="More invoice actions"
              className="grid min-h-11 w-full min-w-11 place-items-center rounded-xl border border-slate-200 hover:bg-slate-50"
              onClick={() => setMenu((value) => !value)}
            >
              <MoreHorizontal size={19} />
            </button>
            {menu ? (
              <ActionMenu
                invoice={invoice}
                onClose={() => setMenu(false)}
                onPayment={() => setModal("payment")}
                onRefresh={refresh}
                router={router}
              />
            ) : null}
          </div>
        </div>
      </div>
      {error || notice ? (
        <div
          className={`flex gap-3 rounded-xl border p-3.5 text-sm font-bold ${error || /could not|add |already|invalid/i.test(notice) ? "border-red-200 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          <AlertTriangle className="shrink-0" size={18} />
          {error || notice}
        </div>
      ) : null}
      <nav
        aria-label="Invoice workspace sections"
        className="flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5"
      >
        {tabs.map((item) => (
          <button
            className={`min-h-10 shrink-0 rounded-lg px-3 text-xs font-black transition ${tab === item.id ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-100 hover:text-slate-950"}`}
            key={item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      {tab === "edit" ? (
        <Editor
          draft={invoice}
          customers={workspace.customers}
          products={workspace.products}
          settings={settings}
          update={update}
        />
      ) : (
        <TabPanel invoice={invoice} settings={settings} tab={tab} />
      )}
      <AnimatePresence>
        {preview ? (
          <ModalFrame
            full
            title={`Preview · ${invoice.invoiceNumber}`}
            onClose={() => setPreview(false)}
          >
            <div className="min-h-full bg-slate-200 p-2 sm:p-6">
              <div className="mb-3 flex flex-wrap justify-end gap-2 print:hidden">
                <a
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-black"
                  href={`/api/admin/invoices/${invoice.id}/pdf`}
                >
                  <Download size={17} />
                  Download PDF
                </a>
                <button
                  className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white"
                  onClick={() => window.print()}
                >
                  <Printer size={17} />
                  Print
                </button>
              </div>
              <div className="overflow-auto">
                <InvoicePreview compact invoice={invoice} settings={settings} />
              </div>
            </div>
          </ModalFrame>
        ) : null}
        {modal === "send" ? (
          <SendModal
            invoice={invoice}
            onClose={() => setModal(null)}
            onDone={async (message) => {
              setNotice(message);
              setModal(null);
              await refresh();
            }}
          />
        ) : null}
        {modal === "payment" ? (
          <PaymentModal
            invoice={invoice}
            onClose={() => setModal(null)}
            onDone={async () => {
              setNotice("Payment recorded.");
              setModal(null);
              await refresh();
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Editor({
  draft,
  customers,
  products,
  settings,
  update,
}: {
  draft: LiveInvoice;
  customers: LiveCustomer[];
  products: LiveAdminProduct[];
  settings: LiveAdminSettings;
  update: (changes: Partial<LiveInvoice>) => void;
}) {
  const [dragged, setDragged] = useState<number | null>(null);
  const setItem = (index: number, changes: Partial<LiveInvoiceItem>) =>
    update({
      items: draft.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...changes } : item,
      ),
    });
  const move = (from: number, to: number) => {
    if (to < 0 || to >= draft.items.length || from === to) return;
    const items = [...draft.items];
    const [item] = items.splice(from, 1);
    items.splice(to, 0, item);
    update({ items });
  };
  const addProduct = (productId: string) => {
    const product = products.find((item) => item.id === productId);
    if (!product) return;
    update({
      items: [
        ...draft.items,
        makeItem({
          productId: product.id,
          code: product.code,
          name: product.name,
          description: [product.brand, product.category]
            .filter(Boolean)
            .join(" · "),
          unitPrice: product.sellingPrice ?? 0,
          taxRate: settings.vatRate,
        }),
      ],
    });
  };
  const customerChanged = (id: string) => {
    const customer = customers.find((item) => item.id === id);
    if (!customer) {
      update({
        userId: "",
        customerType: "walk-in",
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        customerCompany: "",
        vatNumber: "",
        customerAccountNumber: "",
        billingAddress: "",
      });
      return;
    }
    update({
      userId: customer.id,
      customerType: "registered",
      customerName: customer.displayName,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerCompany: customer.companyName,
      customerAccountNumber: customer.customerId,
      billingAddress:
        customer.physicalAddress ||
        customer.deliveryAddress ||
        [customer.city, customer.province].filter(Boolean).join(", "),
    });
  };
  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
      <div className="min-w-0 space-y-4">
        <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 sm:p-5">
          <div>
            <SectionTitle eyebrow="Customer" title="Billing contact" />
            <Field label="Registered customer">
              <select
                className="invoice-input"
                onChange={(event) => customerChanged(event.target.value)}
                value={draft.userId}
              >
                <option value="">Walk-in / manual customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.displayName} · {customer.email}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Contact person">
              <input
                className="invoice-input"
                onChange={(event) =>
                  update({ customerName: event.target.value })
                }
                value={draft.customerName}
              />
            </Field>
            <Field label="Business name">
              <input
                className="invoice-input"
                onChange={(event) =>
                  update({ customerCompany: event.target.value })
                }
                value={draft.customerCompany}
              />
            </Field>
            <Field label="Email">
              <input
                className="invoice-input"
                onChange={(event) =>
                  update({ customerEmail: event.target.value })
                }
                type="email"
                value={draft.customerEmail}
              />
            </Field>
            <Field label="Phone">
              <input
                className="invoice-input"
                onChange={(event) =>
                  update({ customerPhone: event.target.value })
                }
                value={draft.customerPhone || ""}
              />
            </Field>
            <Field label="Customer VAT number">
              <input
                className="invoice-input"
                onChange={(event) => update({ vatNumber: event.target.value })}
                value={draft.vatNumber || ""}
              />
            </Field>
            <Field label="Account number">
              <input
                className="invoice-input"
                onChange={(event) =>
                  update({ customerAccountNumber: event.target.value })
                }
                value={draft.customerAccountNumber || ""}
              />
            </Field>
            <Field label="Physical / delivery address" wide>
              <textarea
                className="invoice-input min-h-20 py-3"
                onChange={(event) =>
                  update({ billingAddress: event.target.value })
                }
                value={draft.billingAddress}
              />
            </Field>
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <SectionTitle
            eyebrow="Invoice details"
            title="Dates and transaction references"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Invoice date">
              <input
                className="invoice-input"
                onChange={(event) =>
                  update({ issuedAt: asIso(event.target.value) })
                }
                type="date"
                value={dateInputValue(draft.issuedAt)}
              />
            </Field>
            <Field label="Due date">
              <input
                className="invoice-input"
                onChange={(event) =>
                  update({ dueDate: asIso(event.target.value) })
                }
                type="date"
                value={dateInputValue(draft.dueDate)}
              />
            </Field>
            <Field label="Invoice number">
              <input
                className="invoice-input"
                onChange={(event) =>
                  update({ invoiceNumber: event.target.value })
                }
                placeholder="Assigned on save"
                value={draft.invoiceNumber}
              />
            </Field>
            <Field label="Order number">
              <input
                className="invoice-input"
                onChange={(event) =>
                  update({ orderNumber: event.target.value })
                }
                value={draft.orderNumber || ""}
              />
            </Field>
            <Field label="Purchase order">
              <input
                className="invoice-input"
                onChange={(event) => update({ poNumber: event.target.value })}
                value={draft.poNumber || ""}
              />
            </Field>
            <Field label="Representative">
              <input
                className="invoice-input"
                onChange={(event) =>
                  update({ representative: event.target.value })
                }
                value={draft.representative || ""}
              />
            </Field>
            <Field label="Cashier / prepared by">
              <input
                className="invoice-input"
                onChange={(event) => update({ preparedBy: event.target.value })}
                value={draft.preparedBy || ""}
              />
            </Field>
            <Field label="Currency">
              <select className="invoice-input" disabled>
                <option>ZAR · South African rand</option>
              </select>
            </Field>
            <Field label="Tags" wide>
              <input
                className="invoice-input"
                onChange={(event) =>
                  update({
                    tags: event.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="trade, walk-in, fleet"
                value={(draft.tags || []).join(", ")}
              />
            </Field>
          </div>
        </section>
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-col gap-3 border-b border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <SectionTitle
              eyebrow={`${draft.items.length} line items`}
              title="Products and services"
            />
            <div className="flex gap-2">
              <select
                aria-label="Add catalogue product"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold sm:max-w-64"
                defaultValue=""
                onChange={(event) => {
                  addProduct(event.target.value);
                  event.target.value = "";
                }}
              >
                <option value="">Add inventory product…</option>
                {products
                  .filter((product) => product.visible)
                  .map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
              </select>
              <button
                className="grid size-11 shrink-0 place-items-center rounded-xl bg-slate-950 text-white"
                onClick={() =>
                  update({
                    items: [
                      ...draft.items,
                      makeItem({ taxRate: settings.vatRate }),
                    ],
                  })
                }
              >
                <Plus size={18} />
              </button>
            </div>
          </div>
          <div className="hidden grid-cols-[2rem_minmax(10rem,1.45fr)_minmax(7rem,1fr)_6rem_6.5rem_6rem_7rem_5.5rem] gap-2 border-b border-slate-200 bg-slate-50 px-3 py-3 text-[9px] font-black uppercase tracking-wider text-slate-500 lg:grid">
            <span />
            <span>Item</span>
            <span>Description</span>
            <span>Unit cost</span>
            <span>Quantity</span>
            <span>Tax</span>
            <span>Discount</span>
            <span>Total</span>
          </div>
          <div className="divide-y divide-slate-200">
            {draft.items.map((item, index) => (
              <article
                className="grid gap-3 p-4 lg:grid-cols-[2rem_minmax(10rem,1.45fr)_minmax(7rem,1fr)_6rem_6.5rem_6rem_7rem_5.5rem] lg:items-start lg:gap-2 lg:px-3"
                draggable
                onDragEnd={() => setDragged(null)}
                onDragOver={(event) => event.preventDefault()}
                onDragStart={() => setDragged(index)}
                onDrop={() => {
                  if (dragged !== null) move(dragged, index);
                  setDragged(null);
                }}
                key={item.id}
              >
                <div className="flex items-center justify-between lg:block">
                  <GripVertical
                    className="hidden cursor-grab text-slate-400 lg:block"
                    size={19}
                  />
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 lg:hidden">
                    Item {index + 1}
                  </span>
                  <div className="flex gap-1 lg:hidden">
                    <IconButton
                      label="Move up"
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowUp size={16} />
                    </IconButton>
                    <IconButton
                      label="Move down"
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDown size={16} />
                    </IconButton>
                    <IconButton
                      label="Duplicate"
                      onClick={() =>
                        update({
                          items: [
                            ...draft.items.slice(0, index + 1),
                            { ...item, id: crypto.randomUUID() },
                            ...draft.items.slice(index + 1),
                          ],
                        })
                      }
                    >
                      <Copy size={16} />
                    </IconButton>
                    <IconButton
                      label="Delete"
                      onClick={() =>
                        update({
                          items: draft.items.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </div>
                </div>
                <label className="text-[10px] font-black text-slate-500 lg:text-transparent">
                  Item
                  <input
                    className="invoice-input mt-1 lg:mt-0"
                    onChange={(event) =>
                      setItem(index, { name: event.target.value })
                    }
                    value={item.name}
                  />
                  <input
                    className="mt-2 min-h-9 w-full rounded-lg border border-slate-200 px-2 text-[11px] font-semibold"
                    onChange={(event) =>
                      setItem(index, { code: event.target.value })
                    }
                    placeholder="Code / SKU"
                    value={item.code || ""}
                  />
                </label>
                <Field label="Description">
                  <textarea
                    className="invoice-input min-h-20 py-2"
                    onChange={(event) =>
                      setItem(index, { description: event.target.value })
                    }
                    value={item.description}
                  />
                </Field>
                <Field label="Unit cost">
                  <input
                    className="invoice-input"
                    min="0"
                    onChange={(event) =>
                      setItem(index, { unitPrice: Number(event.target.value) })
                    }
                    step="0.01"
                    type="number"
                    value={item.unitPrice}
                  />
                </Field>
                <Field label="Quantity">
                  <input
                    className="invoice-input"
                    min="0.001"
                    onChange={(event) =>
                      setItem(index, { quantity: Number(event.target.value) })
                    }
                    step="0.001"
                    type="number"
                    value={item.quantity}
                  />
                </Field>
                <Field label="Tax">
                  <input
                    className="invoice-input"
                    min="0"
                    onChange={(event) =>
                      setItem(index, { taxRate: Number(event.target.value) })
                    }
                    step="0.01"
                    type="number"
                    value={item.taxRate}
                  />
                </Field>
                <Field label="Discount">
                  <div className="flex">
                    <select
                      className="invoice-input rounded-r-none px-1"
                      onChange={(event) =>
                        setItem(index, {
                          discountType: event.target
                            .value as InvoiceDiscountType,
                        })
                      }
                      value={item.discountType}
                    >
                      <option value="none">—</option>
                      <option value="percent">%</option>
                      <option value="fixed">R</option>
                    </select>
                    {item.discountType !== "none" ? (
                      <input
                        className="invoice-input w-16 rounded-l-none border-l-0 px-1"
                        min="0"
                        onChange={(event) =>
                          setItem(index, {
                            discountValue: Number(event.target.value),
                          })
                        }
                        type="number"
                        value={item.discountValue}
                      />
                    ) : null}
                  </div>
                </Field>
                <div className="flex items-center justify-between lg:block">
                  <span className="text-xs font-bold text-slate-500 lg:hidden">
                    Line total
                  </span>
                  <p className="pt-3 text-right text-sm font-black lg:pt-3">
                    {money(item.lineTotal)}
                  </p>
                  <div className="mt-3 hidden justify-end gap-1 lg:flex">
                    <IconButton
                      label="Duplicate"
                      onClick={() =>
                        update({
                          items: [
                            ...draft.items.slice(0, index + 1),
                            { ...item, id: crypto.randomUUID() },
                            ...draft.items.slice(index + 1),
                          ],
                        })
                      }
                    >
                      <Copy size={14} />
                    </IconButton>
                    <IconButton
                      label="Delete"
                      onClick={() =>
                        update({
                          items: draft.items.filter(
                            (_, itemIndex) => itemIndex !== index,
                          ),
                        })
                      }
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!draft.items.length ? (
            <button
              className="m-4 flex min-h-28 w-[calc(100%-2rem)] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-sm font-black text-slate-500 hover:bg-slate-50"
              onClick={() =>
                update({ items: [makeItem({ taxRate: settings.vatRate })] })
              }
            >
              <PackagePlus className="mb-2" size={23} />
              Add the first invoice item
            </button>
          ) : null}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <SectionTitle
            eyebrow="Customer-facing content"
            title="Notes and payment terms"
          />
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <RichField
              label="Public notes"
              value={draft.publicNotes || ""}
              onChange={(value) => update({ publicNotes: value })}
            />
            <RichField
              label="Payment terms"
              value={draft.paymentTerms || draft.terms || ""}
              onChange={(value) => update({ paymentTerms: value })}
            />
            <Field label="Private team notes" wide>
              <textarea
                className="invoice-input min-h-28 py-3"
                onChange={(event) =>
                  update({ privateNotes: event.target.value })
                }
                value={draft.privateNotes || ""}
              />
            </Field>
            <Field label="Invoice footer" wide>
              <textarea
                className="invoice-input min-h-20 py-3"
                onChange={(event) => update({ footer: event.target.value })}
                value={draft.footer || ""}
              />
            </Field>
          </div>
        </section>
      </div>
      <aside className="space-y-4 xl:sticky xl:top-[5.5rem]">
        <Totals invoice={draft} update={update} />
        <section className="rounded-2xl border border-slate-200 bg-white p-4">
          <SectionTitle eyebrow="Payment" title="Deposit request" />
          <div className="mt-3 flex">
            <select
              className="invoice-input rounded-r-none"
              onChange={(event) =>
                update({
                  depositType: event.target.value as InvoiceDiscountType,
                })
              }
              value={draft.depositType || "none"}
            >
              <option value="none">No deposit</option>
              <option value="percent">Percentage</option>
              <option value="fixed">Fixed amount</option>
            </select>
            {draft.depositType !== "none" ? (
              <input
                className="invoice-input w-24 rounded-l-none border-l-0"
                min="0"
                onChange={(event) =>
                  update({ depositValue: Number(event.target.value) })
                }
                type="number"
                value={draft.depositValue || 0}
              />
            ) : null}
          </div>
          {(draft.depositAmount || 0) > 0 ? (
            <p className="mt-3 text-sm font-black">
              Requested: {money(draft.depositAmount)}
            </p>
          ) : null}
        </section>
      </aside>
    </div>
  );
}

function Totals({
  invoice,
  update,
}: {
  invoice: LiveInvoice;
  update: (changes: Partial<LiveInvoice>) => void;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <SectionTitle eyebrow="Live calculation" title="Invoice summary" />
      <dl className="mt-5 space-y-3 text-sm">
        <Total label="Subtotal" value={invoice.subtotal} />
        {(invoice.lineDiscountTotal || 0) > 0 ? (
          <Total
            label="Line discounts"
            value={invoice.lineDiscountTotal || 0}
          />
        ) : null}
        <div className="grid grid-cols-[1fr_5.5rem] gap-2">
          <select
            className="invoice-input"
            onChange={(event) =>
              update({
                discountType: event.target.value as InvoiceDiscountType,
              })
            }
            value={invoice.discountType || "none"}
          >
            <option value="none">No invoice discount</option>
            <option value="percent">Discount %</option>
            <option value="fixed">Discount R</option>
          </select>
          {invoice.discountType !== "none" ? (
            <input
              className="invoice-input"
              min="0"
              onChange={(event) =>
                update({ discountValue: Number(event.target.value) })
              }
              type="number"
              value={invoice.discountValue || 0}
            />
          ) : (
            <span />
          )}
        </div>
        {(invoice.discountAmount || 0) > 0 ? (
          <Total label="Invoice discount" value={invoice.discountAmount || 0} />
        ) : null}
        <Total label="VAT" value={invoice.vatAmount} />
        <label className="flex items-center justify-between gap-3 text-slate-500">
          <span>Extra charges</span>
          <input
            className="h-10 w-28 rounded-lg border border-slate-200 px-2 text-right font-bold text-slate-950"
            min="0"
            onChange={(event) =>
              update({ extraCharges: Number(event.target.value) })
            }
            step="0.01"
            type="number"
            value={invoice.extraCharges || 0}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-slate-500">
          <span>Delivery / transport</span>
          <input
            className="h-10 w-28 rounded-lg border border-slate-200 px-2 text-right font-bold text-slate-950"
            min="0"
            onChange={(event) =>
              update({ deliveryFee: Number(event.target.value) })
            }
            step="0.01"
            type="number"
            value={invoice.deliveryFee}
          />
        </label>
        <div className="flex justify-between border-t-2 border-slate-950 pt-4 text-lg font-black">
          <dt>Total</dt>
          <dd>{money(invoice.total)}</dd>
        </div>
        <Total label="Amount paid" value={invoice.amountPaid || 0} />
        <div className="flex justify-between border-t border-slate-200 pt-4 font-black">
          <dt>Balance due</dt>
          <dd>{money(invoice.balanceDue ?? invoice.total)}</dd>
        </div>
      </dl>
    </section>
  );
}

function TabPanel({
  invoice,
  settings,
  tab,
}: {
  invoice: LiveInvoice;
  settings: LiveAdminSettings;
  tab: Tab;
}) {
  if (tab === "documents")
    return (
      <Panel title="Documents" note="Generated and attached invoice records">
        <ListEmpty
          empty={!invoice.documents?.length}
          text="No supporting documents have been attached."
        >
          {invoice.documents?.map((item) => (
            <RecordRow
              key={item.id}
              title={item.name}
              meta={dateText(item.createdAt)}
              action={
                <a className="font-black underline" href={item.url}>
                  Open
                </a>
              }
            />
          ))}
        </ListEmpty>
      </Panel>
    );
  if (tab === "settings")
    return (
      <Panel
        title="Invoice settings"
        note="Defaults come from the business settings stored in Supabase"
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <Info label="VAT rate" value={`${settings.vatRate}%`} />
          <Info
            label="Payment terms"
            value={`${settings.defaultPaymentTerms} days`}
          />
          <Info label="Currency" value="ZAR" />
          <Info label="Number prefix" value={settings.invoicePrefix} />
        </div>
        <Link
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white"
          href="/admin/settings"
        >
          <Settings2 size={17} />
          Edit business defaults
        </Link>
      </Panel>
    );
  if (tab === "activity")
    return (
      <Panel title="Activity" note="Operational events for this invoice">
        <ListEmpty
          empty={!invoice.activity?.length}
          text="Activity appears as the invoice is saved, sent, viewed and paid."
        >
          {[...(invoice.activity || [])].reverse().map((item) => (
            <RecordRow
              key={item.id}
              title={item.description}
              meta={`${item.actor} · ${dateText(item.createdAt)}`}
            />
          ))}
        </ListEmpty>
      </Panel>
    );
  if (tab === "history")
    return (
      <Panel
        title="Revision history"
        note="A revision is recorded for each server save"
      >
        <ListEmpty
          empty={!invoice.revisions?.length}
          text="The first revision is created when the draft is saved."
        >
          {[...(invoice.revisions || [])].reverse().map((item) => (
            <RecordRow
              key={item.id}
              title={`Version ${item.version} · ${item.summary}`}
              meta={`${item.actor} · ${dateText(item.createdAt)}`}
            />
          ))}
        </ListEmpty>
      </Panel>
    );
  if (tab === "email")
    return (
      <Panel
        title="Email history"
        note="Successful and failed delivery attempts"
      >
        <ListEmpty
          empty={!invoice.emailHistory?.length}
          text="No email delivery has been attempted."
        >
          {[...(invoice.emailHistory || [])].reverse().map((item) => (
            <RecordRow
              key={item.id}
              title={`${item.status === "sent" ? "Sent" : "Not sent"} · ${item.subject}`}
              meta={`${item.to || "No recipient"} · ${dateText(item.sentAt)}${item.error ? ` · ${item.error}` : ""}`}
            />
          ))}
        </ListEmpty>
      </Panel>
    );
  return (
    <Panel title="Payment schedule" note="Payments and requested deposit">
      <div className="grid gap-3 sm:grid-cols-3">
        <Info label="Invoice total" value={money(invoice.total)} />
        <Info
          label="Deposit requested"
          value={money(invoice.depositAmount || 0)}
        />
        <Info
          label="Balance due"
          value={money(invoice.balanceDue ?? invoice.total)}
        />
      </div>
      <ListEmpty
        empty={!invoice.payments?.length}
        text="No payments have been recorded."
      >
        {[...(invoice.payments || [])].reverse().map((item) => (
          <RecordRow
            key={item.id}
            title={`${money(item.amount)} · ${item.method}`}
            meta={`${dateText(item.paidAt)}${item.reference ? ` · ${item.reference}` : ""}`}
          />
        ))}
      </ListEmpty>
    </Panel>
  );
}

function SendModal({
  invoice,
  onClose,
  onDone,
}: {
  invoice: LiveInvoice;
  onClose: () => void;
  onDone: (message: string) => Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setWorking(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const result = await sendAdminInvoice(invoice.id, {
        to: String(form.get("to") || ""),
        cc: String(form.get("cc") || ""),
        subject: String(form.get("subject") || ""),
        message: String(form.get("message") || ""),
      });
      await onDone(String(result.message || "Invoice sent."));
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Invoice could not be sent.",
      );
    } finally {
      setWorking(false);
    }
  };
  return (
    <ModalFrame title="Send invoice" onClose={onClose}>
      <form className="space-y-4 p-4 sm:p-5" onSubmit={submit}>
        {error ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}
        <Field label="To">
          <input
            className="invoice-input"
            defaultValue={invoice.customerEmail}
            name="to"
            type="email"
          />
        </Field>
        <Field label="CC">
          <input className="invoice-input" name="cc" type="email" />
        </Field>
        <Field label="Subject">
          <input
            className="invoice-input"
            defaultValue={`Invoice ${invoice.invoiceNumber} from TRUECOLOURS`}
            name="subject"
          />
        </Field>
        <Field label="Message">
          <textarea
            className="invoice-input min-h-32 py-3"
            defaultValue={`Hello ${invoice.customerName},\n\nYour TRUECOLOURS invoice for ${money(invoice.total)} is ready.\n\nThank you.`}
            name="message"
          />
        </Field>
        <p className="text-xs font-semibold leading-5 text-slate-500">
          Registered customers receive the invoice in their account. Email is
          also sent when the secure invoice email webhook is configured.
        </p>
        <button
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-black text-white disabled:opacity-40"
          disabled={working}
        >
          {working ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <Send size={18} />
          )}
          Send invoice
        </button>
        {invoice.shareToken && invoice.customerPhone ? (
          <a
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#128c7e] px-4 text-sm font-black text-white"
            href={whatsappUrl(invoice)}
            rel="noreferrer"
            target="_blank"
          >
            <MessageCircle size={18} />
            Share secure link on WhatsApp
          </a>
        ) : (
          <p className="rounded-xl bg-slate-100 p-3 text-center text-xs font-bold text-slate-500">
            Save the invoice with a customer phone number to enable WhatsApp
            sharing.
          </p>
        )}
      </form>
    </ModalFrame>
  );
}

function PaymentModal({
  invoice,
  onClose,
  onDone,
}: {
  invoice: LiveInvoice;
  onClose: () => void;
  onDone: () => Promise<void>;
}) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const { data: session } = useSession();
  const storageKey = `truecolours:invoice-payment:${session?.user.id}:${invoice.id}`;
  const [restored] = useState(() =>
    recoverInvoicePaymentAttempt(invoice.id, readPosAttempt(storageKey)),
  );
  const [pending, setPending] = useState<InvoicePaymentAttempt | null>(
    restored,
  );
  const [saved, setSaved] = useState(false);
  const sending = useRef(false);
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending.current || working || !session) return;
    sending.current = true;
    setWorking(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      if (saved) {
        await onDone();
        return;
      }
      const intent = pending ||
        recoverInvoicePaymentAttempt(
          invoice.id,
          readPosAttempt(storageKey),
        ) || {
          key: crypto.randomUUID(),
          payload: {
            invoiceId: invoice.id,
            amount: Number(form.get("amount")),
            method: String(form.get("method")),
            reference: String(form.get("reference") || ""),
            note: String(form.get("note") || ""),
            paidAt: String(form.get("paidAt") || ""),
          },
        };
      storePosAttempt(storageKey, intent);
      setPending(intent);
      await recordAdminInvoicePayment(invoice.id, intent.payload, intent.key);
      storePosAttempt(storageKey, null);
      setPending(null);
      setSaved(true);
      await onDone();
    } catch (reason) {
      if (
        reason instanceof CommandResponseError &&
        isDefinitiveCommandFailure(reason.status)
      ) {
        storePosAttempt(storageKey, null);
        setPending(null);
      }
      setError(
        reason instanceof Error
          ? reason.message
          : "Payment could not be recorded.",
      );
    } finally {
      sending.current = false;
      setWorking(false);
    }
  };
  return (
    <ModalFrame
      title="Record payment"
      onClose={() => {
        if (!working) onClose();
      }}
    >
      <form className="space-y-4 p-4 sm:p-5" onSubmit={submit}>
        {error ? (
          <p className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">
            {error}
          </p>
        ) : null}
        {pending && !working && (
          <p
            role="alert"
            className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm"
          >
            This payment needs its saved result retrieved. Retry the same
            request; do not take payment again. Its amount and reference are
            locked and retained if you close this window.
          </p>
        )}
        {saved && (
          <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm">
            Payment saved. Refreshing its display will not record another
            payment.
          </p>
        )}
        <div className="rounded-xl bg-slate-100 p-4">
          <p className="text-xs font-bold text-slate-500">
            Outstanding balance
          </p>
          <p className="mt-1 text-2xl font-black">
            {money(invoice.balanceDue ?? invoice.total)}
          </p>
        </div>
        <fieldset
          disabled={working || !!pending || saved}
          className="space-y-4"
        >
          <Field label="Amount">
            <input
              required
              autoFocus
              className="invoice-input"
              defaultValue={
                restored?.payload.amount ?? invoice.balanceDue ?? invoice.total
              }
              max={invoice.balanceDue ?? invoice.total}
              min="0.01"
              name="amount"
              step="0.01"
              type="number"
            />
          </Field>
          <Field label="Payment method">
            <select
              className="invoice-input"
              name="method"
              defaultValue={restored?.payload.method || "EFT"}
            >
              <option>EFT</option>
              <option>Cash</option>
              <option>Card</option>
              <option>Bank transfer</option>
              <option>Bank deposit</option>
              <option>Other</option>
            </select>
          </Field>
          <Field label="Payment date">
            <input
              className="invoice-input"
              defaultValue={
                restored?.payload.paidAt ||
                dateInputValue(new Date().toISOString())
              }
              name="paidAt"
              type="date"
            />
          </Field>
          <Field label="Reference">
            <input
              className="invoice-input"
              name="reference"
              defaultValue={restored?.payload.reference || ""}
            />
          </Field>
          <Field label="Note">
            <textarea
              className="invoice-input min-h-20 py-3"
              name="note"
              defaultValue={restored?.payload.note || ""}
            />
          </Field>
        </fieldset>
        <p className="text-xs font-semibold leading-5 text-slate-500">
          Payments require an online confirmation. If the connection drops,
          retrieve the saved request before recording another payment. Closing
          this window retains an unconfirmed request in this browser tab.
        </p>
        <button
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-40"
          disabled={working}
        >
          {working ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <CircleDollarSign size={18} />
          )}
          {saved
            ? "Refresh saved payment"
            : pending
              ? "Retrieve same payment result"
              : "Record payment"}
        </button>
      </form>
    </ModalFrame>
  );
}

function ActionMenu({
  invoice,
  onClose,
  onPayment,
  onRefresh,
  router,
}: {
  invoice: LiveInvoice;
  onClose: () => void;
  onPayment: () => void;
  onRefresh: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
}) {
  const action = async (status: string) => {
    await updateAdminInvoice(invoice.id, status);
    onClose();
    await onRefresh();
  };
  const duplicate = async () => {
    const result = await duplicateAdminInvoice(invoice.id);
    if (result.invoiceId) router.push(`/admin/invoices/${result.invoiceId}`);
  };
  return (
    <div className="absolute right-0 top-12 z-20 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 text-sm font-bold shadow-xl">
      <MenuButton
        icon={<CircleDollarSign size={16} />}
        label="Record payment"
        onClick={() => {
          onClose();
          onPayment();
        }}
      />
      <a
        className="flex min-h-10 items-center gap-3 rounded-lg px-3 hover:bg-slate-100"
        href={`/api/admin/invoices/${invoice.id}/pdf`}
      >
        <Download size={16} />
        Download PDF
      </a>
      <MenuButton
        icon={<Copy size={16} />}
        label="Duplicate invoice"
        onClick={() => void duplicate()}
      />
      {invoice.status === "cancelled" ? (
        <MenuButton
          icon={<RotateCcw size={16} />}
          label="Restore to draft"
          onClick={() => void action("draft")}
        />
      ) : (
        <MenuButton
          icon={<X size={16} />}
          label="Cancel invoice"
          onClick={() => void action("cancelled")}
        />
      )}
      <MenuButton
        danger
        icon={<Trash2 size={16} />}
        label="Move to deleted"
        onClick={() => void action("deleted")}
      />
    </div>
  );
}

function ModalFrame({
  children,
  full = false,
  onClose,
  title,
}: {
  children: React.ReactNode;
  full?: boolean;
  onClose: () => void;
  title: string;
}) {
  return (
    <motion.div
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[90] bg-slate-950/60 p-0 backdrop-blur-sm sm:p-4"
      exit={{ opacity: 0 }}
      initial={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.section
        animate={{ y: 0, opacity: 1 }}
        aria-modal="true"
        className={`mx-auto flex max-h-[100svh] flex-col overflow-hidden bg-white shadow-2xl sm:max-h-[calc(100svh-2rem)] sm:rounded-2xl ${full ? "max-w-6xl" : "max-w-lg"}`}
        initial={{ y: 10, opacity: 0 }}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="flex min-h-16 shrink-0 items-center justify-between border-b border-slate-200 px-4 sm:px-5">
          <h3 className="font-black">{title}</h3>
          <button
            aria-label="Close"
            className="grid size-11 place-items-center rounded-full bg-slate-100"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </motion.section>
    </motion.div>
  );
}
function RichField({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrap = (tag: "strong" | "em") => {
    const input = ref.current;
    if (!input) return;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    onChange(
      `${value.slice(0, start)}<${tag}>${value.slice(start, end)}</${tag}>${value.slice(end)}`,
    );
  };
  return (
    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
      <span>{label}</span>
      <span className="mt-2 flex h-10 items-center gap-1 rounded-t-xl border border-b-0 border-slate-200 bg-slate-50 px-2">
        <button
          aria-label="Bold"
          className="grid size-8 place-items-center rounded-lg hover:bg-slate-200"
          onClick={() => wrap("strong")}
          type="button"
        >
          <Bold size={15} />
        </button>
        <button
          aria-label="Italic"
          className="grid size-8 place-items-center rounded-lg hover:bg-slate-200"
          onClick={() => wrap("em")}
          type="button"
        >
          <Italic size={15} />
        </button>
        <span className="ml-2 text-[9px] normal-case tracking-normal text-slate-400">
          Basic HTML formatting
        </span>
      </span>
      <textarea
        className="invoice-input min-h-36 rounded-t-none py-3 normal-case tracking-normal"
        onChange={(event) => onChange(event.target.value)}
        ref={ref}
        value={value}
      />
    </label>
  );
}
function Panel({
  children,
  note,
  title,
}: {
  children: React.ReactNode;
  note: string;
  title: string;
}) {
  return (
    <section className="min-h-[28rem] rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
      <SectionTitle eyebrow={note} title={title} />
      <div className="mt-6">{children}</div>
    </section>
  );
}
function ListEmpty({
  children,
  empty,
  text,
}: {
  children: React.ReactNode;
  empty: boolean;
  text: string;
}) {
  return empty ? (
    <div className="grid min-h-56 place-items-center rounded-xl border border-dashed border-slate-300 text-center text-sm font-semibold text-slate-500">
      <div>
        <FileText className="mx-auto mb-3" size={24} />
        {text}
      </div>
    </div>
  ) : (
    <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 px-4">
      {children}
    </div>
  );
}
function RecordRow({
  action,
  meta,
  title,
}: {
  action?: React.ReactNode;
  meta: string;
  title: string;
}) {
  return (
    <div className="flex min-h-16 items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-black">{title}</p>
        <p className="mt-1 truncate text-xs font-semibold text-slate-500">
          {meta}
        </p>
      </div>
      {action}
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-bold text-slate-500">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  );
}
function Field({
  children,
  label,
  wide = false,
}: {
  children: React.ReactNode;
  label: string;
  wide?: boolean;
}) {
  return (
    <label
      className={`text-[10px] font-black uppercase tracking-wider text-slate-500 ${wide ? "sm:col-span-2" : ""}`}
    >
      <span>{label}</span>
      <span className="mt-1.5 block normal-case tracking-normal">
        {children}
      </span>
    </label>
  );
}
function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-[.15em] text-slate-400">
        {eyebrow}
      </p>
      <h3 className="mt-1 text-base font-black text-slate-950">{title}</h3>
    </div>
  );
}
function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className="grid size-9 place-items-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}
function MenuButton({
  danger = false,
  icon,
  label,
  onClick,
}: {
  danger?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left hover:bg-slate-100 ${danger ? "text-red-700" : ""}`}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-5">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-black text-slate-950">{money(value)}</dd>
    </div>
  );
}
function EmptyMissing() {
  return (
    <div className="grid min-h-[60svh] place-items-center text-center">
      <div>
        <FileText className="mx-auto text-slate-400" size={32} />
        <h2 className="mt-4 text-xl font-black">Invoice not found</h2>
        <p className="mt-2 text-sm font-semibold text-slate-500">
          It may have been removed or is not available in this Supabase project.
        </p>
        <Link
          className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white"
          href="/admin/invoices"
        >
          Back to invoices
        </Link>
      </div>
    </div>
  );
}
function emptyInvoice(settings: LiveAdminSettings): LiveInvoice {
  const issued = new Date();
  const due = new Date(issued);
  due.setDate(due.getDate() + settings.defaultPaymentTerms);
  return {
    id: "",
    userId: "",
    orderId: "",
    invoiceNumber: "",
    status: "draft",
    customerType: "walk-in",
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    customerCompany: "",
    vatNumber: "",
    customerAccountNumber: "",
    billingAddress: "",
    orderNumber: "",
    representative: "",
    preparedBy: "",
    items: [makeItem({ taxRate: settings.vatRate })],
    subtotal: 0,
    vatRate: settings.vatRate,
    vatAmount: 0,
    extraCharges: 0,
    deliveryFee: 0,
    total: 0,
    amountPaid: 0,
    balanceDue: 0,
    discountType: "none",
    discountValue: 0,
    depositType: "none",
    depositValue: 0,
    currency: "ZAR",
    poNumber: "",
    tags: [],
    publicNotes: settings.defaultPublicNotes,
    privateNotes: "",
    paymentTerms: "",
    terms: "",
    footer: settings.invoiceFooter,
    customFields: [],
    payments: [],
    activity: [],
    revisions: [],
    emailHistory: [],
    documents: [],
    issuedAt: issued.toISOString(),
    dueDate: due.toISOString(),
    createdAt: issued.toISOString(),
  };
}
function reviveDraft(value: string, settings: LiveAdminSettings) {
  try {
    return { ...emptyInvoice(settings), ...JSON.parse(value) } as LiveInvoice;
  } catch {
    return emptyInvoice(settings);
  }
}
function makeItem(input: Partial<LiveInvoiceItem> = {}): LiveInvoiceItem {
  return {
    id: crypto.randomUUID(),
    productId: "",
    code: "",
    name: "",
    description: "",
    quantity: 1,
    unitPrice: 0,
    taxRate: 15,
    discountType: "none",
    discountValue: 0,
    baseAmount: 0,
    discountAmount: 0,
    taxableAmount: 0,
    taxAmount: 0,
    lineTotal: 0,
    ...input,
  };
}
function asIso(value: string) {
  return value ? new Date(`${value}T12:00:00`).toISOString() : null;
}
function dateInputValue(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function money(value: unknown) {
  return `R ${(Number(value) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function dateText(value?: string | null) {
  if (!value) return "No date";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "No date"
    : date.toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}
function relative(value: string) {
  const minutes = Math.max(
    0,
    Math.round((Date.now() - new Date(value).getTime()) / 60000),
  );
  return minutes < 1
    ? "just now"
    : minutes < 60
      ? `${minutes}m ago`
      : dateText(value);
}
function whatsappUrl(invoice: LiveInvoice) {
  const phone = (invoice.customerPhone || "")
    .replace(/\D/g, "")
    .replace(/^0/, "27");
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const message = `Hello ${invoice.customerName}, your TRUECOLOURS invoice ${invoice.invoiceNumber} for ${money(invoice.total)} is ready: ${origin}/invoice/${invoice.shareToken}`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
