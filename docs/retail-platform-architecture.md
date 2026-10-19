# TRUECOLOURS Retail Platform Architecture Assessment

Assessment date: 23 August 2026

This assessment describes the current filesystem in `/Users/bonnysithole/Desktop/truecolours-next`. It does not assume that uncommitted files, Firebase rules, indexes, environment variables, or production data have already been deployed. The implementation strategy is additive: existing documents and public routes remain available while new authoritative services are introduced and reconciled.

## 1. Executive assessment

The application is already a useful catalogue, customer account, administration, and invoicing system. It should be upgraded, not replaced.

It is not yet safe to use as a retail POS. The main reasons are:

1. Customer access and admin access use two separate authentication systems.
2. The 61-product source file is still the public product master; Firestore acts mainly as an override layer.
3. The previous inventory design stored one mutable quantity and recorded history after reading that quantity outside a database transaction.
4. There are no canonical sale, payment attempt, till, shift, return, supplier, purchase order, receiving, or device domains.
5. Website carts are enquiries; they do not reserve stock or perform checkout.
6. The existing admin workspace full-scans and joins many collections, which will not support high-frequency till activity.
7. Catalogue prices are explicitly market references, not authorised TRUECOLOURS selling prices.

The correct path is to retain the current UI and records, add an authoritative command/service layer, migrate data additively, and cut individual workflows over only after reconciliation.

## 2. Existing architecture

### Technology

- Next.js App Router, React, and strict TypeScript.
- Tailwind CSS for presentation.
- Firebase Authentication for website customers.
- Firestore and Firebase Storage for customer and operational records.
- Firebase Admin in server route handlers.
- NextAuth credentials for the existing `/admin` session.
- React PDF for invoices.
- Recharts for current analytics.
- Zod, React Hook Form, React Query, and Zustand are installed and reusable.

### Current system flow

```text
data/catalogue.ts + public/products
          |
          +----> public website and homepage
          |
          +----> admin workspace product list
                    |
             managedProducts overrides
             stockMovements history

Firebase Auth ----> customer account/profile/cart/quotes/orders/messages

NextAuth ---------> /api/admin/workspace ---------> Firebase Admin/Firestore
                            |
                    admin pages and invoice PDF
```

### Authentication and authorization

- Website customers use Firebase Authentication and a Firebase session cookie.
- Firestore `userProfiles/{uid}` holds customer profile data and legacy roles.
- Admin pages use a separate NextAuth credentials session.
- Firebase custom-claim admin endpoints exist, but they are not the identity used by the main admin workspace.
- Before this Phase 1 slice, the workspace treated all operations as one synthetic administrator and had no permission-by-action enforcement.

This split is the largest remaining security architecture issue. A real POS must identify the individual cashier, manager, stock controller, or owner for every command.

### Existing product model

The public source contains stable product IDs, names, category, brand, supplier, image, tags, and optional market-reference prices. Firestore `managedProducts` adds fields such as quantity, minimum stock, visibility, and status.

Missing authoritative commerce fields include:

- SKU distinct from internal product code.
- Barcode and alternate barcodes.
- Product variants.
- Verified selling price and effective date.
- Cost price and historical cost layers.
- Tax class.
- Unit of measure.
- Reorder point, target level, and supplier lead time.
- Channel visibility by website/POS/location.

The public website currently merges only stock status, stock quantity, and visibility from Firestore. Product name, description, image, category, and commercial price are not fully centralized.

### Existing inventory

The existing admin UI supports:

- Absolute quantity changes.
- Minimum-stock level.
- Availability status.
- Website visibility.
- A movement reason and note.
- Movement history.

Before this Phase 1 implementation, the server read the old product quantity and then committed a normal batch. Two simultaneous writers could read the same value and overwrite one another. There were no location, reservation, damaged, returned, quarantine, incoming, or version fields.

### Customers and website users

The existing customer foundation is substantial and reusable:

- Firebase Authentication users.
- Profiles and customer numbers.
- Contact and business details.
- Addresses.
- Vehicles and saved colours.
- Cart, favourites, notifications, and activities.
- Orders, quote requests, messages, and invoice access.
- Admin customer search and customer history view.

The current cart is an enquiry cart. It does not create an atomic order, reserve stock, or process a payment.

### Quotations and invoices

Quotation requests exist for customers, but there is no complete admin quotation workspace or reliable quote-to-sale conversion.

