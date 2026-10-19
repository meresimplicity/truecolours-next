import Fuse from "fuse.js";
import { businessDate } from "../pos-types.ts";
import { receiptPayment } from "./receipt-payment.ts";
import {
  type MatchProduct,
  type ProductAlias,
  type SlipDraft,
  type SlipLine,
} from "./types.ts";
const amount = "(?:\\d{1,3}(?:[ ,]\\d{3})+|\\d+)[.,]\\d{2}";
const qty = "\\d+(?:[.,]\\d{1,3})?";
const moneyAtEnd = (text: string) => {
  const match = text.match(new RegExp(`(${amount})\\s*[-*]?\\s*$`));
  return match ? parseMoney(match[1]) : null;
};
const normal = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
function productMatches(
  description: string,
  products: MatchProduct[],
  aliases: ProductAlias[],
  counterparty: string,
  fuse: Fuse<MatchProduct>,
) {
  const normalized = ` ${normal(description)} `;
  const exact = products.filter(
    (p) =>
      (p.code && normalized.includes(` ${normal(p.code)} `)) ||
      p.barcodes.some((b) => normalized.includes(` ${normal(b)} `)),
  );
  if (exact.length === 1)
    return { product: exact[0], label: "Exact code/barcode" };
  if (exact.length > 1)
    return {
      product: undefined,
      label: "Ambiguous code/barcode - choose product",
    };
  const learnedIds = new Set(
    aliases
      .filter(
        (a) =>
          normal(a.counterparty) === normal(counterparty) &&
          normal(a.description) === normal(description),
      )
      .map((a) => a.product_id),
  );
  const learned = products.filter((p) => learnedIds.has(p.id));
  if (learned.length === 1)
    return { product: learned[0], label: "Previous confirmed match" };
  const names = products.filter((p) => normal(p.name) === normal(description));
  if (names.length === 1)
    return { product: names[0], label: "Exact product name" };
  if (names.length > 1 || learned.length > 1)
    return { product: undefined, label: "Ambiguous name - choose product" };
  const candidates = fuse.search(description).slice(0, 2);
  const best = candidates[0],
    next = candidates[1];
  if (
    best &&
    best.score !== undefined &&
    best.score <= 0.28 &&
    (!next || (next.score ?? 1) - best.score >= 0.12)
  )
    return { product: best.item, label: "Suggested name match" };
  return { product: undefined, label: "Choose product" };
}

function structuredInvoiceRow(
  line: string,
  products: MatchProduct[],
  aliases: ProductAlias[],
  counterparty: string,
  fuse: Fuse<MatchProduct>,
): SlipLine | null {
  const skuRow = line.match(/^\s*([A-Z0-9][A-Z0-9._/-]{2,})\s+(.+)$/i);
  if (!skuRow) return null;
  const quantityRow = skuRow[2].match(
    /^(.*?)\s+(\d+(?:[.,]\d{1,3})?)\s+(.+)$/,
  );
  if (!quantityRow || !quantityRow[1].trim()) return null;

  const quantity = Number(quantityRow[2].replace(",", "."));
  if (!Number.isFinite(quantity) || quantity <= 0) return null;
  // This supplier layout emits the net line amount before unit/list price;
  // other PDFs are accepted when their numeric columns reconcile by quantity.
  const prices = [...quantityRow[3].matchAll(new RegExp(amount, "g"))]
    .map((match) => parseMoney(match[0]))
    .filter((value): value is number => value !== null);
  if (prices.length < 2) return null;

  // Sage/Luxor invoices place the extended net amount before unit price,
  // list price and discount columns in extracted PDF text. Check arithmetic
  // instead of assuming that the last two currency values are the total.
  let printedTotalCents = prices[0];
  let printedNetUnitCents = prices[1];
  if (
    Math.abs(
      Math.round(quantity * printedNetUnitCents) - printedTotalCents,
    ) > 1
  ) {
    const matchingPair = prices.flatMap((candidateTotal, totalIndex) =>
      prices
        .map((candidateUnit, unitIndex) => ({
          candidateTotal,
          candidateUnit,
          totalIndex,
          unitIndex,
        }))
        .filter(
          ({ candidateTotal, candidateUnit, totalIndex, unitIndex }) =>
            totalIndex !== unitIndex &&
            Math.abs(Math.round(quantity * candidateUnit) - candidateTotal) <=
              1,
        ),
    )[0];
    if (!matchingPair) return null;
    printedTotalCents = matchingPair.candidateTotal;
    printedNetUnitCents = matchingPair.candidateUnit;
  }
  const listedUnitCents =
    prices.length >= 3
      ? prices.find(
          (price) =>
            price !== printedTotalCents && price !== printedNetUnitCents,
        ) ?? printedNetUnitCents
      : printedNetUnitCents;

  const sku = skuRow[1].trim();
  const description = quantityRow[1].trim();
  const normalizedSku = normal(sku);
  const exactCodes = products.filter((product) => {
    const normalizedCode = normal(product.code);
    return (
      normalizedCode.length >= 4 &&
      (normalizedSku === normalizedCode ||
        normalizedSku.startsWith(`${normalizedCode} `))
    );
  });
  const longestCodeLength = Math.max(
    0,
    ...exactCodes.map((product) => normal(product.code).length),
  );
  const exactProducts = exactCodes.filter(
    (product) => normal(product.code).length === longestCodeLength,
  );
  const match =
    exactProducts.length === 1
      ? { product: exactProducts[0], label: "Exact supplier product code" }
      : exactProducts.length > 1
        ? {
            product: undefined,
            label: "Ambiguous product code - choose product",
          }
        : productMatches(description, products, aliases, counterparty, fuse);
  const product = match.product;
  const discountCents = Math.max(
    0,
    Math.round(quantity * listedUnitCents) - printedTotalCents,
  );

  return {
    id: `line-${crypto.randomUUID()}`,
    description,
    sourceCode: sku,
    productId: product?.id || "",
    quantity,
    unitPriceCents: listedUnitCents,
    discountCents,
    stockVersion: product?.version || 0,
    matchLabel: match.label,
    printedUnitPriceCents: printedNetUnitCents,
    printedTotalCents,
  };
}

