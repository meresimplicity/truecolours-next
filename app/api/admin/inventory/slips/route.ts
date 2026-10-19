import { NextResponse } from "next/server";
import { requireAdminPermission } from "@/lib/server/admin-authorization";
import { apiFailure } from "@/lib/server/admin-command";
import { assertSameOriginMutation } from "@/lib/server/request-security";
import { checked, getSupabaseServer } from "@/lib/supabase/server";
import { businessDate } from "@/lib/pos-types";
const headers = { "Cache-Control": "private, no-store" };
async function allRows<T>(
  page: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const rows: T[] = [];
  for (let start = 0; start < 20000; start += 1000) {
    const batch = checked(await page(start, start + 999)) || [];
    rows.push(...batch);
    if (batch.length < 1000) return { data: rows, error: null };
  }
  throw Error(
    "The stock catalogue is too large to load safely. Ask an administrator to scope the catalogue before continuing.",
  );
}
export async function GET(request: Request) {
  try {
    const actor = await requireAdminPermission("inventory.read"),
      db = await getSupabaseServer(),
      params = new URL(request.url).searchParams;
    const branch = params.get("locationId") || actor.locationIds[0];
    if (!actor.locationIds.includes(branch))
      return NextResponse.json(
        { message: "Branch access denied" },
        { status: 403 },
      );
    if (params.get("id")) {
      const doc = checked(
        await db
          .from("inventory_documents")
          .select("*")
          .eq("id", params.get("id"))
          .eq("branch_id", branch)
          .maybeSingle(),
      );
      if (!doc)
        return NextResponse.json(
          { message: "Document not found" },
          { status: 404 },
        );
      const payments =
        checked(
          await db
            .from("inventory_document_payments")
            .select("id,amount_cents,method,reference,paid_on")
            .eq("document_id", doc.id)
            .order("created_at"),
        ) || [];
      return NextResponse.json({ ...doc, payments }, { headers });
    }
    const archived = params.get("archived") === "1";
    const page = Math.min(
      100000,
      Math.max(0, Math.floor(Number(params.get("page")) || 0)),
    );
    let documentQuery = db
      .from("inventory_documents")
      .select(
        "id,branch_id,kind,status,version,document_date,counterparty,reference,total_cents,vat_cents,updated_at,voided_at,void_reason",
      )
      .eq("branch_id", branch)
      .in(
        "status",
        archived ? ["archived", "void"] : ["draft", "posted", "verified"],
      )
      .order("updated_at", { ascending: false })
      .order("id")
      .range(page * 50, page * 50 + 50);
    const month = params.get("month");
    if (month && /^\d{4}-\d{2}-01$/.test(month)) {
      const next = new Date(month + "T00:00:00Z");
      next.setUTCMonth(next.getUTCMonth() + 1);
      documentQuery = documentQuery.or(
        `document_date.is.null,and(document_date.gte.${month},document_date.lt.${next.toISOString().slice(0, 10)})`,
      );
    }
    const q = (params.get("q") || "")
      .replace(/[^a-z0-9 \-]/gi, "")
      .trim()
      .slice(0, 100);
    if (q)
      documentQuery = documentQuery.or(
        `counterparty.ilike.%${q}%,reference.ilike.%${q}%`,
      );
    const [catalogue, balances, aliases, documents, branches, monthResult] =
      await Promise.all([
        allRows((from, to) =>
          db
            .from("products")
            .select("id,name,code,barcodes,selling_price_cents,tax_rate")
            .order("id")
            .range(from, to),
        ),
        allRows((from, to) =>
          db
            .from("inventory")
            .select("product_id,on_hand,reserved,damaged,quarantined,version")
            .eq("branch_id", branch)
            .order("product_id")
            .range(from, to),
        ),
        allRows((from, to) =>
          db
            .from("inventory_product_aliases")
            .select("counterparty,description,product_id")
            .eq("branch_id", branch)
            .eq("active", true)
            .order("counterparty")
            .order("description")
            .range(from, to),
        ),
        documentQuery,
        db
          .from("branches")
          .select("id,name")
          .in("id", actor.locationIds)
          .order("name"),
        db.rpc("inventory_month", {
          p_branch: branch,
          p_month: businessDate().slice(0, 7) + "-01",
        }),
      ]);
    const stock = new Map(
      (checked(balances) || []).map((i) => [i.product_id, i]),
    );
    const monthly = checked(monthResult) as {
      products: Array<{ id: string; last_purchase_unit_cents: number | null }>;
    };
    return NextResponse.json(
      {
        locationId: branch,
        branches: checked(branches),
        products: (checked(catalogue) || []).map((p) => {
          const i = stock.get(p.id);
          return {
            ...p,
            sellingPriceCents:
              p.selling_price_cents === null
                ? null
                : Number(p.selling_price_cents),
            taxRate: Number(p.tax_rate),
            available:
              Number(i?.on_hand || 0) -
              Number(i?.reserved || 0) -
              Number(i?.damaged || 0) -
              Number(i?.quarantined || 0),
            version: Number(i?.version || 0),
            lastCostCents:
              monthly.products.find((m) => m.id === p.id)
                ?.last_purchase_unit_cents ?? null,
          };
        }),
        aliases: checked(aliases),
        documents: (checked(documents) || []).slice(0, 50),
        hasMore: (documents.data?.length || 0) > 50,
      },
      { headers },
    );
  } catch (error) {
    return apiFailure(error);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOriginMutation(request);
    const text = await request.text();
    if (text.length > 120000)
      return NextResponse.json(
        { message: "Slip data is too large. Split it into smaller documents." },
        { status: 413 },
      );
    const { action, ...payload } = JSON.parse(text);
    if (
      typeof action !== "string" ||
      ![
        "save",
        "post",
        "payment",
        "budget",
        "archive",
        "restore",
        "void",
      ].includes(action)
    )
      return NextResponse.json(
        { message: "Invalid slip action" },
        { status: 400, headers },
      );
    const db = await getSupabaseServer(),
      result = await db.rpc("inventory_document_command", {
        p_action: action,
        p_payload: payload,
        p_key: request.headers.get("Idempotency-Key") || "",
      });
    if (result.error) throw result.error;
    return NextResponse.json(result.data, { headers });
  } catch (error) {
    return apiFailure(error);
  }
}