Invoicing is the strongest operational module and should be extended. Reusable parts include:

- VAT and discount calculation.
- Invoice numbering concept.
- Customer and walk-in invoices.
- Payment entries and balance tracking.
- Status history, revisions, and activity.
- Secure customer link.
- A4/PDF rendering.
- Email webhook and customer notification path.

Invoice payment recording still needs its own transactional/idempotent service. It must not become the POS payment ledger as-is.

### Admin synchronization and performance

The current `/api/admin/workspace` route loads Firebase Authentication users plus broad Firestore collections and joins them in memory. The client opens multiple realtime listeners; a change triggers another broad workspace refresh.

This is acceptable for the current small admin workspace but not for barcode search, checkout, or large transaction history. POS queries must be narrow, indexed, and paginated.

### Existing integrations

Reusable integrations:

- Firebase Auth, Firestore, and Storage.
- Local product imagery and existing image delivery.
- WhatsApp `wa.me` enquiry links.
- Invoice PDF generation.
- Optional invoice email webhook.

Not currently implemented:

- Payment gateway or payment-terminal adapter.
- Thermal receipt bridge or ESC/POS output.
- QZ Tray or equivalent local print agent.
- Barcode listener/service.
- Cash drawer integration.
- Device registry.
- Offline transaction queue.
- Accounting adapter.
- Signed business webhooks/event outbox.

## 3. Functionality to reuse

Retain and evolve:

- The public website, homepage, catalogue UI, exact product IDs, and local images.
- Firebase customer identities and current customer records.
- Account dashboard, profiles, addresses, carts, saved colours, vehicles, messages, and notifications.
- Current admin visual language, responsive shell, and page structure.
- Admin inventory UI as a compatibility surface while its write path moves to `InventoryService`.
- Invoice calculation, editing, PDF generation, customer delivery, and status history.
- Existing orders, quotes, invoices, and audit documents as legacy records.
- Firebase Admin initialization and revocation-aware customer session verification patterns.
- Zod validation, Recharts, React Query, and Zustand dependencies.

Do not treat these as authoritative POS foundations:

- Static catalogue market-reference prices.
- The shared admin credential as a long-term staff identity.
- Browser-provided order totals, prices, permissions, or payment status.
- A mutable product quantity without a balance transaction and movement.
- The monolithic workspace response for POS queries.
- Duplicate order/quote/invoice types spread across multiple files.

## 4. Target architecture

```text
Public Website       Admin Workspace       POS / Till PWA
       \                    |                    /
        \                   |                   /
         +-------- Query APIs + Command APIs --+
                              |
        Authentication + Permission + Idempotency boundary
                              |
     Product | Inventory | Sales | Payments | Documents | Purchasing
                              |
        Firestore transactions + immutable ledgers + projections
                              |
                    Transactional event outbox
                              |
       Email | WhatsApp | Accounting | Payment | Print/Device adapters
```

Design rules:

- Query APIs read optimized projections.
- Command APIs own every state-changing business operation.
- Sensitive values are recalculated or loaded server-side.
- One command writes all database state it owns atomically.
- External calls occur outside database transactions and are completed through verified callbacks/state machines.
- Idempotency keys protect checkout, payments, receiving, returns, refunds, and inventory commands.
- Public product projections never contain costs, margin, supplier terms, or other internal data.

## 5. Required additive schema

Money should be stored in integer minor units, for example `sellingPriceCents: 12500` for R125.00. Financial line items preserve immutable price, cost, discount, and tax snapshots.

