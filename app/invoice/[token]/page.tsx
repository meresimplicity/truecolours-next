import { notFound } from "next/navigation";
import { InvoicePreview } from "@/components/admin/invoices/InvoicePreview";
import { loadInvoiceByToken } from "@/lib/invoice-server-data";

export const dynamic = "force-dynamic";
export default async function PublicInvoicePage({ params }: { params: Promise<{ token: string }> }) { const { token } = await params; const data = await loadInvoiceByToken(token); if (!data || ["deleted", "cancelled"].includes(data.invoice.status)) notFound(); return <main className="min-h-screen bg-slate-200 px-2 py-4 sm:px-6 sm:py-8"><div className="mx-auto mb-3 flex max-w-[210mm] items-center justify-between gap-3 rounded-xl bg-white p-3 text-xs font-bold text-slate-600"><span>Secure TRUECOLOURS invoice</span><span className="rounded-lg bg-slate-950 px-3 py-2 text-right font-black text-white">Print or save from your browser menu</span></div><div className="mx-auto max-w-[210mm] overflow-hidden shadow-xl"><InvoicePreview compact invoice={data.invoice} settings={data.settings}/></div></main>; }
