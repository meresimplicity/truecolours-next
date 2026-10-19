import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";
import { accountingTotals } from "@/lib/pos-types";
import type { InventoryMonth } from "@/lib/slips/types";
import type {
  AccountingBook,
  PosShift,
  PosTotals,
  PosSale,
  PosReturn,
  CashMovement,
} from "@/lib/pos-types";
const money = (cents: number) =>
  `R ${(Number(cents || 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const time = (value: string) =>
  new Date(value).toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    dateStyle: "medium",
    timeStyle: "short",
  });
const styles = StyleSheet.create({
  page: {
    padding: 36,
    paddingTop: 112,
    paddingBottom: 46,
    fontFamily: "Helvetica",
    fontSize: 8,
    color: "#172033",
  },
  brand: { fontSize: 19, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  title: { fontSize: 15, fontFamily: "Helvetica-Bold", marginTop: 9 },
  muted: { color: "#64748b", fontSize: 8, marginTop: 5, lineHeight: 1.5 },
  section: {
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    marginTop: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    borderBottom: "1 solid #e2e8f0",
    paddingVertical: 6,
  },
  head: {
    backgroundColor: "#142747",
    color: "#ffffff",
    fontFamily: "Helvetica-Bold",
  },
  cell: { paddingHorizontal: 5, flexGrow: 1, flexBasis: 0, lineHeight: 1.4 },
  num: { textAlign: "right" },
  footer: {
    position: "absolute",
    bottom: 22,
    left: 36,
    right: 36,
    fontSize: 7,
    color: "#64748b",
  },
  metrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 16,
    backgroundColor: "#f1f5f9",
    padding: 12,
  },
  metric: { width: "33.333%", padding: 7 },
  label: { fontSize: 7, color: "#526075" },
  value: { fontFamily: "Helvetica-Bold", fontSize: 13, marginTop: 5 },
  note: { marginTop: 12, lineHeight: 1.5, fontSize: 8, color: "#526075" },
});
function Sheet({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <Page size="A4" style={styles.page} wrap>
      <View
        fixed
        style={{ position: "absolute", top: 36, left: 36, right: 36 }}
      >
        <Text style={styles.brand}>TRUECOLOURS</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.muted}>{subtitle}</Text>
      </View>
      {children}
      <Text
        fixed
        style={styles.footer}
        render={({ pageNumber, totalPages }) =>
          `TRUECOLOURS | ZAR | Africa/Johannesburg                 Page ${pageNumber} of ${totalPages}`
        }
      />
    </Page>
  );
}
function Table({
  headers,
  rows,
  widths,
}: {
  headers: string[];
  rows: string[][];
  widths?: number[];
}) {
  return (
    <View>
      <View fixed minPresenceAhead={80} style={[styles.row, styles.head]}>
        {headers.map((h, i) => (
          <Text
            key={h}
            style={[
              styles.cell,
              widths ? { flexBasis: 0, flexGrow: widths[i] } : {},
            ]}
          >
            {h}
          </Text>
        ))}
      </View>
      {rows.length ? (
        rows.map((row, index) => (
          <View key={index} wrap={false} style={styles.row}>
            {row.map((value, i) => (
              <Text
                key={i}
                style={[
                  styles.cell,
                  widths ? { flexBasis: 0, flexGrow: widths[i] } : {},
                ]}
              >
                {value}
              </Text>
            ))}
          </View>
        ))
      ) : (
        <Text style={styles.note}>No entries in this period.</Text>
      )}
    </View>
  );
}
function Totals({ totals: t }: { totals: PosTotals }) {
  return (
    <View style={styles.metrics}>
      {[
        ["Gross sales", t.salesCents],
        ["Refunds", t.refundsCents],
        ["Net sales incl. VAT", t.netSalesCents],
        ["Sales excl. VAT", t.netExVatCents],
        ["Net output VAT", t.netVatCents],
        ["Transactions", null],
      ].map(([label, value]) => (
        <View key={String(label)} style={styles.metric}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.value}>
            {value === null
              ? `${t.transactions} sales / ${t.refundCount} returns`
              : money(Number(value))}
          </Text>
        </View>
      ))}
    </View>
  );
}
function Payments({ t }: { t: PosTotals }) {
  return (
    <>
      <Text style={styles.section} minPresenceAhead={130}>
        POS payment reconciliation
      </Text>
      <Table
        headers={[
          "Cash sales less refunds",
          "Card less refunds",
          "EFT less refunds",
          "Total net receipts",
        ]}
        rows={[
          [
            money(t.cashCents),
            money(t.cardCents),
            money(t.eftCents),
            money(t.netSalesCents),
          ],
        ]}
      />
      <Text style={styles.note}>
        Cash + card + EFT = net sales including VAT. External card/EFT payments
        and refunds are recorded confirmations; bank settlement fees and
        settlement timing are reconciled separately.
      </Text>
    </>
  );
}
function Sales({ sales, returns }: { sales: PosSale[]; returns: PosReturn[] }) {
  return (
    <>
      <Text style={styles.section} minPresenceAhead={130}>
        Sales book
      </Text>
      <Table
        headers={[
          "Receipt / date",
          "Method / reference",
          "Sales excl. VAT",
          "VAT",
          "Total",
        ]}
        widths={[1.8, 1.5, 1, 1, 1]}
        rows={sales.map((s) => [
          `${s.receipt_number}\n${time(s.created_at)}`,
          `${s.payment_method.toUpperCase()}\n${s.payment_reference || "-"}`,
          money(s.total_cents - s.vat_cents),
          money(s.vat_cents),
          money(s.total_cents),
        ])}
      />
      <Text style={styles.section} minPresenceAhead={130}>
        Returns / credit notes
      </Text>
      <Table
        headers={[
          "Return / date",
          "Original receipt ID / reason",
          "Method",
          "VAT reversed",
          "Refund",
        ]}
        widths={[1.7, 2.6, 0.8, 1, 1]}
        rows={returns.map((r) => [
          `${r.return_number}\n${time(r.created_at)}`,
          `${r.sale_id}\n${r.reason}`,
          r.payment_method.toUpperCase(),
          money(r.vat_cents),
          money(r.total_cents),
        ])}
      />
    </>
  );
}
function Cash({ rows }: { rows: CashMovement[] }) {
  return (
    <>
      <Text style={styles.section} minPresenceAhead={130}>
        Cash paid in / paid out
      </Text>
      <Table
        headers={["Date", "Category / reason", "Paid in", "Paid out"]}
        widths={[1.3, 3, 1, 1]}
        rows={rows.map((c) => [
          time(c.created_at),
          `${c.category}: ${c.reason}`,
          c.direction === "in" ? money(c.amount_cents) : "-",
          c.direction === "out" ? money(c.amount_cents) : "-",
        ])}
      />
    </>
  );
}
export async function renderAccountingPdf(book: AccountingBook) {
  return renderToBuffer(
    <Document
      title={`TRUECOLOURS sales book ${book.from} to ${book.to}`}
      author="TRUECOLOURS"
    >
      <Sheet
        title="Sales book & day-end accounts"
        subtitle={`${book.branch} | ${book.from} to ${book.to} inclusive | Prepared ${time(book.generatedAt)}`}
      >
        <Totals totals={accountingTotals(book)} />
        {book.slipBook && (
          <Text style={styles.note}>
            Recorded sales include {money(book.slipBook.salesCents)} from
            physical sales slips outside the till. Supplier purchases:{" "}
            {money(book.slipBook.purchasesCents)}. Supplier payments in this
            period: {money(book.slipBook.supplierPaymentsCents)}. Payments
            collected on physical slips:{" "}
            {money(book.slipBook.externalReceiptsCents)}. POS verification slips
            are excluded from these amounts.
          </Text>
        )}
        <Payments t={book.totals} />
        <Text style={styles.section} minPresenceAhead={130}>
          POS journal control
        </Text>
        <Table
          headers={["Account", "Debit", "Credit"]}
          rows={[
            [
              "Cash / card / EFT clearing",
              book.totals.netSalesCents >= 0
                ? money(book.totals.netSalesCents)
                : "-",
              book.totals.netSalesCents < 0
                ? money(-book.totals.netSalesCents)
                : "-",
            ],
            [
              "Sales excl. VAT",
              book.totals.netExVatCents < 0
                ? money(-book.totals.netExVatCents)
                : "-",
              book.totals.netExVatCents >= 0
                ? money(book.totals.netExVatCents)
                : "-",
            ],
            [
              "Output VAT",
              book.totals.netVatCents < 0
                ? money(-book.totals.netVatCents)
                : "-",
              book.totals.netVatCents >= 0
                ? money(book.totals.netVatCents)
                : "-",
            ],
          ]}
        />
        <Text style={styles.note}>
          This book covers recorded POS sales, returns, till movements and the
          separate supplier/physical-sales slip schedule. It is a sales and cash
          control document. Cost of goods, payroll, bank fees and other
          general-ledger entries require their own records. Opening floats and
          cash transfers are excluded from sales revenue.
        </Text>
        <Text style={styles.section} minPresenceAhead={130}>
          Day-end cash-up register
        </Text>
        <Table
          headers={[
            "Shift opened / status",
            "Opening float",
            "Expected cash",
            "Counted cash",
            "Difference",
          ]}
          widths={[2, 1, 1, 1, 1]}
          rows={book.shifts.map((s) => [
            `${time(s.opened_at)}\n${s.closed_at ? "Closed" : "OPEN - provisional"}`,
            money(s.opening_float_cents),
            money(s.expected_cash_cents ?? s.totals?.expectedCashCents ?? 0),
            s.closed_at ? money(s.counted_cash_cents || 0) : "Not counted",
            s.closed_at ? money(s.discrepancy_cents || 0) : "-",
          ])}
        />
        <Text style={styles.note}>
          Shifts overlapping the selected dates are shown in full. Period sales
          use transaction dates. Open shifts are provisional. Closed cash-up
          totals remain saved even when a later shift refunds an earlier sale.
        </Text>
      </Sheet>
      <Sheet
        title="Sales & returns register"
        subtitle={`${book.branch} | ${book.from} to ${book.to}`}
      >
        <Sales sales={book.sales} returns={book.returns} />
        <Cash rows={book.cashMovements} />
      </Sheet>
      <Sheet
        title="Stock movements & invoice collections"
        subtitle={`${book.branch} | ${book.from} to ${book.to}`}
      >
        <Text style={styles.section} minPresenceAhead={130}>
          Stock movement book
        </Text>
        <Table
          headers={["Date", "Product / reason", "Before", "After", "Change"]}
          widths={[1.4, 3, 0.8, 0.8, 0.8]}
          rows={book.stockMovements.map((m) => [
            time(m.created_at),
            `${m.product_id}\n${m.reason}${m.note ? " - " + m.note : ""}`,
            String(m.previous_quantity),
            String(m.new_quantity),
            String(Number((m.new_quantity - m.previous_quantity).toFixed(3))),
          ])}
        />
        <Text style={styles.section} minPresenceAhead={130}>
          Invoice collections - separate from POS revenue
        </Text>
        <Table
          headers={["Paid date", "Invoice", "Method / reference", "Amount"]}
          rows={book.invoiceCollections.map((p) => [
            p.paid_at,
            p.invoiceNumber,
            `${p.method}\n${p.reference || "-"}`,
            money(p.amount_cents),
          ])}
        />
        <Text style={styles.note}>
          Invoice collections are listed by recorded payment date and are
          excluded from POS totals and the till count. Current outstanding
          invoices: {money(book.outstandingCents)}. This outstanding balance is
          current, not a historical period-end balance.
        </Text>
      </Sheet>
      {book.slipBook && (
        <Sheet
          title="Supplier & physical sales slip book"
          subtitle={`${book.branch} | ${book.from} to ${book.to}`}
        >
          <Text style={styles.section} minPresenceAhead={130}>
            Posted documents
          </Text>
          <Table
            headers={[
              "Date / type",
              "Counterparty / reference",
              "Excl. VAT",
              "VAT",
              "Total",
            ]}
            widths={[1.4, 2.5, 1, 1, 1]}
            rows={book.slipBook.documents.map((d) => [
              `${d.document_date}\n${d.kind === "purchase" ? "Purchase" : "Physical sale"}`,
              `${d.counterparty}\n${d.reference}\nStock: ${d.stock_effect}`,
              money(d.total_cents - d.vat_cents),
              money(d.vat_cents),
              money(d.total_cents),
            ])}
          />
          <Text style={styles.section} minPresenceAhead={130}>
            Payments outside the POS drawer
          </Text>
          <Table
            headers={[
              "Paid / type",
              "Counterparty / document",
              "Method / reference",
              "Amount",
            ]}
            widths={[1.5, 2.5, 2, 1]}
            rows={book.slipBook.payments.map((p) => [
              `${p.paid_on}\n${p.kind === "purchase" ? "Supplier payment" : "Sales receipt"}`,
              `${p.counterparty}\n${p.reference}`,
              `${p.method}\n${p.payment_reference || "-"}`,
              money(p.amount_cents),
            ])}
          />
          <Text style={styles.note}>
            Stock already counted documents affect the accounting book without
            changing stock a second time. Verified POS slips are supporting
            records and are excluded from this register. Supplier VAT shown is
            the reviewed amount on the source document; this book does not
            determine tax eligibility.
          </Text>
        </Sheet>
      )}
    </Document>,
  );
}
export async function renderShiftPdf(data: {
  branch: string;
  shift: PosShift;
  totals: PosTotals;
  sales: PosSale[];
  returns: PosReturn[];
  cashMovements: CashMovement[];
}) {
  const s = data.shift,
    t = data.totals;
  return renderToBuffer(
    <Document title="TRUECOLOURS cash-up">
      <Sheet
        title={
          s.closed_at
            ? "Day-end cash-up - closed"
            : "Shift cash-up - provisional"
        }
        subtitle={`${data.branch} | Opened ${time(s.opened_at)}${s.closed_at ? " | Closed " + time(s.closed_at) : ""}\nShift ${s.id}`}
      >
        <Totals totals={t} />
        <Payments t={t} />
        <Text style={styles.section} minPresenceAhead={130}>
          Till reconciliation
        </Text>
        <Table
          headers={[
            "Opening float",
            "Net cash sales",
            "Cash in",
            "Cash out",
            "Expected cash",
          ]}
          rows={[
            [
              money(s.opening_float_cents),
              money(t.cashCents),
              money(t.cashInCents),
              money(t.cashOutCents),
              money(t.expectedCashCents || 0),
            ],
          ]}
        />
        <Table
          headers={["Counted cash", "Cash difference", "Status"]}
          rows={[
            [
              s.closed_at ? money(s.counted_cash_cents || 0) : "Not counted",
              s.closed_at ? money(s.discrepancy_cents || 0) : "-",
              s.closed_at ? "CLOSED" : "OPEN - provisional",
            ],
          ]}
        />
        <Text style={styles.note}>
          Expected cash = opening float + cash sales - cash refunds + cash paid
          in - cash paid out. A positive difference is an overage; a negative
          difference is a shortage.
        </Text>
        <Sales sales={data.sales} returns={data.returns} />
        <Cash rows={data.cashMovements} />
        <Text style={styles.note}>
          Counted by: ____________________ Checked by: ____________________
          Date: ____________________
        </Text>
      </Sheet>
    </Document>,
  );
}
export async function renderReceiptPdf(
  s: {
    receipt_number?: string;
    return_number?: string;
    created_at: string;
    total_cents: number;
    vat_cents: number;
    payment_method: string;
    tendered_cents?: number;
    change_cents?: number;
    payment_reference?: string;
    reference?: string;
    reason?: string;
  },
  items: Array<{
    name: string;
    code: string;
    quantity: number;
    total_cents: number;
  }>,
  refund = false,
) {
  return renderToBuffer(
    <Document title={s.receipt_number || s.return_number}>
      <Sheet
        title={refund ? "Return / credit note" : "Sales receipt"}
        subtitle={`${s.receipt_number || s.return_number} | ${time(s.created_at)}`}
      >
        <Table
          headers={["Code / product", "Quantity", "Total incl. VAT"]}
          widths={[3, 1, 1]}
          rows={items.map((i) => [
            `${i.code}\n${i.name}`,
            String(i.quantity),
            money(i.total_cents),
          ])}
        />
        <Text style={styles.section} minPresenceAhead={130}>
          {refund ? "Refund" : "Total"} {money(s.total_cents)}
        </Text>
        <Text style={styles.note}>
          Excluding VAT: {money(s.total_cents - s.vat_cents)} | VAT included:{" "}
          {money(s.vat_cents)}
          {`\n${s.payment_method.toUpperCase()} | Reference: ${s.payment_reference || s.reference || "-"}`}
          {!refund
            ? `\nReceived: ${money(s.tendered_cents || 0)} | Change: ${money(s.change_cents || 0)}`
            : `\nReason: ${s.reason}`}
        </Text>
        <Text style={styles.note}>
          Thank you for shopping with TRUECOLOURS.
        </Text>
      </Sheet>
    </Document>,
  );
}
export async function renderInventoryMonthPdf(report: InventoryMonth) {
  const q = (n: number) =>
    Number(n).toLocaleString("en-US", { maximumFractionDigits: 3 });
  return renderToBuffer(
    <Document title={`TRUECOLOURS stock book ${report.month}`}>
      <Sheet
        title="Monthly stock & spending book"
        subtitle={`${report.locationId} | ${report.month.slice(0, 7)} | ZAR`}
      >
        <View style={styles.metrics}>
          {[
            ["Purchases", report.purchasesCents],
            ["Supplier payments", report.spentCents],
            ["Current supplier balance", report.supplierBalanceCents],
            ["Physical slip sales", report.physicalSalesCents],
            ["POS gross sales", report.posSalesCents],
            ["Monthly budget", report.budgetCents],
          ].map(([label, value]) => (
            <View key={String(label)} style={styles.metric}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>
                {value === null ? "Not available" : money(Number(value))}
              </Text>
            </View>
          ))}
        </View>
        <Text style={styles.section} minPresenceAhead={130}>
          Stock reconciliation
        </Text>
        <Table
          headers={[
            "Product",
            "Opening",
            "Received",
            "POS sold",
            "Slip sold*",
            "Returns",
            "Other",
            "Closing",
          ]}
          widths={[3, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8, 0.8]}
          rows={report.products.map((p) => [
            `${p.code}\n${p.name}`,
            q(p.opening),
            q(p.received),
            q(p.pos_sold),
            q(p.slip_applied_sold),
            q(p.returned),
            q(p.other),
            q(p.closing),
          ])}
        />
        <Text style={styles.note}>
          Opening + received + returns - POS sold - applied slip sales + other
          movements = closing. *Only physical sales slips that applied stock
          changes appear in this equation. Documents whose stock was already
          counted are excluded from stock movements. Verify reconstructed
          balances against a physical count. Cancellations remain as offsetting
          corrections under Other; cancelled documents are excluded from money
          totals and reorder demand. POS sales above are gross before returns.
        </Text>
        <Text style={styles.section} minPresenceAhead={130}>
          Reorder review
        </Text>
        <Table
          headers={[
            "Product",
            "Available",
            "Incoming",
            "Suggested order",
            "Last unit cost incl. VAT",
          ]}
          widths={[3, 1, 1, 1, 1.5]}
          rows={report.products
            .filter((p) => p.suggested_order > 0)
            .map((p) => [
              p.name,
              q(p.available),
              q(p.incoming),
              q(p.suggested_order),
              p.last_purchase_unit_cents === null
                ? "No confirmed cost"
                : money(p.last_purchase_unit_cents),
            ])}
        />
        <Text style={styles.note}>
          Suggestions use recorded sales over 30 days, a 14-day supply target
          and minimum stock levels. They do not place orders. Incomplete sales
          history reduces their reliability. Outstanding supplier balances are
          current balances; payments are reported by their actual paid date.
        </Text>
      </Sheet>
    </Document>,
  );
}
