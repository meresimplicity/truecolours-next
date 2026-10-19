import test from "node:test";
import assert from "node:assert/strict";
import { getPaintProvider } from "../lib/paint/provider.ts";
import { normalizePaintCode, parseMultiCode, formatDisplayCode } from "../scripts/normalize-paint-codes.ts";
import { buildWhatsAppLink, WHATSAPP_NUMBER } from "../lib/whatsapp.ts";

test("multi-code parser and formatter handle composite OEM codes", () => {
  const parsed = parseMultiCode("LY9B / A2");
  assert.equal(parsed.primaryCode, "LY9B");
  assert.deepEqual(parsed.salesCodes, ["A2"]);

  const display = formatDisplayCode(parsed.primaryCode, parsed.salesCodes);
  assert.equal(display, "LY9B / A2");

  const single = parseMultiCode("040");
  assert.equal(single.primaryCode, "040");
  assert.deepEqual(single.salesCodes, []);
  assert.equal(formatDisplayCode(single.primaryCode, single.salesCodes), "040");
});

test("paint code normalization is case, space, hyphen, and slash tolerant", () => {
  assert.equal(normalizePaintCode("ly9b"), "LY9B");
  assert.equal(normalizePaintCode("LY9B / A2"), "LY9BA2");
  assert.equal(normalizePaintCode("LY9B-A2"), "LY9BA2");
  assert.equal(normalizePaintCode("  040  "), "040");
});

test("Audi A1 Sportback returns all reference colours and supports exact year filtering", async () => {
  const provider = getPaintProvider();

  // All colors for Audi A1 Sportback
  const allColorsResponse = await provider.getColorsPaginated({
    brand: "Audi",
    model: "A1 Sportback",
    year: undefined,
    page: 1,
    limit: 48,
  });

  assert.ok(allColorsResponse.colors.length >= 30, "Expected at least 30 Audi A1 Sportback colours");
  const codes = allColorsResponse.colors.map((c) => c.primaryCode || c.code);
  assert.ok(codes.includes("LS9R"), "Contains Glacier White Metallic (LS9R)");
  assert.ok(codes.includes("LZ3M"), "Contains Misano Red Pearl (LZ3M)");
  assert.ok(codes.includes("LY9T"), "Contains Mythos Black Metallic (LY9T)");
  assert.ok(codes.includes("LY9B"), "Contains Brilliant Black (LY9B)");
  assert.ok(codes.includes("LX7G"), "Contains Chronos Grey Pearl (LX7G)");

  // Check alternative names on Brilliant Black
  const brilliantBlack = allColorsResponse.colors.find((c) => (c.primaryCode || c.code) === "LY9B");
  assert.ok(brilliantBlack, "Brilliant Black record found");
  assert.ok(
    brilliantBlack.alternativeNames.some((alt) => alt.language === "fr" && alt.name === "Noir Brillant"),
    "Contains French name Noir Brillant"
  );
  assert.ok(
    brilliantBlack.alternativeNames.some((alt) => alt.language === "de" && alt.name === "Brillantschwarz"),
    "Contains German name Brillantschwarz"
  );

  // Exact year filtering: 2022
  const year2022Response = await provider.getColorsPaginated({
    brand: "Audi",
    model: "A1 Sportback",
    year: 2022,
    page: 1,
    limit: 48,
  });

  assert.ok(year2022Response.colors.length > 0);
  for (const c of year2022Response.colors) {
    const applicable =
      (c.years && c.years.includes(2022)) ||
      (c.yearFrom !== undefined && c.yearTo !== undefined && 2022 >= c.yearFrom && 2022 <= c.yearTo);
    assert.ok(applicable, `Colour ${c.code} (${c.name}) must be applicable to 2022`);
  }
});

test("search by code resolves both primary codes, sales codes, and multi-lingual names", async () => {
  const provider = getPaintProvider();

  // Search primary code "LY9B"
  const r1 = await provider.searchByCode("LY9B");
  assert.ok(r1.length > 0);
  assert.ok(r1.some((c) => c.code === "LY9B" || c.primaryCode === "LY9B"));

  // Search sales code "A2"
  const r2 = await provider.searchByCode("A2");
  assert.ok(r2.length > 0);
  assert.ok(r2.some((c) => (c.salesCodes || []).includes("A2") || c.code === "LY9B"));

  // Search composite code "LY9B / A2" or "LY9B-A2"
  const r3 = await provider.searchByCode("LY9B / A2");
  assert.ok(r3.length > 0);
  assert.ok(r3.some((c) => c.code === "LY9B"));

  // Search by multi-lingual name "Brillantschwarz"
  const r4 = await provider.searchByCode("Brillantschwarz");
  assert.ok(r4.length > 0);
  assert.ok(r4.some((c) => c.code === "LY9B"));

  // Search by French name "Noir Brillant"
  const r5 = await provider.searchByCode("Noir Brillant");
  assert.ok(r5.length > 0);
  assert.ok(r5.some((c) => c.code === "LY9B"));
});

test("sorting works correctly for both name and code in ascending and descending orders", async () => {
  const provider = getPaintProvider();

  const nameAsc = await provider.getColorsPaginated({
    brand: "Audi",
    model: "A1 Sportback",
    sortBy: "name_asc",
    page: 1,
    limit: 24,
  });

  for (let i = 0; i < nameAsc.colors.length - 1; i++) {
    assert.ok(nameAsc.colors[i].name.localeCompare(nameAsc.colors[i + 1].name) <= 0);
  }

  const codeAsc = await provider.getColorsPaginated({
    brand: "Audi",
    model: "A1 Sportback",
    sortBy: "code_asc",
    page: 1,
    limit: 24,
  });

  for (let i = 0; i < codeAsc.colors.length - 1; i++) {
    const codeA = codeAsc.colors[i].primaryCode || codeAsc.colors[i].code;
    const codeB = codeAsc.colors[i + 1].primaryCode || codeAsc.colors[i + 1].code;
    assert.ok(codeA.localeCompare(codeB) <= 0);
  }
});

test("WhatsApp enquiry message complies with customer confirmation format", () => {
  const msg = [
    "Hi TRUECOLOURS, I would like to confirm my vehicle paint colour.",
    "Vehicle: Audi A1 Sportback",
    "Year: 2022",
    "Paint code: LY9B / A2",
    "Colour: Brilliant Black",
    "Please confirm this colour for me.",
  ].join("\n");

  const link = buildWhatsAppLink(msg);
  assert.ok(link.startsWith(`https://wa.me/${WHATSAPP_NUMBER}?text=`));
  assert.ok(link.includes("Audi%20A1%20Sportback"));
  assert.ok(link.includes("LY9B%20%2F%20A2"));
  assert.ok(link.includes("Brilliant%20Black"));
});
