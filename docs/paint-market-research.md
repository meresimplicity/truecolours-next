# Country and regional paint search research

Research and source checks: **15 October 2026**. Scope: factory exterior colour availability in a **sales market**, rather than a vehicle manufacturer's country of origin.

## Findings and implementation

The existing `data/paint-records.json` contains 8,501 records with **no market field**. Its loader previously filled missing markets with “South Africa”. That default cannot substantiate country availability and has been removed. General paint-code records remain searchable under All countries.

The new regional catalogue contains **257 published colour listings from 28 palettes across 13 countries**, covering all colours in the selected source tables. Europe groups Austria, France, Germany, Italy, the Netherlands, Ukraine and the United Kingdom, with **170 listings**. Other indexed regions are Africa, Asia, North America and Oceania. A region combines its documented country records; it does not imply continent-wide or EU-wide coverage.

Each regional record keeps its country, model, published colour name, code where stated, source edition and official reference. A brochure's publication date is not converted into a vehicle model year. Eight sources explicitly identify a model year: the 2025 Mustang order guide, 2025 US GR Corolla release, 2020 Canadian Corolla brochure, 2025 Austrian Mazda3 table, MY2024 German Audi A5 price list and the three American Honda specification tables. Published availability does not confer TRUECOLOURS physical-match verification. Country results exclude historic charts without established sales-market provenance.

Names vary by market: code 040 appears as Glacier White in the Australian GR Corolla brochure and Super White in the Canadian Corolla brochure. These names remain separate. Codes absent from a regional release remain absent; they are never copied from a different country's listing. Existing same-brand/code swatches may supply an explicitly indicative digital preview; the source of regional availability remains the manufacturer reference.

## Indexed official sources

