import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { catalogueProducts } from "../data/catalogue.ts";
import { resolveRequestedCategory } from "../lib/catalogueNavigation.ts";

const navCategories = ["Paint Systems", "Primers", "Fillers & Body Repair", "Industrial", "Solvents", "Abrasives", "Masking", "Commercial Vehicle Refinish", "Tools & Supplies"];

test("every homepage and navigation department resolves to a populated catalogue", () => {
  for (const requested of navCategories) {
    const resolved = resolveRequestedCategory(requested);
    assert.ok(catalogueProducts.some((product) => product.filter === resolved || product.category === resolved || product.subcategory === resolved), `${requested} should have products`);
  }
});

test("old category aliases and invalid links recover to usable departments", () => {
  assert.equal(resolveRequestedCategory("Fillers & Body Repair"), "Prep & Repair");
  assert.equal(resolveRequestedCategory("primers"), "Prep & Repair");
  assert.equal(resolveRequestedCategory("CLEARCOATS"), "Paint Systems");
  assert.equal(resolveRequestedCategory("not-a-real-category"), "All");
  assert.equal(resolveRequestedCategory(null), "All");
});

test("all catalogue and featured product images exist locally", () => {
  for (const product of catalogueProducts) {
    assert.ok(existsSync(new URL(`../public${product.primaryImage}`, import.meta.url)), `${product.name} needs its supplied image`);
  }
});
