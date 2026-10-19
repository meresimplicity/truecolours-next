"use client";

import { Suspense, useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Car, Search, AlertCircle, Camera, BookOpen } from "lucide-react";
import type { PaintColor, VehicleBrand, VehicleModel } from "@/types/paint";
import { FilterSortBar, type SortOption } from "./FilterSortBar";
import { PaintResultCard } from "./PaintResultCard";
import { PaintDetailModal } from "./PaintDetailModal";
import { PaginationControls } from "./PaginationControls";
import { HistoricalPaintLibrary } from "./HistoricalPaintLibrary";
import { ColourContactOptions } from "./ColourContactOptions";
import { PaintColourSearch } from "./PaintColourSearch";
import { PaintCountryPicker } from "./PaintCountryPicker";
import { PaintMarketCoverage } from "./PaintMarketCoverage";
import { paintMarketName, resolvePaintMarketQuery } from "@/lib/paint/markets";
import type { HistoricalBookSummary } from "@/lib/paint/historical-source";
import { mergeVehicleMakes, normalizeVehicleMake } from "@/lib/vehicles/makes";
import { buildWhatsAppLink, formatNotFoundEnquiryMessage, withOriginalEnquiry } from "@/lib/whatsapp";

interface PaintFinderCatalogueProps {
  initialBrand?: string;
  initialModel?: string;
  initialYear?: string;
}

async function loadFinderData(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { cache: "no-store", signal });
  const json = await response.json();
  if (!response.ok || !json.success) throw new Error("Colour finder data unavailable");
  return json;
}