/** Join receipt layouts where a description wraps above its quantity/price row. */
function receiptRows(lines: string[]) {
  const rows: string[] = [];
  for (let n = 0; n < lines.length; n++) {
    let row = lines[n];
    if (
      /[a-z]{2}/i.test(row) &&
      !new RegExp(amount).test(row) &&
      !/^(?:invoice|receipt|tax|date|time|tel|phone|vat|reg|payment|bank|account|subtotal|total|balance|cashier|address)\b/i.test(
        row,
      )
    ) {
      const barcode = /^\d{8,14}$/.test(lines[n + 1] || "") ? lines[n + 1] : "";
      const numeric = lines[n + (barcode ? 2 : 1)] || "";
      if (
        new RegExp(
          `^(?:${qty}\\s*[xX*@]?\\s+)?(?:R\\s*)?${amount}(?:\\s+(?:R\\s*)?${amount})?\\s*[*]?$`,
        ).test(numeric)
      ) {
        row = `${row} ${barcode} ${numeric}`.replace(/\s+/g, " ");
        n += barcode ? 2 : 1;
      }
    }
    rows.push(row);
  }
  return rows;
}
export function parseMoney(text: string): number | null {
  const clean = text.replace(/[^\d,.-]/g, "");
  const decimal = clean.lastIndexOf(".") > clean.lastIndexOf(",") ? "." : ",";
  const normalized = clean
    .replace(decimal === "." ? /,/g : /\./g, "")
    .replace(decimal, ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value * 100) : null;
}
export function parseSlip(
  text: string,
  products: MatchProduct[],
  aliases: ProductAlias[] = [],
): SlipDraft {
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 1000);
  const warnings: string[] = [
    "Check the date, reference, product matches, quantities, VAT and payment before posting.",
  ];
  let documentDate = businessDate();
  const iso = text.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/),
    local = text.match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](20\d{2})\b/);
  if (iso)
    documentDate = `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  else if (local) {
    documentDate = `${local[3]}-${local[2].padStart(2, "0")}-${local[1].padStart(2, "0")}`;
    if (Number(local[1]) <= 12 && Number(local[2]) <= 12)
      warnings.push(
        "Date is ambiguous: interpreted as day/month/year. Confirm it.",
      );
  } else {
    const named = text.match(
      /\b(\d{1,2})[\s-]+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)[\s,-]+(20\d{2})\b/i,
    );
    if (named) {
      const month =
        [
          "jan",
          "feb",
          "mar",
          "apr",
          "may",
          "jun",
          "jul",
          "aug",
          "sep",
          "oct",
          "nov",
          "dec",
        ].indexOf(named[2].slice(0, 3).toLowerCase()) + 1;
      documentDate = `${named[3]}-${String(month).padStart(2, "0")}-${named[1].padStart(2, "0")}`;
    } else warnings.push("No reliable date found; today is shown for review.");
  }
  const legalCounterparty = lines.find(
    (line) =>
      /[a-z]{3}/i.test(line) &&
      /\b(?:pty|ltd|limited|inc|llc|plc|cc)\b/i.test(line),
  );
  const counterparty =
    (
      legalCounterparty ||
      lines.find(
        (line) =>
          /[a-z]{3}/i.test(line) &&
          !/(tax invoice|receipt|date|invoice no|^vat\b|^tel\b|^phone\b|^reg\b)/i.test(
            line,
          ),
      ) || ""
    )
      .replace(/\s+(?:tax invoice|invoice|statement)\s*$/i, "")
      .slice(0, 200);
  const directReference = lines
    .map(
      (line) =>
        line.match(
          /(?:invoice|receipt|slip|doc(?:ument)?)\b[ \t#]*(?:no\.?|number|#|:)?[ \t]*[:#-]?[ \t]*([A-Z0-9][A-Z0-9/-]{2,})/i,
        )?.[1],
    )
    .find((value) => value && !/^(total|date|tax|invoice)$/i.test(value));
  const adjacentReference = lines.flatMap((line, index) => {
    if (!/\b(?:invoice|document)\s*(?:no\.?|number|#)\b/i.test(line))
      return [];
    const value = lines[index + 1]?.match(/^([A-Z][A-Z0-9/-]{2,})\b/i)?.[1];
    return value ? [value] : [];
  })[0];
  const reference = directReference || adjacentReference || "";
  const fuse = new Fuse(products, {
    includeScore: true,
    threshold: 0.45,
    ignoreLocation: true,
    keys: [
      { name: "code", weight: 2 },
      { name: "name", weight: 1 },
    ],
  });
  const items: SlipLine[] = [];
  let total: number | null = null,
    totalRank = 0,
    subtotal: number | null = null,
    vat: number | null = null,
    totalVat: number | null = null,
    chargesCents = 0,
    discountCents = 0,
    roundingCents = 0;
  const vatRows = new Map<string, number>();
  const structuredInvoice =
    /\bcode\s+item\s+description\b/i.test(text.replace(/\s+/g, " ")) &&
    /\bquantity\b/i.test(text) &&
    /\bnett\s+price\b/i.test(text) &&
    /\blist\s+price\b/i.test(text);
  // Some supplier PDFs print a block of totals as headings followed by a
  // vertical list of amounts, instead of putting amounts on the same line.
  const totalsHeadingIndex = lines.findIndex((line, index) =>
    /^total\s+nett\s+price\s*$/i.test(line) &&
    lines.slice(index, index + 5).some((next) => /^amount\s+excl(?:usive)?\s+tax\s*$/i.test(next)) &&
    lines.slice(index, index + 5).some((next) => /^tax\s*$/i.test(next)),
  );
  if (totalsHeadingIndex >= 0) {
    const headingOffsets = lines
      .slice(totalsHeadingIndex, totalsHeadingIndex + 5)
      .flatMap((line, offset) =>
        /^(?:total\s+nett\s+price|tax|amount\s+excl(?:usive)?\s+tax)\s*$/i.test(
          line,
        )
          ? [offset]
          : [],
      );
    const headingCount = headingOffsets.length;
    const amountLines = lines
      .slice(totalsHeadingIndex + Math.max(...headingOffsets, 0) + 1)
      .filter((line) => /^\s*[\d, .]+\s*$/.test(line))
      .map(parseMoney)
      .filter((value): value is number => value !== null)
      .slice(0, headingCount);
    if (amountLines.length === headingCount && headingCount === 3) {
      subtotal = amountLines[0];
      vat = amountLines[1];
      // The amount excluding tax should repeat the net subtotal. Keep the
      // first printed value and let the posting reconciliation catch a conflict.
      if (amountLines[2] !== subtotal)
        warnings.push("Printed net subtotal and amount excluding tax differ. Review both values.");
    }
  }
  const receiptDetails = lines
    .filter(
      (l) =>
        /^(?:vat\s*(?:no|number|reg)|tax\s*(?:no|number)|reg(?:istration)?\s*(?:no|number)|tel(?:ephone)?|phone|email|address|branch|store|cashier|operator|till|time|customer|bill to|sold to|ship to|subtotal|sub total|cash|change|card|visa|mastercard|eft|amount paid|paid|balance|payment|auth|approval|transaction)\b/i.test(
          l,
        ) || /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/.test(l),
    )
    .slice(0, 50)
    .map((l) => {
      const split = l.indexOf(":");
      return split > 0 && split < 40
        ? { label: l.slice(0, split).trim(), value: l.slice(split + 1).trim() }
        : { label: "Printed detail", value: l.slice(0, 500) };
    });
  const printedTerms = text.match(
    /\b(?:net\s*)?(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten|fourteen|thirty)\s+(?:business\s+)?(?:days?|weeks?)(?:\s+terms?)?\b/i,
  )?.[0];
  if (printedTerms)
    receiptDetails.unshift({
      label: "Printed payment terms",
      value: printedTerms.trim(),
    });
  for (const line of receiptRows(lines)) {
    if (structuredInvoice) {
      const structured = structuredInvoiceRow(
        line,
        products,
        aliases,
        counterparty,
        fuse,
      );
      if (structured) {
        items.push(structured);
        continue;
      }
    }
    const matches = [...line.matchAll(new RegExp(amount, "g"))];
    if (!matches.length) continue;
    const last = matches.at(-1)!;
    const cents = parseMoney(last[0]);
    if (cents === null) continue;
    if (
      /^(?:date|time|cashier|operator|till|branch|store|email|address|customer|bank|account|auth|approval|transaction|invoice|receipt|document)\b/i.test(
        line,
      )
    )
      continue;
    if (
      (/\b(grand total|amount due|total incl|total payable)\b/i.test(line) ||
        /^total\b/i.test(line)) &&
      !/(sub.?total|total\s+(?:nett|net|vat|tax|excl)\b|excl)/i.test(line)
    ) {
      if (line.slice(0, last.index).replace(/[R\s]/gi, "").endsWith("-")) {
        total = 0;
        totalRank = 4;
        warnings.push(
          "This slip has a negative total. Use the returns/refund workflow rather than posting it as a new purchase or sale.",
        );
        continue;
      }
      const rank = /amount due/i.test(line)
        ? 1
        : /grand|incl|payable/i.test(line)
          ? 3
          : 2;
      if (rank >= totalRank) {
        total = cents;
        totalRank = rank;
      }
      continue;
    }
    if (
      /^(?:sub[ -]?total|total\s+(?:nett|net|excl(?:usive)?))\b/i.test(line) ||
      /^amount\s+excl(?:usive)?\s+tax\b/i.test(line)
    ) {
      subtotal = cents;
      continue;
    }
    if (
      /\b(vat|tax)\b/i.test(line) &&
      !/(excl|before|subtotal|vat\s*(?:no|number|reg)|tax\s*(?:no|number))/i.test(
        line,
      )
    ) {
      vat = cents;
      if (/\b(?:total\s+(?:vat|tax)|(?:vat|tax)\s+total)\b/i.test(line))
        totalVat = cents;
      else {
        const rate = line.match(
          /\b(?:vat|tax)\s*(\d{1,2}(?:[.,]\d+)?)\s*%/i,
        )?.[1];
        if (rate) vatRows.set(`${rate}:${cents}`, cents);
      }
      continue;
    }
    if (/^\s*(delivery|freight|shipping)\b/i.test(line)) {
      chargesCents += Math.abs(cents);
      continue;
    }
    if (/^\s*(discount)\b/i.test(line)) {
      discountCents += Math.abs(cents);
      continue;
    }
    if (/^\s*rounding\b/i.test(line)) {
      roundingCents = /[-−]\s*$/.test(line.slice(0, last.index))
        ? -cents
        : cents;
      continue;
    }
    if (
      /\b(sub.?total|discount|change|cash|card|eft|tender|balance|rounding|delivery|freight|tel|phone|vat no|reg no|paid|payment|credit)\b/i.test(
        line,
      )
    )
      continue;
    let description = line
      .slice(0, last.index)
      .replace(/\s+[R$€£]?\s*$/, "")
      .trim();
    if (/(?:^|\s)-\s*(?:R\s*)?\d/.test(line)) {
      warnings.push(`Negative item needs the returns/refund workflow: ${line}`);
      continue;
    }
    if (
      (!/[a-z]{2}/i.test(description) &&
        !products.some((p) =>
          p.barcodes.some((b) => description.includes(b)),
        )) ||
      cents < 0
    )
      continue;
    let quantity = 1,
      unitPriceCents = cents;
    const columns = line.match(
      new RegExp(
        `^(.*?)\\s+(${qty})\\s*(?:[xX*@]\\s*|\\s+)(?:R\\s*)?(${amount})\\s+(?:R\\s*)?(${amount})\\s*[*]?$`,
      ),
    );
    const firstQty = line.match(
      new RegExp(
        `^(${qty})\\s*(?:[xX*]\\s*|\\s+)(.+?)\\s+(?:R\\s*)?(${amount})\\s+(?:R\\s*)?(${amount})\\s*[*]?$`,
      ),
    );
    const unitFirst = line.match(
      new RegExp(
        `^(.*?)\\s+(?:R\\s*)?(${amount})\\s+(${qty})\\s+(?:R\\s*)?(${amount})\\s*[*]?$`,
      ),
    );
    const leading = description.match(/^(\d+(?:[.,]\d{1,3})?)\s*[xX*]\s+/),
      trailing = description.match(
        /\s+(\d+(?:[.,]\d{1,3})?)\s*[xX*@]\s*(?:R\s*)?$/,
      );
    const qtyUnit = description.match(
      new RegExp(
        `\\s+(\\d+(?:[.,]\\d{1,3})?)\\s*[xX*@]?\\s+(?:R\\s*)?(${amount})\\s*$`,
      ),
    );
    if (columns && columns[1].trim()) {
      description = columns[1].trim();
      quantity = Number(columns[2].replace(",", "."));
      unitPriceCents = parseMoney(columns[3]) || 0;
    } else if (firstQty) {
      description = firstQty[2].trim();
      quantity = Number(firstQty[1].replace(",", "."));
      unitPriceCents = parseMoney(firstQty[3]) || 0;
    } else if (unitFirst) {
      description = unitFirst[1].trim();
      quantity = Number(unitFirst[3].replace(",", "."));
      unitPriceCents = parseMoney(unitFirst[2]) || 0;
    } else if (qtyUnit) {
      quantity = Number(qtyUnit[1].replace(",", "."));
      unitPriceCents = parseMoney(qtyUnit[2]) || 0;
      description = description.slice(0, qtyUnit.index).trim();
    } else if (leading) {
      quantity = Number(leading[1].replace(",", "."));
      description = description.slice(leading[0].length).trim();
      unitPriceCents = Math.round(cents / quantity);
    } else if (trailing) {
      quantity = Number(trailing[1].replace(",", "."));
      description = description.slice(0, trailing.index).trim();
      unitPriceCents = Math.round(cents / quantity);
    }
    if (!Number.isFinite(quantity) || quantity <= 0) continue;
    // Quantity columns such as "2 230.00" are not a grouped R2,230 amount.
    const lineCents =
      parseMoney(columns?.[4] || firstQty?.[4] || unitFirst?.[4] || last[0]) ??
      cents;
    const match = productMatches(
        description,
        products,
        aliases,
        counterparty,
        fuse,
      ),
      suggested = match.product;
    if (Math.abs(Math.round(quantity * unitPriceCents) - lineCents) > 1)
      warnings.push(`Check line arithmetic: ${description}`);
    items.push({
      id: `line-${items.length + 1}`,
      description,
      productId: suggested?.id || "",
      quantity,
      unitPriceCents,
      discountCents: 0,
      printedUnitPriceCents: unitPriceCents,
      printedTotalCents: lineCents,
      stockVersion: suggested?.version || 0,
      matchLabel: match.label,
    });
  }
  if (totalVat !== null) vat = totalVat;
  else if (vatRows.size)
    vat = [...vatRows.values()].reduce((sum, value) => sum + value, 0);
  if (
    lines.some((line) =>
      /^(?:tax\s+)?(?:credit note|credit memo|refund receipt|return receipt)\b/i.test(
        line,
      ),
    )
  ) {
    items.length = 0;
    warnings.push(
      "Credit notes and refund receipts must use the returns/refund workflow. They cannot be scanned as new positive stock or revenue.",
    );
  }
  if (items.length > 200) {
    items.length = 200;
    warnings.push(
      "Only the first 200 item lines were read. Split this document before posting.",
    );
  }
  let calculated =
    items.reduce(
      (n, i) =>
        n + Math.round(i.quantity * i.unitPriceCents) - i.discountCents,
      0,
    ) +
    chargesCents -
    discountCents +
    roundingCents;
  const printedTaxRates = [
    ...text.matchAll(
      /\b(?:vat|tax)\s*(?:(?:rate|@|:)\s*)?(\d{1,2}(?:[.,]\d+)?)\s*%/gi,
    ),
  ].map((m) => Number(m[1].replace(",", ".")));
  let taxRates = new Set(printedTaxRates);
  let inferredTaxRate = false;
  if (
    !taxRates.size &&
    subtotal !== null &&
    subtotal > 0 &&
    vat !== null &&
    vat > 0 &&
    total !== null &&
    subtotal + vat === total
  ) {
    const aggregateRate = (vat / subtotal) * 100;
    const roundedRate = Math.round(aggregateRate * 100) / 100;
    if (
      roundedRate > 0 &&
      roundedRate <= 50 &&
      Math.round((subtotal * roundedRate) / 100) === vat
    ) {
      taxRates = new Set([roundedRate]);
      inferredTaxRate = true;
    }
  }
  // Mixed/unspecified tax rates cannot safely be allocated to individual stock.
  // Convert explicitly exclusive prices only when the single printed rate and sums agree.
  if (
    vat !== null &&
    vat > 0 &&
    total !== null &&
    subtotal !== null &&
    subtotal > 0 &&
    taxRates.size === 1 &&
    Math.round((subtotal * [...taxRates][0]) / 100) === vat &&
    subtotal === calculated &&
    calculated + vat === total &&
    !chargesCents &&
    !discountCents &&
    !roundingCents &&
    /(?:prices?|unit(?:\s+price)?|amount|total)\s*(?:are\s+)?excl(?:usive)?\b/i.test(
      text,
    ) &&
    items.length &&
    items.every(
      (i) =>
        Math.round(i.quantity * i.unitPriceCents) - i.discountCents ===
        i.printedTotalCents,
    )
  ) {
    let allocated = 0;
    items.forEach((item, index) => {
      const tax =
        index === items.length - 1
          ? vat! - allocated
          : Math.floor((vat! * item.printedTotalCents!) / subtotal!);
      allocated += tax;
      const gross = item.printedTotalCents! + tax;
      item.unitPriceCents = Math.ceil(gross / item.quantity);
      item.discountCents =
        Math.round(item.quantity * item.unitPriceCents) - gross;
      item.priceBasis = "exclusive";
    });
    calculated = total;
    if (inferredTaxRate)
      warnings.push(
        `No VAT percentage was printed. A ${[...taxRates][0]}% aggregate rate was derived from the printed subtotal, tax and total; confirm the supplier's VAT treatment before posting.`,
      );
  }
  if (total === null)
    warnings.push("No reliable total found. Enter the printed total.");
  if (vat === null)
    warnings.push("VAT was not identified; zero is shown for review.");
  if (!items.length)
    warnings.push(
      "No reliable item rows found. Edit the recognised text or add rows manually.",
    );
  if (total !== null && calculated !== total)
    warnings.push(
      "Extracted item amounts do not match the printed total. Check missing items, discounts, charges and quantities.",
    );
  const foreign = /\b(?:USD|EUR|GBP)\b|[$€£]/.test(text);
  if (foreign)
    warnings.push(
      "A foreign currency was detected. This stock book only posts ZAR amounts.",
    );
  const payment = receiptPayment(lines, total, moneyAtEnd);
  warnings.push(...payment.warnings);
  if (payment.paymentMethod === "credit")
    warnings.push(
      "No confirmed payment method found. The amount paid is zero until reviewed.",
    );
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(documentDate) ||
    Number.isNaN(new Date(documentDate + "T00:00:00Z").getTime()) ||
    new Date(documentDate + "T00:00:00Z").toISOString().slice(0, 10) !==
      documentDate
  ) {
    warnings.push("The recognised date is invalid. Enter the printed date.");
    documentDate = businessDate();
  }
  return {
    counterparty,
    reference,
    documentDate,
    currency: foreign ? "CHECK" : "ZAR",
    stockEffect: "apply",
    linkedSaleId: "",
    sourceSha256: "",
    sourceName: "",
    rawText: text.slice(0, 40000),
    confidence: null,
    items,
    chargesCents,
    discountCents,
    roundingCents,
    vatCents: vat || 0,
    declaredTotalCents: total || 0,
    paidCents: payment.paidCents,
    paymentMethod: payment.paymentMethod,
    paymentReference: payment.paymentReference,
    receiptDetails,
    warnings,
  };
}