| Collection/entity | Purpose and important fields |
| --- | --- |
| `businesses` | Business configuration, currency, tax, branding, schema version. |
| `locations` | Store/warehouse identity, address, type, active status. |
| `productMasters` | Internal product identity, description, supplier, costs, margin, tax class, units, status. Never public. |
| `publicProducts` | Sanitized website projection: product content, channel visibility, public price, available stock/status. |
| `productVariants` | Parent product, variant attributes, SKU, verified price/cost, tax, unit. Legacy products receive one deterministic default variant. |
| `productBarcodes` / `barcodeLookups` | Unique normalized barcode claims pointing to a variant. |
| `inventoryBalances` | Business, location, product/variant, on-hand, reserved, available, incoming, damaged, returned, quarantined, version. |
| `stockMovements` | Immutable type, bucket changes, before/after, location, actor, reference, reason, idempotency/request hashes, timestamp. |
| `stockBatches` | Lot/batch, supplier reference, received/manufactured/expiry dates, remaining quantity, costing layer. |
| `stockCounts` and `stockCountItems` | Expected, counted, variance, status, approval, reconciliation movement IDs. |
| `stockTransfers` and items | Source/destination, requested/approved/in-transit/received state, in-transit quantities. |
| `inventoryReservations` | Source record, quantity, expiry, release status, location/variant. |
| `sales` and `saleItems` | Sale state, till, cashier, immutable item/tax/price/cost snapshots, totals, document number. |
| `payments` and `paymentAttempts` | Method allocations, provider references, confirmation state, refunds, permitted card metadata only. |
| `returns` and `returnItems` | Source sale, reason, condition/disposition, refund/store-credit state, linked stock movements. |
| `tillRegisters` | Till/device/location configuration and current state. |
| `tillSessions` | Cashier shift, opening float, expected/actual cash, discrepancy and approval. |
| `cashMovements` | Float, cash sale, cash in/out, refund, drawer opening, reason, actor/approver. |
| `suppliers` | Supplier contact, terms, lead time, supplied products, active status. |
| `purchaseOrders` and items | Ordered costs/quantities, expected date, status, totals and approvals. |
| `goodsReceipts` and items | Actual receipt quantities, batches, cost layers, receiving user and movements. |
| `customers` | Canonical CRM/account data linked to existing `userProfiles` during transition. |
| Existing `quotes` / `invoices` | Add canonical items, status machines, number claims, balances, conversions, credits, retention metadata. |
| `staff`, `roles`, `permissions` | Individual staff profile, locations, active status, explicit permissions and approval rules. |
| `devices`, `printers` | Registered till/device/printer, location, adapter, status, last activity. |
| `idempotencyKeys` | Command scope, request hash, stored result, expiry. Deterministic movement documents already provide this for Phase 1 inventory adjustments. |
| `auditLogs` | Server-only actor, action, old/new value, related record, device, location, timestamp. |
| `outboxEvents` | Signed/retryable integration events created in the same transaction as business changes. |
| `webhookEvents` | Provider event ID, signature result, processing state, retry/error metadata. |
| `schemaMigrations` | Migration status, checkpoint, counts, conflicts, start/completion timestamps. |

Required unique-claim documents should protect SKU, barcode, receipt number, invoice number, quotation number, purchase-order number, and return number from concurrent duplication.

## 6. Migration strategy

1. Export Firestore before applying a migration.
2. Run the migration in dry-run mode and resolve duplicate/conflicting identifiers.
3. Seed `businesses/truecolours` and `locations/main-store`.
4. Seed product masters and default variants with existing stable IDs and images.
5. Do not invent SKUs, barcodes, costs, or selling prices.
6. Migrate only known legacy stock quantities. Missing stock remains unknown rather than being assumed zero.
7. Create one deterministic opening-balance movement for each known quantity.
8. Dual-write the new balance and current `managedProducts` projection.
9. Shadow-read and reconcile before changing website/POS reads to the new balance.
10. Preserve legacy records until the new flow has passed reconciliation and rollback testing.

The included `001-bootstrap-inventory-ledger.mjs` migration is dry-run-only by default and refuses to apply if it finds a balance without its deterministic opening movement.

## 7. Required routes/pages

### POS, sales, and tills

- `/admin/pos`
- `/admin/pos/held`
- `/admin/sales/transactions`
- `/admin/sales/transactions/[saleId]`
- `/admin/sales/returns`
- `/admin/sales/returns/new`
- `/admin/sales/returns/[returnId]`
- `/admin/sales/payments`
- `/admin/tills`
- `/admin/tills/[tillId]`
- `/admin/tills/[tillId]/cash-up`
- `/admin/tills/z-reports/[reportId]`

`/admin/pos` should use a full-screen POS shell rather than the current padded business-page shell.

### Products and inventory

- `/admin/products`
- `/admin/products/new`
- `/admin/products/[productId]`
- `/admin/products/categories`
- `/admin/products/brands`
- `/admin/products/barcodes`
- Retain `/admin/inventory` as the overview.
- `/admin/inventory/movements`
- `/admin/inventory/products/[productId]`
- `/admin/inventory/counts`, `/new`, and `/[stockCountId]`
- `/admin/inventory/transfers`, `/new`, and `/[transferId]`
- `/admin/inventory/low-stock`
- `/admin/inventory/batches`

