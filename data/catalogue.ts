import type { MarketResearch } from "@/data/marketResearch";

export type CatalogueFilter = "Paint Systems" | "Prep & Repair" | "Industrial" | "Solvents" | "Masking" | "Abrasives" | "Tools & Supplies";
export type ProductSeed = { id: string; name: string; brand: string; filter: CatalogueFilter; subcategory: string; image: string };
export type CatalogueCategory = { id: string; filter: CatalogueFilter; title: string; description: string; bestFor: string; supplier: string; source: string; accent: string; ctaLabel: string; products: ProductSeed[] };
export type CatalogueProduct = { id: string; name: string; categoryId: string; category: string; filter: CatalogueFilter; subcategory: string; supplier: string; brand: string; primaryImage: string; images: string[]; source: string; tags: string[]; featured?: boolean; isNewArrival?: boolean; isNew?: boolean; code?: string; size?: string; colour?: string; price?: string; marketResearch?: MarketResearch };

export const catalogueFilters: ("All" | CatalogueFilter)[] = ["All", "Paint Systems", "Prep & Repair", "Industrial", "Solvents", "Masking", "Abrasives", "Tools & Supplies"];
export const catalogueDisclaimers = ["Product availability may change.", "Supplier prices are not shown online.", "Ask TRUECOLOURS for current stock and pricing."];
const img = (file: string) => `/products/${file}`;
type Row = [string, string, string, CatalogueFilter, string, string];

