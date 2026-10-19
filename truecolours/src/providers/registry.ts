import type { PaintProvider, VehicleProvider } from "./types";
import { VehiclesDbProvider } from "./vehiclesdb.provider";
import { NhtsaVpicProvider } from "./nhtsa-vpic.provider";
import { PaintCalculatorsProvider } from "./paint-calculators.provider";
import { MyCarColorProvider } from "./mycarcolor.provider";
import { TrueColoursInternalProvider } from "./truecolours-internal.provider";

/**
 * Central place import scripts (never live API routes — see README
 * "Cache the external API") ask "which providers are active right now".
 * Adding a fifth provider later means adding one line here, not touching
 * every call site.
 */

export function getVehicleProviders(): VehicleProvider[] {
  return [
    new VehiclesDbProvider("car"),
    new NhtsaVpicProvider(), // secondary — year validation only, see file header there
  ];
}

export function getPaintProviders(): PaintProvider[] {
  const providers: PaintProvider[] = [new TrueColoursInternalProvider()];

  if (process.env.PAINT_CALCULATORS_API_KEY) {
    providers.push(new PaintCalculatorsProvider());
  }
  if (process.env.MYCARCOLOR_ENABLED === "true" && process.env.MYCARCOLOR_API_KEY) {
    providers.push(new MyCarColorProvider());
  }
  return providers;
}
