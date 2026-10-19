"use client";

import { Search } from "lucide-react";
import type { FormEvent } from "react";

interface PaintCodeSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSubmit: (e: FormEvent) => void;
  isLoading: boolean;
}

export function PaintCodeSearch({
  query,
  onQueryChange,
  onSubmit,
  isLoading,
}: PaintCodeSearchProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex flex-1 flex-col gap-2">
        <label htmlFor="tcf-code-query" className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Paint Code or Factory Colour Name
        </label>
        <div className="relative">
          <input
            id="tcf-code-query"
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="e.g. 040, 1G3, LB9A, YZ, 529, Pure White, Reflex Silver"
            className="w-full rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3.5 pl-11 text-base font-semibold text-white shadow-inner placeholder:text-slate-500 focus:border-[#c8722e] focus:outline-none focus:ring-2 focus:ring-[#c8722e]/30"
            required
          />
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
            <Search size={18} />
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={isLoading || !query.trim()}
        className="inline-flex h-[52px] items-center justify-center rounded-xl bg-[#c8722e] px-8 text-base font-bold text-slate-950 transition hover:bg-[#d8823e] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Searching..." : "Search Code"}
      </button>
    </form>
  );
}
