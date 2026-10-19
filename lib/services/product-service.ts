"use client";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { check } from "@/lib/customer-data";
import type { Product } from "@/lib/types/product";
type CatalogueRow = {
  id: string;
  name: string;
  code: string;
  category: string;
  brand: string;
  supplier: string;
  visible: boolean;
  featured: boolean;
  data: Partial<Product>;
};
export type ProductFilter = {
  category?: string;
  brand?: string;
  supplier?: string;
  search?: string;
  stockStatus?: string;
  featured?: boolean;
  visible?: boolean;
};
export type PaginatedProducts = {
  products: Product[];
  lastDoc: number | null;
  hasMore: boolean;
};
export async function getProducts(
  filters: ProductFilter = {},
  pageSize = 24,
  afterDoc?: number | null,
): Promise<PaginatedProducts> {
  const size = Math.min(Math.max(pageSize, 1), 100);
  const offset = afterDoc || 0;
  const all = check(
    await getSupabaseBrowser().rpc("catalogue_products"),
  ) as CatalogueRow[];
  const filtered = (all || []).filter(
    (row) =>
      (!filters.category || row.category === filters.category) &&
      (!filters.brand || row.brand === filters.brand) &&
      (!filters.supplier || row.supplier === filters.supplier) &&
      (filters.featured === undefined || row.featured === filters.featured) &&
      (!filters.search ||
        `${row.name} ${row.code}`
          .toLowerCase()
          .includes(filters.search.toLowerCase())),
  );
  const rows = filtered.slice(offset, offset + size + 1);
  const products = rows.slice(0, size).map(
    (row) =>
      ({
        ...row.data,
        ...row,
        imageUrl: row.data.imageUrl || "",
        stockStatus: row.data.stockStatus || "Confirm availability",
        price: row.data.price || "Quote on request",
      }) as Product,
  );
  return {
    products,
    lastDoc: products.length ? offset + size : null,
    hasMore: rows.length > size,
  };
}
export async function getProductById(id: string) {
  const rows = check(
    await getSupabaseBrowser().rpc("catalogue_products"),
  ) as CatalogueRow[];
  const row = rows?.find((item) => item.id === id);
  return row ? ({ ...row.data, ...row } as Product) : null;
}
export const getProductsByCategory = async (category: string, pageSize = 24) =>
  (await getProducts({ category, visible: true }, pageSize)).products;
export const getFeaturedProducts = async (pageSize = 8) =>
  (await getProducts({ featured: true, visible: true }, pageSize)).products;
export const searchProducts = async (search: string, pageSize = 24) =>
  (await getProducts({ search, visible: true }, pageSize)).products;
export function watchProducts(
  callback: (rows: Product[]) => void,
  pageSize = 100,
) {
  const db = getSupabaseBrowser();
  const refresh = () => {
    void getProducts({}, pageSize).then((result) => callback(result.products));
  };
  refresh();
  const channel = db
    .channel(`products-${crypto.randomUUID()}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "products" },
      refresh,
    )
    .subscribe();
  return () => {
    void db.removeChannel(channel);
  };
}
export const getAllCategories = async () =>
  [
    ...new Set(
      (await getProducts({}, 100)).products.map((product) => product.category),
    ),
  ].sort();
export const getAllBrands = async () =>
  [
    ...new Set(
      (await getProducts({}, 100)).products.map((product) => product.brand),
    ),
  ].sort();
