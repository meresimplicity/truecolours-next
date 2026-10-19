import { LocalOpenDataProvider } from "../local-provider.ts";
import type { PaintProviderDefinition } from "./types.ts";

const localPaintSource = new LocalOpenDataProvider();

export const localProvider: PaintProviderDefinition = {
  name: "local",
  source: "open-data",
  isAvailable: () => true,
  getColors: async (brand, model, year, market) => {
    return localPaintSource.getColors(brand, model, year, market);
  },
  searchByCode: async (query) => {
    return localPaintSource.searchByCode(query);
  },
};
