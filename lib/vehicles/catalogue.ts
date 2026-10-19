import "server-only";
import fs from "node:fs";
import path from "node:path";
import { modelsForVehicleMake } from "./makes.ts";

interface VehicleSelector { years: Record<string, Record<string, string[]>>; }
let cached: VehicleSelector | null = null;

function selector() {
  if (cached) return cached;
  const file = path.join(process.cwd(), "data", "processed", "vehicle-selector.json");
  if (!fs.existsSync(file)) return { years: {} };
  cached = JSON.parse(fs.readFileSync(file, "utf8"));
  return cached!;
}

export function vehicleYears() { return Object.keys(selector().years).map(Number).sort((a, b) => b - a); }
export function vehicleMakes(year: number) { return Object.keys(selector().years[year] ?? {}).sort((a, b) => a.localeCompare(b)); }
export function vehicleModels(year: number, make: string) { return modelsForVehicleMake(selector().years[year] ?? {}, make); }
