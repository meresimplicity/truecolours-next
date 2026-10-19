"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ExternalLink, X } from "lucide-react";
import type { HistoricalBookSummary, HistoricalBookDetail } from "@/lib/paint/historical-source";
import type { HistoricalSample } from "@/lib/paint/chart-samples";
import type { PaintColor } from "@/types/paint";
import { useModalFocus } from "@/lib/hooks/useModalFocus";
import { buildWhatsAppLink, withOriginalEnquiry } from "@/lib/whatsapp";
import { PaintResultCard } from "./PaintResultCard";
import { paintSwatchPreview, paintSwatchStyle } from "@/lib/paint/swatch-preview";

function ReferenceImage({ src, alt }: { src: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? <span className="block p-5 text-xs text-slate-500">Open the source link to view this chart.</span> : <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} className="h-auto w-full" />;
}

function SampleDialog({ sample, book, onClose, enquiryMessage }: { sample: HistoricalSample; book: HistoricalBookSummary; onClose: () => void; enquiryMessage?: string }) {
  const dialogRef = useRef<HTMLDivElement>(null);
  useModalFocus(true, dialogRef, onClose);
  const message = `Hi TRUECOLOURS, please help match ${sample.name} for my ${book.year} ${book.make}. ${sample.manufacturerCode ? `Manufacturer code: ${sample.manufacturerCode}. ` : ""}${sample.chipReference ? `Chart reference: ${sample.chipReference}. ` : ""}Original reference: ${sample.sourceUrl}`;
  return createPortal(<div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" style={{ fontFamily: "var(--font-public-sans), sans-serif" }} onClick={onClose}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="historical-sample-title" className="relative max-h-[90svh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={onClose} aria-label="Close colour details" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full hover:bg-slate-100"><X size={20} /></button>
      <p className="pr-12 text-xs text-slate-500">{book.year} {book.make}</p>
      <div className="mt-5 aspect-[4/3] rounded-xl border border-black/10" style={paintSwatchStyle(sample)} role="img" aria-label={`Colour preview for ${sample.name}`} />
      <h2 id="historical-sample-title" className="mt-5 text-xl font-semibold text-slate-900">{sample.name}</h2>
      {sample.manufacturerCode && <p className="mt-3 text-sm text-slate-600">Manufacturer code <span className="font-mono font-semibold text-slate-900">{sample.manufacturerCode}</span></p>}
      {sample.chipReference && <p className="mt-2 text-xs text-slate-500">Chart reference {sample.chipReference}</p>}
      {sample.sourceLabel && <p className="mt-3 break-words text-xs leading-relaxed text-slate-500">Source label: {sample.sourceLabel}</p>}
      {(sample.swatchSource === "name-reference" || paintSwatchPreview(sample).estimated) && <p className="mt-3 text-xs leading-relaxed text-slate-500">Estimated preview: the original listing gives a colour name without a printed chip.</p>}
      <p className="mt-4 text-xs leading-relaxed text-slate-500">A digital reference for the original colour. Confirm the paint match and vehicle applicability with TRUECOLOURS.</p>
      <a href={buildWhatsAppLink(withOriginalEnquiry(message, enquiryMessage))} target="_blank" rel="noopener noreferrer" className="tc-button mt-5 w-full">Match this colour</a>
      <a href={sample.sourceUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-11 items-center gap-2 text-xs text-slate-600 underline underline-offset-4">View original colour reference <ExternalLink size={13} /></a>
    </div>
  </div>, document.body);
}

function paintCard(sample: HistoricalSample, book: HistoricalBookSummary): PaintColor {
  return {
    id: `${sample.sourceUrl}-${sample.id}`, brand: book.make, model: "", year: book.year,
    name: sample.name, code: sample.manufacturerCode ?? "",
    displayCode: sample.manufacturerCode || (sample.chipReference ? `REF ${sample.chipReference}` : `${book.year} ${book.make}`),
    swatchHex: sample.swatchHex, swatchEstimated: sample.swatchSource === "name-reference", source: "open-data", sourceUrl: sample.sourceUrl, verified: false,
  };
}

/** Antique colours use the same individual swatch cards as modern results. */
export function HistoricalPaintLibrary({ books: references, enquiryMessage }: { books: HistoricalBookSummary[]; enquiryMessage?: string }) {
  const books = references.filter((book) => book.previewUrl || book.chartCount || book.colourCount);
  const linkedBooks = references.filter((book) => !books.includes(book));
  const [selectedId, setSelectedId] = useState<string | null>(books.length === 1 ? books[0].id : null);
  const selectedBook = books.find((book) => book.id === selectedId) ?? null;
  const [detail, setDetail] = useState<HistoricalBookDetail | null>(null);
  const [samples, setSamples] = useState<HistoricalSample[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pagesLoaded, setPagesLoaded] = useState(0);
  const [conversionDone, setConversionDone] = useState(false);
  const [failedPages, setFailedPages] = useState<number[]>([]);
  const [detailError, setDetailError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [activeSample, setActiveSample] = useState<HistoricalSample | null>(null);

  useEffect(() => {
    if (!selectedBook) return;
    const controller = new AbortController();
    setDetail(null); setSamples([]); setDetailLoading(true); setDetailError("");
    setPagesLoaded(0); setConversionDone(false); setFailedPages([]); setActiveSample(null);
    (async () => {
      try {
        const response = await fetch(`/api/paint/history?bookId=${encodeURIComponent(selectedBook.id)}`, { signal: controller.signal });
        const json = await response.json();
        if (!response.ok || !json.success || !json.data.detail) throw new Error("Colour reference unavailable");
        if (controller.signal.aborted) return;
        const source: HistoricalBookDetail = json.data.detail;
        setDetail(source);
        setSamples(source.colours.map((colour, index) => ({ ...colour, id: `ordering-${index + 1}`, swatchHex: colour.swatchHex ?? "", sourceUrl: colour.imageUrl || source.sourceUrl })));
        setDetailLoading(false);
        const pending = source.charts.map((url, chartIndex) => ({ url, chartIndex }));
        // Every chart is converted, including pages without ordering-card data.
        // Two requests at a time keep the original source and OCR work bounded.
        await Promise.all(Array.from({ length: Math.min(2, pending.length) }, async () => {
          while (pending.length && !controller.signal.aborted) {
            const page = pending.shift()!;
            try {
              const result = await fetch(`/api/paint/history/samples?bookId=${encodeURIComponent(selectedBook.id)}&chartIndex=${page.chartIndex}`, { signal: controller.signal });
              const body = await result.json();
              if (!result.ok || !body.success || !Array.isArray(body.data)) throw new Error("Chart conversion unavailable");
              if (!controller.signal.aborted) setSamples((current) => [...current, ...body.data]);
            } catch {
              if (!controller.signal.aborted) setFailedPages((current) => [...current, page.chartIndex]);
            } finally {
              if (!controller.signal.aborted) setPagesLoaded((count) => count + 1);
            }
          }
        }));
        if (!controller.signal.aborted) setConversionDone(true);
      } catch {
        if (!controller.signal.aborted) { setDetailError("These colours couldn’t load. Open the original reference or try again."); setDetailLoading(false); }
      }
    })();
    return () => controller.abort();
  }, [selectedBook, attempt]);

  const nameKey = (name: string) => name.toLowerCase().replace(/\b(?:poly|metallic)\b/g, "").replace(/[^a-z0-9]/g, "");
  const publishedSamples = samples.filter((sample) => sample.chartIndex === undefined);
  const visibleSamples = [...samples].sort((a, b) => (a.chartIndex ?? -1) - (b.chartIndex ?? -1)).filter((sample) => {
    // Published ordering entries take precedence when the same named colour
    // also appears on a scan. Generic sample labels remain page-specific.
    if (sample.chartIndex === undefined || /^Colour sample /i.test(sample.name)) return true;
    return !publishedSamples.some((known) => {
      if (nameKey(known.name) !== nameKey(sample.name) || !known.swatchHex) return false;
      return [1, 3, 5].every((offset) => Math.abs(parseInt(known.swatchHex.slice(offset, offset + 2), 16) - parseInt(sample.swatchHex.slice(offset, offset + 2), 16)) <= 45);
    });
  });
  const sourceLinks = linkedBooks.length > 0 && <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">{linkedBooks.map((book) => <a key={book.id} href={book.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-xs text-slate-500 underline underline-offset-4">{book.year} {book.make} original colour chart <ExternalLink size={13} /></a>)}</div>;
  if (!books.length) return sourceLinks || null;

  return <section aria-labelledby="historical-colours-heading" className="mt-8 space-y-6">
    {books.length > 1 && <div>
      <h2 id="historical-colours-heading" className="text-lg font-semibold text-slate-900">Antique & classic colours</h2>
      <div className="mt-4 flex flex-wrap gap-2">{books.map((book) => <button key={book.id} type="button" aria-label={`View ${book.year} ${book.make} colours`} aria-pressed={selectedId === book.id} onClick={() => setSelectedId(book.id)} className={`min-h-11 rounded-full border px-5 text-sm transition ${selectedId === book.id ? "border-black bg-black text-white" : "border-slate-200 bg-white text-slate-700 hover:border-black"}`}>{book.year} {book.make}</button>)}</div>
    </div>}
    {selectedBook && <article aria-label={`${selectedBook.year} ${selectedBook.make} colours`} className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={books.length === 1 ? "historical-colours-heading" : undefined} className="text-lg font-semibold text-slate-900">{selectedBook.year} {selectedBook.make} colours</h2>
        <span className="text-xs text-slate-500">{visibleSamples.length > 0 ? `${visibleSamples.length} colours` : ""}</span>
      </div>
      {detailLoading && <p role="status" className="py-5 text-sm text-slate-500">Loading colours…</p>}
      {detailError && <p role="alert" className="text-sm text-amber-800">{detailError} <button type="button" onClick={() => setAttempt((value) => value + 1)} className="underline underline-offset-4">Try again</button></p>}
      {visibleSamples.length > 0 && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4">{visibleSamples.map((sample) => <PaintResultCard key={`${sample.sourceUrl}-${sample.id}`} item={paintCard(sample, selectedBook)} previewLabel={sample.swatchSource === "name-reference" ? "Indicative preview" : undefined} onSelect={() => setActiveSample(sample)} />)}</div>}
      {detail && !conversionDone && <p role="status" className="text-xs text-slate-500">Preparing colours from the original pages… {pagesLoaded}/{detail.charts.length}</p>}
      {failedPages.length > 0 && <p role="alert" className="text-xs leading-relaxed text-amber-800">{failedPages.length} {failedPages.length === 1 ? "page couldn’t" : "pages couldn’t"} be prepared. <button type="button" onClick={() => setAttempt((value) => value + 1)} className="underline underline-offset-4">Retry</button> or open the original charts below.</p>}
      {conversionDone && !visibleSamples.length && <p className="text-sm text-slate-500">This reference contains a text listing. Open the original below to view its paint information.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
        {detail && detail.charts.length > 0 && <details className="w-full">
          <summary className="inline-flex min-h-11 cursor-pointer items-center text-xs text-slate-500 underline underline-offset-4">View original charts ({detail.charts.length})</summary>
          <div className="mt-4 grid items-start gap-4 sm:grid-cols-2">{detail.charts.map((url, index) => <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl border border-slate-200 bg-white"><ReferenceImage src={url} alt={`${selectedBook.year} ${selectedBook.make} original chart ${index + 1}`} /><span className="flex items-center justify-between px-4 py-3 text-xs text-slate-500">Chart {index + 1} <ExternalLink size={13} /></span></a>)}</div>
        </details>}
        <a href={selectedBook.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 text-xs text-slate-500 underline underline-offset-4">Auto Color Library <ExternalLink size={13} /></a>
        <p className="text-xs text-slate-500">Digital reference colours. Confirm your paint match in store.</p>
      </div>
    </article>}
    {sourceLinks}
    {activeSample && selectedBook && <SampleDialog sample={activeSample} book={selectedBook} enquiryMessage={enquiryMessage} onClose={() => setActiveSample(null)} />}
  </section>;
}
