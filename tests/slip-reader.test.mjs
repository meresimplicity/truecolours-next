import test from "node:test";
import assert from "node:assert/strict";
import { parseSlip, parseMoney } from "../lib/slips/parse.ts";
import { slipTotal } from "../lib/slips/types.ts";
import { scanSlipProduct } from "../lib/slips/scan.ts";
const products = [
  {
    id: "paint",
    name: "Automotive Paint",
    code: "P001",
    barcodes: ["6001234567890"],
    available: 10,
    version: 5,
    lastCostCents: 10000,
  },
  {
    id: "primer",
    name: "Plastic primer",
    code: "PR02",
    barcodes: [],
    available: 4,
    version: 1,
    lastCostCents: null,
  },
];
test("barcode receiving uses confirmed costs, accumulates quantities and preserves scanned invoice totals", () => {
  const empty = parseSlip("", products);
  const first = scanSlipProduct(empty, products, "6001234567890", "purchase");
  const second = scanSlipProduct(first, products, "p001", "purchase");
  assert.equal(second.items.length, 1);
  assert.equal(second.items[0].quantity, 2);
  assert.equal(second.items[0].unitPriceCents, 10000);
  assert.equal(second.declaredTotalCents, 20000);
  assert.equal(second.items[0].stockVersion, 5);
  const printed = {
    ...first,
    sourceName: "receipt.pdf",
    declaredTotalCents: 23456,
    vatCents: 3000,
  };
  const scanned = scanSlipProduct(printed, products, "P001", "purchase");
  assert.equal(scanned.declaredTotalCents, 23456);
  assert.equal(scanned.vatCents, 3000);
  assert.equal(first.items[0].quantity, 1);
  assert.throws(
    () => scanSlipProduct(empty, products, "missing", "purchase"),
    /not found/,
  );
  assert.throws(
    () =>
      scanSlipProduct(
        empty,
        [...products, { ...products[0], id: "duplicate" }],
        "P001",
        "purchase",
      ),
    /several products/,
  );
});
test("manual physical-sale scans use catalogue price and VAT without inventing missing supplier prices", () => {
  const catalogue = [{ ...products[0], sellingPriceCents: 11500, taxRate: 15 }];
  const scanned = scanSlipProduct(
    parseSlip("", catalogue),
    catalogue,
    "P001",
    "physical_sale",
  );
  assert.equal(scanned.declaredTotalCents, 11500);
  assert.equal(scanned.vatCents, 1500);
  const missing = scanSlipProduct(
    parseSlip("", products),
    products,
    "PR02",
    "purchase",
  );
  assert.equal(missing.items[0].unitPriceCents, 0);
  assert.equal(missing.declaredTotalCents, 0);
});
test("slip reader recognises ZA money, quantity/unit/total columns, VAT-inclusive total and cash without treating totals as items", () => {
  const d = parseSlip(
    "PAINT SUPPLY\nInvoice No: INV-0042\nDate 15/10/2026\nP001 Automotive Paint 2 x 115.00 230.00\nVAT 15% 30.00\nTOTAL INCL VAT R 230.00\nPAID CASH 250.00\nCHANGE 20.00",
    products,
  );
  assert.equal(d.reference, "INV-0042");
  assert.equal(d.documentDate, "2026-10-15");
  assert.equal(d.items.length, 1);
  assert.equal(d.items[0].productId, "paint");
  assert.equal(d.items[0].quantity, 2);
  assert.equal(d.items[0].unitPriceCents, 11500);
  assert.equal(d.vatCents, 3000);
  assert.equal(d.declaredTotalCents, 23000);
  assert.equal(slipTotal(d), 23000);
  assert.equal(d.paidCents, 23000);
  assert.equal(parseMoney("R 1 234,56"), 123456);
  assert.equal(parseMoney("1,234.56"), 123456);
});
test("slip reader does not invent payment, prices, a product match or a reliable total", () => {
  const d = parseSlip("ACME\nTax Invoice\nUnknown misc thing 5.00", products);
  assert.equal(d.paymentMethod, "credit");
  assert.equal(d.paidCents, 0);
  assert.equal(d.declaredTotalCents, 0);
  assert.equal(d.items[0].productId, "");
  assert.ok(d.warnings.some((w) => w.includes("No reliable total")));
});
test("confirmed product aliases improve subsequent matching while preserving stock versions", () => {
  const d = parseSlip(
    "SUPPLIER ONE\nInvoice #A-123\nSupercoat Base 115.00\nTOTAL 115.00",
    products,
    [
      {
        counterparty: "supplier one",
        description: "Supercoat Base",
        product_id: "paint",
      },
    ],
  );
  assert.equal(d.items[0].productId, "paint");
  assert.equal(d.items[0].stockVersion, 5);
  assert.equal(d.items[0].matchLabel, "Previous confirmed match");
});
test("reader separates charges and discounts and flags foreign currency and ambiguous dates", () => {
  const d = parseSlip(
    "SUPPLIER\nInvoice #A-321\nDate 01/02/2026\nP001 Paint 115.00\nDelivery 10.00\nDiscount 5.00\nTOTAL USD 120.00",
    products,
  );
  assert.equal(d.items.length, 1);
  assert.equal(d.chargesCents, 1000);
  assert.equal(d.discountCents, 500);
  assert.equal(slipTotal(d), 12000);
  assert.equal(d.currency, "CHECK");
  assert.ok(d.warnings.some((w) => w.includes("ambiguous")));
});

