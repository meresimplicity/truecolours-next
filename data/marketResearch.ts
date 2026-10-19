export type MarketResearch = {
  priceRange: string;
  priceStatus: string;
  researchType: string;
  specifications: string[];
  applications: string[];
  sources: { retailer: string; url: string; price?: string }[];
  checkedOn: string;
};

export const marketResearchDisclaimer =
  "Competitor pricing is a market reference only and is not necessarily the TRUECOLOURS selling price. Confirm TRUECOLOURS stock and price through WhatsApp.";

// Verified South African retailer and manufacturer research supplied on
// 2026-08-09. Comparable/family prices are explicitly labelled and must never
// be presented as an exact price for the catalogue product.
export const marketResearchByProductId: Record<string, MarketResearch> = {
  "supplier-batch1-h827a-spray-gun-h827a": {
    priceRange: "R420.00–R615.00 for the H-827A gravity-feed spray gun",
    priceStatus: "Verified current South African market range",
    researchType: "Exact product code and nozzle variants verified",
    specifications: [
      "600ml gravity-feed PVC cup.",
      "Nozzle options: 1.4mm, 1.7mm and 2.0mm.",
      "Operating pressure is approximately 3.1–3.45 bar (45–50psi), depending on nozzle.",
      "Suitable for automotive, furniture and equipment coatings.",
    ],
    applications: ["Automotive refinishing", "Basecoat and clearcoat", "Urethane topcoats"],
    sources: [
      { retailer: "Auto Paints and Plates", price: "R420.00", url: "https://autopaintsandplates.co.za/products/bulldog-h-827a-hvlp-spray-gun-silver" },
      { retailer: "Hyper Paint", price: "R615.00", url: "https://hyperpaint.co.za/shop/accessories/painting-accessories/bulldog-h827-gravity-feed-spray-gun-1-4mm-nozzle/" },
    ],
    checkedOn: "2026-08-20",
  },
  "supplier-batch1-180mm-variable-speed-polisher-at3502": {
    priceRange: "R2,049.00–R2,742.24 for the AT3502 polisher",
    priceStatus: "Verified current South African market range",
    researchType: "Exact product code verified",
    specifications: [
      "180mm disc diameter.",
      "220V, 50Hz, 1,200W motor.",
      "Variable no-load speed: 660–3,000 rpm.",
      "3.7kg; supplied without a mop or pad.",
    ],
    applications: ["Vehicle lacquer polishing", "General polishing", "Direct-drive sanding with suitable accessories"],
    sources: [
      { retailer: "Auto Paints and Plates", price: "R2,049.00", url: "https://autopaintsandplates.co.za/products/bulldog-at3502-variable-speed-polisher" },
      { retailer: "Dr Concrete", price: "R2,742.24", url: "https://drconcrete.co.za/product/at3502-variable-speed-polisher/" },
    ],
    checkedOn: "2026-08-20",
  },
  "supplier-batch1-strata-ultra-cutting-creme-350g-presb-12-350": {
    priceRange: "R150.00–R255.00 for the 350g Strata Ultra Cutting Creme",
    priceStatus: "Verified current South African market range",
    researchType: "Exact product family and 350g format verified",
    specifications: [
      "350g cutting-crème tube.",
      "Water-based emulsion with diminishing abrasives.",
      "Removes P1200 and finer sanding scratches.",
      "Contains no waxes, fillers or silicone; VOC compliant.",
    ],
    applications: ["Clear-coat correction", "Oxidation removal", "Gel-coat and marine coatings"],
    sources: [
      { retailer: "Adendorff", price: "From R150.00", url: "https://www.adendorff.co.za/presta-strata-ultra-cutting-creme" },
      { retailer: "Bob Shop", price: "R255.00", url: "https://www.bobshop.co.za/presta-strata-ultra-cutting-cr-me-350g/p/646659521" },
    ],
    checkedOn: "2026-08-20",
  },
  "supplier-batch1-plastic-pro-vos126": {
    priceRange: "R241.56 recorded market reference for the VOS126 1kg tin",
    priceStatus: "Historic South African price reference; confirm current price",
    researchType: "Exact product code and pack size verified",
    specifications: [
      "Carsystem VOS126 Plastic Pro including hardener.",
      "1kg tin.",
      "Specialist plastic putty with adhesion, elasticity and standability.",
      "Used to repair scratches and damage on plastic parts.",
    ],
    applications: ["Plastic-part repair", "Scratch repair", "Automotive refinishing"],
    sources: [
      { retailer: "Bulldog Abrasives", url: "https://bulldogabrasives.co.za/product/plastic-pro-incl-hardener/" },
      { retailer: "Mix'n Paint price list", price: "R241.56 incl. VAT (historic list)", url: "https://mixnpaint.co.za/downloads/Customer-Price-List-April-2018.pdf" },
    ],
    checkedOn: "2026-08-20",
  },
  "supplier-batch1-eco-wet-water-paper-2c101": {
    priceRange: "From R70.00 for Mirka Eco-Wet water paper",
    priceStatus: "Current market reference; grit and pack quantity affect price",
    researchType: "Exact product code and product family verified",
    specifications: [
      "230mm × 280mm full sheets.",
      "Available grits: P60–P2500.",
      "Wet-sanding abrasive paper.",
    ],
    applications: ["Wet sanding", "Paint preparation", "Refinishing"],
    sources: [
      { retailer: "Adendorff", price: "From R70.00", url: "https://www.adendorff.co.za/welding-helmets" },
      { retailer: "Bulldog Abrasives catalogue", url: "https://bulldogabrasives.co.za/wp-content/uploads/2024/06/Automotive-Brochure.pdf" },
    ],
    checkedOn: "2026-08-20",
  },
  "supplier-batch1-150mm-gold-discs-236428-236422": {
    priceRange: "R7.19–R11.45 each for 150mm Mirka Gold discs",
    priceStatus: "Verified current South African market range",
    researchType: "Exact product family, size and hole variants verified",
    specifications: [
      "150mm grip discs in 6+1-hole and no-hole variants.",
      "Available grits: P40–P800.",
      "Suitable for sanding and surface preparation.",
    ],
    applications: ["Automotive surface preparation", "Sanding fillers and primers", "Refinishing"],
    sources: [
      { retailer: "Greymoon Online", price: "R7.19–R11.45 each", url: "https://greymoononline.co.za/brand/mirka/" },
      { retailer: "Bulldog Abrasives catalogue", url: "https://bulldogabrasives.co.za/wp-content/uploads/2024/06/Automotive-Brochure.pdf" },
    ],
    checkedOn: "2026-08-20",
  },
  "horizon-automotive-zirconio-disco-flap-115mm": {
    priceRange:
      "Comparable 115mm zirconium flap discs: R37.20–R75.84 each; 4+1 packs about R148.81–R155.25",
    priceStatus: "No verified online market price found for the exact Horizon product",
    researchType: "Closest verified variants — comparable pricing only",
    specifications: [
      "115mm diameter.",
      "Comparable products use a 22.22–22.23mm bore.",
      "Zirconium abrasive construction.",
      "Comparable flat and 15-degree angled variants.",
      "Comparable grits include P40, P60, P80 and P120.",
      "Verified Tork Craft variants are rated to 13,300 rpm.",
    ],
    applications: [
      "Grinding and finishing welds",
      "Deburring and rust removal",
      "Stock removal, blending and surface finishing",
    ],
    sources: [
      {
        retailer: "Vermont Sales — Tork Craft P60 flat",
        url: "https://www.vermontsales.co.za/TCFD115-3-60_Flap-Disc-Zirconium-115mm-60-Grit-Flat",
      },
      {
        retailer: "Vermont Sales — Tork Craft P60 angled",
        url: "https://www.vermontsales.co.za/Tork-Craft-Products-Accessories-Flap-discs/TCFD115-4-60_Flap-Disc-Zirconium-115mm-60grit-Angled",
      },
      {
        retailer: "Vermont Sales — Tork Craft P120 angled",
        url: "https://www.vermontsales.co.za/Tork-Craft-Products-Accessories-Flap-discs/TCFD115-4-120_Flap-Disc-Zirconium-115mm-120grit-Angled",
      },
      {
        retailer: "Vermont Sales — 115mm zirconium range",
        url: "https://www.vermontsales.co.za/Flap-discs-Zirconium-115mm",
      },
    ],
    checkedOn: "2026-08-09",
  },
  "ultra-light-body-filler-pro-4g": {
    priceRange: "Closest verified Luxor Ultra Light family: R139–R165 for 1kg",
    priceStatus: "No verified online market price found for the exact Pro 4G product",
    researchType: "Closest verified product family — comparable pricing only",
    specifications: [
      "Luxor Ultra Light Original family is a lightweight polyester filler.",
      "Thixotropic formulation with a pinhole-free finish.",
      "Green body filler with paste hardener included.",
      "Manufacturer family sizes: 1kg, 3.8kg and 5kg.",
      "Recommended sanding range: P60–P240.",
    ],
    applications: [
      "Aluminium and galvanized steel",
      "Stainless steel and bare steel",
      "Wood and polyester surfaces",
    ],
    sources: [
      {
        retailer: "Luxor Paints — manufacturer",
        url: "https://luxorpaints.co.za/product/ultra-light-bodyfiller-original/",
      },
      {
        retailer: "La-Cor",
        price: "R139.00 for 1kg",
        url: "https://lacor.co.za/products/luxor-ultra-light-body-filler",
      },
      {
        retailer: "Leroy Merlin South Africa",
        price: "R165.00 for 1kg",
        url: "https://leroymerlin.co.za/luxor-auto-body-filler-ultra-light-1kg-6bbd5e66",
      },
    ],
    checkedOn: "2026-08-09",
  },
  "auto-gold-aga-8-polyprop-plastic-primer": {
    priceRange: "R150.00–R275.00, depending on 500ml or 1L size and retailer",
    priceStatus: "Verified market range by size and source",
    researchType: "Exact product and product code verified",
    specifications: [
      "Verified code: AGA 8 / AGA8.",
      "Verified sizes: 500ml and 1L.",
      "Ready-for-use spray adhesion promoter.",
      "Designed for new polypropylene plastic.",
      "Good substrate wetting and excellent adhesion to polypropylene.",
    ],
    applications: ["Polypropylene bumpers", "Polypropylene plastic refinishing"],
    sources: [
      {
        retailer: "Luxor Paints — manufacturer",
        url: "https://luxorpaints.co.za/product/aga-8-polyprop-plastic-primer/",
      },
      {
        retailer: "CBS Paint & Panel",
        price: "From R150.00",
        url: "https://cbspaintpanel.co.za/products/autogold-aga8-polyprop-plastic-primer-500ml-1l",
      },
      {
        retailer: "La-Cor",
        price: "R275.00 for 1L",
        url: "https://lacor.co.za/products/auto-gold-polyprop-plastic-primer",
      },
    ],
    checkedOn: "2026-08-09",
  },
  "luxor-fibreglass-chopped-strand-mat-320g": {
    priceRange: "R55.00–R59.00 at established retailers; R189.00 marketplace observation",
    priceStatus: "Verified exact product",
    researchType: "Exact 320g product and code verified",
    specifications: [
      "Verified code: FGG-FGM320.",
      "Verified weight: 320g.",
      "Chopped-strand, multi-directional reinforcement mat.",
      "Good conformability and fast resin wet-out.",
      "Compatible with polyester and vinyl ester resin.",
      "Chamberlain package listing: 400mm × 200mm × 30mm.",
    ],
    applications: [
      "Marine and boat repairs",
      "Automotive body repairs",
      "GRP panels and mould fabrication",
      "General fibreglass reinforcement",
    ],
    sources: [
      {
        retailer: "Chamberlain",
        price: "R59.00",
        url: "https://www.chamberlains.co.za/luxor-fibreglass-chopped-strand-mat-320g-fgg-fgm320-1009856",
      },
      {
        retailer: "DiYshop.co.za",
        price: "R55.00 incl. VAT",
        url: "https://diyshop.co.za/products/fiberglass-matt",
      },
      {
        retailer: "Bob Shop marketplace",
        price: "R189.00",
        url: "https://www.bobshop.co.za/luxor-fibreglass-chopped-strand-mat-320g/p/654980493",
      },
    ],
    checkedOn: "2026-08-09",
  },
  "luxcoat-quick-drying-enamel-dark-admiralty-grey-and-aluminium-silver": {
    priceRange:
      "Aluminium Silver 1L from R120.52; Dark Admiralty Grey 5L from R436.32",
    priceStatus: "Verified market pricing by colour and volume",
    researchType: "Exact named colour variants verified",
    specifications: [
      "Aluminium Silver 1L: supplier code FGL-QAS, retailer SKU 1160025.",
      "Dark Admiralty Grey 5L: supplier code FGL-QDAG, retailer SKU 1176497.",
      "Oxidatively drying, one-component alkyd coating.",
      "Gloss-retaining topcoat with a smooth gloss finish.",
      "No mixing required and no pot-life restriction.",
      "Family listings include 1L, 5L and 25L sizes.",
    ],
    applications: [
      "Atmospheric topcoat and touch-up work",
      "Industrial structures",
      "Deck and topside applications",
    ],
    sources: [
      {
        retailer: "Luxor Paints — manufacturer",
        url: "https://luxorpaints.co.za/product/luxcoat-quick-drying-enamel/",
      },
      {
        retailer: "BUCO — Aluminium Silver 1L",
        price: "From R120.52",
        url: "https://www.buco.co.za/catalog/product/view/_ignore_category/1/id/133525/s/enamel-quick-drying-aluminium-silver-luxcoat-1l-luxor-fgl-qas-1160025/",
      },
      {
        retailer: "BUCO — Dark Admiralty Grey 5L",
        price: "From R436.32",
        url: "https://www.buco.co.za/catalog/product/view/_ignore_category/1/id/133479/s/enamel-quick-drying-dark-admiralty-grey-luxcoat-5l-luxor-fgl-qdag-1176497/",
      },
      {
        retailer: "Alberton Hardware — Luxor QD variants",
        price: "R125.00–R3,669.00 by colour and volume",
        url: "https://albertonhardware.co.za/product/luxor-quick-dry-qd-industrial-enamel-various-colours/",
      },
    ],
    checkedOn: "2026-08-09",
  },
  "q-bond-ultra-strong-adhesive-and-filling-powders": {
    priceRange: "R69.00–R84.90 for the verified QB2 small repair kit",
    priceStatus: "Verified QB2 small repair kit market range",
    researchType: "Exact product family, kit contents and codes verified",
    specifications: [
      "Verified codes: QB2, QBN0200 and A10787.",
      "Cyanoacrylate-based repair system that sets in seconds.",
      "Contains two sealed 10ml adhesive bottles plus grey and black filling powders.",
      "Black powder is primarily for hard plastics; grey powder is primarily for metals.",
      "Manufacturer exclusions: polyethylene, polypropylene, silicone rubber and stainless steel.",
    ],
    applications: [
      "Hard plastics, motorcycle fairings and bumpers",
      "Radiators, motorcycle casings and carburettors",
      "Aluminium and general metal, plastic, rubber or ceramic repairs",
    ],
    sources: [
      { retailer: "Q-Bond — manufacturer", url: "https://qbond.com/" },
      { retailer: "Q-Bond — manufacturer FAQ", url: "https://qbond.com/about/" },
      {
        retailer: "Securadeal",
        price: "R69.00",
        url: "https://www.securadeal.co.za/product/q-bond-ultra-strong-bonding-adhesive-kit-qb2/",
      },
      {
        retailer: "HSB Trading",
        price: "R74.50",
        url: "https://hsbsa.co.za/products/qb2-4",
      },
      {
        retailer: "Leroy Merlin South Africa",
        price: "R81.00",
        url: "https://leroymerlin.co.za/q-bond-ultra-strong-bonding-adhesive-kit-qb2-e492cd3a",
      },
      {
        retailer: "Chamberlain",
        price: "R84.90",
        url: "https://www.chamberlains.co.za/q-bond-small-ultra-strong-adhesive-filling-powder-qbn0200-1010919",
      },
    ],
    checkedOn: "2026-08-09",
  },
};
