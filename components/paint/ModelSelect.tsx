"use client";

import type { VehicleModel } from "@/types/paint";

interface ModelSelectProps {
  models: VehicleModel[];
  selectedModel: string;
  onChange: (model: string) => void;
  hasBrand: boolean;
  isLoading: boolean;
  disabled?: boolean;
}

export function ModelSelect({
  models,
  selectedModel,
  onChange,
  hasBrand,
  isLoading,
  disabled = false,
}: ModelSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="tcf-model-select" className="text-xs font-bold uppercase tracking-wider text-slate-400">
        Vehicle Model
      </label>
      <div className="relative">
        <select
          id="tcf-model-select"
          value={selectedModel}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled || !hasBrand || isLoading}
          className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3.5 pr-10 text-base font-semibold text-white shadow-inner transition focus:border-[#c8722e] focus:outline-none focus:ring-2 focus:ring-[#c8722e]/30 disabled:cursor-not-allowed disabled:opacity-40"
          required
        >
          <option value="" disabled>
            {!hasBrand
              ? "Select a brand first"
              : isLoading
              ? "Loading models..."
              : "Select model (e.g. Hilux, Polo, Ranger)"}
          </option>
          {models.map((m) => (
            <option key={m.name} value={m.name} className="bg-slate-900 text-white">
              {m.name} {m.colorsCount ? `(${m.colorsCount} colours)` : ""}
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
