"use client";

import { Info } from "lucide-react";

export function DataSourceNotice() {
  return (
    <aside
      aria-label="Data Source and Match Accuracy Disclaimer"
      className="mt-8 rounded-xl border border-slate-800 bg-slate-900/40 p-4 text-xs text-slate-400"
    >
      <div className="flex items-start gap-2.5">
        <Info size={16} className="mt-0.5 flex-shrink-0 text-slate-500" />
        <div className="space-y-1">
          <p>
            <strong className="text-slate-300">Data Source &amp; Accuracy Notice:</strong> Vehicle model applicability and factory OEM paint codes are referenced from public automotive technical specifications and manufacturer service documentation. Manufacturer trademarks (e.g. Toyota, Volkswagen, Ford, Isuzu) are referenced strictly for part identification and vehicle compatibility under fair use.
          </p>
          <p className="text-slate-500">
            Due to age, UV weathering, factory batch variants, and monitor calibration, screen swatches are indicative approximations only. TRUECOLOURS strongly recommends confirming your code or bringing a fuel flap / vehicle panel in-store for spectral verification before mixing.
          </p>
        </div>
      </div>
    </aside>
  );
}
