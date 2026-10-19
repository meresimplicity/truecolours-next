import type { PaintColor } from "../../types/paint.ts";
import { getPaintSearchMatch } from "./search.ts";

/**
 * In-memory / persisted TRUECOLOURS in-store verified records.
 * Records verified by TRUECOLOURS colour matching technicians take precedence
 * over open-data or external API results.
 */
export interface TrueColoursOverrideRecord {
  id: string;
  brand: string;
  model: string;
  yearFrom: number;
  yearTo: number;
  code: string;
  name: string;
  finish?: string;
  hex?: string;
  formula?: string;
  notes?: string;
  physicalSwatchReference?: string;
  verificationMethod?: 'spectrophotometer' | 'spray-out' | 'oem-swatch' | 'customer-match';
  verifiedBy?: string;
  verifiedAt?: string;
}

// Initial in-store verified overrides (can be expanded via Admin portal)
export const TRUECOLOURS_OVERRIDES: TrueColoursOverrideRecord[] = [
  {
    id: "tc-toyota-hilux-040-glacier",
    brand: "Toyota",
    model: "Hilux",
    yearFrom: 2005,
    yearTo: 2026,
    code: "040",
    name: "Glacier White",
    finish: "Solid",
    hex: "#F5F6F8",
    formula: "2K Polyurethane Base / Pure White Toner + Trace Yellow Oxide",
    physicalSwatchReference: "TC-TOY-040-CARD-A1",
    verificationMethod: "spectrophotometer",
    verifiedBy: "TRUECOLOURS Trade Desk",
    verifiedAt: "2025-10-15",
    notes: "Confirmed on Datacolor spectrophotometer against OEM Hilux sample panel."
  },
  {
    id: "tc-vw-polo-lb9a-purewhite",
    brand: "Volkswagen",
    model: "Polo",
    yearFrom: 2010,
    yearTo: 2026,
    code: "LB9A",
    name: "Candy White / Pure White",
    finish: "Solid",
    hex: "#F7F7F6",
    formula: "2K HS Acrylic White + Micro Black Ochre",
    physicalSwatchReference: "TC-VW-LB9A-CARD-B2",
    verificationMethod: "spray-out",
    verifiedBy: "TRUECOLOURS Trade Desk",
    verifiedAt: "2025-11-02",
    notes: "Confirmed test spray-out matched against South African Polo Vivo door panel."
  },
  {
    id: "tc-ford-ranger-yz-oxford",
    brand: "Ford",
    model: "Ranger",
    yearFrom: 2011,
    yearTo: 2026,
    code: "YZ",
    name: "Oxford White",
    finish: "Solid",
    hex: "#FAF9F6",
    formula: "Commercial 2K Refinish White Toner",
    physicalSwatchReference: "TC-FRD-YZ-CARD-C1",
    verificationMethod: "spectrophotometer",
    verifiedBy: "TRUECOLOURS Trade Desk",
    verifiedAt: "2026-01-20",
    notes: "In-store verified against current generation Ranger fuel flap."
  }
];

export function findTrueColoursOverrides(brand: string, model: string, year: number): PaintColor[] {
  const b = brand.trim().toLowerCase();
  const m = model.trim().toLowerCase();

  return TRUECOLOURS_OVERRIDES
    .filter(o => o.brand.toLowerCase() === b && o.model.toLowerCase() === m && year >= o.yearFrom && year <= o.yearTo)
    .map(o => ({
      id: o.id,
      brand: o.brand,
      model: o.model,
      yearFrom: o.yearFrom,
      yearTo: o.yearTo,
      year,
      code: o.code,
      name: o.name,
      finish: o.finish,
      hex: o.hex,
      source: 'truecolours',
      verified: true,
      notes: o.notes,
      formulaReference: o.formula,
      verifiedBy: o.verifiedBy,
      verifiedAt: o.verifiedAt
    }));
}

export function searchTrueColoursOverrides(query: string): PaintColor[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  return TRUECOLOURS_OVERRIDES
    .filter(o => getPaintSearchMatch({ ...o, source: 'truecolours', verified: true }, q))
    .map(o => ({
      id: o.id,
      brand: o.brand,
      model: o.model,
      yearFrom: o.yearFrom,
      yearTo: o.yearTo,
      code: o.code,
      name: o.name,
      finish: o.finish,
      hex: o.hex,
      source: 'truecolours',
      verified: true,
      notes: o.notes,
      formulaReference: o.formula,
      verifiedBy: o.verifiedBy,
      verifiedAt: o.verifiedAt
    }));
}
