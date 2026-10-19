/**
 * TRUECOLOURS — Vehicle Paint Data Architecture
 * Normalized types for brands, models, generations, years, OEM paint colours, and provider interfaces.
 */

export interface VehicleBrand {
  id: string;
  name: string;
  slug?: string;
  modelsCount?: number;
}

export interface VehicleModel {
  id: string;
  brandId: string;
  name: string;
  slug?: string;
  generations?: VehicleGeneration[];
  colorsCount?: number;
}

export interface VehicleGeneration {
  id: string;
  modelId: string;
  name: string;
  code?: string;
  yearFrom?: number;
  yearTo?: number;
}

export interface VehicleYear {
  year: number;
}

export type PaintSourceType = 'truecolours' | 'licensed' | 'open-data' | 'api' | 'unverified';

export interface AlternativeName {
  language: string; // e.g. "fr", "us", "de", "br", "ca", "en", "za"
  name: string;
}

export interface PaintColorCode {
  code: string;
  normalizedCode: string;
  codeType: 'primary' | 'sales' | 'alias';
  isPrimary: boolean;
}

export interface PaintColor {
  id: string;
  brand: string;
  model: string;
  brandId?: string;
  modelId?: string;
  generation?: string;
  generationId?: string;
  year?: number;
  yearFrom?: number;
  yearTo?: number;
  years?: number[];

  // Primary OEM code (e.g. "LY9B", "LS9R")
  code: string;
  auxCode?: string | null;
  standardNumber?: string | null;
  primaryCode?: string;
  // Sales / marketing codes (e.g. ["A2"], ["2Y"])
  salesCodes?: string[];
  // Display code combo (e.g. "LY9B / A2", "LS9R / 2Y")
  displayCode?: string;
  aliases?: string[];

  name: string;
  baseColor?: string | null;
  normalizedName?: string;
  finish?: string; // e.g. "Solid", "Metallic", "Pearl", "Mica", "Tri-Coat Pearl"

  // Digital swatch approximation
  hex?: string; // Kept for backwards compatibility
  swatchHex?: string;
  swatchSource?: string;
  swatchVerified?: boolean;
  swatchEstimated?: boolean;
  swatchSecondaryHex?: string;

  market?: string;
  marketEvidence?: {
    countryCode: string;
    sourceTitle: string;
    sourceUrl: string;
    edition: string;
    checkedAt: string;
  };
  manufacturer?: string;

  // Multi-lingual names
  alternativeNames?: AlternativeName[];

  source: PaintSourceType;
  sourceId?: string;
  sourceUrl?: string;
  sourceLicense?: string;
  verified: boolean;
  notes?: string;
  formulaReference?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  relevanceScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CodeSearchResult extends PaintColor {
  matchType?: 'exact_code' | 'prefix_code' | 'partial_code' | 'exact_name' | 'partial_name' | 'alias_name' | 'vehicle';
  relevanceScore?: number;
}

export interface VehicleEnquiryDetails {
  brand: string;
  model: string;
  year?: number | string;
  colourName?: string;
  code?: string;
  primaryCode?: string;
  salesCode?: string;
  finish?: string;
  alternativeNames?: AlternativeName[];
}

export interface PaintColorQueryFilter {
  brand: string;
  model: string;
  year?: number;
  generation?: string;
  colorName?: string;
  sortBy?: 'name_asc' | 'name_desc' | 'code_asc' | 'code_desc';
  page?: number;
  limit?: number;
  market?: string;
}

export interface PaginatedPaintResponse {
  colors: PaintColor[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
}

export interface PaintDataProvider {
  getBrands(): Promise<VehicleBrand[]>;
  getModels(brand: string): Promise<VehicleModel[]>;
  getGenerations?(brand: string, model: string): Promise<VehicleGeneration[]>;
  getYears(brand: string, model: string): Promise<number[]>;
  getColors(brand: string, model: string, year: number, market?: string): Promise<PaintColor[]>;
  getColorsPaginated?(filter: PaintColorQueryFilter): Promise<PaginatedPaintResponse>;
  searchByCode(query: string): Promise<CodeSearchResult[]>;
}
