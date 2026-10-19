import type { CatalogueProduct } from "./catalogue";
import { exactProductImages } from "./exactProductImages";

type ImageProduct = Pick<
  CatalogueProduct,
  | "id"
  | "name"
  | "categoryId"
  | "category"
  | "subcategory"
  | "supplier"
  | "brand"
  | "filter"
  | "isNewArrival"
  | "primaryImage"
  | "images"
>;

export function productSlug(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/\b10\s*%/g, "ten percent")
    .replace(/\b2\s*k\b/g, "two k")
    .replace(/\b2k\b/g, "two k")
    .replace(/\b300\s*d\b/g, "three hundred d")
    .replace(/\b300d\b/g, "three hundred d")
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/%/g, " percent ")
    .replace(/\//g, " ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getCatalogueProductImage(product: ImageProduct): string | undefined {
  return getProductImageEntry(product)?.primaryImage;
}

export function getCatalogueProductImages(product: ImageProduct): string[] {
  return getProductImageEntry(product)?.images ?? [];
}

export function getCatalogueProductImageAlt(product: ImageProduct) {
  return `${product.name} product image available through TRUECOLOURS`;
}

export function getMissingExactImageProducts(products: ImageProduct[]) {
  return products.filter((product) => !getCatalogueProductImage(product));
}

function getProductImageEntry(product: ImageProduct) {
  if (product.primaryImage) {
    return {
      name: product.name,
      primaryImage: product.primaryImage,
      images: product.images?.length ? product.images : [product.primaryImage],
    };
  }

  const slug = productSlug(product.name);
  const remoteEntry = exactProductImages[slug];

  if (remoteEntry) {
    return remoteEntry;
  }

  return undefined;
}
