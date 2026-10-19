"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { VehicleSelector } from "./components/VehicleSelector";
import { ColourResultsGrid } from "./components/ColourResultsGrid";
import { ColourFilters, type FilterState } from "./components/ColourFilters";
import { Pagination } from "./components/Pagination";
import { DirectCodeSearch } from "./components/DirectCodeSearch";
import { EmptyState } from "./components/EmptyState";
import type { PaintResult } from "@/types/paint";
import { buildWhatsAppLink } from "@/lib/whatsapp";

interface Option {
  slug: string;
  label: string;
}

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export default function FindMyColourPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [makes, setMakes] = useState<Option[]>([]);
  const [models, setModels] = useState<Option[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [yearsNote, setYearsNote] = useState<string | undefined>();

  const [selectedMake, setSelectedMake] = useState<string | null>(searchParams.get("make"));
  const [selectedModel, setSelectedModel] = useState<string | null>(searchParams.get("model"));
  const [selectedYear, setSelectedYear] = useState<number | null>(
    searchParams.get("year") ? Number(searchParams.get("year")) : null
  );

  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingYears, setLoadingYears] = useState(false);
  const [searching, setSearching] = useState(false);

  const [results, setResults] = useState<PaintResult[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [resultsNote, setResultsNote] = useState<string | undefined>();
  const [filters, setFilters] = useState<FilterState>({ sort: "name_asc", verifiedOnly: false });
  const pageSize = 24;

  // --- Load makes once ----------------------------------------------------
  useEffect(() => {
    fetch("/api/vehicles/makes")
      .then((r) => r.json())
      .then((data) => setMakes(data.makes.map((m: any) => ({ slug: m.slug, label: m.name }))))
      .catch(() => setMakes([]));
  }, []);

  // --- Load models when make changes --------------------------------------
  useEffect(() => {
    if (!selectedMake) {
      setModels([]);
      return;
    }
    setLoadingModels(true);
    fetch(`/api/vehicles/models?make=${selectedMake}`)
      .then((r) => r.json())
      .then((data) => setModels((data.models ?? []).map((m: any) => ({ slug: m.slug, label: m.name }))))
      .catch(() => setModels([]))
      .finally(() => setLoadingModels(false));
  }, [selectedMake]);

  // --- Load years when model changes --------------------------------------
  useEffect(() => {
    if (!selectedMake || !selectedModel) {
      setYears([]);
      setYearsNote(undefined);
      return;
    }
    setLoadingYears(true);
    fetch(`/api/vehicles/years?make=${selectedMake}&model=${selectedModel}`)
      .then((r) => r.json())
      .then((data) => {
        setYears(data.years ?? []);
        setYearsNote(data.note);
      })
      .catch(() => setYears([]))
      .finally(() => setLoadingYears(false));
  }, [selectedMake, selectedModel]);

  const runSearch = useCallback(
    (targetPage = 1) => {
      if (!selectedMake) return;
      setSearching(true);
      const params = new URLSearchParams({
        make: selectedMake,
        page: String(targetPage),
        pageSize: String(pageSize),
        sort: filters.sort,
      });
      if (selectedModel) params.set("model", selectedModel);
      if (selectedYear) params.set("year", String(selectedYear));
      if (filters.verifiedOnly) params.set("verifiedOnly", "true");

      fetch(`/api/paint-colors?${params}`)
        .then((r) => r.json())
        .then((data) => {
          setResults(data.results ?? []);
          setTotal(data.total ?? 0);
          setResultsNote(data.note);
          setPage(targetPage);
        })
        .finally(() => setSearching(false));

      // Shareable URL — spec "URLS" section.
      const urlParams = new URLSearchParams();
      urlParams.set("make", selectedMake);
      if (selectedModel) urlParams.set("model", selectedModel);
      if (selectedYear) urlParams.set("year", String(selectedYear));
      router.replace(`/find-my-colour?${urlParams}`, { scroll: false });
    },
    [selectedMake, selectedModel, selectedYear, filters, router]
  );

  // Re-run search when filters change, but only once a search has already happened.
  useEffect(() => {
    if (results.length > 0 || resultsNote) runSearch(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  function handleDirectCodeSearch(query: string) {
    fetch(`/api/paint/search?q=${encodeURIComponent(query)}`)
      .then((r) => r.json())
      .then((data) => {
        // Direct code search returns a lighter row shape than the full
        // vehicle-context search; map defensively rather than assume parity.
        setResults(
          (data.results ?? []).map((r: any) => ({
            id: r.id,
            code: r.code,
            auxCode: r.aux_code,
            name: r.name,
            manufacturerId: "",
            codeNormalized: "",
            alternativeNames: [],
            baseColor: null,
            finish: null,
            hex: null,
            source: { id: "", slug: "" },
            verificationStatus: "unverified",
            fitment: { yearFrom: null, yearTo: null, market: null, confidence: 1, verificationStatus: "unverified" },
          }))
        );
        setTotal(data.results?.length ?? 0);
        setResultsNote(data.note);
        setPage(1);
      });
  }

  const whatsAppLink = buildWhatsAppLink({
    phoneNumber: WHATSAPP_NUMBER,
    vehicle: {
      make: makes.find((m) => m.slug === selectedMake)?.label ?? selectedMake ?? "",
      model: models.find((m) => m.slug === selectedModel)?.label,
      year: selectedYear ?? undefined,
    },
  });

  return (
    <main className="max-w-5xl mx-auto px-4 py-10 flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-3xl">Find my colour</h1>
        <p className="text-steel max-w-xl">
          Select your vehicle to see the factory paint colours we have on record. These are colours associated with
          this vehicle context — to confirm the exact match for your car, check the paint-code label on the vehicle
          itself.
        </p>
      </header>

      <DirectCodeSearch onSearch={handleDirectCodeSearch} />

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
        <VehicleSelector
          makes={makes}
          models={models}
          years={years}
          yearsNote={yearsNote}
          selectedMake={selectedMake}
          selectedModel={selectedModel}
          selectedYear={selectedYear}
          loadingModels={loadingModels}
          loadingYears={loadingYears}
          onMakeChange={(slug) => {
            setSelectedMake(slug);
            setSelectedModel(null);
            setSelectedYear(null);
            setResults([]);
            setResultsNote(undefined);
          }}
          onModelChange={(slug) => {
            setSelectedModel(slug);
            setSelectedYear(null);
            setResults([]);
            setResultsNote(undefined);
          }}
          onYearChange={(year) => {
            setSelectedYear(year);
            setResults([]);
            setResultsNote(undefined);
          }}
          onSubmit={() => runSearch(1)}
          submitDisabled={!selectedMake || searching}
        />

        <section className="flex flex-col gap-3">
          {results.length > 0 && (
            <>
              <ColourFilters state={filters} onChange={setFilters} resultCount={total} />
              <ColourResultsGrid results={results} onSelect={() => {}} />
              <Pagination page={page} pageSize={pageSize} total={total} onPageChange={runSearch} />
            </>
          )}
          {results.length === 0 && resultsNote && <EmptyState message={resultsNote} whatsAppLink={whatsAppLink} />}
        </section>
      </div>
    </main>
  );
}
