# TRUECOLOURS — Next.js site

Automotive and industrial paint supply in Mankweng, Limpopo. Built with Next.js 16, React, TypeScript, Tailwind CSS 4 and Framer Motion.

## Run locally

Use Node.js 22 (see `.nvmrc`), install with `npm ci`, then run `npm run dev`. Open `http://localhost:3000`.

The existing postinstall script signs installed native build dependencies on macOS. If macOS rejects an installed compiler binary, run `node scripts/sign-native-bindings.js` and restart the server. The script replaces each successfully signed binary with a fresh copy so macOS does not reuse a failed signature validation.

## Validate and build

The admin stays under `/admin` on the existing site, with staff sign-in at `/admin/login`.

```sh
npm test
npm run verify:retail -- --audit
npm run start
```

`verify:retail` requires Node 22 and checks the retail database/authentication/recovery tests, generated route types, TypeScript, retail ESLint, local OCR assets and the production build. The optional audit checks production dependencies. `.github/workflows/retail-integrity.yml` runs the same gate without business credentials; it does not deploy or post transactions.

For an aggregate, read-only launch check, run `npm run preflight:retail -- --project-ref=iyjkepjvsfvhviamsixx` with the private configured admin credentials. It validates the intended project before signing in, prints setup counts without prices or customer data, and returns exit code 2 when business setup is incomplete. It never adjusts stock, records payments or assigns staff roles.

Development and production use webpack. Tailwind scans only application source directories, excluding the large raw vehicle and paint data. Inter and Barlow Condensed are bundled locally in `public/fonts`, with their open font licenses, so builds do not need to fetch Google Fonts.

## Site sections

The homepage includes the hero, business overview, supplier ranges, featured products, services, interactive process guide, product systems, reviews, gallery, trust information, FAQ and contact section. Product cards open their catalogue details; department links resolve to populated filters. The gallery supports previous/next controls, arrow keys, Escape, focus restoration and scroll locking. Mobile navigation supports keyboard access and Escape. Animations respect the visitor's reduced motion preference, and homepage content remains readable if JavaScript is disabled.

The gallery uses the supplied product and process artwork. Keep genuine shop photographs separate from illustrations when replacing assets. Contact information, social links and the map search are centralized in `config/site.ts`.

## Accounts and administration

Copy `.env.example` to `.env.local` and configure the Supabase project URL and publishable key. See [account setup](ACCOUNT_SYSTEM_SETUP.md) and [migration instructions](docs/SUPABASE_MIGRATION.md). Keep privileged migration keys and bootstrap passwords in private environment variables.

Public catalogue browsing and the paint finder are available without signing in. Customer accounts, uploads, invoices, inventory and staff administration use Supabase Auth, Postgres, Storage and Realtime. Firebase Admin is a development dependency used only by the one-time export tools.

Staff sign in at `/admin/login` using a username alias or individual email and a Supabase password. Google sign-in is absent from the admin form. Staff permissions and branch assignments are checked against the current database record on every protected operation.

The integrated POS at `/admin/pos` provides product/barcode lookup, branch stock, cashier shifts, cash/manual card/EFT checkout and printable receipts. Sales, stock, payments and shift reconciliation require an online connection. The older Oracle/ERPNext deployment documents are historical references; those services are not required by this backend.

Stock & slips at `/admin/stock-control` connects supplier purchases and external physical sales to that same inventory ledger and the accounts PDFs. It supports local image/PDF reading, barcode receiving, reviewed product matches, draft autosave, partial payments, mistake cancellation with stock reversals, monthly reconciliation, spending budgets and reorder suggestions. See the [operating guide and open-source sources](docs/INVENTORY_SLIPS.md). Original slip files are never stored in Supabase.

## Historic automotive colours

Find My Colour includes antique and classic years in the normal vehicle selectors, plus an Antique & Classic shortcut. Historic colours use the same individual swatch cards as modern results. Original scanned chips are sampled without decorative gradients, and OCR reads labels and text-only listings. A listing without a printed chip gets an explicitly labelled indicative preview unless its reference matches a sampled chip from the same book. Original charts remain available in a collapsed reference section; chart references are kept separate from OEM codes. Book coverage does not imply every model or a physically verified paint match.

Refresh the source index and inspect all pre-1978 books with `npm run import:historical-paint`. The importer reads all public page sitemaps, deduplicates legacy pages, makes at most three requests at once and saves progress atomically for resumable imports. Its runtime dataset is `data/processed/historical-paint-library.json`; chart images remain hosted by the original source. `/api/paint/history` supports era, year, make, text search, pagination and book detail. The dataset is included in deployment tracing for both archive and paint-search routes. See `docs/paint-data-sources.md` for the source and coverage limitations.

`npm run prepare:historical-swatches -- --books=1926-ford,1965-chevrolet` prepares and saves converted pages in `data/processed/historical-paint-samples.json`. The script also prepares all published ordering swatches, resumes from saved results, and supports `--refresh` or `--all`. Unprepared charts are converted when their book is opened through `/api/paint/history/samples`, using local Tesseract English data. Low quality scans may retain generic sample labels; original references are preserved for verification.

Find My Colour opens with a global search and predictive swatch suggestions. Search by colour name, primary/sales/alias paint code, make, model, or combinations including an applicable year (for example, “Toyota white 2020”). Vehicle selectors are optional. Matching colours and historic colour books have separate pagination so all matches remain accessible.

Find by country sits below the vehicle finder. Search also has a compact region/country button, and accepts phrases such as “Europe green”, “Germany white” or “America blue”. Country results use 257 manufacturer-published listings from 28 complete named palettes across 13 sales markets, with edition dates and official references. All published colour families are included. Europe includes Austria, France, Germany, Italy, the Netherlands, Ukraine and the UK. English colour searches also find regional names such as Grün, Vert and Verde. Untagged general catalogue records are not assigned a country by default. See [country research and source coverage](docs/paint-market-research.md) and the [full structural catalogue audit](docs/paint-catalogue-audit.json) for evidence, corrections and coverage limitations.

Public Get in touch and WhatsApp links open Find My Colour first. Customers can select a colour or open the compact “Need help finding your colour?” option, then open WhatsApp with the selected reference or help request. Product/cart enquiries are carried through this step into the draft. Opening a link does not send a message.

## Deploy

Import this repository into Vercel, choose the Next.js framework preset, configure the variables listed in `.env.example`, and deploy. `npm run build` must pass before publishing.
