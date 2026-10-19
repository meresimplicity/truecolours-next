# POS and open-source reuse

The active `/admin/pos` is the integrated Supabase till. Its products, branch inventory, receipts, returns and accounting books share the same database as `/admin/stock-control`. It does not launch ERPNext or require an Oracle VM. The earlier standalone POSNext/Oracle proposal is superseded by this implementation.

The downloaded `operating system/erpnext-develop` and `operating system/POSNext-develop` repositories were used as workflow references for receipt posting, stock ledgers and correction flows. Their GPL/AGPL application code is not copied into the Next.js app. Installing a separate ERP database would require a deliberately designed synchronization and ownership model; there is no implicit synchronization here.

The slip reader directly reuses the Apache-2.0 libraries Tesseract.js, PDF.js and Fuse.js, with self-hosted workers and upstream license notices. See [Inventory slips](INVENTORY_SLIPS.md) for versions, sources, review requirements and correction behaviour, and [POS/day-end](POS_DAY_END.md) for till operation.
