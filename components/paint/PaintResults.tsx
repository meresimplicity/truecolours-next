"use client";

import { AlertCircle, Camera, MessageCircle } from "lucide-react";
import type { PaintColor } from "@/types/paint";
import { PaintResultCard } from "./PaintResultCard";
import { buildWhatsAppLink, formatNotFoundEnquiryMessage } from "@/lib/whatsapp";

interface PaintResultsProps {
  results: PaintColor[];
  hasSearched: boolean;
  isLoading: boolean;
  searchContext?: {
    brand?: string;
    model?: string;
    year?: string | number;
    codeQuery?: string;
  };
}

export function PaintResults({
  results,
  hasSearched,
  isLoading,
  searchContext,
}: PaintResultsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-[#c8722e]" />
        <p className="mt-4 text-base font-semibold text-slate-300">Finding factory colours...</p>
        <p className="text-xs text-slate-500">Checking OEM specification records</p>
      </div>
    );
  }

  if (!hasSearched) {
    return null;
  }

  if (results.length === 0) {
    const notFoundMessage = formatNotFoundEnquiryMessage({
      brand: searchContext?.brand,
      model: searchContext?.model,
      year: searchContext?.year,
      code: searchContext?.codeQuery,
    });

    const notFoundWhatsAppUrl = buildWhatsAppLink(notFoundMessage);

    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-amber-500/40 bg-amber-950/20 p-8 text-center sm:p-12">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-500/10 text-[#c8722e] mb-4">
          <AlertCircle size={28} />
        </div>

        <h3 className="text-xl font-bold text-white sm:text-2xl">
          WE COULDN&apos;T FIND THAT COLOUR
        </h3>

        <p className="mt-2 max-w-lg text-sm text-slate-300 sm:text-base">
          Our database doesn&apos;t have a confirmed record for this vehicle yet.
          TRUECOLOURS matches any vehicle colour in-store using our high-precision spectrophotometer.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <a
            href={notFoundWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c8722e] px-6 py-3.5 text-sm font-bold text-slate-950 shadow-md transition hover:bg-[#d8823e] active:scale-95"
          >
            <MessageCircle size={18} />
            <span>SEND DETAILS TO TRUECOLOURS</span>
          </a>

          <a
            href={notFoundWhatsAppUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700/80"
          >
            <Camera size={18} />
            <span>SEND A PHOTO OF YOUR DOOR JAMB</span>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
          Available Factory Colours ({results.length})
        </h3>
        <span className="text-xs text-slate-500">
          Select any colour to enquire on WhatsApp
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {results.map((c) => (
          <PaintResultCard
            key={c.id}
            item={c}
            activeVehicleYear={searchContext?.year}
          />
        ))}
      </div>
    </div>
  );
}
