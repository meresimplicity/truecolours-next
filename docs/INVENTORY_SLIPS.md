# Stock, slips and spending

Open `/admin/stock-control`. Supplier purchases, external physical sales and existing POS receipt verification use the same Supabase inventory ledger as the till. Select the branch and month before reviewing its quantity book, spending, supplier balances, budget and reorder suggestions.

## Receiving or recording a sale

1. Start a supplier purchase or physical-sales slip. A draft is saved immediately and subsequent edits autosave after one second. Drafts have no stock or financial effect.
2. Choose **Scan image or PDF**. The reader automatically fills a summary of products, stock matches, quantities, printed prices/totals, VAT, discounts, charges, payment evidence and extra printed details. It handles wrapped descriptions and common quantity/unit-price/total column orders. **Everything read from the slip** retains the full recognised text within the document limits. Normal scanning does not require typing into an editing form.
3. Check the summary and confirm it. Clear exact codes/barcodes, unique product names and previously confirmed supplier descriptions match automatically. Ambiguous matches stay unresolved. Use **Resolve scan details** only for unreadable/unmatched details or inconsistent amounts; manual correction fields stay hidden by default. The reader records payment evidence from this receipt, rather than inferring payment from banking details or a “cards accepted” footer. Explicitly VAT-exclusive prices are converted for the book only when a single printed VAT rate, subtotal, VAT and total reconcile; mixed or unspecified rates need review. The printed prices remain visible. OCR does not prove a receipt is authentic.
4. Choose **Receive/deduct now** for unrecorded stock, **Already reflected in a count** for historical book-only evidence, or **Verify existing POS receipt** to match an existing sale without counting it twice. Verification requires matching date, products, quantities, total and VAT.
5. Confirm the review, then post. The server validates and updates stock atomically. Stale stock requires a refresh and review. A duplicate fingerprint/reference cannot post twice. Purchases and credit sales can be partly paid; later payments use their actual paid date. A payment record does not make a bank transfer or charge a terminal.

Manual entry remains available under **Enter manually / correct an unreadable scan**, including keyboard/USB barcode scanners. Repeated scans increase quantity. Change quantities for cases or litres; no pack conversion is inferred. Last confirmed supplier costs or catalogue selling prices are suggested for manual barcode entry; missing prices require review. Printed totals from uploaded slips remain unchanged by additional barcode scans. Split or ambiguous payments require confirmation separately rather than guessing one combined payment.

Credit notes, refund receipts and negative item rows are flagged for the returns/refund workflow; the reader cannot turn them into a new positive purchase or sale.

## Mistakes and cancellations

- Edit an unposted draft or discard it. Discarded drafts can be restored from **Show discarded & cancelled**.
- For an incorrectly posted record, enter a cancellation reason and confirm its effects. The transaction reverses its stock effect and excludes the record and its saved payments from active spending, balances and sales books. Cancellation requires the existing management/stock/payment permissions and checks for changes in payments since the screen loaded.
- A purchase cannot be cancelled if its stock is already sold, reserved or held and reversal would make available stock negative. Reconcile that stock first. Actual goods returns, customer refunds and actual money movement are separate workflows.
- Cancellation of a verified POS attachment leaves its original POS sale and payments unchanged.
- Originals, line items, payments, actor, reason and offsetting stock movements remain in the audit trail. Corrections use the original document date for quantity reconciliation and retain today's audit timestamp. They can change a previously exported period; regenerate the period's books after a correction.
- Use **Copy into corrected draft** on a cancelled record, fix its values and review again. Its payment starts unpaid so a payment is not silently repeated. Reposting the corrected document can reuse the cancelled source fingerprint/reference.

## Files and saving

Tesseract.js reads images locally; PDF.js extracts PDF text and renders image-only pages for OCR. The application sends only extracted text, matched lines and accounting values to Supabase. It never uploads original images or PDFs to Supabase Storage, and clears the selected file after reading/cancelling. It does not delete the original on the user's device. Limits are 10 MB, five PDF pages, 200 lines and 40,000 text characters per document. Keep originals separately where required by the business.

