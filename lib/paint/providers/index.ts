import { MyCarColorProvider } from "../api-provider.ts";
import { localProvider } from "./local.ts";
import { openVehicleProvider } from "./open-vehicle.ts";
import { trueColoursProvider } from "./truecolours.ts";
import {
  mergeCodeSearchResults,
  mergePaintResults,
  SOURCE_PRIORITY,
  type PaintProviderDefinition,
} from "./types.ts";

const paintCalculatorsProvider: PaintProviderDefinition = {
  name: "paint-calculators",
  source: "api",
  isAvailable: () => new MyCarColorProvider().isConfigured(),
  getColors: async (brand, model, year, market) => {
    const provider = new MyCarColorProvider();
    if (!provider.isConfigured()) return [];
    return provider.getColors(brand, model, year, market);
  },
  searchByCode: async (query) => {
    const provider = new MyCarColorProvider();
    if (!provider.isConfigured()) return [];
    return provider.searchByCode(query);
  },
};

export const DEFAULT_PROVIDER_CHAIN = [
  trueColoursProvider,
  openVehicleProvider,
  localProvider,
  paintCalculatorsProvider,
] as const;

export { mergeCodeSearchResults, mergePaintResults, SOURCE_PRIORITY };