// One row per supplied file. This is the source of truth for what appears in the catalogue.
const rows: Row[] = [
  ["q-bond-ultra-adhesive","Q-Bond Ultra Adhesive","Q-Bond","Tools & Supplies","Adhesives","05992988-D7D3-46BE-9E60-B1AA84CEE9DF.PNG"],
  ["luxcoat-quick-drying-enamel-aluminium-silver","Luxcoat Quick Drying Enamel Aluminium Silver","Luxor","Industrial","Quick Drying Enamel","0F918FFC-8106-4510-8162-F59A4C7C2853.PNG"],
  ["luxline-finishing-black","Luxline Finishing Black","Luxline","Paint Systems","Automotive Paint","11CED917-8416-420D-87F1-5A2E79D16277.PNG"],
  ["autogold-aga8-plastic-primer","Auto Gold AGA8 Polyprop Plastic Primer","Auto Gold","Prep & Repair","Plastic Primer","1B3D0EB6-7357-4D1A-B0A6-B8D6ECAAFD88.PNG"],
  ["bulldog-bdx5005-filling-primer","Bulldog BDX 5005 2K Filling Primer HS","Bulldog","Prep & Repair","Filling Primer","2B1ED676-7404-4EAB-954D-90A431DE90AC.PNG"],
  ["horizon-zirconia-flap-disc","Horizon Zirconia Flap Disc 40 Grit","Horizon","Abrasives","Flap Discs","30ADB8CC-9B08-46B4-A0EC-BD0C344F7A0D.PNG"],
  ["luxcoat-dark-admiral-enamel","Luxcoat Quick Drying Enamel Dark Admiral","Luxor","Industrial","Quick Drying Enamel","3A11E390-792A-4F60-B07F-186884F67CA5.PNG"],
  ["prochem-thinners","Prochem Thinners E Grade Solvent","Prochem","Solvents","Thinners","442D9C9E-6F9D-48C9-9F38-E3BA04A400F1.PNG"],
  ["automax-2k-primer-beige","Automax 2K Primer Beige","Automax","Prep & Repair","2K Primer","47B63864-25D8-4DFD-97EA-77C9A69FFB2E.PNG"],
  ["profinish-2k-fast-hardener","ProFinish 2K Fast Hardener","ProFinish","Paint Systems","Hardener","4BCBC07A-B47F-43B3-A4E9-84F5276BD8B9.PNG"],
  ["masking-tapes-24mm","Masking Tapes 24mm","Masking Tapes","Masking","Masking Tape","4CE76260-AA77-4397-A731-139D29A8675C.PNG"],
  ["luxline-stone-chips","Luxline Stone Chips","Luxline","Industrial","Protective Coating","55644AE9-0ECB-427C-B07F-94B45DA4A843.PNG"],
  ["proshield-industrial-primer","Proshield Industrial Primer","Proshield","Industrial","Industrial Primer","5C8749CF-E937-40D9-97BC-A9F1DD048624.PNG"],
  ["bulldog-p980-primer","Bulldog P980 1K Primer","Bulldog","Prep & Repair","1K Primer","62139383-59B8-48B4-A0B1-AD94403EF13E.PNG"],
  ["bulldog-p961-etch-primer","Bulldog P961 1K Etch Primer","Bulldog","Prep & Repair","Etch Primer","6317507A-FFBD-4417-8FE3-B843FCE203D0.PNG"],
  ["luxor-fibreglass-chopped-strand","Luxor Fibreglass Chopped Strand","Luxor","Prep & Repair","Fibreglass Repair","8878A88E-88DB-4275-92DE-BD98E94EDBF9.PNG"],
  ["luxprime-primer-surfacer","Luxprime Primer Surfacer","Luxor","Prep & Repair","Primer Surfacer","942C20A0-B632-4667-8C75-B458293AD57E.PNG"],
  ["autocraft-body-filler","Autocraft Body Filler","Autocraft","Prep & Repair","Body Filler","971EECE7-20B6-47E6-9665-E53A06F76F06.PNG"],
  ["luxline-matt-black","Luxline Matt Black","Luxline","Paint Systems","Automotive Paint","AAD137CE-D713-4B6D-8986-C1BCFE8D19CD.PNG"],
  ["bulldog-bdx5005-primer-pack","Bulldog BDX 5005 2K Filling Primer HS","Bulldog","Prep & Repair","Filling Primer","AB88BFE8-FCBD-42A0-A709-512B64DC742D.PNG"],
  ["carvello-ap1-primer","Carvello AP1 HS 5:1 Primer","Carvello","Prep & Repair","HS Primer","AD962316-7F1E-450E-B84C-DA70AAA3BA75.PNG"],
  ["carvello-aa2-etch-primer","Carvello AA2 1K Etch Filler Primer","Carvello","Prep & Repair","Etch Primer","B5DBA03A-0051-4979-AD8D-C41CC05037DB.PNG"],
  ["luxor-aga8-plastic-primer","Luxor AGA8 Polyprop Plastic Primer","Luxor","Prep & Repair","Plastic Primer","BAF37EBA-76A4-4346-ACBD-5FC4D8CBDB9B.PNG"],
  ["autogold-aga8-plastic-primer-can","Auto Gold AGA8 Polyprop Plastic Primer","Auto Gold","Prep & Repair","Plastic Primer","C9A537AA-BB59-4AB1-8A22-83D0C305546D.PNG"],
  ["luxprime-primer-surfacer-grey","Luxprime Primer Surfacer Grey","Luxor","Prep & Repair","Primer Surfacer","ChatGPT Image Aug 17, 2026, 11_17_08 PM (1).png"],
  ["luxline-satin-black","Luxline Satin Black","Luxline","Paint Systems","Automotive Paint","ChatGPT Image Aug 17, 2026, 11_17_09 PM (2).png"],
  ["luxcoat-self-etch-primer","Luxcoat Self Etch Primer","Luxor","Prep & Repair","Etch Primer","ChatGPT Image Aug 17, 2026, 11_17_10 PM (3).png"],
  ["luxcoat-qd-enamel-black","Luxcoat QD Quick Drying Enamel Black","Luxor","Industrial","Quick Drying Enamel","ChatGPT Image Aug 17, 2026, 11_17_10 PM (4).png"],
  ["luxcoat-qd-alkyd-primer","Luxcoat QD Alkyd Primer Grey","Luxor","Industrial","Alkyd Primer","ChatGPT Image Aug 17, 2026, 11_17_10 PM (5).png"],
  ["luxcoat-enamel-thinners","Luxcoat Enamel Thinners","Luxor","Solvents","Thinners","ChatGPT Image Aug 17, 2026, 11_17_11 PM (6).png"],
  ["autogold-m100-basecoat","Auto Gold M100 Ultra Fine Silver Basecoat","Auto Gold","Paint Systems","Basecoat","ChatGPT Image Aug 17, 2026, 11_17_11 PM (7).png"],
  ["autogold-agp1-primer","Auto Gold AGP1 HS 4:1 Primer Beige","Auto Gold","Prep & Repair","HS Primer","ChatGPT Image Aug 17, 2026, 11_17_12 PM (8).png"],
  ["autogold-agh2-hardener","Auto Gold AGH2 HS 2:1 Universal Fast Hardener","Auto Gold","Paint Systems","Hardener","ChatGPT Image Aug 17, 2026, 11_17_12 PM (9).png"],
  ["autogold-agc3-clearcoat","Auto Gold AGC3 2K Crystal Clear","Auto Gold","Paint Systems","Clearcoat","ChatGPT Image Aug 17, 2026, 11_17_13 PM (10).png"],
  ["hb-body-bodysoft","HB Body BodySoft 2K Polyester Filler","HB Body","Prep & Repair","Body Filler","ChatGPT Image Aug 17, 2026, 11_20_15 PM (1).png"],
  ["hb-body-unifine","HB Body Uni-Fine Universal Fine Polyester Filler","HB Body","Prep & Repair","Fine Filler","ChatGPT Image Aug 17, 2026, 11_20_16 PM (2).png"],
  ["hb-body-615-fibre-filler","HB Body 615 Fibre Filler","HB Body","Prep & Repair","Fibreglass Filler","ChatGPT Image Aug 17, 2026, 11_20_16 PM (3).png"],
  ["hb-body-692-primer","HB Body 692 Series 6 Primer","HB Body","Prep & Repair","Primer","ChatGPT Image Aug 17, 2026, 11_20_16 PM (4).png"],
  ["hb-body-p989-epoxy-primer","HB Body P989 4:1 Epoxy Primer with H732 Hardener","HB Body","Prep & Repair","Epoxy Primer","ChatGPT Image Aug 17, 2026, 11_20_16 PM (5).png"],
  ["hb-body-650-stone-chip","HB Body 650 Stone Chip Spray","HB Body","Industrial","Stone Chip Coating","ChatGPT Image Aug 17, 2026, 11_20_17 PM (6).png"],
  ["bulldog-masking-film","Bulldog Masking Film Roll","Bulldog","Masking","Masking Film","ChatGPT Image Aug 17, 2026, 11_20_17 PM (7).png"],
  ["bulldog-foam-tape-wide","Bulldog Foam Tape","Bulldog","Masking","Foam Tape","ChatGPT Image Aug 17, 2026, 11_20_18 PM (8).png"],
  ["bulldog-elite-paint-strainer","Bulldog Elite Paint Strainer 190 Microns","Bulldog","Tools & Supplies","Paint Strainers","ChatGPT Image Aug 17, 2026, 11_20_19 PM (10).png"],
  ["bulldog-foam-tape-12mm","Bulldog Foam Tape 12mm","Bulldog","Masking","Foam Tape","ChatGPT Image Aug 17, 2026, 11_20_19 PM (9).png"],
  ["luxprime-primer-surfacer-copy","Luxprime Primer Surfacer","Luxor","Prep & Repair","Primer Surfacer","ChatGPT Image Aug 17, 2026, 11_31_20 PM (1).png"],
  ["luxline-satin-black-copy","Luxline Satin Black","Luxline","Paint Systems","Automotive Paint","ChatGPT Image Aug 17, 2026, 11_31_21 PM (2).png"],
  ["luxcoat-self-etch-primer-copy","Luxcoat Self Etch Primer","Luxor","Prep & Repair","Etch Primer","ChatGPT Image Aug 17, 2026, 11_31_21 PM (3).png"],
  ["luxcoat-qd-enamel-black-copy","Luxcoat QD Quick Drying Enamel Black","Luxor","Industrial","Quick Drying Enamel","ChatGPT Image Aug 17, 2026, 11_31_22 PM (4).png"],
  ["luxcoat-qd-alkyd-primer-copy","Luxcoat QD Alkyd Primer Grey","Luxor","Industrial","Alkyd Primer","ChatGPT Image Aug 17, 2026, 11_31_22 PM (5).png"],
  ["luxcoat-enamel-thinners-copy","Luxcoat Enamel Thinners","Luxor","Solvents","Thinners","ChatGPT Image Aug 17, 2026, 11_31_22 PM (6).png"],
  ["autogold-m100-basecoat-copy","Auto Gold M100 Ultra Fine Silver Basecoat","Auto Gold","Paint Systems","Basecoat","ChatGPT Image Aug 17, 2026, 11_31_23 PM (7).png"],
  ["autogold-agp1-primer-copy","Auto Gold AGP1 HS 4:1 Primer Beige","Auto Gold","Prep & Repair","HS Primer","ChatGPT Image Aug 17, 2026, 11_31_23 PM (8).png"],
  ["autogold-agc3-clearcoat-copy","Auto Gold AGC3 2K Crystal Clear","Auto Gold","Paint Systems","Clearcoat","ChatGPT Image Aug 17, 2026, 11_31_24 PM (10).png"],
  ["autogold-agh2-hardener-copy","Auto Gold AGH2 HS 2:1 Universal Fast Hardener","Auto Gold","Paint Systems","Hardener","ChatGPT Image Aug 17, 2026, 11_31_24 PM (9).png"],
  ["profinish-2k-clearcoat","ProFinish 2K Clear Coat","ProFinish","Paint Systems","Clearcoat","DA4219D3-A167-4D2E-927F-5EAE039163DD.PNG"],
  ["automax-2k-primer-beige-pack","Automax 2K Primer Beige","Automax","Prep & Repair","2K Primer","E13C00B2-F1E2-4F38-BCB1-FFF21CE46AF9.PNG"],
  ["ultra-light-body-filler","Ultra Light Body Filler","Ultra Light","Prep & Repair","Body Filler","E63F2589-539C-44B2-A8C8-A2302B118B5E.PNG"],
  ["luxor-aga7-etch-filler-primer","Luxor AGA7 1K Etch Filler Primer","Luxor","Prep & Repair","Etch Primer","ECDFEE5A-EA66-4C4D-B28C-A412C678B2FC.PNG"],
  ["luxline-satin-black-can","Luxline Satin Black","Luxline","Paint Systems","Automotive Paint","EF098E9F-4416-4903-A7E2-0FA047C2613D.PNG"],
  ["luxor-agp2-primer-grey","Luxor AGP2 HS 4:1 Automotive Primer Grey","Luxor","Prep & Repair","Automotive Primer","F2005557-C5CF-49A2-9B8D-4B9A054803C9.PNG"],
  ["carvello-ap5-plastic-primer","Carvello AP5 Polyprop Filler Primer","Carvello","Prep & Repair","Plastic Primer","FE04CAB2-B3B2-46A8-8EB7-98B19AB545B3.PNG"],
];

