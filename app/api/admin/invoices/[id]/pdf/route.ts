import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/server/admin-authorization";
import { apiFailure } from "@/lib/server/admin-command";
import { loadInvoiceById } from "@/lib/invoice-server-data";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdminPermission("documents.read");
    const { id } = await context.params;
    const data = await loadInvoiceById(id);
    if (!data)
      return NextResponse.json(
        { message: "Invoice not found" },
        { status: 404 },
      );
    const pdf = await renderInvoicePdf(data.invoice, data.settings);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${data.invoice.invoiceNumber.replace(/[^a-z0-9_-]/gi, "-")}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