test("automatic extraction handles wrapped, quantity-first and unit-first product rows", () => {
  for (const row of [
    "P001 Automotive Paint\n2 x R115.00 R230.00",
    "P001 Automotive Paint\n6001234567890\n2 x R115.00 R230.00",
    "2 x P001 Automotive Paint 115.00 230.00",
    "2 P001 Automotive Paint 115.00 230.00",
    "P001 Automotive Paint 115.00 2 230.00",
    "6001234567890 2 115.00 230.00",
  ]) {
    const d = parseSlip(
      `SUPPLIER\nInvoice #TEST-2\nDate 16 Oct 2026\n${row}\nVAT 30.00\nTOTAL 230.00\nCASH 250.00\nCHANGE 20.00`,
      products,
    );
    assert.equal(d.items.length, 1, row);
    assert.equal(d.items[0].quantity, 2, row);
    assert.equal(d.items[0].unitPriceCents, 11500, row);
    assert.equal(d.items[0].productId, "paint", row);
    assert.equal(d.items[0].printedTotalCents, 23000, row);
    assert.equal(d.documentDate, "2026-10-16");
    assert.equal(slipTotal(d), d.declaredTotalCents, row);
  }
});

test("Sage/Luxor supplier invoices preserve supplier codes, read net/list price columns, and reconcile VAT totals", () => {
  const supplierProducts = [
    { ...products[0], code: "FGG-ULT001", name: "Ultralight Bodyfiller" },
    { ...products[1], code: "FGT-MSB001S", name: "Stallion 2K MS Primer Beige" },
  ];
  const draft = parseSlip(
    [
      "TRUE COLOURS PAINTS (TWO WEEK TERMS)",
      "Luxor Paints (Pty) Ltd",
      "Tax Invoice",
      "Date Document No",
      "INV457209 2026/10/12 Page 1 of 1",
      "Code Item Description Per Unit Quantity Unit Nett Price",
      "List Price Disc %",
      "FGG-ULT001 Ultralight Bodyfiller 12.00 888.00 1KG 74.00 92.50 20.0 1KG",
      "FGT-MSB001S Stallion - 2K MS Primer Beige 6.00 417.00 1LT 69.50 1LT",
      "Total Nett Price",
      "Tax",
      "Amount Excl Tax",
      "Discount 0.00",
      "1 305.00",
      "195.75",
      "1 305.00",
      "Total (ZAR) 1 500.75",
    ].join("\n"),
    supplierProducts,
  );

  assert.equal(draft.counterparty, "Luxor Paints (Pty) Ltd");
  assert.equal(draft.reference, "INV457209");
  assert.equal(draft.documentDate, "2026-10-12");
  assert.equal(draft.items.length, 2);
  assert.deepEqual(
    draft.items.map((item) => [item.sourceCode, item.quantity, item.productId]),
    [
      ["FGG-ULT001", 12, "paint"],
      ["FGT-MSB001S", 6, "primer"],
    ],
  );
  assert.equal(draft.vatCents, 19575);
  assert.equal(draft.declaredTotalCents, 150075);
  assert.equal(slipTotal(draft), 150075);
  assert.ok(
    draft.receiptDetails?.some(
      (field) =>
        field.label === "Printed payment terms" &&
        field.value.toLowerCase() === "two week terms",
    ),
  );
  assert.ok(
    draft.warnings.some((warning) => warning.includes("aggregate rate")),
  );
});

