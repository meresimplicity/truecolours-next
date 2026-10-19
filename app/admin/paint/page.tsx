"use client";

import { useState } from "react";
import { CheckCircle2, Search, ShieldCheck, RefreshCw } from "lucide-react";
import type { PaintColor } from "@/types/paint";

export default function AdminPaintPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PaintColor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setMessage(null);
    try {
      const res = await fetch(
        `/api/paint/search?q=${encodeURIComponent(query.trim())}`,
      );
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setResults(json.data);
      } else {
        setResults([]);
      }
    } catch (err) {
      console.error("Search failed:", err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (item: PaintColor) => {
    setVerifyingId(item.id);
    try {
      const res = await fetch("/api/paint/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: item.brand,
          model: item.model,
          year: item.year || item.yearFrom,
          code: item.code,
          name: item.name,
          finish: item.finish,
          swatchHex: item.swatchHex || item.hex,
          formulaNotes:
            "Verified in Mankweng trade lab via spray-out panel comparison.",
          verifiedBy: "TRUECOLOURS Senior Matcher",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMessage(
          `✓ Successfully recorded in-store verification for ${item.brand} ${item.model} (${item.code}).`,
        );
        // Refresh item in results
        setResults((prev) =>
          prev.map((r) =>
            r.id === item.id
              ? { ...r, verified: true, source: "truecolours" }
              : r,
          ),
        );
      } else {
        setMessage(`Error: ${json.error}`);
      }
    } catch (err) {
      console.error("Verification failed:", err);
      setMessage("Failed to verify paint record.");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="text-[#e52452]" size={28} />
            Paint Verification Console
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review automotive paint codes and promote in-store spectrophotometer
            matches to Priority 1 TRUECOLOURS Verified standards.
          </p>
        </div>
      </div>

      {message && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
          {message}
        </div>
      )}

      {/* Search Form */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSearch} className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by code (e.g. LY9B, LS9R) or vehicle (e.g. Audi A1)..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pl-11 text-sm font-semibold text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[#e52452] focus:outline-none focus:ring-1 focus:ring-[#e52452]"
            />
            <Search
              size={18}
              className="absolute left-3.5 top-3.5 text-slate-400"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-[#e52452] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#d01e48] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              "Search"
            )}
          </button>
        </form>
      </div>

      {/* Table */}
      {results.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 uppercase tracking-wider text-[11px] font-bold">
              <tr>
                <th className="px-4 py-3.5">Swatch</th>
                <th className="px-4 py-3.5">Code</th>
                <th className="px-4 py-3.5">Colour Name</th>
                <th className="px-4 py-3.5">Vehicle</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {results.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3">
                    <span
                      className="inline-block h-8 w-8 rounded-lg border border-black/10 shadow-inner"
                      style={{
                        backgroundColor: r.swatchHex || r.hex || "#e2e8f0",
                      }}
                    />
                  </td>
                  <td className="px-4 py-3 font-mono font-black text-slate-900">
                    {r.displayCode || r.primaryCode || r.code}
                  </td>
                  <td className="px-4 py-3 font-bold text-slate-800 uppercase">
                    {r.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {r.brand} {r.model}{" "}
                    {r.yearFrom ? `(${r.yearFrom}–${r.yearTo})` : ""}
                  </td>
                  <td className="px-4 py-3">
                    {r.verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 border border-emerald-200">
                        <CheckCircle2 size={13} />
                        TRUECOLOURS Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200">
                        Open Spec ({r.source})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!r.verified && (
                      <button
                        type="button"
                        onClick={() => handleVerify(r)}
                        disabled={verifyingId === r.id}
                        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
                      >
                        {verifyingId === r.id
                          ? "Recording..."
                          : "Verify In-Store"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
