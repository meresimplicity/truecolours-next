/** Source catalogues use different casing and spacing for the same make. */
export function normalizeVehicleMake(make: string): string {
  return make.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function mergeVehicleMakes(...sources: string[][]): string[] {
  const makes = new Map<string, string>();
  for (const source of sources) {
    for (const make of source) {
      const key = normalizeVehicleMake(make);
      if (key && !makes.has(key)) makes.set(key, make);
    }
  }
  return [...makes.values()].sort((a, b) => a.localeCompare(b));
}

export function modelsForVehicleMake(makes: Record<string, string[]>, make: string): string[] {
  const key = Object.keys(makes).find((name) => normalizeVehicleMake(name) === normalizeVehicleMake(make));
  return key ? makes[key] : [];
}
