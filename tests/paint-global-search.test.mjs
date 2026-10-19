import test from "node:test";
import assert from "node:assert/strict";
import { getPaintProvider } from "../lib/paint/provider.ts";
import { getPaintSearchMatch, paginatePaintSearch } from "../lib/paint/search.ts";

const sample = {
  id: "audi-black", brand: "Audi", model: "A1 Sportback", code: "LY9B", salesCodes: ["A2"], aliases: ["9004"],
  displayCode: "LY9B / A2", name: "Brilliant Black", finish: "Solid", yearFrom: 2010, yearTo: 2025,
  alternativeNames: [{ language: "de", name: "Brillantschwarz" }], source: "open-data", verified: false,
};

test("global search accepts names, code variants, aliases and partial vehicle details", () => {
  for (const query of ["Brilliant Black", "black", "ly9", "LY9B-A2", "A2", "9004", "Brillantschwarz", "Audi", "Sportback", "Audi black 2020", "Audi LY9B 2020"]) {
    assert.ok(getPaintSearchMatch(sample, query), `Expected ${query} to match`);
  }
  for (const query of ["Toyota black", "Audi black 2000", "Audi white", "LY9B Toyota", "LY9B 1990", "", "///"]) {
    assert.equal(getPaintSearchMatch(sample, query), null, `Must not match ${query}`);
  }
});

test("search requires every word and respects an explicit list of applicable years", () => {
  const record = { ...sample, years: [2010, 2020] };
  assert.ok(getPaintSearchMatch(record, "Audi black 2020"));
  assert.equal(getPaintSearchMatch({ ...record, yearFrom: undefined, yearTo: undefined }, "Audi black 2015"), null);
  assert.equal(getPaintSearchMatch(sample, "A2 nonexistent"), null);
});

test("global matches extend beyond fifty results and every page remains reachable", async () => {
  const results = await getPaintProvider().searchByCode("white");
  assert.ok(results.length > 50, `Expected all matches, got ${results.length}`);
  assert.ok(results.some((colour) => colour.brand === "Toyota"));
  assert.ok(results.some((colour) => colour.brand === "Volkswagen"));
  const ids = new Set();
  const first = paginatePaintSearch(results, { limit: 24 });
  for (let page = 1; page <= first.pagination.totalPages; page++) {
    const next = paginatePaintSearch(results, { page, limit: 24 });
    for (const colour of next.data) {
      assert.ok(!ids.has(colour.id), "No duplicate records between pages");
      ids.add(colour.id);
    }
  }
  assert.equal(ids.size, first.pagination.total);
});

test("suggestions prefer exact codes and full results sort before pagination", () => {
  assert.ok(getPaintSearchMatch(sample, "LY9B").relevanceScore > getPaintSearchMatch(sample, "LY9").relevanceScore);
  const results = ["Zulu", "Alpha", "Beta"].map((name, index) => ({ ...sample, id: String(index), name }));
  const sorted = paginatePaintSearch(results, { limit: 1, page: 2, sortBy: "name_asc" });
  assert.equal(sorted.data[0].name, "Beta");
  assert.deepEqual(sorted.pagination, { total: 3, page: 2, limit: 1, totalPages: 3 });
  assert.equal(paginatePaintSearch(results, { page: Infinity, limit: NaN }).pagination.page, 1);
  assert.equal(paginatePaintSearch(results, { page: 1000, limit: 1 }).pagination.page, 3);
  assert.equal(paginatePaintSearch([], { page: -1 }).pagination.totalPages, 1);
});
