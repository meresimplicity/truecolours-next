import { catalogueCategories, catalogueFilters, catalogueProducts } from "../data/catalogue.ts";

const ALL = "All";

export function normalizeCategoryKey(val: string): string {
  return val.trim().toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
}

export function resolveRequestedCategory(requested: string | null): string {
  if (!requested || requested.trim() === "" || requested === ALL) return ALL;

  const norm = normalizeCategoryKey(requested);

  // 1. Check exact or normalized match against catalogueFilters
  for (const filter of catalogueFilters) {
    if (filter === requested || normalizeCategoryKey(filter) === norm) {
      return filter;
    }
  }

  // 2. Check exact or normalized match against catalogueCategories
  for (const cat of catalogueCategories) {
    if (
      cat.title === requested ||
      cat.id === requested ||
      normalizeCategoryKey(cat.title) === norm ||
      normalizeCategoryKey(cat.id) === norm
    ) {
      return cat.title;
    }
  }

  // 3. Check against all product categories and subcategories
  for (const product of catalogueProducts) {
    if (product.category === requested || normalizeCategoryKey(product.category) === norm) {
      return product.category;
    }
    if (product.subcategory === requested || normalizeCategoryKey(product.subcategory) === norm) {
      return product.subcategory;
    }
  }

  // 4. Common aliases and shortcuts
  if (norm === "paint" || norm === "autopaints" || norm === "automotivepaint" || norm === "paintsystems") {
    return "Paint Systems";
  }
  if (norm === "primers" || norm === "clears" || norm === "clearcoats") {
    return norm === "primers" ? "Prep & Repair" : "Paint Systems";
  }
  if (norm === "fillers" || norm === "putty" || norm === "bodyfiller" || norm === "bodyfillers" || norm === "fillersandputties") {
    return "Prep & Repair";
  }
  if (norm === "solvents" || norm === "thinners") {
    return "Solvents";
  }
  if (norm === "abrasives" || norm === "sandpaper") {
    return "Abrasives";
  }
  if (norm === "masking" || norm === "maskingtape") {
    return "Masking";
  }
  if (norm === "industrial" || norm === "protectivecoatings" || norm === "stonechip") {
    return "Industrial";
  }
  if (norm === "tools" || norm === "supplies" || norm === "equipment") {
    return "Tools & Supplies";
  }
  if (norm === "latest" || norm === "newarrivals") {
    return "Latest Supplier Product Range";
  }

  if (norm === "fillersandbodyrepair" || norm === "prepandrepair") return "Prep & Repair";
  if (norm === "commercialvehiclerefinish") return "Paint Systems";

  return ALL;
}

