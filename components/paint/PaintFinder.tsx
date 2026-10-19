"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Car, Hash, HelpCircle, MapPin, MessageCircle } from "lucide-react";
import type { PaintColor, VehicleBrand, VehicleModel } from "@/types/paint";
import { BrandSelect } from "./BrandSelect";
import { ModelSelect } from "./ModelSelect";
import { YearSelect } from "./YearSelect";
import { PaintCodeSearch } from "./PaintCodeSearch";
import { PaintResults } from "./PaintResults";
import { DataSourceNotice } from "./DataSourceNotice";
import { buildWhatsAppLink, formatNotFoundEnquiryMessage } from "@/lib/whatsapp";

type SearchMode = "vehicle" | "code";

export default function PaintFinder() {
  const [mode, setMode] = useState<SearchMode>("vehicle");

  // Selection states
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [codeQuery, setCodeQuery] = useState("");

  // Data lists
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [years, setYears] = useState<number[]>([]);

  // Loading states
  const [loadingBrands, setLoadingBrands] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);

  // Results & search execution
  const [results, setResults] = useState<PaintColor[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  // 1. Fetch brands on mount
  useEffect(() => {
    let isMounted = true;
    async function loadBrands() {
      setLoadingBrands(true);
      try {
        const res = await fetch("/api/paint/brands", { cache: "no-store" });
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data)) {
          setBrands(json.data);
        }
      } catch (err) {
        console.error("Failed to load vehicle brands:", err);
      } finally {
        if (isMounted) setLoadingBrands(false);
      }
    }
    loadBrands();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch models when brand changes
  useEffect(() => {
    if (!selectedBrand) return;

    let isMounted = true;
    async function loadModels() {
      setLoadingModels(true);
      try {
        const res = await fetch(`/api/paint/models?brand=${encodeURIComponent(selectedBrand)}`, {
          cache: "no-store",
        });
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data)) {
          setModels(json.data);
        }
      } catch (err) {
        console.error("Failed to load models:", err);
      } finally {
        if (isMounted) setLoadingModels(false);
      }
    }

    loadModels();
    return () => {
      isMounted = false;
    };
  }, [selectedBrand]);

  // 3. Fetch years when model changes
  useEffect(() => {
    if (!selectedBrand || !selectedModel) return;

    let isMounted = true;
    async function loadYears() {
      setLoadingYears(true);
      try {
        const res = await fetch(
          `/api/paint/years?brand=${encodeURIComponent(selectedBrand)}&model=${encodeURIComponent(selectedModel)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (isMounted && json.success && Array.isArray(json.data)) {
          setYears(json.data);
        }
      } catch (err) {
        console.error("Failed to load years:", err);
      } finally {
        if (isMounted) setLoadingYears(false);
      }
    }

    loadYears();
    return () => {
      isMounted = false;
    };
  }, [selectedBrand, selectedModel]);

  // Switch tabs
  const handleSwitchMode = (nextMode: SearchMode) => {
    setMode(nextMode);
    setHasSearched(false);
    setResults([]);
  };

  // Brand change handler
  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedModel("");
    setSelectedYear("");
    setHasSearched(false);
    setResults([]);
  };

  // Model change handler
  const handleModelChange = (model: string) => {
    setSelectedModel(model);
    setSelectedYear("");
    setHasSearched(false);
    setResults([]);
  };

  // Submit vehicle lookup
  const handleVehicleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedBrand || !selectedModel || !selectedYear) return;

    setLoadingResults(true);
    setHasSearched(true);
    try {
      const res = await fetch(
        `/api/paint/colors?brand=${encodeURIComponent(selectedBrand)}&model=${encodeURIComponent(selectedModel)}&year=${selectedYear}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setResults(json.data);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Failed to find colours for vehicle:", err);
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  };

  // Submit code/name query
  const handleCodeSearch = async (e: FormEvent) => {
    e.preventDefault();
    const q = codeQuery.trim();
    if (!q) return;

    setLoadingResults(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/paint/search?q=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setResults(json.data);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Failed to search paint code:", err);
      setResults([]);
    } finally {
      setLoadingResults(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col gap-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-[#c8722e]">
          Automotive Paint Code Finder
        </span>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
          FIND MY COLOUR
        </h1>
        <p className="max-w-2xl mx-auto text-sm text-slate-400 sm:text-base">
          Find your vehicle&apos;s paint colour and factory paint code. Look up by brand, model and year, or search by code directly.
        </p>
      </div>

      {/* Main Finder Box */}
      <div className="rounded-3xl border border-slate-800 bg-slate-950/80 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        {/* Mode Tabs */}
        <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 p-1.5" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "vehicle"}
            onClick={() => handleSwitchMode("vehicle")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
              mode === "vehicle"
                ? "bg-[#c8722e] text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Car size={18} />
            <span>SEARCH BY VEHICLE</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={mode === "code"}
            onClick={() => handleSwitchMode("code")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all ${
              mode === "code"
                ? "bg-[#c8722e] text-slate-950 shadow-md"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Hash size={18} />
            <span>I HAVE MY CODE</span>
          </button>
        </div>

        {/* Vehicle Mode Cascading Form */}
        {mode === "vehicle" && (
          <form onSubmit={handleVehicleSearch} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <BrandSelect
                brands={brands}
                selectedBrand={selectedBrand}
                onChange={handleBrandChange}
                isLoading={loadingBrands}
              />

              <ModelSelect
                models={models}
                selectedModel={selectedModel}
                onChange={handleModelChange}
                hasBrand={Boolean(selectedBrand)}
                isLoading={loadingModels}
              />

              <YearSelect
                years={years}
                selectedYear={selectedYear}
                onChange={(y) => {
                  setSelectedYear(y);
                  setHasSearched(false);
                }}
                hasModel={Boolean(selectedModel)}
                isLoading={loadingYears}
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!selectedBrand || !selectedModel || !selectedYear || loadingResults}
                className="w-full sm:w-auto inline-flex items-center justify-center rounded-xl bg-[#c8722e] px-8 py-3.5 text-base font-bold text-slate-950 shadow-lg transition hover:bg-[#d8823e] active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loadingResults ? "Finding Colours..." : "FIND COLOUR"}
              </button>
            </div>
          </form>
        )}

        {/* Code Mode Form */}
        {mode === "code" && (
          <PaintCodeSearch
            query={codeQuery}
            onQueryChange={(q) => {
              setCodeQuery(q);
              setHasSearched(false);
            }}
            onSubmit={handleCodeSearch}
            isLoading={loadingResults}
          />
        )}
      </div>

      {/* Results Section */}
      <PaintResults
        results={results}
        hasSearched={hasSearched}
        isLoading={loadingResults}
        searchContext={{
          brand: selectedBrand,
          model: selectedModel,
          year: selectedYear,
          codeQuery,
        }}
      />

      {/* Paint Code Location Guide Accordion */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60 shadow-md">
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between p-5 text-sm font-bold text-white transition hover:bg-slate-900/60 sm:text-base">
            <span className="flex items-center gap-2.5">
              <HelpCircle size={20} className="text-[#c8722e]" />
              WHERE IS MY VEHICLE PAINT CODE?
            </span>
            <span className="text-slate-400 group-open:rotate-180 transition-transform duration-200">
              ▼
            </span>
          </summary>

          <div className="border-t border-slate-800/80 p-5 pt-4 text-sm leading-relaxed text-slate-300 space-y-4">
            <p>
              Your vehicle&apos;s factory paint code is stamped on a metal plate or printed on a durable vinyl sticker. The location varies by manufacturer:
            </p>

            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <li className="flex items-start gap-2 rounded-xl bg-slate-900/80 p-3 border border-slate-800">
                <MapPin size={16} className="mt-0.5 text-[#c8722e] flex-shrink-0" />
                <div>
                  <strong className="text-white">Driver-side door jamb:</strong> Often alongside the tyre pressure placard (Toyota, VW, Ford, Isuzu, Hyundai).
                </div>
              </li>
              <li className="flex items-start gap-2 rounded-xl bg-slate-900/80 p-3 border border-slate-800">
                <MapPin size={16} className="mt-0.5 text-[#c8722e] flex-shrink-0" />
                <div>
                  <strong className="text-white">Inside the engine bay:</strong> Stamped on the strut tower, radiator support, or firewall (BMW, Mercedes-Benz, Nissan).
                </div>
              </li>
              <li className="flex items-start gap-2 rounded-xl bg-slate-900/80 p-3 border border-slate-800">
                <MapPin size={16} className="mt-0.5 text-[#c8722e] flex-shrink-0" />
                <div>
                  <strong className="text-white">Boot &amp; spare wheel well:</strong> On the floor under the carpet or next to the spare wheel (Audi, VW, Renault).
                </div>
              </li>
              <li className="flex items-start gap-2 rounded-xl bg-slate-900/80 p-3 border border-slate-800">
                <MapPin size={16} className="mt-0.5 text-[#c8722e] flex-shrink-0" />
                <div>
                  <strong className="text-white">Fuel cap / glovebox lid:</strong> On the inner side of the fuel flap or glovebox panel (Ford, Chevrolet, Mahindra).
                </div>
              </li>
            </ul>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-800/60">
              <p className="text-xs text-slate-400">
                Still can&apos;t find your code plate? Bring your vehicle or fuel cap to TRUECOLOURS in Mankweng, or send us a photo on WhatsApp.
              </p>
              <a
                href={buildWhatsAppLink(formatNotFoundEnquiryMessage())}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs font-bold text-emerald-400 hover:text-emerald-300 whitespace-nowrap"
              >
                <MessageCircle size={15} />
                <span>SEND A PHOTO ON WHATSAPP →</span>
              </a>
            </div>
          </div>
        </details>
      </div>

      {/* Data Source and Legal Disclaimer */}
      <DataSourceNotice />
    </div>
  );
}
