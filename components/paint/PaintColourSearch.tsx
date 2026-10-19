"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowRight, LoaderCircle, Search, X } from "lucide-react";
import type { PaintColor } from "@/types/paint";
import { PaintCountryPicker } from "./PaintCountryPicker";
import { paintSwatchStyle } from "@/lib/paint/swatch-preview";

interface PaintColourSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  onSelect: (colour: PaintColor) => void;
  isSearching: boolean;
  country: string;
  onCountryChange: (country: string) => void;
}

export function PaintColourSearch({ value, onChange, onSearch, onSelect, isSearching, country, onCountryChange }: PaintColourSearchProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [response, setResponse] = useState<{ query: string; country: string; colours: PaintColor[]; total: number; failed?: boolean } | null>(null);
  const query = value.trim();
  const canSuggest = query.length >= 2;
  const currentResponse = response?.query === query && response?.country === country ? response : null;
  const suggestions = currentResponse?.colours ?? [];
  const showSuggestions = open && canSuggest;
  const loading = showSuggestions && !currentResponse;

  useEffect(() => {
    if (!canSuggest || !open) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, country, limit: "6" });
        const res = await fetch(`/api/paint/search?${params}`, { signal: controller.signal });
        const json = await res.json();
        if (!res.ok || !json.success || !Array.isArray(json.data)) throw new Error("Suggestions unavailable");
        if (!controller.signal.aborted) setResponse({ query, country, colours: json.data, total: json.count });
      } catch {
        if (!controller.signal.aborted) setResponse({ query, country, colours: [], total: 0, failed: true });
      }
    }, 220);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [query, canSuggest, open, country]);

  const choose = (colour: PaintColor) => {
    setOpen(false);
    setActiveIndex(-1);
    onSelect(colour);
  };

  const searchAll = () => {
    if (!query && !country) return;
    setOpen(false);
    setActiveIndex(-1);
    onSearch(query);
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (showSuggestions && activeIndex >= 0 && suggestions[activeIndex]) choose(suggestions[activeIndex]);
    else searchAll();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { setOpen(false); setActiveIndex(-1); }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (suggestions.length) setActiveIndex((current) => event.key === "ArrowDown"
        ? (current + 1) % suggestions.length
        : current <= 0 ? suggestions.length - 1 : current - 1);
    }
  };

  return <section className="tc-colour-search" aria-label="Search all paint colours" onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActiveIndex(-1); }
  }}>
    <form onSubmit={submit} role="search">
      <label htmlFor={`${id}-input`}>Search all colours</label>
      <div className="tc-colour-search-field">
        <Search size={22} aria-hidden="true" />
        <input
          ref={inputRef}
          id={`${id}-input`}
          type="text"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls={showSuggestions ? `${id}-suggestions` : undefined}
          aria-activedescendant={showSuggestions && activeIndex >= 0 && suggestions[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
          aria-describedby={`${id}-hint`}
          autoComplete="off"
          maxLength={120}
          spellCheck={false}
          value={value}
          onChange={(event) => { onChange(event.target.value); setResponse(null); setOpen(true); setActiveIndex(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Colour name, paint code, make or model…"
        />
        {value && <button type="button" className="tc-colour-search-clear" aria-label="Clear colour search" onClick={() => { onChange(""); setResponse(null); setActiveIndex(-1); inputRef.current?.focus(); }}><X size={18} /></button>}
        <button type="submit" className="tc-colour-search-submit" aria-label="Search all colours" disabled={(!query && !country) || isSearching}>
          {isSearching ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <ArrowRight size={18} aria-hidden="true" />}<span>Search</span>
        </button>
      </div>
    </form>
    <p id={`${id}-hint`} className="tc-colour-search-hint">Search across makes and years. Or try “Germany white” or “America blue”.</p>
    <div className="tc-search-country-control"><PaintCountryPicker compact value={country} onChange={(value) => { setOpen(false); setActiveIndex(-1); onCountryChange(value); }} /></div>
    <span role="status" className="sr-only">{loading ? "Finding suggestions…" : showSuggestions && currentResponse ? `${suggestions.length} suggestions available. Use the up and down arrow keys to explore.` : ""}</span>
    {showSuggestions && <div className="tc-colour-suggestions">
      <ul id={`${id}-suggestions`} role="listbox" aria-label="Suggested colours" aria-busy={loading}>
        {suggestions.map((colour, index) => <li
          id={`${id}-option-${index}`}
          key={colour.id}
          role="option"
          aria-selected={index === activeIndex}
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => choose(colour)}
          onPointerMove={() => setActiveIndex(index)}
        >
          <span className="tc-colour-suggestion-swatch" style={paintSwatchStyle(colour)} aria-hidden="true" />
          <span className="tc-colour-suggestion-text"><strong>{colour.name}</strong><span>{colour.brand} {colour.model}{colour.marketEvidence ? ` · ${colour.market}` : ""}{colour.yearFrom ? ` · ${colour.yearFrom}${colour.yearTo && colour.yearTo !== colour.yearFrom ? `–${colour.yearTo}` : ""}` : ""}</span></span>
          <span className="tc-colour-suggestion-code">{colour.code ? colour.displayCode || colour.code : "Code not published"}</span>
        </li>)}
      </ul>
      {loading && <p className="tc-colour-suggestion-status"><LoaderCircle size={16} className="animate-spin" aria-hidden="true" />Finding colours…</p>}
      {currentResponse?.failed && <p className="tc-colour-suggestion-status">Suggestions couldn’t load. Press Search to try again.</p>}
      {currentResponse && !currentResponse.failed && !suggestions.length && <p className="tc-colour-suggestion-status">No suggestions yet. Search for all results, including classic colour books.</p>}
      <button type="button" className="tc-colour-suggestions-all" onClick={searchAll}>Search {currentResponse?.total ? `all ${currentResponse.total.toLocaleString()} matches` : "all colours"} for “{query}”<ArrowRight size={16} aria-hidden="true" /></button>
    </div>}
  </section>;
}
