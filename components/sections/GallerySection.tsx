"use client";

import { buildColourContactLink } from "@/lib/whatsapp";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Expand, X } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useModalFocus } from "@/lib/hooks/useModalFocus";

const GALLERY_ITEMS = [
  { img: siteConfig.images.colourMatching, title: "Colour Matching", desc: "Paint codes, fan decks and sample matching", accent: "#E53935" },
  { img: siteConfig.images.sprayPaint, title: "Spray Work", desc: "Professional refinish preparation and application", accent: "#1565C0" },
  { img: siteConfig.images.paintCans, title: "Product Range", desc: "Paint, primers, thinners and supporting products", accent: "#b45309" },
  { img: "/Story/48F9FE13-EC0C-4E7A-AABB-DBB5431C4547.PNG", title: "Surface Preparation", desc: "Filling, sanding and masking for the job", accent: "#2E7D32" },
  { img: "/Story/D5ECB346-12E3-47E1-8A24-09BA43CE7A75.PNG", title: "The Paint Desk", desc: "Colour guidance and the right paint system", accent: "#7B1FA2" },
  { img: "/Story/3A5E2C77-2528-48BF-A571-C4CED3D10C3A.PNG", title: "Finishing Support", desc: "Products for a smooth, professional finish", accent: "#E65100" },
];

export default function GallerySection() {
  const [selected, setSelected] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const open = selected !== null;
  useModalFocus(open, dialogRef, () => setSelected(null));

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const direction = event.key === "ArrowRight" ? 1 : -1;
        setSelected((current) => ((current ?? 0) + direction + GALLERY_ITEMS.length) % GALLERY_ITEMS.length);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const active = selected !== null ? GALLERY_ITEMS[selected] : null;

  return (
    <section id="gallery" className="tc-section" aria-labelledby="gallery-heading">
      <header className="tc-split-intro"><div><p className="tc-eyebrow">Colour. Craft. Confidence.</p><h2 id="gallery-heading">A closer look<br/><span>at the finish.</span></h2></div><p>Explore our colour matching, product supply and refinishing workflow. Select an image for a closer look.</p></header>
      <div className="tc-gallery-grid">{GALLERY_ITEMS.map((item,index) => <button key={item.title} type="button" aria-label={`View ${item.title} image`} aria-haspopup="dialog" onClick={() => setSelected(index)} className="tc-gallery-item"><span className="tc-gallery-image"><img src={item.img} alt={item.title} loading="lazy" decoding="async" width={800} height={600}/><span><Expand size={16}/></span></span><h3>{item.title}</h3><p>{item.desc}</p></button>)}</div>
      <div className="tc-section-foot"><p>Illustrations of our products and process. Share your project photos with the paint desk for product guidance.</p><a href={buildColourContactLink()} className="tc-text-link">Chat about your project<ArrowRight size={16}/></a></div>
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {active && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }} className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/90 p-3 backdrop-blur-md sm:p-6" onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="gallery-title" aria-describedby="gallery-description" className="flex max-h-[calc(100dvh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-slate-950 shadow-2xl ring-1 ring-white/15">
              <div className="flex shrink-0 items-center justify-between gap-4 px-5 py-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-white/60">TRUECOLOURS Gallery</span>
                <button type="button" aria-label="Close gallery" onClick={() => setSelected(null)} className="grid h-11 w-11 place-items-center rounded-full text-white transition hover:bg-white/10"><X size={22} /></button>
              </div>
              <div className="relative min-h-0 flex-1 bg-black">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.img key={active.img} src={active.img} alt={active.title} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }} className="max-h-[65dvh] w-full object-contain" />
                </AnimatePresence>
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 p-4 sm:p-5">
                <div aria-live="polite" className="min-w-0"><h3 id="gallery-title" className="text-xl font-bold text-white">{active.title}</h3><p id="gallery-description" className="mt-1 text-xs text-white/60">{active.desc} · {(selected ?? 0) + 1} / {GALLERY_ITEMS.length}</p></div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" aria-label="Previous image" onClick={() => setSelected((current) => ((current ?? 0) - 1 + GALLERY_ITEMS.length) % GALLERY_ITEMS.length)} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10"><ArrowLeft size={18} /></button>
                  <button type="button" aria-label="Next image" onClick={() => setSelected((current) => ((current ?? 0) + 1) % GALLERY_ITEMS.length)} className="grid h-11 w-11 place-items-center rounded-full border border-white/20 text-white transition hover:bg-white/10"><ArrowRight size={18} /></button>
                </div>
              </div>
            </div>
          </motion.div>}
        </AnimatePresence>, document.body
      )}
    </section>
  );
}
