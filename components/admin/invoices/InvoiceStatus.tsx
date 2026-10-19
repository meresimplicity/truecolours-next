import type { InvoiceStatus as InvoiceStatusValue } from "@/lib/admin-live-types";

export function InvoiceStatus({ value }: { value: InvoiceStatusValue }) {
  const tone =
    value === "paid"
      ? "bg-emerald-50 text-emerald-700"
      : value === "overdue"
        ? "bg-red-50 text-red-700"
        : value === "partially_paid"
          ? "bg-amber-50 text-amber-700"
          : value === "cancelled"
            ? "bg-slate-200 text-slate-600"
            : value === "sent" || value === "viewed"
              ? "bg-blue-50 text-blue-700"
              : "bg-slate-100 text-slate-700";
  return (
    <span
      className={`w-fit rounded-full px-2.5 py-1 text-[11px] font-black capitalize ${tone}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}
