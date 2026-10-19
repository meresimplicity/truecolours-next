"use client";

import { useState } from "react";
import type { VehicleBrand, VehicleModel } from "@/types/paint";

interface VehicleHeaderBarProps {
  brands: VehicleBrand[];
  models: VehicleModel[];
  selectedBrand: string;
  selectedModel: string;
  onBrandChange: (brand: string) => void;
  onModelChange: (model: string) => void;
  onChangeVehicle: (brand: string, model: string) => void;
  isLoading?: boolean;
}

export function VehicleHeaderBar({
  brands,
  models,
  selectedBrand,
  selectedModel,
  onBrandChange,
  onModelChange,
  onChangeVehicle,
  isLoading = false,
}: VehicleHeaderBarProps) {
  const [tempBrand, setTempBrand] = useState(selectedBrand);
  const [tempModel, setTempModel] = useState(selectedModel);

  const handleBrandSelect = (brand: string) => {
    setTempBrand(brand);
    setTempModel("");
    onBrandChange(brand);
  };

  const handleModelSelect = (model: string) => {
    setTempModel(model);
    onModelChange(model);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempBrand && tempModel) {
      onChangeVehicle(tempBrand, tempModel);
    }
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm sm:p-6">
      <p className="mb-4 text-center text-sm font-medium text-slate-600 sm:text-base">
        Is it not your car? You can find your car here.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        {/* Brand Dropdown */}
        <div className="relative w-full sm:w-64">
          <select
            value={tempBrand || selectedBrand}
            onChange={(e) => handleBrandSelect(e.target.value)}
            className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm font-bold uppercase text-slate-800 shadow-sm transition hover:border-slate-400 focus:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] cursor-pointer"
            aria-label="Select Vehicle Brand"
          >
            <option value="" disabled>
              Select Brand
            </option>
            {brands.map((b) => (
              <option key={b.id || b.name} value={b.name}>
                {b.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
            ▼
          </div>
        </div>

        {/* Model Dropdown */}
        <div className="relative w-full sm:w-64">
          <select
            value={tempModel || selectedModel}
            onChange={(e) => handleModelSelect(e.target.value)}
            disabled={!tempBrand && !selectedBrand}
            className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-4 py-3 pr-10 text-sm font-bold uppercase text-slate-800 shadow-sm transition hover:border-slate-400 focus:border-[#111111] focus:outline-none focus:ring-1 focus:ring-[#111111] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:opacity-60 cursor-pointer"
            aria-label="Select Vehicle Model"
          >
            <option value="" disabled>
              Select Model
            </option>
            {models.map((m) => (
              <option key={m.id || m.name} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-400">
            ▼
          </div>
        </div>

        {/* Change Button */}
        <button
          type="submit"
          disabled={isLoading || (!tempBrand && !selectedBrand) || (!tempModel && !selectedModel)}
          className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-[#111111] px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#333333] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? "Loading..." : "Change"}
        </button>
      </form>
    </div>
  );
}
