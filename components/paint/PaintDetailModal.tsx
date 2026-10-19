"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Check, HelpCircle, Camera, CheckCircle2, ExternalLink } from "lucide-react";
import type { PaintColor } from "@/types/paint";
import { buildWhatsAppLink, withOriginalEnquiry } from "@/lib/whatsapp";
import { getLanguageFlag } from "./FlagIcon";
import { useModalFocus } from "@/lib/hooks/useModalFocus";
import { paintSwatchPreview, paintSwatchStyle } from "@/lib/paint/swatch-preview";

interface PaintDetailModalProps {
  item: PaintColor | null;
  selectedYear?: string | number;
  enquiryMessage?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PaintDetailModal({
  item,
  selectedYear,
  enquiryMessage,
  isOpen,
  onClose,
}: PaintDetailModalProps) {
  const [showNotSure, setShowNotSure] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocus(isOpen && Boolean(item), dialogRef, onClose);

  if (!isOpen || !item) return null;

  const preview = paintSwatchPreview(item);
  const primaryCode = item.primaryCode || item.code;
  const salesCodes = item.salesCodes || [];
  const salesCodeDisplay = salesCodes.length > 0 ? salesCodes.join(" / ") : "None";
  const displayCode = item.displayCode || (salesCodes.length > 0 ? `${primaryCode} / ${salesCodeDisplay}` : primaryCode);
  const displayYear =
    selectedYear ||
    (item.years && item.years.length > 0 ? item.years[0] : item.yearFrom || (item.marketEvidence ? "Not specified in source" : "All applicable years"));
  const marketLines = item.marketEvidence ? [`Sales country: ${item.market}`, `Source edition: ${item.marketEvidence.edition}`, `Official reference: ${item.marketEvidence.sourceUrl}`] : [];

  // Requirement 13 WhatsApp text
  const confirmMsg = [
    "Hi TRUECOLOURS, I would like to confirm my vehicle paint colour.",
    `Vehicle: ${item.brand} ${item.model}`,
    `Year: ${displayYear}`,
    `Paint code: ${displayCode}`,
    `Colour: ${item.name}`,
    ...marketLines,
    "Please confirm this colour for me.",
  ].join("\n");

  const confirmWhatsAppUrl = buildWhatsAppLink(withOriginalEnquiry(confirmMsg, enquiryMessage));

  // Requirement 14 "I'm Not Sure" WhatsApp text
  const notSureMsg = [
    "Hi TRUECOLOURS, I'm not sure if this is my vehicle paint colour.",
    `Vehicle: ${item.brand} ${item.model} (${displayYear})`,
    `Reference code looked at: ${displayCode} (${item.name})`,
    ...marketLines,
    "I can send a photo of my vehicle and paint-code label. Please help confirm it.",
  ].join("\n");

  const notSureWhatsAppUrl = buildWhatsAppLink(withOriginalEnquiry(notSureMsg, enquiryMessage));

  return createPortal(
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6" style={{ fontFamily: "var(--font-public-sans), sans-serif" }}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="paint-detail-title"
        className="relative z-10 max-h-[90svh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-black uppercase tracking-wider text-[#111111]">
              TRUECOLOURS Paint Catalogue
            </span>
            {item.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                <CheckCircle2 size={11} /> Verified In-Store
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            aria-label="Close detail modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="max-h-[80vh] overflow-y-auto p-6 space-y-5">
          {/* Vehicle Title & Swatch Preview */}
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="relative h-28 w-28 flex-shrink-0 overflow-hidden rounded-xl border border-black/10 shadow-md">
              <div
                className="h-full w-full"
                style={paintSwatchStyle(item)}
                role="img"
                aria-label={`${preview.estimated ? "Estimated colour preview" : "Colour preview"} for ${item.name}`}
                title={preview.source}
              />
            </div>

            <div className="flex-1 text-center sm:text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {item.brand}
              </span>
              <h2 id="paint-detail-title" className="text-xl font-black uppercase text-slate-900 sm:text-2xl">
                {item.model}
              </h2>
              <div className="mt-1 font-mono text-base font-black text-[#111111]">
                {displayCode}
              </div>
              <p className="mt-0.5 text-sm font-bold uppercase text-slate-700">
                {item.name}
              </p>
            </div>
          </div>

          {/* Specification Data Table */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs sm:text-sm">
              <div>
                <dt className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">VEHICLE</dt>
                <dd className="font-bold text-slate-900 uppercase">{item.brand} {item.model}</dd>
              </div>

              <div>
                <dt className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">YEAR</dt>
                <dd className="font-bold text-slate-900">{displayYear}</dd>
              </div>

              <div>
                <dt className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">{item.marketEvidence ? "PUBLISHED CODE" : "REFERENCE CODE"}</dt>
                <dd className="font-mono font-black text-slate-900 uppercase">{primaryCode || "Not published"}</dd>
              </div>

              <div>
                <dt className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">SALES CODE</dt>
                <dd className="font-mono font-bold text-slate-900 uppercase">{salesCodeDisplay}</dd>
              </div>

              <div>
                <dt className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">FINISH</dt>
                <dd className="font-bold text-slate-900">{item.finish || "Not stated"}</dd>
              </div>

              {item.generation && (
                <div>
                  <dt className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">GENERATION</dt>
                  <dd className="font-bold text-slate-900">{item.generation}</dd>
                </div>
              )}
            </dl>

            {/* Alternative Names */}
            {item.alternativeNames && item.alternativeNames.length > 0 && (
              <div className="mt-4 border-t border-slate-200/60 pt-3">
                <span className="font-semibold text-slate-500 uppercase tracking-wider text-[11px]">
                  ALTERNATIVE NAMES:
                </span>
                <ul className="mt-1.5 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                  {item.alternativeNames.map((alt, i) => (
                    <li key={`${alt.language}-${i}`} className="flex items-center gap-1.5 text-slate-700">
                      <span>{item.marketEvidence && alt.language === "en" ? "English:" : getLanguageFlag(alt.language)}</span>
                      <span className="font-medium uppercase">{alt.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {item.marketEvidence && <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs leading-relaxed text-slate-600">
            <p className="font-semibold text-slate-900">Sold in {item.market} · {item.marketEvidence.edition}</p>
            <p className="mt-2">{item.notes}</p>
            <a href={item.marketEvidence.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center gap-2 underline underline-offset-4">View official country reference<ExternalLink size={13} /></a>
            <p className="text-[10px] text-slate-500">{item.marketEvidence.sourceTitle}</p>
          </div>}

          {/* Swatch disclaimer */}
          <p className="text-center text-[11px] text-slate-400 leading-relaxed">
            {preview.estimated && <span className="mb-1 block font-semibold">Estimated preview based on the colour name.</span>}
            Digital swatches are indicative only and may not accurately represent the physical automotive paint.
          </p>

          {/* Confirmation Prompt */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-center space-y-3">
            <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">
              Is this your colour?
            </h3>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={confirmWhatsAppUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#111111] px-4 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-[#333333] active:scale-95 text-center cursor-pointer"
              >
                <Check size={16} />
                <span>YES — CONTACT TRUECOLOURS</span>
              </a>

              <button
                type="button"
                onClick={() => setShowNotSure(!showNotSure)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-xs sm:text-sm font-bold text-slate-700 transition hover:bg-slate-100 active:scale-95 cursor-pointer"
              >
                <HelpCircle size={16} />
                <span>I&apos;M NOT SURE</span>
              </button>
            </div>

            {/* Requirement 14 "Not Sure" Expansion */}
            {showNotSure && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-left space-y-3 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-amber-950">
                    Not sure if this is your colour?
                  </h4>
                  <p className="text-xs text-amber-900 leading-relaxed">
                    Send TRUECOLOURS a photo of your vehicle and your paint-code label. Our in-store mixing bench will decode the formula for you.
                  </p>
                </div>

                <a
                  href={notSureWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-neutral-950 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-neutral-800 cursor-pointer"
                >
                  <Camera size={15} />
                  <span>SEND PHOTO TO TRUECOLOURS</span>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>, document.body
  );
}