test("automatic matching supports punctuated codes and never chooses between ambiguous products", () => {
  const hyphenated = [{ ...products[0], code: "PT-001" }];
  assert.equal(
    parseSlip(
      "SUPPLIER\nPT-001 Automotive Paint 115.00\nTOTAL 115.00",
      hyphenated,
    ).items[0].productId,
    "paint",
  );
  const sameName = [
    ...products,
    { ...products[0], id: "other-paint", code: "P002", barcodes: [] },
  ];
  assert.equal(
    parseSlip("SUPPLIER\nAutomotive Paint 115.00\nTOTAL 115.00", sameName)
      .items[0].productId,
    "",
  );
  assert.equal(
    parseSlip("SUPPLIER\nP001 Automotive Paint 115.00\nTOTAL 115.00", [
      ...products,
      { ...products[0], id: "duplicate" },
    ]).items[0].productId,
    "",
  );
});
test("exclusive printed unit prices reconcile automatically while the original prices remain visible", () => {
  const d = parseSlip(
    "SUPPLIER\nInvoice #VAT-1\nDate 2026-10-16\nUnit price excl VAT\nP001 Automotive Paint 2 100.00 200.00\nSUBTOTAL 200.00\nVAT 15% 30.00\nTOTAL INCL VAT 230.00",
    products,
  );
  assert.equal(d.items[0].unitPriceCents, 11500);
  assert.equal(d.items[0].printedUnitPriceCents, 10000);
  assert.equal(d.items[0].printedTotalCents, 20000);
  assert.equal(d.items[0].priceBasis, "exclusive");
  assert.equal(slipTotal(d), 23000);
  const unclear = parseSlip(
    "SUPPLIER\nP001 Automotive Paint 2 100.00 200.00\nVAT 30.00\nTOTAL 230.00",
    products,
  );
  assert.equal(slipTotal(unclear), 20000);
  assert.ok(unclear.warnings.some((w) => w.includes("do not match")));
  const mixed = parseSlip(
    "SUPPLIER\nUnit price excl VAT\nP001 Automotive Paint 100.00\nPR02 Plastic primer 100.00\nSUBTOTAL 200.00\nVAT 15% 15.00\nVAT 0% 0.00\nTOTAL 215.00",
    products,
  );
  assert.equal(slipTotal(mixed), 20000);
  assert.equal(mixed.vatCents, 1500);
  assert.ok(mixed.warnings.some((w) => w.includes("do not match")));
});
test("the scan reads partial payments, references and extra receipt fields without treating the balance as the sale total", () => {
  const d = parseSlip(
    "SUPPLIER\nInvoice #CARD-1\nDate 2026-10-16\nVAT No: 4123456789\nCashier: Sam\nEmail: sales@example.test\nTime: 14:35\nP001 Automotive Paint 230.00\nVAT 30.00\nTOTAL 230.00\nCARD 100.00\nAuth code: ABC123\nBALANCE DUE 130.00\nAMOUNT DUE 130.00",
    products,
  );
  assert.equal(d.items.length, 1);
  assert.equal(d.declaredTotalCents, 23000);
  assert.equal(d.paidCents, 10000);
  assert.equal(d.paymentMethod, "card");
  assert.equal(d.paymentReference, "ABC123");
  assert.ok(
    d.receiptDetails.some(
      (f) => f.label === "VAT No" && f.value === "4123456789",
    ),
  );
  assert.ok(
    d.receiptDetails.some((f) => f.label === "Cashier" && f.value === "Sam"),
  );
  assert.ok(d.rawText.includes("Time: 14:35"));
});
test("credit notes and negative returns cannot automatically become positive stock or revenue", () => {
  for (const text of [
    "SUPPLIER\nCREDIT NOTE\nP001 Automotive Paint 230.00\nTOTAL 230.00",
    "SUPPLIER\nP001 Automotive Paint -2 x 115.00 -230.00\nTOTAL -230.00",
  ]) {
    const d = parseSlip(text, products);
    assert.equal(d.items.length, 0);
    assert.ok(d.warnings.some((w) => w.includes("returns/refund")));
  }
});
test("banking footers and accepted-card notices never invent a payment", () => {
  const d = parseSlip(
    "SUPPLIER\nInvoice #UNPAID-1\nP001 Automotive Paint 230.00\nVAT 30.00\nTOTAL 230.00\nWe accept Visa and Mastercard\nBank transfer details\nAccount: 123456789\nPayment terms: 30 days",
    products,
  );
  assert.equal(d.paidCents, 0);
  assert.equal(d.paymentMethod, "credit");
  const split = parseSlip(
    "SUPPLIER\nP001 Automotive Paint 230.00\nTOTAL 230.00\nCASH 100.00\nCARD 130.00",
    products,
  );
  assert.equal(split.paidCents, 0);
  assert.ok(split.warnings.some((w) => w.includes("Several payment")));
  const repeated = parseSlip(
    "SUPPLIER\nP001 Automotive Paint 230.00\nTOTAL 230.00\nCASH 100.00\nPAID CASH 100.00",
    products,
  );
  assert.equal(repeated.paidCents, 10000);
});
