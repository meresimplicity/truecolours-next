import { describe, it, expect } from "vitest";
import { resolveField, sourcePriorityRank, looseStringEquals, type FieldCandidate } from "@/lib/conflict";

describe("sourcePriorityRank", () => {
  it("ranks truecolours_internal highest", () => {
    expect(sourcePriorityRank("truecolours_internal")).toBeLessThan(sourcePriorityRank("paint_calculators"));
  });

  it("ranks unknown sources last", () => {
    expect(sourcePriorityRank("some_random_new_source")).toBeGreaterThan(sourcePriorityRank("nhtsa_vpic"));
  });
});

describe("resolveField", () => {
  it("returns no_data when every candidate is null", () => {
    const candidates: FieldCandidate<string | null>[] = [
      { sourceSlug: "paint_calculators", sourceRecordId: "1", value: null },
    ];
    expect(resolveField(candidates).status).toBe("no_data");
  });

  it("marks agreed when all present values match", () => {
    const candidates: FieldCandidate<string>[] = [
      { sourceSlug: "paint_calculators", sourceRecordId: "1", value: "Mythos Black Metallic" },
      { sourceSlug: "mycarcolor", sourceRecordId: "2", value: "Mythos Black Metallic" },
    ];
    const result = resolveField(candidates);
    expect(result.status).toBe("agreed");
    expect(result.value).toBe("Mythos Black Metallic");
  });

  it("picks the higher-priority value and reports a conflict when sources disagree", () => {
    // Fictitious TEST-ONLY values — not real paint data, see file header of tests/fixtures if extended.
    const candidates: FieldCandidate<string>[] = [
      { sourceSlug: "mycarcolor", sourceRecordId: "2", value: "Unrelated Colour Name" },
      { sourceSlug: "paint_calculators", sourceRecordId: "1", value: "Mythos Black Metallic" },
    ];
    const result = resolveField(candidates);
    expect(result.status).toBe("resolved_by_priority");
    // paint_calculators ranks above mycarcolor in SOURCE_PRIORITY
    expect(result.value).toBe("Mythos Black Metallic");
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0]!.loser.sourceSlug).toBe("mycarcolor");
  });

  it("does not flag a conflict for case/whitespace differences when using looseStringEquals", () => {
    const candidates: FieldCandidate<string>[] = [
      { sourceSlug: "paint_calculators", sourceRecordId: "1", value: "Mythos Black Metallic" },
      { sourceSlug: "mycarcolor", sourceRecordId: "2", value: "  mythos black metallic " },
    ];
    const result = resolveField(candidates, looseStringEquals);
    expect(result.status).toBe("agreed");
  });
});
