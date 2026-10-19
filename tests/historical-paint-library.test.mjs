import test from "node:test";
import assert from "node:assert/strict";
import { historicalBookFromUrl, parseHistoricalBook, sitemapLocations } from "../lib/paint/historical-source.ts";
import { historicalLibrary, searchHistoricalLibrary } from "../lib/paint/historical-library.ts";

test("historical ordering cards keep manufacturer codes distinct from chip references", () => {
  const book = historicalBookFromUrl("https://www.autocolorlibrary.com/pages/1965-chevrolet");
  const detail = parseHistoricalBook(`<main><ul class="carsBlocks"><li><a><img src="https://cdn.shopify.com/s/files/1/0040/1312/9763/files/1965-CHEVROLET_ErmineWhite.jpg"><br><br>8259<br>Ermine White<br>CC<br></a></li></ul><img src="https://cdn.shopify.com/s/files/1/0271/7931/9375/files/1965-chevrolet-pg01.jpg"><img src="https://cdn.shopify.com/s/files/1/0271/7931/9375/files/1965-chevrolet-pg01.jpg"></main>`, book);
  assert.equal(detail.colours[0].manufacturerCode, "CC");
  assert.equal(detail.colours[0].chipReference, "8259");
  assert.equal(detail.colours[0].name, "Ermine White");
  assert.equal(detail.charts.length, 1, "Repeated modal images and ordering swatches must not become extra chart pages");
});

test("archive parser accepts both source archives and excludes unrelated or unsafe images", () => {
  const book = historicalBookFromUrl("https://www.autocolorlibrary.com/pages/1930-ford");
  const detail = parseHistoricalBook(`<main><img src="https://cdn.shopify.com/s/files/1/0271/7931/9375/files/1930-ford-pg01.jpg"><img src="https://cdn.shopify.com/s/files/1/0040/1312/9763/files/1930-ford-pg02.jpg"><img src="http://cdn.shopify.com/s/files/1/0040/1312/9763/files/unsafe.jpg"><img src="https://example.org/chart.jpg"><img src="https://cdn.shopify.com/s/files/1/other-store/files/chart.jpg"></main><footer><img src="https://cdn.shopify.com/s/files/1/0040/1312/9763/files/logo.jpg"></footer>`, book);
  assert.equal(detail.charts.length, 2);
  assert.equal(detail.colours.length, 0, "Scanned charts must not produce invented text colour codes");
});

test("legacy and duplicate archive URLs resolve to the same book and preserve antique years", () => {
  assert.equal(historicalBookFromUrl("https://www.autocolorlibrary.com/pages/1926-ford-car-colors").id, historicalBookFromUrl("https://www.autocolorlibrary.com/pages/1926-ford").id);
  assert.equal(historicalBookFromUrl("https://www.autocolorlibrary.com/pages/1934-buick-1").id, "1934-buick");
  assert.equal(historicalBookFromUrl("https://www.autocolorlibrary.com/pages/1925-studebaker").era, "antique");
  assert.equal(historicalBookFromUrl("https://example.org/pages/1926-ford"), null);
  assert.deepEqual(sitemapLocations("<loc>https://www.autocolorlibrary.com/sitemap_pages_1.xml?from=1&amp;to=2</loc>"), ["https://www.autocolorlibrary.com/sitemap_pages_1.xml?from=1&to=2"]);
});

test("imported archive covers every indexed historic book without duplicate ids", () => {
  const library = historicalLibrary();
  assert.ok(library.books.length > 2900);
  assert.equal(new Set(library.books.map((book) => book.id)).size, library.books.length);
  assert.equal(library.metadata.failedBookIds.length, 0);
  for (const book of library.books.filter((item) => item.year < 1978)) {
    assert.ok(library.details[book.id], `${book.id} must have been inspected`);
    assert.ok(library.details[book.id].charts.length > 0 || library.details[book.id].colours.length > 0, `${book.id} must contain charts or published colour records`);
  }
});

test("archive search filters by year, make and actual published colour name, and clamps pages", () => {
  const results = searchHistoricalLibrary({ era: "classic", year: 1965, make: "Chevrolet", query: "Ermine White" });
  assert.equal(results.books.length, 1);
  assert.equal(results.books[0].id, "1965-chevrolet");
  assert.equal(searchHistoricalLibrary({ era: "antique", year: 1926, make: "Ford" }).books[0].id, "1926-ford");
  const lastPage = searchHistoricalLibrary({ era: "classic", page: 99999 });
  assert.equal(lastPage.pagination.page, lastPage.pagination.totalPages);
  assert.ok(lastPage.books.length > 0);
});

test("finder archive previews use the untouched original chart or source sample", () => {
  const library = historicalLibrary();
  const antique = searchHistoricalLibrary({ year: 1926, make: "Ford" }).books[0];
  assert.equal(antique.previewUrl, library.details[antique.id].charts[0]);
  const classic = searchHistoricalLibrary({ year: 1965, make: "Chevrolet" }).books[0];
  const detail = library.details[classic.id];
  assert.equal(classic.previewUrl, detail.charts[0] ?? detail.colours.find((colour) => colour.imageUrl)?.imageUrl);
  assert.equal(classic.colourCount, detail.colours.length);
  assert.equal(classic.chartCount, detail.charts.length);
  assert.ok(searchHistoricalLibrary().years.includes(1926), "The normal finder can include antique years");
  assert.ok(searchHistoricalLibrary({ year: 1926 }).makes.includes("Ford"), "Historic makes belong to their selected year");
});
