# POS, inventory and day-end accounts

Use `/admin/pos` for the till and `/admin/accounts` for sales books and cash-up PDFs.

## Before trading

1. In Inventory, enter verified selling prices and barcodes, count opening stock for the correct branch, and check the product VAT rates against the business's own tax setup. The catalogue import does not invent prices or stock.
2. Sign in with an individual staff account. Administrators and managers can process returns; cashiers can sell and count their own till.
3. Open a shift with the actual opening cash float. A cashier can have one open shift. An existing open shift selects its original branch.

## During the day

- Scan a barcode or select a product, enter quantities, then confirm cash received or the unique external card/EFT transaction reference. Card/EFT confirmations record a payment; the app does not charge a bank account or terminal.
- Supabase calculates prices and VAT and deducts available branch stock atomically. Changes in price require the cashier to refresh the cart and confirm the new total.
- Record cash paid in/out for extra float, petty cash and banking. These movements affect expected till cash and do not count as sales revenue.
- Reopen a receipt under Receipts & returns. A manager can return all or part of the original quantities, using the original price and VAT. Return to the original payment method. Choose sellable stock or quarantine. Each return produces a credit-note PDF.
- In Inventory > Stock inspection, release inspected stock, hold damaged stock or write off held quantities with a reason. Stale stock versions cannot overwrite another transaction.
- If a request times out, use the same saved retry. Do not repeat the physical payment or refund. Retry keys are retained in the browser tab. Online access is required to save financial or stock transactions.

## Closing

1. Clear or complete the cart. Count all physical till cash, including the opening float.
2. Close the shift and enter the actual count. Expected cash = opening float + cash sales - cash refunds + cash paid in - cash paid out.
3. Open the saved cash-up PDF. Positive differences are overages; negative differences are shortages. The closed snapshot remains unchanged by returns processed in a later shift.
4. In Accounts & day-end, select a branch and up to 31 days. Download the sales book PDF: gross sales, returns, net sales, VAT, cash/card/EFT reconciliation, POS journal control, shift counts, stock movements and a separate invoice-collection schedule.

All period dates use Africa/Johannesburg. Invoice collections are excluded from POS revenue and the till count. Outstanding invoice balances are current balances. Supplier and physical-sales slips now connect to these books through `/admin/stock-control`; see [Inventory slips](INVENTORY_SLIPS.md). External physical sales are included once in revenue, with supplier purchases/payments in a separate schedule. External slip payments do not change a closed POS cash-up. Cost of goods, payroll, bank fees and general-ledger postings still need their own records.

## Validation and deployment

`node --test tests/admin-login.test.mjs tests/request-security.test.mjs tests/supabase-backend.test.mjs` exercises the SQL migrations, permissions, revocation, stock, checkout, partial returns, integer-cent VAT rounding, cash-up and inspection controls. Run `npm run build` before deployment.

The new Supabase project is `iyjkepjvsfvhviamsixx`. Migrations applied through the dashboard must also be marked applied in CLI migration history before a later `db push`; do not rerun the initial schema. The Firebase import was an initial copy, with source writes still allowed. A production switch requires a final paused-source export and reconciliation; do not overwrite a destination after trading has begun.

The schema, POS/accounts, inspection/register, slip books and correction migrations are installed in that project (`20261015100454`, `20261015145916`, `20261015194427`, `20261015201013`, `20261015221000`, `20261016000001`). The local production build is served at `http://127.0.0.1:3001`. Network and database startup time can vary; the Free plan cannot guarantee instant cold starts.
