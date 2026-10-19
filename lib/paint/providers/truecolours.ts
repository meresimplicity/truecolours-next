import { findTrueColoursOverrides, searchTrueColoursOverrides } from "../truecolours-overrides.ts";
import type { PaintProviderDefinition } from "./types.ts";
import { getPaintSearchMatch } from "../search.ts";

export const trueColoursProvider: PaintProviderDefinition = {
  name: "truecolours",
  source: "truecolours",
  isAvailable: () => true,
  getColors: async (brand, model, year, market) => {
    void market;
    return findTrueColoursOverrides(brand, model, year);
  },
  searchByCode: async (query) => {
    return searchTrueColoursOverrides(query).map((entry) => ({
      ...entry,
      ...getPaintSearchMatch(entry, query),
    }));
  },
};
