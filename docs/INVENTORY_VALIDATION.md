# Stock and slip validation — 16 October 2026

The implementation uses the existing Supabase POS ledger, not a second inventory database. These results describe the implemented controls and completed checks; they are not a guarantee of error-free business operation or evidence of a public production cutover.

## Completed checks

- 49 targeted automated tests pass across the real SQL migrations, slip parser/barcode handling, admin login, request-origin protection and transaction/draft recovery.
- Database tests cover staff/customer/branch permissions, immediate revocation, authoritative cents/VAT, atomic checkout, overselling rejection, partial returns, cash-up snapshots, stale stock, duplicate source/reference checks, draft autosave versions, supplier part-payments, unpaid documents, physical sales, POS verification and monthly quantity/money reconciliation.
- Correction tests cover rejected cancellation without review, changed payment totals, insufficient available stock, role restrictions, safe repeated requests, immutable original payments, stock reversal, exclusion from active books, learned-match revocation/reconfirmation and corrected reposting.
- Recovery tests cover reloads during an uncertain save, edits typed after a save request, JSONB object ordering, another window's newer saved version, read-only documents, malformed/cross-document cache entries, and invoice payment responses lost after a simulated commit. Timeouts, throttling and expired/revoked sign-in retain the original request. Invoice payment fields stay locked until that request is resolved; reopening its window does not create a new request.
- Scan-first tests cover wrapped descriptions/barcodes, quantity-first and unit-price-first rows, named-month dates, punctuated product codes, duplicate-name/code ambiguity, explicitly VAT-exclusive invoices, partial payments, payment references and retained VAT/cashier/contact details. Banking footers do not invent payments; outstanding balances do not replace the sale total; repeated payment labels do not double the paid amount. Original printed prices and full recognised text remain available while the normal screen shows a summary with corrections hidden.
- Database command boundaries reject fractional/non-finite cents, malformed envelopes, missing/null/fractional stock-count versions and invalid quantities. Application roles cannot execute older internal implementations to bypass these guards.
- TypeScript, targeted ESLint and the optimized production build pass. Next.js is pinned to 16.4.1, with compatible source-map-js and baseline-browser-mapping advisory patches in the lockfile. The production-only dependency audit reports zero known advisories at the time of this check.
- Real authenticated API checks returned HTTP 200 for stock/slip bootstrap, monthly reconciliation, accounts, POS and both PDF exports. Unauthenticated reads returned 401; cross-origin mutations returned 403; malformed/null-action requests returned 400.
- Live bootstrap contains all 61 current catalogue products, matching the monthly report. Large bootstrap lists paginate instead of silently stopping at the Supabase row limit; oversized catalogues fail explicitly.
- A synthetic supplier image and text-based PDF were read by the actual application reader/parser, extracting the product, two units, R230 total and R30 VAT. OCR confidence on that clear image was 94%; this does not predict accuracy on all real slips.
- Sample multi-page stock and supplier/physical-sales books were rendered to PNG and visually reviewed. Branding, column headings and page numbers repeat; cancelled quantity corrections remain traceable. No synthetic financial transactions were posted to the live business ledger for these checks.

## Operational limits

Original images/PDFs are processed locally and never uploaded to Supabase. Extraction still requires human review; it does not authenticate a slip. The scanned/image-only PDF browser test was not completed because its upload permission was declined. Actual receipt variation, scanner/terminal/printer hardware and business opening balances/prices require acceptance with the business's own devices and verified data.

Database writes require an online connection. Free-plan cold starts and network interruptions cannot be guaranteed instantaneous. Unknown mutation outcomes use the same saved request key; they must not cause a repeated physical payment.

This supplies stock, sales, VAT and cash-control books. It does not execute bank transfers, card charges, supplier orders or a full general ledger. Cancellation of an incorrect record is different from returning real goods or refunding real money.

The release gate passed locally on Node 22.23.3, matching the configured Node 22 deployment major version. The pinned GitHub Actions workflow is prepared; it has not been pushed or run remotely. Use `npm run verify:retail -- --audit` to repeat the code checks. No cloud transactions are needed by this gate.

The read-only Supabase preflight at 2026-10-16 07:03 UTC found 61 active products, all 61 missing selling prices; no invalid stock balances or ambiguous identifiers; 59 main-store balances without recorded changes; one active administrator and no named owner account. A changed balance version does not prove physical verification. The Firebase export manifest does not confirm a paused-source snapshot. The command returns exit code 2 for these business setup gaps rather than treating a successful build as trading approval.

The admin remains at `/admin` on the existing site. Local previews run at ports 3001 and 3002. Public deployment, final Firebase source-write pause/reconciliation, verified opening counts/prices, recovery/backup arrangements and named staff credential rollout remain operational release work. See `SUPABASE_MIGRATION.md` and `INVENTORY_SLIPS.md`. Dashboard-applied migration versions must be registered before future CLI pushes.
