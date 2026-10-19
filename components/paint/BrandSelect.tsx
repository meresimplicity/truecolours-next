"use client";

import type { VehicleBrand } from "@/types/paint";

interface BrandSelectProps {
  brands: VehicleBrand[];
  selectedBrand: string;
  onChange: (brand: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function BrandSelect({
  brands,
  selectedBrand,
  onChange,
  isLoading,
  disabled = false,
}: BrandSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="tcf-brand-select" className="text-xs font-bold uppercase tracking-wider text-slate-400">
        Vehicle Brand / Make
      </label>
      <div className="relative">
        <select
          id="tcf-brand-select"
          value={selectedBrand}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || isLoading}
          className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3.5 pr-10 text-base font-semibold text-white shadow-inner transition focus:border-[#c8722e] focus:outline-none focus:ring-2 focus:ring-[#c8722e]/30 disabled:cursor-not-allowed disabled:opacity-50"
          required
        >
          <option value="" disabled>
            {isLoading ? "Loading brands..." : "Select vehicle make (e.g. Toyota, VW)"}
          </option>
          {brands.map((b) => (
            <option key={b.name} value={b.name} className="bg-slate-900 text-white">
              {b.name} {b.modelsCount ? `(${b.modelsCount} models)` : ""}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
