import { describe, it, expect } from "vitest";
import { normalizeName, slugify, normalizePaintCode, splitPrimaryAndAuxCode } from "@/lib/normalize";

describe("normalizeName", () => {
  it("title-cases and collapses whitespace", () => {
    expect(normalizeName("  audi   ")).toBe("Audi");
    expect(normalizeName("MERCEDES-BENZ")).toBe("Mercedes-benz");
  });
});

describe("slugify", () => {
  it("produces url-safe ascii slugs", () => {
    expect(slugify("Škoda")).toBe("skoda");
    expect(slugify("A1 Sportback")).toBe("a1-sportback");
    expect(slugify("  Mercedes-Benz  ")).toBe("mercedes-benz");
  });
});

describe("normalizePaintCode", () => {
  it("treats separator variants as the same code", () => {
    const a = normalizePaintCode("LY9T / 0E");
    const b = normalizePaintCode("LY9T-0E");
    const c = normalizePaintCode("ly9t0e");
    expect(a).toBe(b);
    expect(b).toBe(c);
    expect(a).toBe("LY9T0E");
  });

  it("does not collapse genuinely different codes", () => {
    expect(normalizePaintCode("LY9T")).not.toBe(normalizePaintCode("LY9B"));
  });
});

describe("splitPrimaryAndAuxCode", () => {
  it("splits a compound code into primary + aux", () => {
    expect(splitPrimaryAndAuxCode("LY9T / 0E")).toEqual({ code: "LY9T", auxCode: "0E" });
    expect(splitPrimaryAndAuxCode("LY9T-0E")).toEqual({ code: "LY9T", auxCode: "0E" });
  });

  it("does not invent an aux code when the source string has none", () => {
    expect(splitPrimaryAndAuxCode("LY9T")).toEqual({ code: "LY9T", auxCode: null });
  });
});
