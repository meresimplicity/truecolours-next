"use client";

import { useId } from "react";
import { ChevronDown, Globe2 } from "lucide-react";
import { PAINT_MARKETS, PAINT_REGIONS, paintMarketName } from "@/lib/paint/markets";
import { PaintMarketCoverage } from "./PaintMarketCoverage";

export function PaintCountryPicker({ value, onChange, compact = false }: { value: string; onChange: (value: string) => void; compact?: boolean }) {
  const id = useId();
  const region = PAINT_REGIONS.find((item) => item.code === value || (item.countries as readonly string[]).includes(value));
  const countries = PAINT_MARKETS.filter((market) => !region || (region.countries as readonly string[]).includes(market.code));
  const isCountry = PAINT_MARKETS.some((market) => market.code === value);
  const fields = <div className="tc-country-fields">
    <div><label htmlFor={`${id}-region`}>Region</label><select id={`${id}-region`} value={region?.code || ""} onChange={(event) => onChange(event.target.value)}>
      <option value="">All regions</option>{PAINT_REGIONS.map((item) => <option key={item.code} value={item.code}>{item.name}</option>)}
    </select></div>
    <div><label htmlFor={`${id}-country`}>Country where sold</label><select id={`${id}-country`} value={isCountry ? value : region?.code || ""} onChange={(event) => onChange(event.target.value)}>
      <option value={region?.code || ""}>{region ? `All indexed countries in ${region.name}` : "All indexed countries"}</option>
      {countries.map((market) => <option key={market.code} value={market.code}>{market.name}</option>)}
    </select></div>
  </div>;

  if (compact) return <details className="tc-country-compact" onChange={(event) => {
    if (event.target instanceof HTMLSelectElement) event.currentTarget.open = false;
  }}>
    <summary><Globe2 size={14} aria-hidden="true" />{paintMarketName(value) || "Country / region"}<ChevronDown size={13} aria-hidden="true" /></summary>
    <div className="tc-country-popover"><p>Group your search by where the colour was sold.</p>{fields}{value && <button type="button" onClick={() => onChange("")}>Show all countries</button>}</div>
  </details>;

  return <section className="tc-country-section" aria-labelledby={`${id}-heading`}>
    <p className="tc-eyebrow">Another way to find your colour</p>
    <h2 id={`${id}-heading`}><Globe2 size={21} aria-hidden="true" />Find by country</h2>
    <p>Explore colours sold in Europe, America and other regions, then narrow down to a country.</p>
    {fields}
    <PaintMarketCoverage country={value} />
  </section>;
}
