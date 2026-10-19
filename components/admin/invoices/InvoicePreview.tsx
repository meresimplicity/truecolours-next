import Image from "next/image";
import type { LiveAdminSettings, LiveInvoice } from "@/lib/admin-live-types";
import { siteConfig } from "@/config/site";

export function InvoicePreview({
  invoice,
  settings,
  compact = false,
}: {
  invoice: LiveInvoice;
  settings: LiveAdminSettings;
  compact?: boolean;
}) {
  const discount =
    (invoice.lineDiscountTotal || 0) + (invoice.discountAmount || 0);
  const totalQuantity = invoice.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );
  const bankingReady = Boolean(
    settings.bankName.trim() && settings.bankAccountNumber.trim(),
  );
  const createdAt = invoice.createdAt || invoice.issuedAt;

  return (
    <article
      className={`invoice-document mx-auto bg-white text-[#172033] ${compact ? "w-full p-4 sm:p-7" : "w-[210mm] p-[11mm]"}`}
    >
      <header className="grid gap-5 border-b-2 border-[#182f68] pb-4 sm:grid-cols-2">
        <div>
          <div className="relative h-12 w-44 sm:h-14 sm:w-52">
            <Image
              alt="TRUECOLOURS"
              className="object-contain object-left"
              fill
              priority
              sizes="208px"
              src="/images/logo.png"
            />
          </div>
          <p className="mt-2 text-[11px] font-black">{siteConfig.legalName}</p>
          <p className="mt-1 whitespace-pre-line text-[10px] leading-4 text-slate-600">
            {settings.address}
          </p>
        </div>
        <div className="text-[10px] leading-4 text-slate-600 sm:text-right">
          <h1 className="text-base font-black uppercase tracking-[.18em] text-[#182f68]">
            Tax invoice
          </h1>
          {settings.phone ? (
            <p className="mt-2">
              <b>Telephone:</b> {settings.phone}
            </p>
          ) : null}
          {settings.email ? (
            <p>
              <b>Email:</b> {settings.email}
            </p>
          ) : null}
          {settings.vatNumber ? (
            <p>
              <b>VAT Registration No:</b> {settings.vatNumber}
            </p>
          ) : null}
          <p>
            <b>Invoice Date:</b> {date(invoice.issuedAt)}
          </p>
        </div>
      </header>

      <section className="mt-4 rounded border border-slate-300 p-3">
        <p className="text-[9px] font-black uppercase tracking-[.16em] text-[#526485]">
          Customer information
        </p>
        <p className="mt-2 text-[11px] font-black">{customerLabel(invoice)}</p>
        {invoice.billingAddress ? (
          <p className="mt-1 whitespace-pre-line text-[10px] leading-4 text-slate-600">
            {invoice.billingAddress}
          </p>
        ) : null}
        {invoice.vatNumber ? (
          <p className="mt-1 text-[10px] text-slate-600">
            <b>VAT No:</b> {invoice.vatNumber}
          </p>
        ) : null}
        {invoice.customerPhone ? (
          <p className="text-[10px] text-slate-600">
            <b>Phone:</b> {invoice.customerPhone}
          </p>
        ) : null}
      </section>

      <section className="mt-3 grid grid-cols-2 divide-x divide-y divide-slate-300 overflow-hidden rounded border border-slate-300 sm:grid-cols-6 sm:divide-y-0">
        <InfoCell label="Account No" value={invoice.customerAccountNumber} />
        <InfoCell label="Invoice Date" value={date(invoice.issuedAt)} />
        <InfoCell
          label="Order Number"
          value={invoice.orderNumber || invoice.orderId}
        />
        <InfoCell label="Representative" value={invoice.representative} />
        <InfoCell label="Invoice Number" value={invoice.invoiceNumber} />
        <InfoCell label="Page" value="1 of 1" />
      </section>
      {invoice.preparedBy ? (
        <p className="mt-2 text-[9px] text-slate-600">
          <b>Cashier / Prepared By:</b> {invoice.preparedBy}
        </p>
      ) : null}

      <table className="mt-3 w-full table-fixed border-collapse text-left text-[9px]">
        <thead>
          <tr className="border-y border-[#182f68] bg-slate-50">
            <th className="w-[14%] px-2 py-2 font-black">Item Code</th>
            <th className="w-[40%] px-2 py-2 font-black">Description</th>
            <th className="w-[8%] px-1 py-2 text-right font-black">Qty</th>
            <th className="w-[15%] px-1 py-2 text-right font-black">
              Unit Price
            </th>
            <th className="w-[10%] px-1 py-2 text-right font-black">Disc %</th>
            <th className="w-[13%] px-2 py-2 text-right font-black">
              Line Total
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr
              className="break-inside-avoid border-b border-slate-200 align-top"
              key={item.id}
            >
              <td className="px-2 py-2 font-bold text-slate-600">
                {item.code || ""}
              </td>
              <td className="px-2 py-2">
                <p className="font-black">{item.name}</p>
                {item.description && item.description !== item.name ? (
                  <p className="mt-0.5 leading-3.5 text-slate-500">
                    {item.description}
                  </p>
                ) : null}
              </td>
              <td className="px-1 py-2 text-right">
                {quantity(item.quantity)}
              </td>
              <td className="px-1 py-2 text-right">{money(item.unitPrice)}</td>
              <td className="px-1 py-2 text-right">{discountPercent(item)}%</td>
              <td className="px-2 py-2 text-right font-black">
                {money(item.baseAmount - item.discountAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 grid items-start gap-5 sm:grid-cols-[1fr_15rem]">
        <div className="space-y-3 text-[9px] leading-4 text-slate-600">
          <div className="inline-block min-w-28 rounded border border-slate-300 p-3 text-center">
            <p className="font-black text-slate-800">Number of Items</p>
            <p className="mt-1 text-sm font-black text-[#182f68]">
              {quantity(totalQuantity)}
            </p>
          </div>
          {bankingReady ? (
            <section className="max-w-xs rounded border border-slate-300 p-3">
              <p className="font-black uppercase tracking-[.14em] text-slate-900">
                Banking Details
              </p>
              <div className="mt-1">
                <p>
                  <b>Bank:</b> {settings.bankName}
                </p>
                <p>
                  <b>Account No:</b> {settings.bankAccountNumber}
                </p>
                {settings.bankAccountType ? (
                  <p>
                    <b>Account Type:</b> {settings.bankAccountType}
                  </p>
                ) : null}
                {settings.bankBranchCode ? (
                  <p>
                    <b>Branch:</b> {settings.bankBranchCode}
                  </p>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
        <dl className="space-y-1.5 text-[10px]">
          <MoneyRow label="Subtotal" value={invoice.subtotal} />
          <MoneyRow label="Discount" value={discount} />
          <MoneyRow label="VAT" value={invoice.vatAmount} />
          <div className="flex justify-between border-y-2 border-[#182f68] py-2 text-sm font-black">
            <dt>Total</dt>
            <dd>{money(invoice.total)}</dd>
          </div>
        </dl>
      </div>

      <footer className="mt-5 flex justify-between border-t border-slate-300 pt-3 text-[8px] text-slate-500">
        <p>Currency: {invoice.currency || "ZAR"}</p>
        <p>Created: {dateTime(createdAt)}</p>
        <p>Page 1 of 1</p>
      </footer>
    </article>
  );
}

function InfoCell({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-h-12 p-2">
      <p className="text-[7px] font-black uppercase tracking-wider text-slate-500">
        {label}
      </p>
      {value ? <p className="mt-1 text-[9px] font-bold">{value}</p> : null}
    </div>
  );
}
function MoneyRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-bold">{money(value)}</dd>
    </div>
  );
}
function money(value: number) {
  return `R ${(Number(value) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function quantity(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : value.toLocaleString("en-US", { maximumFractionDigits: 3 });
}
function date(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toLocaleDateString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}
function dateTime(value?: string | null) {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? ""
    : parsed.toLocaleString("en-ZA", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}
function customerLabel(invoice: LiveInvoice) {
  return (
    [invoice.customerCompany, invoice.customerName]
      .filter((value, index, all) => value && all.indexOf(value) === index)
      .join(" / ") || "Customer"
  );
}
function discountPercent(item: LiveInvoice["items"][number]) {
  if (item.discountType === "percent") return quantity(item.discountValue);
  if (item.baseAmount > 0 && item.discountAmount > 0)
    return quantity((item.discountAmount / item.baseAmount) * 100);
  return "0";
}