### Purchasing

- `/admin/purchasing/suppliers`
- `/admin/purchasing/suppliers/[supplierId]`
- `/admin/purchasing/orders`
- `/admin/purchasing/orders/new`
- `/admin/purchasing/orders/[purchaseOrderId]`
- `/admin/purchasing/receiving`
- `/admin/purchasing/receiving/[goodsReceiptId]`

### Customers, website, and documents

- Retain `/admin/customers`; add `/admin/customers/[customerId]` and statements.
- `/admin/quotes`, `/new`, and `/[quoteId]`.
- Retain and extend current invoice routes.
- `/admin/website`
- `/admin/website/users`
- `/admin/website/orders`
- `/admin/website/content`
- `/admin/website/promotions`

Website products must open the canonical product editor with a website-channel filter, not a separate database/editor.

### Reports, staff, and settings

- `/admin/reports` with sales, inventory, profitability, customers, and staff reports.
- `/admin/staff`, `/admin/staff/[staffId]`, and `/admin/staff/roles`.
- `/admin/notifications`.
- Retain `/admin/activity` as the audit log.
- `/admin/devices`.
- `/admin/settings/hardware/printers`.
- `/admin/settings/hardware/diagnostics`.
- `/admin/settings/payments`.
- `/admin/settings/locations`.
- `/admin/settings/tax`.
- `/admin/settings/numbering`.

Future website checkout routes are `/cart`, `/checkout`, `/checkout/payment`, and `/orders/[orderId]/confirmation`.

## 8. Required backend services

- `ProductService`: canonical product/variant/barcode management and public projection.
- `PricingService`: authorised selling price, promotions, tax, discounts, price history, and immutable snapshots.
- `InventoryService`: atomic balances, movements, reservations, counts, transfers, batches, and reconciliation.
- `SalesService` / `CheckoutService`: authoritative cart validation and atomic sale finalization.
- `PaymentService`: provider-neutral attempts, split allocations, callbacks, refunds, and reconciliation.
- `TillService`: register state, shifts, float, expected cash, cash-up, and Z-reports.
- `ReceiptService`: receipt model and render targets.
- `PrinterService`, `DeviceService`, `ReceiptPrinterAdapter`, and `LabelPrinterAdapter`.
- `CustomerService`: CRM, credit, statements, privacy controls, and website identity linkage.
- `QuotationService` and `InvoiceService`: canonical documents, conversion, numbering, delivery, and credits.
- `SupplierService` and `PurchasingService`: suppliers, purchase orders, receiving, and lead times.
- `ReturnService`: return authorization, item disposition, refund/store credit, and stock movement.
- `ReportingService`: indexed aggregates and exports rather than full browser-side collection scans.
- `NotificationService`: in-app alerts/preferences and delivery outbox.
- `AuditService`: immutable server-only business events.
- `NumberSequenceService`: safe year/prefix sequences plus uniqueness claims.
- `WebhookService`: signing, event IDs, retry state, and replay protection.
- `SyncService`: offline command queue, conflict policy, and exactly-once replay.

Core business logic must remain outside React components.

## 9. Required APIs

All command APIs require authentication, server permission checks, Zod validation, an `Idempotency-Key`, and a correlation ID. Sensitive totals are recomputed on the server.

### Query examples

- `GET /api/v1/catalogue/products`
- `GET /api/admin/products`
- `GET /api/admin/search?q=`
- `GET /api/admin/inventory/balances`
- `GET /api/admin/inventory/movements`
- `GET /api/pos/products?barcode=`
- `GET /api/pos/products?query=`
- `GET /api/pos/tills/[tillId]/session`
- `GET /api/admin/reports/...`

### Command examples

- `POST /api/admin/inventory/adjustments` — implemented in the first Phase 1 slice.
- `POST /api/admin/inventory/reservations`
- `POST /api/admin/inventory/counts/[id]/reconcile`
- `POST /api/admin/inventory/transfers/[id]/dispatch`
- `POST /api/admin/inventory/transfers/[id]/receive`
- `POST /api/pos/sales/prepare`
- `POST /api/pos/sales/[id]/payments`
- `POST /api/pos/sales/[id]/complete`
- `POST /api/pos/sales/[id]/void`
- `POST /api/pos/returns`
- `POST /api/admin/purchase-orders`
- `POST /api/admin/goods-receipts`
- `POST /api/admin/quotes/[id]/convert`
- `POST /api/admin/tills/[id]/open`
- `POST /api/admin/tills/[id]/cash-up`
- `POST /api/admin/print-jobs`