const detail: Record<CatalogueFilter, Omit<CatalogueCategory, "id" | "filter" | "products">> = {
  "Paint Systems": { title: "Paint Systems", description: "Automotive paint, clearcoats and hardeners.", bestFor: "Professional refinishing.", supplier: "TRUECOLOURS", source: "TRUECOLOURS product images", accent: "#e53935", ctaLabel: "Ask About Paint Systems" },
  "Prep & Repair": { title: "Prep & Repair", description: "Primers, fillers and surface preparation products.", bestFor: "Repair and preparation.", supplier: "TRUECOLOURS", source: "TRUECOLOURS product images", accent: "#2563eb", ctaLabel: "Ask About Prep & Repair" },
  Industrial: { title: "Industrial", description: "Industrial coatings and protective finishes.", bestFor: "Protection and durable finishes.", supplier: "TRUECOLOURS", source: "TRUECOLOURS product images", accent: "#475569", ctaLabel: "Ask About Industrial Products" },
  Solvents: { title: "Solvents", description: "Thinners and cleaning solvents.", bestFor: "Paint preparation and clean-up.", supplier: "TRUECOLOURS", source: "TRUECOLOURS product images", accent: "#7c3aed", ctaLabel: "Ask About Solvents" },
  Masking: { title: "Masking", description: "Masking tape, film and foam tape.", bestFor: "Clean paint edges and protection.", supplier: "TRUECOLOURS", source: "TRUECOLOURS product images", accent: "#d97706", ctaLabel: "Ask About Masking" },
  Abrasives: { title: "Abrasives", description: "Abrasives for surface preparation.", bestFor: "Sanding and finishing.", supplier: "TRUECOLOURS", source: "TRUECOLOURS product images", accent: "#ca8a04", ctaLabel: "Ask About Abrasives" },
  "Tools & Supplies": { title: "Tools & Supplies", description: "Workshop supplies and application accessories.", bestFor: "Everyday refinishing work.", supplier: "TRUECOLOURS", source: "TRUECOLOURS product images", accent: "#0f766e", ctaLabel: "Ask About Tools & Supplies" },
};
const slug = (filter: CatalogueFilter) => filter.toLowerCase().replace(/[^a-z0-9]+/g, "-");
const suppliedProducts: ProductSeed[] = rows.map(([id, name, brand, filter, subcategory, file]) => ({ id, name, brand, filter, subcategory, image: img(file) }));
// Current South African retail references, checked against live retailer listings
// on 20 August 2026. These are market prices, not TRUECOLOURS selling prices.
const marketPrices: Record<string, string> = {
  "q-bond-ultra-adhesive": "R72.00",
  "luxcoat-quick-drying-enamel-aluminium-silver": "From R120.52",
  "luxline-finishing-black": "From R180.00",
  "autogold-aga8-plastic-primer": "From R150.00",
  "autogold-aga8-plastic-primer-can": "From R150.00",
  "luxcoat-dark-admiral-enamel": "From R436.32",
  "luxprime-primer-surfacer": "From R145.00",
  "luxprime-primer-surfacer-grey": "From R145.00",
  "luxprime-primer-surfacer-copy": "From R145.00",
  "luxline-matt-black": "From R75.00",
  "luxline-satin-black": "From R190.00",
  "luxline-satin-black-copy": "From R190.00",
  "luxline-satin-black-can": "From R190.00",
  "luxcoat-self-etch-primer": "From R125.00",
  "luxcoat-self-etch-primer-copy": "From R125.00",
  "luxcoat-qd-enamel-black": "From R150.00",
  "luxcoat-qd-enamel-black-copy": "From R150.00",
  "luxor-fibreglass-chopped-strand": "From R55.00",
  "hb-body-p989-epoxy-primer": "R532.69",
};
export const catalogueCategories: CatalogueCategory[] = catalogueFilters.filter((f): f is CatalogueFilter => f !== "All").map((filter) => ({ id: slug(filter), filter, ...detail[filter], products: suppliedProducts.filter((p) => p.filter === filter) }));
export const catalogueProducts: CatalogueProduct[] = suppliedProducts.map((p, index) => ({ id: p.id, name: p.name, categoryId: slug(p.filter), category: detail[p.filter].title, filter: p.filter, subcategory: p.subcategory, supplier: "TRUECOLOURS", brand: p.brand, primaryImage: p.image, images: [p.image], source: "TRUECOLOURS product images", tags: [p.name, p.brand, p.subcategory, p.filter].flatMap((v) => v.toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean), featured: index < 12, price: marketPrices[p.id], size: p.subcategory }));
