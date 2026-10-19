"use client";

export interface FilterState {
  sort: "name_asc" | "code_asc";
  verifiedOnly: boolean;
}

export function ColourFilters({
  state,
  onChange,
  resultCount,
}: {
  state: FilterState;
  onChange: (next: FilterState) => void;
  resultCount: number;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-3 border-b border-line text-sm">
      <p className="text-steel">
        {resultCount} colour{resultCount === 1 ? "" : "s"} found
      </p>
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 text-steel">
          <input
            type="checkbox"
            checked={state.verifiedOnly}
            onChange={(e) => onChange({ ...state, verifiedOnly: e.target.checked })}
          />
          Verified only
        </label>
        <select
          className="border border-line rounded-card px-2 py-1 bg-white font-display"
          value={state.sort}
          onChange={(e) => onChange({ ...state, sort: e.target.value as FilterState["sort"] })}
        >
          <option value="name_asc">Colour name A–Z</option>
          <option value="code_asc">Colour code A–Z</option>
        </select>
      </div>
    </div>
  );
}
