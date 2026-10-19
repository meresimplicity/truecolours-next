import type { CatalogueFilter, CatalogueProduct } from "@/data/catalogue";
import { supplierImageProductsBatch1 } from "@/data/supplierImageMapBatch1";

const SOURCE_LABEL = "Automotive supplier catalogue supplied to TRUECOLOURS";

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function filterForCategory(category: string): CatalogueFilter {
  const value = category.toLowerCase();

  if (/paint|aerosol|hb body/.test(value)) return "Paint Systems";
  if (/tape|masking|mask film/.test(value)) return "Masking";
  if (/abrasive|sanding|polish|surface prep/.test(value)) return "Abrasives";
  if (/filler|body repair|plastic repair|colour|hb body/.test(value)) return "Prep & Repair";
  if (/protective coating/.test(value)) return "Industrial";
  return "Tools & Supplies";
}

function tagsForProduct(product: (typeof supplierImageProductsBatch1)[number]) {
  return Array.from(
    new Set(
      [product.productName, product.supplier, product.category, product.partNo, product.specification]
        .join(" ")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((word) => word.length > 1 && !["and", "the", "for", "with"].includes(word))
    )
  ).slice(0, 12);
}

export const supplierBatch1CatalogueProducts: CatalogueProduct[] = supplierImageProductsBatch1.map(
  (product, index) => {
    const categorySlug = slugify(product.category);
    const productSlug = slugify(`${product.productName}-${product.partNo || index + 1}`);

    return {
      id: `supplier-batch1-${productSlug}`,
      name: product.productName,
      categoryId: `supplier-batch1-${categorySlug}`,
      category: product.category,
      filter: filterForCategory(product.category),
      subcategory: product.category,
      supplier: product.supplier,
      brand: product.supplier,
      code: product.partNo || undefined,
      size: product.specification || undefined,
      primaryImage: product.image,
      images: [product.image],
      source: `${SOURCE_LABEL}, page ${product.sourcePage}`,
      tags: tagsForProduct(product),
    };
  }
);

export const supplierBatch1FeaturedProducts = [
  "H827A",
  "AT3502",
  "PRESB-12 350",
  "VOS126",
  "2C101",
  "236428 / 236422",
]
  .map((code) => supplierBatch1CatalogueProducts.find((product) => product.code === code))
  .filter((product): product is CatalogueProduct => Boolean(product));