| Sales country | Vehicle / edition | Listings | Primary evidence |
| --- | --- | ---: | --- |
| Germany | Toyota Corolla, September 2026 price list | 11 | [Toyota Germany brochure viewer](https://broschueren.toyota.de/de/profiles/9c59aae1a25d-toyota/editions/corolla-preisliste), paint table p. 18; publication date p. 53 |
| United States | Ford Mustang, model year 2025 | 11 | [Ford order guide](https://www.fromtheroad.ford.com/content/dam/fordmediasite/us/en/library/2025/order-guides/2025_Ford_Mustang_Order_Guide.pdf), exterior colour/trim tables pp. 28–30 |
| United States | Toyota GR Corolla, model year 2025 | 4 | [Toyota USA launch release](https://pressroom.toyota.com/ready-to-hit-the-streets-the-2025-toyota-gr-corolla-adds-new-direct-automatic-transmission-option-and-more/), grade colour lists; names only |
| United Kingdom | Toyota Yaris, March brochure, edition year not printed | 12 | [Toyota UK brochure](https://www.toyota.co.uk/content/dam/toyota/nmsc/united-kingdom/brochure-downloads/yaris-march.pdf), monotone and bi-tone tables pp. 14–15 |
| Australia | Toyota GR Corolla, January 2025 brochure | 4 | [Toyota Australia brochure](https://www.toyota.com.au/-/media/toyota/main-site/vehicle-hubs/gr-corolla/files/20250124_gto008687_gr-corolla_brochure.pdf), colour/trim table p. 24 |
| Australia | Toyota HiLux, April 2025 brochure | 11 | [Toyota Australia brochure CDN](https://cdn.mattaki.com/toyota/static-assets/vehicles/brochures/hilux_ebrochure.pdf), colour/trim table p. 25 |
| Canada | Toyota Corolla / Corolla Hybrid, model year 2020 | 8 | [Toyota Canada brochure](https://media.toyota.ca/content/dam/media-toyota/general/unassigned/20145/20-corolla-brochure-en.pdf), exterior colours p. 14 |
| Japan | Toyota GR Corolla, manufacturer FAQ checked October 2026 | 5 | [Toyota Japan body paint FAQ](https://toyota.jp/faq/show/10124.html), exterior body-colour table; mirror-only black 202 is excluded |
| South Africa | Toyota Corolla Cross, 2023 specification sheet | 10 | [Toyota South Africa specification sheet](https://media.cdntoyota.co.za/toyotacms/attachments/cle6tays400zi0pqlifwad22u-corolla-cross-spec-sheet-2023.pdf), paint codes p. 2 |
| Austria | Mazda3, model year 2025 | 10 | [Mazda Austria January 2025 price list](https://media-assets.mazda.eu/raw/upload/mazdaat/globalassets/01-global/downloads/preisliste/2025/01_25_nova/mazda_gesamtpreisliste_01_2025.pdf), model-specific paint table p. 19 |
| Ukraine | Toyota Hilux, 30 January 2025 brochure | 7 | [Toyota Europe / Ukraine brochure](https://scene7.toyota.eu/is/content/toyotaeurope/toyota/nmsc/ukraine/brochures/toyota-hilux-a5.pdf), body colours p. 1 |
| India | Toyota Urban Cruiser Hyryder, July 2022 launch | 11 | [Toyota India release](https://www.toyotabharat.com/news/2022/toyota-forays-into-the-coveted-b-suv-segment-in-india-with-the-urban-cruiser-hyryder.html), seven monotone/four black-roof options; names only |
| Germany | BMW M8 Competition, July 2025 | 13 | [BMW Germany dated price list](https://www.bmw.de/content/dam/bmw/marketDE/bmw_de/new-vehicles/pricelists/preisliste-bmwm8.pdf.asset.1749107905847.pdf), trim-specific exterior availability p. 10 |
| Germany | BMW M850i xDrive, July 2025 | 14 | [BMW Germany dated price list](https://www.bmw.de/content/dam/bmw/marketDE/bmw_de/new-vehicles/pricelists/preisliste-bmwm8.pdf.asset.1749107905847.pdf), trim-specific exterior availability p. 10 |
| Germany | Audi A5 Sportback, MY2024 price-list edition | 12 | [Audi Germany price list](https://www.audi.de/dam/nemo/models/misc/pdf/my-2024/preislisten/preisliste_a5-sportback.pdf), named paint / order references p. 12 |
| United Kingdom | MINI Cooper / Aceman / Countryman / Cooper Convertible, checked October 2026 | 9 / 10 / 9 / 10 | [MINI UK paint guide](https://www.mini.co.uk/en_GB/home/range/colours-and-paints.html), all named colour entries for each model |
| United Kingdom | Peugeot 308 hatchback / SW, August 2023 | 9 / 8 | [Peugeot UK specification guide](https://www.media.stellantis.com/uploads/uk/model-pricelist/peugeot308priceandspecaug2023-6502e1cc69e63.pdf), paint tables pp. 29–30; stock-only entries labelled |
| France | Peugeot 308 Berline / SW, 1 February 2024 | 7 / 6 | [Peugeot France price list](https://www.peugeot.fr/content/dam/peugeot/france/b2c/documentation/catalogues/2402/308.pdf), full paint tables pp. 16–17 |
| Italy | Fiat Panda / Pandina, checked October 2026 | 11 | [Fiat Italy trim comparison](https://www.fiat.it/content/dam/fiat2023/it/trimcomparison/pandina/confronta-gli-allestimenti/FIAT_Panda_Hybrid_trimcomparison.pdf), mono / bi-colour names p. 1 |
| Netherlands | Škoda Octavia, 1 June 2025 | 12 | [Škoda / Pon Netherlands price list](https://s3.eu-central-1.amazonaws.com/poncenter-nl/07/prijslijst-skoda-octavia-1-juni-2025.pdf), exterior paint / order references p. 8 |
| United States | Honda HR-V, model year 2026 | 8 | [American Honda specifications](https://hondanews.com/en-US/honda-automobiles/releases/release-6f8b202ddb1c7f26ecd92774bb014b0c-2026-honda-hr-v-specifications-and-features), full exterior colour / trim table |
| United States | Honda Civic Sedan, model year 2026 | 7 | [American Honda specifications](https://hondanews.com/en-US/honda-automobiles/releases/release-395467bf3b280929feeb74845f0060f5-2026-honda-civic-sedan-specifications-features), full exterior colour / trim table |
| United States | Honda Accord, model year 2023 | 8 | [American Honda specifications](https://hondanews.com/en-US/honda-automobiles/releases/release-4e58b4e0fcd795affa5685a66a387e28-2023-honda-accord-specifications-features), full exterior colour / trim table |

German evidence was obtained through Toyota Germany's current official download directory and brochure viewer. Its downloadable 53-page PDF was extracted locally and the full paint table was rendered for visual verification. The obsolete July 2022 German Corolla PDF returns 404 and was not used. The source spells one two-tone label “Platinum White Pear”; the display expands the evident “Pearl” abbreviation/typo while retaining its published 2PU reference.

## European green colours and multilingual search

The expansion adds **130 listings from 13 palettes**, covering each selected source's named colour table rather than adding green examples alone. Searching `green` within Europe now finds **17 market/model listings** across BMW, Audi, MINI, Peugeot, Fiat and Škoda. These include M Isle of Man Grün, Sanremo Green, Distriktgrün Metallic, British Racing Green IV, Ocean Wave Green, Smokey Green, Olivine Green / Vert Olivine, Verde Foresta, Mamba Green and Highland Green. Repeated names on different models or in different sales countries remain separate listings.

Manufacturer names are preserved. English colour-family terms support German, French, Italian and Dutch names, including German compound names. Word boundaries prevent false matches such as interpreting “Vertigo Blue” as French “vert”, or English “with” as Dutch “wit”. These search terms describe the published name, not a measured paint colour.

The MINI page's headline colour counts differ from some of its named lists; only names actually published in each list are indexed. MINI and Fiat sources do not publish paint codes, so those entries remain name-only. The Škoda table duplicates Candy White's reference beside Mamba Green; Mamba Green's code is deliberately left unconfirmed. Audi order/sales references are preserved as published without inventing a separate refinishing code. Peugeot's hatchback and SW have different tables: Vertigo Blue and Pearlescent White are listed for the UK hatchback only. The French Olivine Green record describes the February 2024 edition, not current availability.

## Audit of every stored colour

The full structural audit covers **all 8,501 stored rows across 22 brands**, irrespective of colour family. The reproducible result is [paint-catalogue-audit.json](paint-catalogue-audit.json); regenerate it with `node scripts/audit-paint-catalogue.ts --output docs/paint-catalogue-audit.json`.

- **20 legacy ID collision groups** included different Honda and Chery colours and the separate Prius / Prius+ models. Runtime identities now preserve the full reference and model spelling, including `+`. One exact duplicate BMW row is collapsed, leaving 8,500 distinct runtime rows. This restores 23 distinct references that an ID-only global search could previously hide.
- **15 Honda records** had an OEM code split into a primary prefix and a supposed sales suffix. The six known code/name pairs are restored only when both the complete code and colour name agree with Honda documentation. The Honda specification tables above establish NH-731P, NH-797M, NH-883P, NH-830M and R-513; [American Honda service bulletin 19-057](https://static.nhtsa.gov/odi/tsbs/2019/MC-10164449-0001.pdf) establishes NH-578 Taffeta White. This corrects code spelling without asserting new model-year or country fitment for the legacy records.
- **Four existing verification claims** lacked a verifier/date. They no longer receive a verified badge. Existing records with recorded verification evidence are retained.
- **12 raw brand/code groups** contain different digital hex values. Regional reference swatches are reused only when the corrected same-brand/code references agree. Missing or conflicting references receive a visibly labelled estimate based on the published colour name; these estimates are not OEM chips or mixing formulas. All 257 regional listings now include a preview, including names with unpublished codes. Explicit black-roof names show both body and roof colours. Digital previews are never physical-match guarantees.
- **8,471 legacy records link back to the site's own catalogue**, and all 8,501 lack documented national availability. Those links do not independently prove OEM fitment or a sales market. The general catalogue remains a reference to confirm against a paint-code label, while country results require the separate manufacturer evidence above.

The audit does **not** certify every legacy vehicle/year/code association. No complete worldwide missing-colour list can be established from these partial source tables. Further factual expansion needs a documented model/edition source or an authorised maintained automotive-paint data service. No counts or coverage flags are used to present the catalogue as globally complete.

## Sources investigated but not used as country evidence

- BMW Germany's current 3 Series download, initially indexed as November 2025, now serves a document labelled November 2026. It was excluded rather than silently treating a future edition as historical sales evidence.
- Toyota Brazil's 2025 Corolla PDF has an indexed colour table but returned 403 to the web reader. It was not imported without direct inspection.
- Toyota Finland's 2025 Hilux price list includes accessory sensor colours; those entries do not establish the full body-paint palette and were not imported as one.
- A Malaysian Toyota Hilux price-list URL could not be fetched consistently. No regional records were inferred from secondary listings.
- Toyota France's October 2023 release documents selected new colours, but was not used to claim a complete national palette.
- An older UK Yaris PDF exceeded the web reader's size limit; the accessible March brochure with its own code tables was used instead. Its year is left unspecified.

## Coverage limits and expansion

This is a documented initial index, **not a complete database of every paint sold worldwide**. Several entries cover previous editions, and grades, option packages and build dates can restrict availability. A missing indexed result does not establish that a colour was never sold in that country. Names and published ordering/combination references are preserved without asserting a mixing formula or a physical colour match.

Manufacturer brochures are useful for auditable country/model/edition records, but do not supply a complete continually updated global formulation service. [PPG's PaintManager XI information](https://www.ppg.com/en-US/refinish/color/color-applications/paintmanager-xi) describes maintained formulation and variant tools. PPG's [current ColorMobile transition notice](https://www.ppglinq.com/colormobile.html) directs colour-lookup users to PPG LINQ Color setup or a local PPG representative. No access, integration permission, redistribution rights or public bulk API has been assumed from those pages.

The runtime source lists are `data/paint-market-palettes.ts` and `data/paint-market-europe.ts`; `/api/paint/markets` reports exact indexed counts and references. Expand them with an official regional source, the actual edition, a vehicle/model-year claim only where explicit, and a checked colour/code table. Unknown country provenance must remain unknown.