### Integration events

- `sale.created`
- `sale.refunded`
- `inventory.updated`
- `product.updated`
- `customer.created`
- `invoice.created`
- `payment.completed`
- `purchase.received`

Outbox workers deliver signed webhooks with retry/backoff. Receiving endpoints claim provider event IDs before processing.

## 10. Atomic checkout and payment design

A card provider must never be called from inside a Firestore transaction.

1. Authenticate cashier/till/device and validate the command.
2. Transactionally claim the idempotency key, validate authoritative prices, reserve stock, and create `sale: pending_payment` plus `paymentAttempt`.
3. Call the configured `PaymentProvider` outside the transaction.
4. Receive a signed webhook or query an official status API.
5. Transactionally claim the provider event, finalize sale/payment, consume reservations, create stock movements, assign the receipt number, write audit/outbox events, and mark the attempt complete.
6. On confirmed failure/expiry, transactionally release reservations.

Cash and manager-authorised manual card confirmation use the same finalization command. No flow stores PAN or CVV.

## 11. Hardware integration architecture

### Barcode scanners

USB HID/keyboard scanners require no special browser driver. `BarcodeScannerService` should buffer rapid keystrokes, recognize a configurable terminator, ignore normal typing contexts, normalize the code, perform an indexed lookup, and add/increment the item immediately. WebUSB/WebSerial can be optional adapters, not the only scanner path.

### Printing and cash drawer

```text
Receipt/label model
       |
PrinterService
       |
       +-- QZ/local print bridge adapter (preferred)
       +-- Vendor SDK adapter
       +-- Optional WebUSB/WebSerial adapter
       +-- PDF/browser-print fallback
```

The server creates a short-lived signed print job. The local bridge selects the configured printer and sends ESC/POS, PDF, or label output. Private signing keys remain server-side. Receipt, invoice, quotation, and label printers are separately configurable.

Cash-drawer kick commands go through the configured receipt-printer/device adapter. Automatic opening occurs only after an authorised cash completion. Every manual opening records user, till, time, and reason and can require manager approval.

### Payment providers

Use a provider adapter with operations equivalent to:

- `createPayment`
- `getPaymentStatus`
- `cancelPayment`
- `refundPayment`
- `reconcilePayment`

Only implement terminal handoff when an official provider API/SDK supports it. Otherwise record a permission-controlled manual confirmation. No provider has been selected or fabricated in this phase.

### Diagnostics

Hardware diagnostics should test scanner input, receipt/A4/label printing, cash drawer, printer status, payment provider, network, and synchronization without creating a real sale.

## 12. Offline POS strategy

- Installable PWA shell and approved admin routes/static assets.
- IndexedDB cache of bounded product, customer, inventory-balance, device, and session projections.
- Durable local queue of JSON command envelopes with stable device, operation, correlation, and idempotency identifiers.
- Explicit online, offline, synchronizing, pending, and error states.
- Ordered replay while the app is open when connectivity returns, with stale-claim recovery.
- Server-side authentication, permission, actor ownership, location scope, registered-device state checks when a record exists, idempotency, version-conflict validation, and stored results. Random browser device IDs remain a transitional compatibility path until enrollment is enforced.

The current implementation permits cached lookup and quantity-only inventory adjustments offline. It does **not** permit offline sales, payment confirmation, refunds, customer-credit changes, staff/security changes, metadata changes, manager approvals, or final-unit guarantees. Offline cash sales may be added later within configured limits. Live card authorization remains unavailable offline unless the selected provider officially supports an offline mode; the application must never present a queued or unconfirmed card payment as successful.

The current browser queue is origin-scoped IndexedDB, not encrypted at rest. Persistent storage is requested from the browser but remains platform-controlled. A dedicated password-protected store device is required for this slice. Local PIN lock, enrolled-device keys, encrypted sensitive records, registered-device enforcement, individual staff identities, export/recovery, and a loss/revocation procedure are prerequisites for offline sales or financial data.

## 13. Security changes

Implemented in the first Phase 1 slice:

- A named permission model and legacy-role normalization.
- Permission checks inside server workspace, stream, and inventory command paths.
- Role-filtered admin navigation; UI filtering is supplementary to server enforcement.
- Production no longer falls back to known admin username/password or session secret values.
- Atomic, actor-attributed, idempotent inventory adjustment.
- Direct client writes disabled for balances, movements, managed product projections, audit records, counters, orders, and invoices in the updated rules.
- Nested customer upload paths are covered by Storage rules.
- Verified selling price is separate from the public market-reference label.

Still required before production POS:

- Replace the shared transitional admin login with individual staff identities.
- Add MFA capability, staff/session revocation, terminal PIN lock, and device/location scope.
- Store permissions and approval thresholds server-side and cache them safely.
- Add rate limiting, request/correlation IDs, structured logs, and error monitoring.
- Add same-origin/CSRF checks where cookie-authenticated commands require them.
- Enforce strict schemas and size limits for every command.
- Make quote/message/customer Firestore rules field-specific.
- Add manager approval records for discount, refund, void, cash drawer, stock adjustment, and price override.
- Add payment webhook signature verification and replay protection.
- Add signed short-lived invoice/quotation links with revocation/expiry.
- Establish backup, restore, retention, and POPIA data-subject procedures.

## 14. Phased implementation plan

### Phase 1 — Foundation

- Complete staff identity consolidation and permission persistence.
- Finish canonical schemas and public/internal product separation.
- Run the inventory migration after export and dry-run review.
- Add reservation and price services.
- Move invoice payment recording into a transactional idempotent service.
- Add emulator rules tests, inventory concurrency tests, migration rerun tests, and CI.
- Replace monolithic writes with command routes and begin paginated query routes.

Exit criteria: one trusted identity per staff member; no direct financial/inventory client writes; new and legacy inventory reconcile; identical retries have one effect.

### Phase 2 — POS

- Full-screen POS shell, barcode listener/search, cart, customer selection, held sales, server pricing, cash/manual payment, receipt model, tills and shifts.
- Complete sale as one idempotent command transaction.

### Phase 3 — Advanced inventory

- Reservations, stock counts, transfers, batches, FIFO/FEFO, reorder settings, damaged/quarantine/returns, and history pages.

### Phase 4 — Purchasing

- Suppliers, purchase orders, receiving, batch/cost creation, supplier returns, and purchase recommendations.

### Phase 5 — CRM and financial documents

- Unified customers, credit/accounts, statements, full quotation workflow, conversion, invoices, credit notes, returns and refunds.

### Phase 6 — Hardware and payments

- Printer/device settings, QZ/local bridge, ESC/POS receipts, labels, cash drawer, official payment provider adapters, and diagnostics.

### Phase 7 — Reporting

- Sales, inventory, valuation, gross profit, customer, staff, till, return, and purchasing reports with PDF/CSV/Excel-compatible export.

### Phase 8 — Reliability

- Continue hardening the implemented PWA/offline foundation: encrypted sensitive storage, registered-device enforcement, background sync where the platform reliably supports it, broader conflict handling, outbox/webhooks, backups, restore drills, monitoring, reconciliation, rate limits, and recovery tooling.

### Phase 9 — Intelligence

- Approved recommendations for reorder quantities, trends, fast/slow movers, expiry risk, and tied-up stock. AI remains advisory and cannot mutate business records.

## 15. Phase 1 implementation completed in this slice

Code added or upgraded:

- `lib/business/permissions.ts`: role/permission catalogue and legacy role mapping.
- `lib/server/admin-authorization.ts`: reusable server permission guard and real session actor.
- `lib/business/inventory-types.ts`: balance buckets and immutable movement types.
- `lib/server/inventory-service.ts`: Firestore transaction that updates balance, movement, audit, and legacy product projection atomically and deduplicates retries.
- `POST /api/admin/inventory/adjustments`: Zod-validated dedicated command route.
- Existing inventory UI now calls the dedicated route with an idempotency key.
- Existing workspace mutation remains temporarily compatible but uses the same inventory service.
- Admin workspace and realtime stream use server permission checks.
- Admin navigation is permission-filtered and nested routes highlight correctly.
- Production credentials fail closed; development-only defaults preserve current local access.
- Firestore rules make operational ledger/projection writes server-only.
- Firebase session creation now allocates missing customer numbers with a server transaction, so locking client counter writes does not break new profiles.
- `firestore.indexes.json` introduces initial product, movement, balance, order, and sales indexes.
- Storage rules now support the nested vehicle-upload path used by the app.
- `scripts/migrations/001-bootstrap-inventory-ledger.mjs` provides a deterministic, resumable, dry-run-first opening-balance migration.
- Catalogue market references no longer auto-fill invoice selling prices; only `sellingPriceCents` is treated as verified.

