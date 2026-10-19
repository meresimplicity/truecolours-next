export type Product = {
  id: string;
  name: string;
  code: string;
  category: string;
  subcategory?: string;
  brand: string;
  supplier: string;
  price: string;
  priceNumeric?: number;
  stockStatus: ProductStockStatus;
  description: string;
  specifications?: string;
  imageUrl: string;
  additionalImages?: string[];
  visible: boolean;
  featured: boolean;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  weight?: string;
  volume?: string;
  packSize?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type ProductInput = Omit<Product, "id" | "createdAt" | "updatedAt">;

export type ProductStockStatus =
  | "In Stock"
  | "Limited Stock"
  | "Out of Stock"
  | "On Order"
  | "Confirm availability";

export const productStockStatuses: ProductStockStatus[] = [
  "In Stock",
  "Limited Stock",
  "Out of Stock",
  "On Order",
  "Confirm availability",
];

export const productCategories = [
  "2K Products",
  "Basecoats",
  "Clearcoats",
  "Primers & Fillers",
  "Hardeners & Activators",
  "Thinners & Solvents",
  "Sandpaper & Abrasives",
  "Masking Products",
  "Polishing & Finishing",
  "Spray Equipment",
  "Safety & PPE",
  "Workshop Supplies",
] as const;
