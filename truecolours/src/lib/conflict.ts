/**
 * Priority + conflict logic (spec sections 17 & 31).
 *
 *   TRUECOLOURS team verified  >  licensed vehicle/paint source data
 *     >  licensed paint API  >  secondary reference  >  unverified
 *
 * Two things happen independently when sources disagree on a field:
 *   1. A value is still chosen (by priority) so the UI has something to show.
 *   2. A data_conflicts row is still written for admin review — picking a
 *      winner is not the same as the disagreement being resolved. Section
 *      31 is explicit: "Never silently choose conflicting data."
 */

export const SOURCE_PRIORITY: readonly string[] = [
  "truecolours_internal", // a human confirmed this against a real vehicle/label
  "vehiclesdb", // licensed, structurally-verified vehicle taxonomy
  "paint_calculators", // licensed paint API, free tier
  "mycarcolor", // secondary/expansion paint API (once licence-cleared)
  "nhtsa_vpic", // secondary reference / cross-validation only
];

export function sourcePriorityRank(sourceSlug: string): number {
  const idx = SOURCE_PRIORITY.indexOf(sourceSlug);
  return idx === -1 ? SOURCE_PRIORITY.length : idx; // unrecognized sources rank last, not first
}

export interface FieldCandidate<T> {
  sourceSlug: string;
  sourceRecordId: string;
  value: T;
}

export interface FieldResolution<T> {
  value: T | null;
  status: "agreed" | "resolved_by_priority" | "no_data";
  /** Populated only when status === 'resolved_by_priority' — write one data_conflicts row per entry. */
  conflicts: Array<{ winner: FieldCandidate<T>; loser: FieldCandidate<T> }>;
}

/**
 * Resolve one field (e.g. `name`, `hex`, `year_to`) across candidates from
 * different sources. Candidates with a null/undefined value are ignored —
 * "a source didn't mention this field" is not a disagreement.
 */
export function resolveField<T>(
  candidates: FieldCandidate<T>[],
  equals: (a: T, b: T) => boolean = (a, b) => a === b
): FieldResolution<T> {
  const present = candidates.filter((c) => c.value !== null && c.value !== undefined);
  if (present.length === 0) return { value: null, status: "no_data", conflicts: [] };

  const sorted = [...present].sort((a, b) => sourcePriorityRank(a.sourceSlug) - sourcePriorityRank(b.sourceSlug));
  const winner = sorted[0]!;
  const disagreeing = sorted.slice(1).filter((c) => !equals(c.value, winner.value));

  if (disagreeing.length === 0) {
    return { value: winner.value, status: "agreed", conflicts: [] };
  }
  return {
    value: winner.value,
    status: "resolved_by_priority",
    conflicts: disagreeing.map((loser) => ({ winner, loser })),
  };
}

/** Case/whitespace-insensitive string equality — for names/finishes where "Black" vs "black " isn't a real conflict. */
export function looseStringEquals(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