Not performed automatically:

- No migration was applied.
- No Firebase rules or indexes were deployed.
- No production environment variables were changed.
- No existing Firestore documents were deleted or rewritten in bulk.
- No payment, printer, or terminal provider was fabricated.
- No deployed Firebase, concurrency-emulator, or hardware verification has been claimed.

## 16. Immediate next implementation slice

The next safe slice is individual staff identity plus transactional manual invoice payments and inventory reservations. After that, build the POS cash-sale path end to end:

1. Barcode lookup.
2. Authoritative verified price lookup.
3. Cart validation.
4. Stock reservation.
5. Cash payment.
6. Atomic sale, payment, movement, audit, and receipt number.
7. Receipt PDF/browser fallback.
8. Concurrent-final-unit and duplicate-submit tests.

The PWA, bounded IndexedDB snapshot, and inventory-adjustment queue now exist as an early reliability foundation. Only after the cash-sale vertical slice and device hardening pass should offline sales, card-terminal, and printer-bridge work begin.

## 17. Verification record

- `npx tsc --noEmit --pretty false --incremental false`: passed after the final changes.
- `npm run test:foundation`: six role/permission, inventory-availability, and stale-version-conflict tests passed.
- Targeted ESLint over the new foundation, authorization, command route, workspace integration, admin navigation, and migration: zero errors.
- `npm run build`: strict production build passed, including TypeScript validation, and generated `/admin/offline`, `/manifest.webmanifest`, `/api/admin/offline/bootstrap`, `/api/admin/offline/sync`, and `/api/admin/inventory/adjustments`. The former `ignoreBuildErrors` escape hatch was removed.
- A current Next.js/ESLint flat configuration was added. The repository-wide lint run now executes, but it exposes 16 errors and 47 warnings outside the scoped offline/PWA files, primarily in pre-existing catalogue, account, navigation, invoice, and helper code. Those issues are recorded technical debt; they were not hidden by disabling rules.
- Production browser verification loaded the authenticated dashboard once, allowed the service worker to pre-warm approved admin HTML and route-specific JavaScript/CSS, then opened `/admin/offline` without first visiting it and with the local server stopped. The complete route hydrated, retained its IndexedDB device identity, and changed central-sync state to `Needs attention` with `Failed to fetch`.
- The temporary local server had no Firebase Admin service-account credential, so bootstrap failed closed with a visible sync warning and no fabricated empty success. Live snapshot download/replay, Firestore emulator concurrency/rules tests, Firebase deployment verification, migration execution, and hardware verification remain pending.

## 18. Offline foundation implemented in this slice

Client and PWA components:

- `app/manifest.ts`, `public/sw.js`, and generated 192/512/apple icons provide an installable admin PWA. After authentication, an acknowledged worker message pre-warms only the five approved admin shells plus their referenced Next.js JavaScript/CSS. Private shell entries expire after 12 hours and are cleared with acknowledgement plus a direct Cache API fallback on logout. The worker never caches API responses, auth/account pages, invoices, uploads, RSC/prefetch responses, redirected login HTML, or requests carrying authorization headers.
- `lib/offline/offline-db.ts` owns the versioned IndexedDB stores for metadata, product/customer/balance projections, operational records, and the FIFO sync queue. Snapshot replacement across all projection stores is one IndexedDB transaction, so quota/interruption failure preserves the prior complete snapshot. Business records are not stored in `localStorage`.
- `components/pwa/OfflineSyncManager.tsx` downloads bounded snapshots, claims one actor-owned command at a time, replays it, handles idempotent results and conflicts, and retries on online/visibility events plus a periodic interval while the app is open. Network calls time out, automatic retry exhaustion becomes a visible recoverable failure, and definitive server conflicts require an explicit `Discard & reload server stock` decision before FIFO continues.
- `components/pwa/OfflineStatus.tsx` and `app/admin/offline/page.tsx` expose connection, pending, error, device, cache, and last-sync state without implying that browser connectivity equals successful server synchronization.
- Dashboard, inventory, customers, and help can read the last approved cached projection. Manual `On Order` and `Confirm availability` labels survive quantity-only counts. Inventory queues only when the browser was already offline before submission; an interrupted request that may have reached the server is reported as outcome-unknown and is never converted into a new command with different identifiers.