Saved drafts survive browser restarts. Unsaved changes and uncertain transaction retries have a per-user, per-document browser-tab fallback. Online access is needed for database saves; an unknown outcome must be retried with the same saved key. There is no offline financial queue and no promise of instant database startup on the Free plan.

On reload, a draft resumes an uncertain save before saving later edits. If another window has changed the saved version, the editor preserves those saved values and offers the local edits as a separate recovery draft. Review that draft against the original before posting; it starts unpaid. Browser storage must be available before sending a recoverable transaction.

POS operations, stock inspections and invoice/slip payments retain the exact pending request after a timeout, throttling or expired sign-in. Reopening an invoice's payment window in the same browser tab retrieves that request with its amount and reference locked. Retrieve its result before taking or recording another payment. A saved payment whose display refresh fails can refresh without sending a new payment. These local recovery copies are tab-scoped; keep the tab open until an uncertain outcome is resolved.

## Books and controls

Monthly stock PDFs reconcile opening + receipts + returns − POS sales − applied physical sales + other movements = closing. Book-only physical sale quantities are shown separately on screen. Supplier payments are measured by payment date; supplier balances are current, while purchases/sales use document dates. Reorder suggestions use minimum levels, available/incoming stock and 30 days of recorded applied sales. Missing purchase cost stays unknown; estimates do not place orders or spend money.

Accounts & day-end includes external physical sales once in revenue/VAT, with separate supplier purchases/payments and external receipt schedules in the PDF. External slips do not change a closed POS cash-up. This is stock and sales control, not a complete general ledger or automatic bank reconciliation.

## Reused open-source components

- [Tesseract.js](https://github.com/naptha/tesseract.js) 7.0.0, Apache-2.0: local OCR with self-hosted worker, WASM core and English language data.
- [PDF.js](https://github.com/mozilla/pdf.js) 6.4.299, Apache-2.0: PDF text extraction and rendering.
- [Fuse.js](https://github.com/krisk/Fuse) 7.5.0, Apache-2.0: conservative catalogue matching, alongside exact barcodes and human-confirmed supplier aliases.
- Existing ERPNext and POSNext workspace copies informed receipt/ledger and correction workflow design. Their GPL/AGPL application code was not copied or embedded. The live stock book uses this application's Supabase ledger, avoiding a second unsynchronised stock database.

`scripts/prepare-slip-reader.mjs` copies runtime workers/data and upstream license notices into the generated `/public/slip-reader` directory during dev/build. Receipt originals never appear there.

## Validation and database deployment

Use Node 22 and run `npm run verify:retail -- --audit`. This runs the database, authentication, request-security, slip-reader and transaction/draft recovery tests, route-type generation, TypeScript, retail ESLint and the production build. The GitHub retail-integrity workflow uses the same gate without production credentials. `npm run test:retail` runs only the targeted tests.

Before trading, use the read-only `npm run preflight:retail -- --project-ref=iyjkepjvsfvhviamsixx` with the configured private admin credentials and complete the manual checks it lists. An aggregate report is not a physical stocktake or a backup restore test.

The slip schema is migration `20261015201013`; correction support is `20261015221000`, and strict command boundary guards are `20261016000001`. Apply migrations once, in order, to project `iyjkepjvsfvhviamsixx`. Dashboard-applied migrations must be marked applied in CLI migration history before a later `db push`; do not rerun the schema. See `SUPABASE_MIGRATION.md` for the separate outstanding public Firebase cutover requirements.

The command guards reject fractional/non-finite cent values, invalid quantities, missing stock-count versions and malformed command envelopes at the database boundary. Older internal command implementations are not executable by application roles. Private QA exports are excluded from source control and deployments.
