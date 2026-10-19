"use client";

export type SortOption = "name_asc" | "name_desc" | "code_asc" | "code_desc";

interface FilterSortBarProps {
  years: number[];
  selectedYear: string;
  onYearChange: (year: string) => void;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  totalCount: number;
  showYearFilter?: boolean;
}

export function FilterSortBar({
  years,
  selectedYear,
  onYearChange,
  sortBy,
  onSortChange,
  totalCount,
  showYearFilter = true,
}: FilterSortBarProps) {
  return (
    <div className="flex flex-col gap-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Filter:
        </span>

        {/* All Colors Select (Placeholder / Category) */}
        <div className="relative">
          <select
            defaultValue="all"
            className="appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-[#111111] focus:outline-none cursor-pointer"
            aria-label="Filter by color group"
          >
            <option value="all">All Colors</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[10px] text-slate-400">
            ▼
          </div>
        </div>

        {/* All Years Select */}
        {showYearFilter && <div className="relative">
          <select
            value={selectedYear}
            onChange={(e) => onYearChange(e.target.value)}
            className="appearance-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 pr-8 text-xs font-bold text-slate-700 shadow-sm transition hover:border-slate-300 focus:border-[#111111] focus:outline-none cursor-pointer"
            aria-label="Filter by model year"
          >
            <option value="all">All Years</option>
            {years.map((y) => (
              <option key={y} value={y.toString()}>
                {y}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-[10px] text-slate-400">
            ▼
          </div>
        </div>}

        <span className="text-xs font-medium text-slate-400">
          ({totalCount} {totalCount === 1 ? "colour" : "colours"})
        </span>
      </div>

      {/* Sorting */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
          Sort By:
        </span>

        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm text-xs">
          <button
            type="button"
            onClick={() => onSortChange(sortBy === "name_asc" ? "name_desc" : "name_asc")}
            className={`rounded-md px-2.5 py-1 font-semibold transition cursor-pointer ${
              sortBy === "name_asc" || sortBy === "name_desc"
                ? "bg-slate-100 text-[#111111] font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Color Name {sortBy === "name_asc" ? "(A/Z)" : sortBy === "name_desc" ? "(Z/A)" : "(A/Z)"}
          </button>

          <button
            type="button"
            onClick={() => onSortChange(sortBy === "code_asc" ? "code_desc" : "code_asc")}
            className={`rounded-md px-2.5 py-1 font-semibold transition cursor-pointer ${
              sortBy === "code_asc" || sortBy === "code_desc"
                ? "bg-slate-100 text-[#111111] font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Color Code {sortBy === "code_asc" ? "(A/Z)" : sortBy === "code_desc" ? "(Z/A)" : "(A/Z)"}
          </button>
        </div>
      </div>
    </div>
  );
}