Server boundaries:

- `GET /api/admin/offline/bootstrap` returns a private, no-store, permission-shaped, bounded projection: at most 500 products, 1,000 balances, and 250 customers. A stock controller can download inventory without customer permission; customer rows are omitted for roles that cannot read them.
- `POST /api/admin/offline/sync` accepts at most 25 operations and 128 KB per request, validates same-origin session, actor, permission, operation ownership, location, any registered device record, schema, idempotency, and expected inventory version. Mandatory device enrollment remains future hardening.
- Only `inventory_adjustment` is accepted. Cash/card sales, refunds, credit, security, staff, metadata, and unknown commands are rejected without writes.
- Existing atomic inventory transactions now retain device/operation/correlation identifiers and before/after versions. An identical retry is replayed once; a stale expected version returns a conflict instead of overwriting newer stock.

Operational notes:

- Synchronization is automatic while the app is open; this slice does not claim service-worker background execution on platforms such as iOS.
- Logging out removes the local actor and cached projections and clears private service-worker shell entries. Pending actor-owned commands are retained for safe later recovery rather than silently discarded.
- The current six pure foundation tests do not yet exercise IndexedDB transactions, route schemas/authentication, Firebase-backed idempotent replay, cache expiry, or conflict recovery. Those integration tests are required before production offline operations are approved.
- No Firestore migration, rules/index deployment, production environment change, payment confirmation, or hardware action was performed by this implementation.

## 19. Phase 1 secure transaction slice completed

Implemented after the initial inventory/offline foundation:

- The synthetic shared-owner login was removed. `/admin/login` now verifies an individual Firebase Google or Email/Password identity, then creates a NextAuth staff session only for an active canonical `staff/{uid}` record or a server-authorised bootstrap role.
- The configured first owner can bootstrap safely through `FIREBASE_SUPER_ADMIN_EMAILS`. Later role assignments create or update staff identity, location scope, and session-version records. Role changes revoke Firebase refresh tokens and invalidate old admin sessions.
- `requireAdminPermission()` reloads staff state for every protected request, so disabled accounts, changed roles, revoked session versions, and unassigned locations fail closed even when an older JWT still exists.
- `POST /api/admin/invoices/[id]/payments` is the dedicated same-origin manual-payment command. It recalculates totals from the stored invoice inside the transaction and atomically writes the canonical `payments` document, invoice payment projection/status/balance, activity, and audit entry.
- The invoice payment modal retains one idempotency key across an outcome-unknown network retry. Manual payment confirmation remains online-only and is never queued by the PWA.
- `POST /api/admin/inventory/reservations` creates or releases a reservation. Each command is permission-, location-, schema-, version-, source-, and idempotency-checked before atomically updating `inventoryReservations`, `inventoryBalances`, `managedProducts`, `stockMovements`, `idempotencyKeys`, and `auditLogs`.
- Reservations change only the reserved and available buckets. On-hand remains unchanged until the later sale-consumption command is implemented. Concurrent final-unit reservations serialize on the balance transaction and cannot both succeed.
- Firestore rules keep staff, reservation, payment, idempotency, balance, movement, invoice, and audit writes server-only. New composite indexes cover active reservation expiry and invoice payment history.

Verification for this slice:

- `npm run test:foundation`: 10 tests passed, including all prior permission/offline-version assertions plus exact-cent partial/full settlement, overpayment rejection, final-unit reservation, oversell rejection, and release restoration.
- `npx tsc --noEmit --pretty false --incremental false`: passed.
- Targeted ESLint over the new identity, authorization, transaction, route, schema, login, shell, and client helper files: passed with zero warnings/errors. The older invoice workspace file still has its previously recorded `set-state-in-effect` lint debt outside the payment-modal change.
- `npm run build`: passed and generated `/api/admin/invoices/[id]/payments` and `/api/admin/inventory/reservations` alongside the existing offline and inventory-adjustment routes.
- A local browser/server run was not performed because permission to bind the development server was declined. No production Firebase record, rule, index, environment, or authentication account was changed for verification.
