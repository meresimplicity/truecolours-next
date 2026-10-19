"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { PAINT_MARKETS, matchesPaintMarket, paintMarketName } from "@/lib/paint/markets";

interface CountryCoverage {
  code: string;
  name: string;
  colourCount: number;
  sources: { brand: string; model: string; edition: string; sourceTitle: string; sourceUrl: string }[];
}

export function PaintMarketCoverage({ country }: { country: string }) {
  const [coverage, setCoverage] = useState<CountryCoverage[]>([]);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/paint/markets", { signal: controller.signal }).then(async (res) => {
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error("Market coverage unavailable");
      if (!controller.signal.aborted) setCoverage(json.data);
    }).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, []);

  const market = coverage.find((item) => item.code === country);
  const visibleCoverage = coverage.filter((item) => matchesPaintMarket(item.code, country));
  const colourCount = visibleCoverage.reduce((sum, item) => sum + item.colourCount, 0);
  return <div className="tc-market-coverage">
    {country ? <p><strong>{paintMarketName(country)} sales references.</strong> {coverage.length ? `${colourCount} indexed colour listings. ` : ""}Availability follows the source edition and vehicle trim.</p>
      : <p>Browse documented sales palettes from {coverage.length || PAINT_MARKETS.length} countries. More makes, years and countries are still being indexed.</p>}
    <details>
      <summary>{country ? "View country coverage & official sources" : "View country coverage"}</summary>
      <p>Only manufacturer-published regional listings appear in a country search. General catalogue records and historic charts with no confirmed sales country remain available under All countries. A missing result does not mean a colour was never sold there.</p>
      {failed && <p>Source coverage couldn’t load. Individual colour details still link to their official reference.</p>}
      <ul>{(market ? [market] : visibleCoverage).map((item) => <li key={item.code}><strong>{item.name} · {item.colourCount} listings</strong><ul>{item.sources.map((source) => <li key={source.sourceUrl + source.model}><a href={source.sourceUrl} target="_blank" rel="noopener noreferrer">{source.brand} {source.model} · {source.edition}<ExternalLink size={12} aria-hidden="true" /></a></li>)}</ul></li>)}</ul>
    </details>
  </div>;
}
