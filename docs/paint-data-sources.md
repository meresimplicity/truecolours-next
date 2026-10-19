# TRUECOLOURS — Automotive Paint Data Sources & Licence Audit

This document records all automotive vehicle, make/model/year, and OEM paint-code data sources evaluated and integrated for TRUECOLOURS ("Find My Colour" system).

## Auto Color Library historical reference integration (11 October 2026)

- **Source:** [Auto Color Library / TCP Global](https://www.autocolorlibrary.com/), specifically all six public page sitemaps and their year/make colour-book pages. Added at the user's explicit request.
- **Data:** A deduplicated index of year/make books across all eras. Every indexed pre-1978 book is inspected for original chart-image links and published ordering cards. Ordering-card manufacturer paint codes and chip reference numbers are stored as separate fields. The import metadata records the actual counts, retrieval time and any unavailable pages.
- **Historic coverage:** The indexed year/make books begin in 1924 and include 1925 entries that are missing from the site's antique selector. Earlier period references are available through the source's Colours of the Era, Murphy (1921–1929), and Coaches & Carriages pages.
- **Display:** Historic results use the same individual swatch cards as modern results. Median RGB sampling takes colour from the middle of each original chip, excluding labels and borders. Local OCR reads scanned labels and document-only colour listings. A text listing can reuse a sampled chip from the same year/make book when its reference matches; otherwise it has an explicitly labelled indicative preview based on its colour name. Published ordering swatches are prepared in advance, and every chart page is converted when its book is opened. Original images stay on the source CDN and remain accessible through a collapsed reference section. Only factual sample values and labels are cached; no bulk image copies or mixing formulas are stored, and no source reuse licence is asserted.
- **Limits:** OCR can misread faded labels or retain generic “Colour sample” names. Name-only indicative previews are approximate, and even sampled screen colours reflect scan age, lighting and display calibration. Text search currently covers published ordering cards and book titles, not OCR of every scanned chip. A year/make book can include several models, trim/interior colours or two-tone combinations; it is not treated as model-specific paint coverage, South African market confirmation or a physically verified formulation.
- **Refresh:** `npm run import:historical-paint` writes `data/processed/historical-paint-library.json`. The importer follows the public sitemap index, merges legacy/duplicate URLs, allows only the source's two Shopify image archives, retries failed requests, and checkpoints completed books. Re-running resumes incomplete imports. Parser-version changes trigger a fresh inspection.
- **Swatch preparation:** `npm run prepare:historical-swatches -- --books=1926-ford,1965-chevrolet` writes `data/processed/historical-paint-samples.json`, resumes saved work and supports `--refresh` and `--all`. The API uses the cache first and prepares missing pages on demand. Source charts and local English OCR data are included in production tracing.

The source-specific integration above does not assert the broad licensing claims made for unrelated existing datasets elsewhere in this document.

---

## 1. Selected Production Data Sources

### A. Factory OEM Specifications & Vehicle Identification Guides
- **Source:** Manufacturer Technical Service Bulletins, Factory Order Guides, Vehicle Identification Plate Guides, and Paint Matching Colorimetric References (Toyota, Volkswagen AG, Ford Motor Company, Isuzu Motors, Nissan Motor Co., BMW Group, Mercedes-Benz AG, Hyundai Motor Group, Suzuki Motor Corp., Renault Group, Mazda Motor Corp., Honda Motor Co., Mahindra & Mahindra, General Motors, Great Wall Motor / Haval, Chery Automobile).
- **Licence:** Public factual data (non-copyrightable industrial specifications under international copyright law). Under *Feist Publications, Inc. v. Rural Telephone Service Co.* (499 U.S. 340), alphanumeric identifiers (such as part numbers, paint codes, VIN specifications) and standard factual colour names lack creative authorship and are free for commercial reference use.
- **Commercial Use:** Permitted.
- **Redistribution:** Permitted.
- **Attribution:** OEM designations and trademarks (e.g. Toyota, Volkswagen) are referenced solely for identification and compatibility purposes under fair use.
- **What TRUECOLOURS is using it for:** Primary local baseline database mapping Brand → Model → Model Years → Authentic Factory OEM Paint Code, Finish Type, and Official Colour Name.
- **Limitations:** Does not contain proprietary chemical mixing formulas (resin weights, toner grammage) which remain protected trade secrets of coatings manufacturers (e.g. Glasurit, PPG, AkzoNobel, Axalta).

### B. US Department of Transportation / NHTSA VPIC Database
- **Source:** [National Highway Traffic Safety Administration VPIC API](https://vpic.nhtsa.dot.gov/api/)
- **Licence:** US Federal Government Work (Public Domain worldwide / 17 U.S.C. § 105).
- **Commercial Use:** Permitted without restriction.
- **Redistribution:** Permitted.
- **Attribution:** Not legally required; acknowledged for taxonomy alignment.
- **What TRUECOLOURS is using it for:** Validation and normalization of automotive manufacturer names, models, and year spans.
- **Limitations:** NHTSA VPIC does not track exterior automotive paint codes.

### C. TRUECOLOURS In-Store Verified Overrides
- **Source:** In-store spectrophotometer readings, physical spray-out sample cards, and trade desk customer confirmations performed at Stand No 01 Ga-Thoka R71, Mankweng, Limpopo.
- **Licence:** Proprietary to TRUECOLOURS PAINTS AND CONSTRUCTION.
- **Commercial Use:** Internal primary commercial use.
- **Redistribution:** Displayed on truecolours.vercel.app as verified references.
- **What TRUECOLOURS is using it for:** Top-priority override layer (`source: 'truecolours'`, `verified: true`) for paint codes confirmed by the TRUECOLOURS technical team.

---

## 2. Commercial / External API Adapters (Future Expansion)

### A. MyCarColor API
- **Source:** [mycarcolor.com](https://mycarcolor.com/)
- **Licence:** Commercial SaaS subscription.
- **Commercial Use:** Permitted under paid plan.
- **Redistribution:** Subject to API provider terms (typically prohibits bulk database redistribution; permits end-user queries).
- **Integration Status:** Architecture-ready. Pluggable provider adapter (`MyCarColorProvider` in `lib/paint/api-provider.ts`) enabled when `MYCARCOLOR_API_KEY` is set in environment. Initial production release operates completely independently without requiring a paid subscription.

### B. Paint Calculators API
- **Source:** [paintcalculators.com](https://paintcalculators.com/)
- **Licence:** Commercial API license.
- **Integration Status:** Evaluated; supported by provider abstraction layer.

---

## 3. Audited & Rejected Sources

### A. Scraped Competitor Datasets (e.g., `kashifumar/automotivetouchup-colorcode-scraper`, Color N Drive, AutomotiveTouchup)
- **Source:** Automated web scrapers targeting commercial touch-up vendors.
- **Audit Result:** **REJECTED.**
- **Reason:** Violates target sites' terms of service, circumvents bot protections, and reproduces proprietary database arrangements. Strictly prohibited by TRUECOLOURS engineering standards.

---

## 4. Current Dataset Statistics (Normalized Production Database)

- **Database Engine:** SQLite 3 (server-side indexed `data/paint.db`) + Pre-indexed JSON fallback (`data/paint-records.json`).
- **Manufacturers Covered:** 18+ major brands.
- **Models Covered:** 120+ high-traffic passenger and light commercial vehicle models.
- **Total OEM Paint Code Records:** 500+ genuine OEM factory codes.
- **Year Coverage:** 1995–2026.
- **Fake / Invented Codes:** 0 (all `SAMPLE-*` entries removed from production).
- **Import Timestamp:** Repeatable pipeline via `npm run import:paint-data`.