export function PaintFinderCatalogue({
  initialBrand = "",
  initialModel = "",
  initialYear = "",
}: PaintFinderCatalogueProps) {
  const [searchMode, setSearchMode] = useState<"vehicle" | "search" | "history">("vehicle");
  const [resultMode, setResultMode] = useState<"vehicle" | "search">("vehicle");

  // Selection states
  const [brand, setBrand] = useState(initialBrand);
  const [model, setModel] = useState(initialModel);
  const [year, setYear] = useState(initialYear);
  const [codeQuery, setCodeQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [country, setCountry] = useState("");
  const [submittedCountry, setSubmittedCountry] = useState("");
  const [enquiryMessage, setEnquiryMessage] = useState("");

  // Data lists
  const [brands, setBrands] = useState<VehicleBrand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [historicalMakes, setHistoricalMakes] = useState<string[]>([]);
  const [makesLoading, setMakesLoading] = useState(false);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [selectionError, setSelectionError] = useState("");

  // Results & Pagination
  const [colors, setColors] = useState<PaintColor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(Boolean(initialBrand && initialModel));

  // Filter & Sorting
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>(initialYear || "all");
  const [sortBy, setSortBy] = useState<SortOption>("code_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(24);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [historicalMatches, setHistoricalMatches] = useState<HistoricalBookSummary[]>([]);
  const [historicalPage, setHistoricalPage] = useState(1);
  const [historicalTotalPages, setHistoricalTotalPages] = useState(1);
  const [searchError, setSearchError] = useState("");
  const requestNumber = useRef(0);

  // Selected Card for Modal Detail
  const [activeItem, setActiveItem] = useState<PaintColor | null>(null);
  const [activeItemYear, setActiveItemYear] = useState<string | undefined>();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Historic references share the normal selectors, while model coverage and
  // make/year colour charts remain distinct sources of paint information.
  useEffect(() => {
    const controller = new AbortController();
    async function loadYears() {
      const [vehicles, history] = await Promise.allSettled([
        loadFinderData("/api/vehicles/years", controller.signal),
        loadFinderData("/api/paint/history", controller.signal),
      ]);
      if (controller.signal.aborted) return;
      const vehicleYears = vehicles.status === "fulfilled" && Array.isArray(vehicles.value.data) ? vehicles.value.data : [];
      const archiveYears = history.status === "fulfilled" && Array.isArray(history.value.data?.years) ? history.value.data.years : [];
      setYears([...new Set<number>([...vehicleYears, ...archiveYears])].sort((a, b) => b - a));
      if (vehicles.status === "rejected" && history.status === "rejected") setSelectionError("We couldn’t load the vehicle years. Please refresh to try again.");
    }
    loadYears();
    return () => controller.abort();
  }, []);

  // 2. A year limits the makes to only those the supplied vehicle data supports.
  useEffect(() => {
    if (!year) { setBrands([]); setHistoricalMakes([]); setMakesLoading(false); return; }
    const controller = new AbortController();
    setBrands([]);
    setHistoricalMakes([]);
    setMakesLoading(true);
    setSelectionError("");
    async function loadMakes() {
      const [vehicles, history] = await Promise.allSettled([
        loadFinderData(`/api/vehicles/makes?year=${encodeURIComponent(year)}`, controller.signal),
        loadFinderData(`/api/paint/history?year=${encodeURIComponent(year)}`, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      const vehicleMakes: string[] = vehicles.status === "fulfilled" && Array.isArray(vehicles.value.data) ? vehicles.value.data : [];
      const archiveMakes: string[] = history.status === "fulfilled" && Array.isArray(history.value.data?.makes) ? history.value.data.makes : [];
      setHistoricalMakes(archiveMakes);
      setBrands(mergeVehicleMakes(vehicleMakes, archiveMakes).map((name) => ({ id: name, name })));
      setMakesLoading(false);
      if (vehicles.status === "rejected" && history.status === "rejected") setSelectionError("We couldn’t load the makes for this year. Choose the year again to retry.");
    }
    loadMakes();
    return () => controller.abort();
  }, [year]);

  // 3. A make is then limited to models that exist in the selected year.
  useEffect(() => {
    if (!year || !brand) { setModels([]); setModelsLoading(false); return; }
    const controller = new AbortController();
    setModels([]);
    setModelsLoading(true);
    setSelectionError("");
    async function loadModels() {
      try {
        const json = await loadFinderData(`/api/vehicles/models?year=${encodeURIComponent(year)}&make=${encodeURIComponent(brand)}`, controller.signal);
        if (!controller.signal.aborted && Array.isArray(json.data)) {
          setModels(json.data.map((name: string) => ({ id: `${brand}-${name}`, brandId: brand, name })));
        }
      } catch {
        if (!controller.signal.aborted) setSelectionError("We couldn’t load the models. Select the make again to retry.");
      } finally {
        if (!controller.signal.aborted) setModelsLoading(false);
      }
    }
    loadModels();
    return () => controller.abort();
  }, [year, brand]);

  // 4. Fetch Paint Colours for Vehicle
  const fetchVehicleColors = useCallback(async (
    targetBrand: string,
    targetModel: string,
    targetYearStr: string,
    targetSort: SortOption,
    page: number,
    limit: number
  ) => {
    if (!targetBrand) return;

    const activeRequest = ++requestNumber.current;
    setResultMode("vehicle");
    setIsLoading(true);
    setSearchError("");
    setHasSearched(true);
    setHistoricalMatches([]);
    try {
      const queryParams = new URLSearchParams({
        brand: targetBrand,
        model: targetModel,
        sortBy: targetSort,
        page: page.toString(),
        limit: limit.toString(),
      });

      if (targetYearStr && targetYearStr !== "all") {
        queryParams.set("year", targetYearStr);
      }

      const [paint, history] = await Promise.allSettled([
        targetModel ? loadFinderData(`/api/paint/colors?${queryParams.toString()}`) : Promise.resolve(null),
        targetYearStr && targetYearStr !== "all" ? loadFinderData(`/api/paint/history?year=${encodeURIComponent(targetYearStr)}&make=${encodeURIComponent(targetBrand)}`) : Promise.resolve(null),
      ]);
      if (activeRequest !== requestNumber.current) return;
      const json = paint.status === "fulfilled" ? paint.value : null;
      const books = history.status === "fulfilled" && Array.isArray(history.value?.data?.books) ? history.value.data.books : [];
      setHistoricalMatches(books);
      if (paint.status === "rejected" || (history.status === "rejected" && !targetModel)) {
        setSearchError("Some paint references couldn’t load. Please try your search again.");
      }

      if (json && Array.isArray(json.data)) {
        setColors(json.data);
        if (json.pagination) {
          setTotalCount(json.pagination.total);
          setTotalPages(json.pagination.totalPages);
          setCurrentPage(json.pagination.page);
        } else {
          setTotalCount(json.data.length);
          setTotalPages(1);
        }
      } else {
        setColors([]);
        setTotalCount(0);
        setTotalPages(1);
      }
    } catch (err) {
      if (activeRequest !== requestNumber.current) return;
      console.error("Failed to fetch colours:", err);
      setSearchError("We couldn’t load the paint records. Please try your search again.");
      setColors([]);
      setTotalCount(0);
    } finally {
      if (activeRequest === requestNumber.current) setIsLoading(false);
    }
  }, []);

  // Trigger initial search if props provided (e.g. from SEO subroute)
  useEffect(() => {
    if (initialBrand && initialModel) {
      fetchVehicleColors(initialBrand, initialModel, initialYear || "all", "code_asc", 1, 24);
    }
    return () => { requestNumber.current++; };
  }, [fetchVehicleColors, initialBrand, initialModel, initialYear]);

  // Handler: Initial Form Submit
  const handleInitialFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSearchVehicle) return;
    setCurrentPage(1);
    setSelectedYearFilter(year || "all");
    fetchVehicleColors(brand, model, year || "all", sortBy, 1, pageSize);
  };

  // Handler: Filter by Year
  const handleYearFilterChange = (nextYear: string) => {
    setSelectedYearFilter(nextYear);
    setCurrentPage(1);
    fetchVehicleColors(brand, model, nextYear, sortBy, 1, pageSize);
  };

  // Handler: Sort Change
  const handleSortChange = (nextSort: SortOption) => {
    setSortBy(nextSort);
    setCurrentPage(1);
    if (resultMode === "search") fetchSearchColors(submittedQuery, nextSort, 1, pageSize, 1, submittedCountry);
    else fetchVehicleColors(brand, model, selectedYearFilter, nextSort, 1, pageSize);
  };

  // Handler: Page Change
  const handlePageChange = (nextPage: number) => {
    setCurrentPage(nextPage);
    if (resultMode === "search") fetchSearchColors(submittedQuery, sortBy, nextPage, pageSize, 1, submittedCountry);
    else fetchVehicleColors(brand, model, selectedYearFilter, sortBy, nextPage, pageSize);
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  // Global search never applies the optional vehicle selectors.
  const fetchSearchColors = async (query: string, targetSort: SortOption, page: number, limit: number, archivePage = 1, targetCountry = "") => {
    const q = query.trim();
    if (!q && !targetCountry) { resetResults(); return; }

    const activeRequest = ++requestNumber.current;
    setResultMode("search");
    setIsLoading(true);
    setSearchError("");
    setHistoricalMatches([]);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ q, country: targetCountry, sortBy: targetSort, page: String(page), limit: String(limit), historyPage: String(archivePage) });
      const res = await fetch(`/api/paint/search?${params}`);
      const json = await res.json();
      if (activeRequest !== requestNumber.current) return;
      if (!res.ok || !json.success) throw new Error("Paint search unavailable");
      setHistoricalMatches(Array.isArray(json.historicalBooks) ? json.historicalBooks : []);
      setHistoricalPage(json.historicalPagination?.page ?? 1);
      setHistoricalTotalPages(json.historicalPagination?.totalPages ?? 1);
      if (json.success && Array.isArray(json.data)) {
        setColors(json.data);
        setTotalCount(json.pagination.total);
        setTotalPages(json.pagination.totalPages);
        setCurrentPage(json.pagination.page);
      } else {
        setColors([]);
        setTotalCount(0);
      }
    } catch (err) {
      if (activeRequest !== requestNumber.current) return;
      console.error("Failed to search colours:", err);
      setSearchError("We couldn’t search the paint records. Please try again.");
      setColors([]);
      setTotalCount(0);
      setTotalPages(1);
    } finally {
      if (activeRequest === requestNumber.current) setIsLoading(false);
    }
  };

  const handleColourSearch = (query: string, selectedCountry = country, keepVehiclePicker = false) => {
    const resolved = resolvePaintMarketQuery(query, selectedCountry);
    setSearchMode(keepVehiclePicker ? "vehicle" : "search");
    setCountry(resolved.country);
    setCodeQuery(resolved.query);
    setSubmittedCountry(resolved.country);
    setSubmittedQuery(resolved.query);
    setSelectedYearFilter("all");
    setCurrentPage(1);
    fetchSearchColors(resolved.query, sortBy, 1, pageSize, 1, resolved.country);
  };

  // Handler: Select Card
  const handleSelectCard = (item: PaintColor) => {
    setActiveItem(item);
    setActiveItemYear(resultMode === "search" ? undefined : selectedYearFilter !== "all" ? selectedYearFilter : year || undefined);
    setIsModalOpen(true);
  };

  const resetResults = () => {
    requestNumber.current++;
    setHasSearched(false);
    setColors([]);
    setTotalCount(0);
    setCurrentPage(1);
    setTotalPages(1);
    setIsLoading(false);
    setHistoricalMatches([]);
    setHistoricalPage(1);
    setHistoricalTotalPages(1);
    setSearchError("");
  };
  const switchSearchMode = (mode: "vehicle" | "search" | "history") => {
    if (mode === searchMode) return;
    setSearchMode(mode);
    resetResults();
    if (mode !== "search") { setCountry(""); setSubmittedCountry(""); }
    if (mode === "history" && Number(year) >= 1978) { setYear(""); setBrand(""); setModel(""); }
  };
  const requiresModel = !historicalMakes.some((make) => normalizeVehicleMake(make) === normalizeVehicleMake(brand)) || models.length > 0;
  const canSearchVehicle = Boolean(year && brand && !makesLoading && !modelsLoading && !selectionError && (!requiresModel || model));

  return (
    <motion.div
      id="colour-finder"
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-[940px] scroll-mt-[110px] pb-8 pt-2"
    >
      <div className="tc-paint-heading"><p className="tc-eyebrow">Your vehicle. Your colour.</p><h1>Find my colour.</h1><p>Search by colour name, paint code or vehicle. Find original colours for cars old and new.</p></div>
      <PaintColourSearch value={codeQuery} onChange={setCodeQuery} onSearch={handleColourSearch} country={country} onCountryChange={(value) => handleColourSearch(codeQuery, value)} isSearching={isLoading} onSelect={(item) => {
        setActiveItem(item);
        setActiveItemYear(undefined);
        setIsModalOpen(true);
      }} />
      <div className="tc-search-modes">
          <button type="button" aria-pressed={searchMode === "search"} onClick={() => switchSearchMode("search")}><Search size={16} /><span>ALL COLOURS</span></button>
          <button
            type="button"
            aria-pressed={searchMode === "vehicle"}
            onClick={() => switchSearchMode("vehicle")}
            className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition ${
              searchMode === "vehicle" ? "bg-[#111111] text-white shadow-sm" : "text-slate-600"
            }`}
          >
            <Car size={16} />
            <span>FIND BY VEHICLE</span>
          </button>

          <button type="button" aria-pressed={searchMode === "history"} onClick={() => switchSearchMode("history")}>
            <BookOpen size={16} /><span>ANTIQUE & CLASSIC</span>
          </button>
      </div>

      {!isLoading && searchError && <p role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{searchError}</p>}

      <AnimatePresence mode="wait">
      {searchMode !== "search" && (
        <motion.div
          key="vehicle-picker"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.28, ease: "easeOut" }}
          className="mx-auto mt-8 max-w-[860px]"
        >
          <div className="tc-paint-steps"><p><span>01</span>Select year</p><p><span>02</span>Select vehicle</p><p><span>03</span>Find your colour</p></div>
          <form onSubmit={handleInitialFormSubmit} className="tc-vehicle-form space-y-4" aria-live="polite">
            <div className="space-y-3">
              <label className="relative block">
                <select
                  aria-label="Select vehicle year"
                  value={year}
                  onChange={(e) => {
                    resetResults();
                    setYear(e.target.value);
                    setBrand("");
                    setModel("");
                  }}
                  required
                  className="w-full min-h-[68px] cursor-pointer appearance-none rounded-[18px] border-[3px] border-[#1c1c1c] bg-transparent px-5 pr-12 text-left text-[clamp(1.2rem,2vw,2rem)] font-bold tracking-[-0.05em] text-[#111111] focus:outline-none focus:ring-0"
                >
                  <option value="" disabled>
                    Select Year
                  </option>
                  {years.filter((availableYear) => searchMode !== "history" || availableYear < 1978).map((availableYear) => (
                    <option key={availableYear} value={availableYear.toString()}>
                      {availableYear}
                    </option>
                  ))}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-[1.4rem] text-[#111111]">⌄</span>
              </label>

              <label className="relative block">
                <select
                  aria-label="Select vehicle make"
                  value={brand}
                  onChange={(e) => {
                    resetResults();
                    setBrand(e.target.value);
                    setModel("");
                  }}
                  required
                  disabled={!year || makesLoading}
                  className="w-full min-h-[68px] cursor-pointer appearance-none rounded-[18px] border-[3px] border-[#1c1c1c] bg-transparent px-5 pr-12 text-left text-[clamp(1.2rem,2vw,2rem)] font-bold tracking-[-0.05em] text-[#111111] focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="" disabled>
                    {makesLoading ? "Loading makes…" : "Select Make"}
                  </option>
                  {brands.map((availableMake) => (
                    <option key={availableMake.id || availableMake.name} value={availableMake.name}>
                      {availableMake.name}
                    </option>
                  ))}
                  {brand && !brands.some((item) => item.name === brand) && <option value={brand}>{brand}</option>}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-[1.4rem] text-[#111111]">⌄</span>
              </label>

              {(requiresModel || modelsLoading) && <label className="relative block">
                <select
                  aria-label="Select vehicle model"
                  value={model}
                  onChange={(e) => { resetResults(); setModel(e.target.value); }}
                  required
                  disabled={!brand || modelsLoading}
                  className="w-full min-h-[68px] cursor-pointer appearance-none rounded-[18px] border-[3px] border-[#1c1c1c] bg-transparent px-5 pr-12 text-left text-[clamp(1.2rem,2vw,2rem)] font-bold tracking-[-0.05em] text-[#111111] focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <option value="" disabled>
                    {modelsLoading ? "Loading models…" : "Select Model"}
                  </option>
                  {models.map((availableModel) => (
                    <option key={availableModel.id || availableModel.name} value={availableModel.name}>
                      {availableModel.name}
                    </option>
                  ))}
                  {model && !models.some((item) => item.name === model) && <option value={model}>{model}</option>}
                </select>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4 text-[1.4rem] text-[#111111]">⌄</span>
              </label>}
            </div>

            <button
              type="submit"
              disabled={isLoading || !canSearchVehicle}
              className="w-full rounded-full bg-[#111] py-4 text-base font-medium text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? "Finding Colours…" : "Find Colour"}
            </button>
          </form>

          {selectionError && <p role="alert" className="mt-4 text-sm text-amber-800">{selectionError}</p>}
          <p className="mt-5 text-center text-xs leading-relaxed text-slate-500">{brand && !requiresModel && !modelsLoading ? `Original ${year} ${brand} charts are available by make and year. Check the chart for your model.` : "Select your year, make and model to see the available paint colours."}</p>
        </motion.div>
      )}
      </AnimatePresence>

      {searchMode !== "search" && <PaintCountryPicker value={country} onChange={(value) => handleColourSearch(codeQuery, value, true)} />}

      <Suspense fallback={null}><ColourContactOptions details={resultMode === "search" ? { code: codeQuery || undefined } : { brand, model, year: year || undefined }} onEnquiryChange={setEnquiryMessage} /></Suspense>

      {hasSearched && resultMode === "search" && !isLoading && !searchError && <p className="mt-8 text-sm text-slate-600" role="status">{totalCount.toLocaleString()} {totalCount === 1 ? "colour" : "colours"}{submittedQuery ? <> found for <strong className="text-slate-900">“{submittedQuery}”</strong></> : " in the indexed palettes"}{submittedCountry ? ` · ${paintMarketName(submittedCountry)}` : ""}{historicalMatches.length > 0 ? ", plus original colour books below." : "."}</p>}
      {hasSearched && searchMode === "search" && submittedCountry && !isLoading && <PaintMarketCoverage country={submittedCountry} />}

      {/* 6. Filter & Sort Bar (Requirement 2, 6, 7 & 24) */}
      {hasSearched && colors.length > 0 && !isLoading && (
        <FilterSortBar
          years={years}
          selectedYear={selectedYearFilter}
          onYearChange={handleYearFilterChange}
          sortBy={sortBy}
          onSortChange={handleSortChange}
          totalCount={totalCount}
          showYearFilter={false}
        />
      )}

      {/* 7. Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#111111]" />
          <p className="text-sm font-bold text-slate-600">Finding catalogue colours…</p>
        </div>
      )}

      {/* 8. The 6-Column Responsive Colour Grid (Requirement 3, 24, 25 & 26) */}
      {!isLoading && hasSearched && colors.length > 0 && (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 sm:gap-4">
            {colors.map((item) => (
              <PaintResultCard
                key={item.id}
                item={item}
                previewLabel={resultMode === "search" ? `${item.brand} ${item.model}`.trim() : undefined}
                onSelect={handleSelectCard}
              />
            ))}
          </div>

          {/* Pagination Controls (Requirement 8 & 24) */}
          <PaginationControls
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            pageSize={pageSize}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setCurrentPage(1);
              if (resultMode === "search") fetchSearchColors(submittedQuery, sortBy, 1, sz, 1, submittedCountry);
              else fetchVehicleColors(brand, model, selectedYearFilter, sortBy, 1, sz);
            }}
          />
        </div>
      )}

      {/* 9. Empty Result State (Requirement 20 & 14) */}
      {!isLoading && hasSearched && colors.length === 0 && historicalMatches.length === 0 && !searchError && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-4 shadow-sm max-w-xl mx-auto">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <AlertCircle size={24} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              {resultMode === "search" ? `No indexed colours found${submittedQuery ? ` for “${submittedQuery}”` : ""}${submittedCountry ? ` in ${paintMarketName(submittedCountry)}` : ""}.` : "We don’t have a confirmed colour record for this vehicle yet."}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {resultMode === "search" ? "Try a shorter colour name, a different paint code, or All countries. Country coverage is still growing; a missing record does not mean the colour was never sold there." : "Automotive paint formulations vary by build year, factory plant, and international market. Send us a photo of your vehicle paint-code plate or door jamb sticker, and our in-store technicians in Mankweng will match it directly."}
            </p>
          </div>

          <a
            href={buildWhatsAppLink(
              withOriginalEnquiry(formatNotFoundEnquiryMessage({
                brand: resultMode === "search" ? "" : brand,
                model: resultMode === "search" ? "" : model,
                year: selectedYearFilter !== "all" ? selectedYearFilter : undefined,
                code: resultMode === "search" ? submittedQuery : undefined,
              }), enquiryMessage)
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-950 px-6 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-neutral-800 cursor-pointer"
          >
            <Camera size={16} />
            <span>CONTACT TRUECOLOURS ON WHATSAPP</span>
          </a>
        </div>
      )}

      {!isLoading && hasSearched && historicalMatches.length > 0 && <HistoricalPaintLibrary key={historicalMatches.map((book) => book.id).join(",")} books={historicalMatches} enquiryMessage={enquiryMessage} />}
      {!isLoading && hasSearched && resultMode === "search" && historicalTotalPages > 1 && <div aria-label="Colour book pages" className="mt-4"><p className="text-sm text-slate-500">Original colour book pages</p><PaginationControls currentPage={historicalPage} totalPages={historicalTotalPages} onPageChange={(page) => fetchSearchColors(submittedQuery, sortBy, currentPage, pageSize, page, submittedCountry)} /></div>}

      {/* 10. Paint Detail Modal / Panel (Requirement 12, 13 & 14) */}
      <PaintDetailModal
        key={activeItem?.id ?? "closed"}
        item={activeItem}
        enquiryMessage={enquiryMessage}
        selectedYear={activeItemYear}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setActiveItem(null);
        }}
      />
    </motion.div>
  );
}
