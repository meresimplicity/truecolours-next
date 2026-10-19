import { LocalOpenDataProvider } from "../local-provider.ts";
import type { PaintProviderDefinition } from "./types.ts";

const openVehicleSource = new LocalOpenDataProvider();

export const openVehicleProvider: PaintProviderDefinition = {
  name: "open-vehicle",
  source: "open-data",
  isAvailable: () => true,
  getColors: async (brand, model, year, market) => {
    return openVehicleSource.getColors(brand, model, year, market);
  },
  searchByCode: async (query) => {
    return openVehicleSource.searchByCode(query);
  },
};
