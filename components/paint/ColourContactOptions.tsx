"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, HelpCircle, MessageCircle } from "lucide-react";
import type { VehicleEnquiryDetails } from "@/types/paint";
import { buildWhatsAppLink, formatColourHelpMessage } from "@/lib/whatsapp";

export function ColourContactOptions({ details, onEnquiryChange }: {
  details: Partial<VehicleEnquiryDetails>;
  onEnquiryChange: (enquiry: string) => void;
}) {
  const params = useSearchParams();
  const enquiry = params.get("enquiry") || "";
  const contact = params.get("contact") === "whatsapp";
  const [needsHelp, setNeedsHelp] = useState(false);
  const [note, setNote] = useState("");

  useEffect(() => { onEnquiryChange(enquiry); }, [enquiry, onEnquiryChange]);

  return <section aria-label="Colour matching help" className="mx-auto mt-5 max-w-[860px] text-center">
    {contact && <p className="mb-2 text-sm text-neutral-600">Find your colour before we chat, or ask our paint desk for help.</p>}
    <button type="button" aria-expanded={needsHelp} aria-controls="colour-help-options" onClick={() => setNeedsHelp(!needsHelp)} className="inline-flex min-h-11 items-center gap-2 text-xs text-neutral-500 underline underline-offset-4 transition hover:text-neutral-950">
      <HelpCircle size={15} aria-hidden="true" />Need help finding your colour?
    </button>
    {needsHelp && <div id="colour-help-options" className="mt-4 space-y-4 rounded-2xl border border-neutral-200 bg-white p-5 text-left">
      <p className="text-sm leading-relaxed text-neutral-600">Share what you know. You can send a photo or paint-code label when WhatsApp opens.</p>
      <div>
        <label htmlFor="colour-help-note" className="mb-2 block text-sm font-medium text-neutral-900">Anything you’d like us to know? <span className="font-normal text-neutral-500">(optional)</span></label>
        <textarea id="colour-help-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Your vehicle, the colour you’re looking for, or your project…" className="w-full rounded-xl border border-neutral-300 bg-white p-3 text-sm text-neutral-900 focus:border-neutral-950 focus:outline-none focus:ring-1 focus:ring-neutral-950" />
      </div>
      <div className="flex flex-wrap gap-3">
        <a href={buildWhatsAppLink(formatColourHelpMessage(details, note, enquiry))} target="_blank" rel="noopener noreferrer" className="tc-button"><MessageCircle size={17} />Continue to WhatsApp<ArrowRight size={16} /></a>
        <button type="button" onClick={() => setNeedsHelp(false)} className="min-h-11 px-3 text-sm text-neutral-600 underline underline-offset-4">Back to finding my colour</button>
      </div>
    </div>}
  </section>;
}
