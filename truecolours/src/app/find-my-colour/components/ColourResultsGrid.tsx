"use client";

import type { PaintResult } from "@/types/paint";
import { ColourCard } from "./ColourCard";

export function ColourResultsGrid({
  results,
  onSelect,
}: {
  results: PaintResult[];
  onSelect: (color: PaintResult) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {results.map((color) => (
        <ColourCard key={color.id} color={color} onSelect={onSelect} />
      ))}
    </div>
  );
}
