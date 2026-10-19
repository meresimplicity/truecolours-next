import { NextResponse } from "next/server";
import { loadAdminWorkspace } from "@/lib/server/workspace";
import { runAdminCommand, apiFailure } from "@/lib/server/admin-command";
import { calculateInvoice } from "@/lib/invoice-calculations";
import { loadInvoiceById } from "@/lib/invoice-server-data";
import { assertSameOriginMutation } from "@/lib/server/request-security";
import { requireAdminPermission } from "@/lib/server/admin-authorization";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    return NextResponse.json(await loadAdminWorkspace(new URL(request.url)), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return apiFailure(error);
  }
}
export async function PATCH(request: Request) {
  try {
    assertSameOriginMutation(request);
    const body = await request.json();
    const action = String(body.action || "");
    if (["create-invoice", "save-invoice"].includes(action)) {
      const existing = body.invoiceId
        ? await loadInvoiceById(body.invoiceId)
        : null;
      const values = { ...existing?.invoice, ...body };
      if (
        !Array.isArray(values.items) ||
        !values.items.length ||
        values.items.length > 200
      )
        return NextResponse.json(
          { message: "Add valid invoice items." },
          { status: 422 },
        );
      for (const item of values.items)
        if (
          !Number.isFinite(Number(item.quantity)) ||
          Number(item.quantity) <= 0 ||
          !Number.isFinite(Number(item.unitPrice)) ||
          Number(item.unitPrice) < 0
        )
          return NextResponse.json(
            {
              message:
                "Each item requires a positive quantity and valid price.",
            },
            { status: 422 },
          );
      Object.assign(
        body,
        calculateInvoice({
          ...values,
          payments: existing?.invoice.payments || [],
        }),
      );
    }
    if (action === "send-invoice") {
      await requireAdminPermission("documents.manage");
      const invoice = await loadInvoiceById(String(body.invoiceId));
      if (!invoice)
        return NextResponse.json(
          { message: "Invoice not found." },
          { status: 404 },
        );
      const hook = process.env.INVOICE_EMAIL_WEBHOOK_URL;
      if (!hook)
        return NextResponse.json(
          { message: "Configure the invoice email provider before sending." },
          { status: 503 },
        );
      const to = String(body.to || invoice.invoice.customerEmail || "");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to))
        return NextResponse.json(
          { message: "Enter a valid recipient email." },
          { status: 422 },
        );
      const secureUrl = new URL(
        `/invoice/${invoice.invoice.shareToken}`,
        new URL(request.url).origin,
      ).toString();
      const sent = await fetch(hook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": request.headers.get("idempotency-key") || "",
        },
        body: JSON.stringify({
          ...body,
          to,
          invoiceNumber: invoice.invoice.invoiceNumber,
          total: invoice.invoice.total,
          currency: "ZAR",
          secureUrl,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!sent.ok)
        throw new Error(
          "Email provider did not confirm delivery. Check the provider before retrying.",
        );
      const result = await runAdminCommand(request, action, body);
      return NextResponse.json({ ...result, secureUrl, emailStatus: "sent" });
    }
    return NextResponse.json(await runAdminCommand(request, action, body));
  } catch (error) {
    return apiFailure(error);
  }
}
