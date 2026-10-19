"use client";

import type { PaintColor } from "@/types/paint";
import { getLanguageFlag } from "./FlagIcon";
import { paintSwatchPreview, paintSwatchStyle } from "@/lib/paint/swatch-preview";

interface PaintResultCardProps {
  item: PaintColor;
  onSelect?: (item: PaintColor) => void;
  activeVehicleYear?: string | number;
  previewLabel?: string;
}

export function PaintResultCard({ item, onSelect, activeVehicleYear, previewLabel }: PaintResultCardProps) {
  const displayCode =
    item.displayCode ||
    (item.primaryCode
      ? item.salesCodes && item.salesCodes.length > 0
        ? `${item.primaryCode} / ${item.salesCodes.join(" / ")}`
        : item.primaryCode
      : item.code);

  const preview = paintSwatchPreview(item);
  const altNames = item.alternativeNames || [];
  void activeVehicleYear;

  return (
    <div className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      {/* Digital colour preview */}
      <div className="relative mb-2.5 overflow-hidden rounded-lg border border-black/10 shadow-inner">
        <div
          className="aspect-[4/3] w-full transition-transform duration-300 group-hover:scale-105"
          style={paintSwatchStyle(item)}
          role="img"
          aria-label={`${preview.estimated ? "Estimated colour preview" : "Colour preview"} for ${item.name}`}
          title={preview.source}
        />

        {/* Verified Badge pill */}
        {item.verified && (
          <span className="absolute right-1.5 top-1.5 rounded-md bg-neutral-950/90 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white shadow-sm">
            VERIFIED
          </span>
        )}
      </div>

      {/* 2. Paint Code & Name */}
      <div className="flex flex-1 flex-col items-center text-center">
        <span className="font-mono text-xs font-black tracking-wider text-slate-900 sm:text-sm">
          {displayCode}
        </span>

        <h3 className="mt-1 line-clamp-2 text-xs font-black uppercase leading-tight text-slate-800 sm:text-[13px]">
          {item.name}
        </h3>
        {(preview.estimated || previewLabel) && <p className="mt-1 text-[10px] text-slate-500">{preview.estimated ? "Estimated preview" : previewLabel}</p>}
        {item.marketEvidence && <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{item.market} · {item.marketEvidence.edition}{!preview.estimated ? <span className="block">Indicative preview</span> : null}</p>}

        {/* 3. Alternative Names with Country Flags */}
        {altNames.length > 0 && (
          <div className="mt-2 w-full border-t border-slate-100 pt-1.5 text-left">
            <ul className="space-y-0.5 text-[10px] leading-tight text-slate-500">
              {altNames.slice(0, 3).map((alt, idx) => (
                <li key={`${alt.language}-${alt.name}-${idx}`} className="truncate flex items-center gap-1">
                  <span>{item.marketEvidence && alt.language === "en" ? "English:" : getLanguageFlag(alt.language)}</span>
                  <span className="truncate uppercase font-medium">{alt.name}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* 4. Select CTA Button */}
      <button
        type="button"
        onClick={() => onSelect?.(item)}
        className="mt-3 flex w-full items-center justify-center rounded-lg bg-[#111111] py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#333333] active:scale-95 cursor-pointer"
      >
        Select
      </button>
    </div>
  );
}
