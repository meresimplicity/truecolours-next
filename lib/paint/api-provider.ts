import type {
  CodeSearchResult,
  PaintColor,
  PaintDataProvider,
  VehicleBrand,
  VehicleModel,
} from "../../types/paint.ts";

interface ApiMake {
  id?: string;
  name: string;
}

interface ApiModel {
  id?: string;
  name: string;
}

interface ApiColor {
  id?: string;
  code: string;
  name: string;
  brand?: string;
  make?: string;
  model?: string;
  finish?: string;
  hex?: string;
  market?: string;
  verified?: boolean;
  notes?: string;
  formula?: string;
  yearFrom?: number;
  yearTo?: number;
}

/**
 * MyCarColorProvider
 * Adapter for commercial MyCarColor REST API (or similar commercial endpoint).
 * Kept entirely server-side; zero secrets exposed to client bundle.
 */
export class MyCarColorProvider implements PaintDataProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.MYCARCOLOR_API_KEY || '';
    this.baseUrl = baseUrl || process.env.MYCARCOLOR_BASE_URL || 'https://api.mycarcolor.com/v1';
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async getBrands(): Promise<VehicleBrand[]> {
    if (!this.isConfigured()) return [];
    try {
      const res = await fetch(`${this.baseUrl}/makes`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        next: { revalidate: 86400 },
      });
      if (!res.ok) return [];

      const data = await res.json();
      return ((data.makes || []) as ApiMake[]).map((m) => ({
        id: m.id || m.name.toLowerCase(),
        name: m.name,
      }));
    } catch (err) {
      console.error("[MyCarColorProvider] getBrands error:", err);
      return [];
    }
  }

  async getModels(brand: string): Promise<VehicleModel[]> {
    if (!this.isConfigured()) return [];
    try {
      const res = await fetch(`${this.baseUrl}/models?make=${encodeURIComponent(brand)}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
        next: { revalidate: 86400 },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return ((data.models || []) as ApiModel[]).map((m) => ({
        id: m.id || `${brand}-${m.name}`.toLowerCase(),
        brandId: brand.toLowerCase(),
        name: m.name,
      }));
    } catch (err) {
      console.error("[MyCarColorProvider] getModels error:", err);
      return [];
    }
  }

  async getYears(brand: string, model: string): Promise<number[]> {
    if (!this.isConfigured()) return [];
    try {
      const res = await fetch(
        `${this.baseUrl}/years?make=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          next: { revalidate: 86400 },
        }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return data.years || [];
    } catch (err) {
      console.error("[MyCarColorProvider] getYears error:", err);
      return [];
    }
  }

  async getColors(brand: string, model: string, year: number, market?: string): Promise<PaintColor[]> {
    if (!this.isConfigured()) return [];
    try {
      const marketParam = market ? `&market=${encodeURIComponent(market)}` : '';
      const res = await fetch(
        `${this.baseUrl}/colors?make=${encodeURIComponent(brand)}&model=${encodeURIComponent(model)}&year=${year}${marketParam}`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
          next: { revalidate: 3600 },
        }
      );
      if (!res.ok) return [];
      const data = await res.json();
      return ((data.colors || []) as ApiColor[]).map((c) => ({
        id: c.id || `api-${c.code}`,
        brand,
        model,
        year,
        code: c.code,
        name: c.name,
        finish: c.finish || 'Solid',
        hex: c.hex || undefined,
        market: c.market || market,
        source: 'api',
        verified: Boolean(c.verified),
        notes: c.notes,
        formulaReference: c.formula,
      }));
    } catch (err) {
      console.error("[MyCarColorProvider] getColors error:", err);
      return [];
    }
  }

  async searchByCode(query: string): Promise<CodeSearchResult[]> {
    if (!this.isConfigured()) return [];
    try {
      const res = await fetch(`${this.baseUrl}/search?q=${encodeURIComponent(query)}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return ((data.results || []) as ApiColor[]).map((c) => ({
        id: c.id || `api-${c.code}`,
        brand: c.brand || c.make || "",
        model: c.model || "",
        yearFrom: c.yearFrom,
        yearTo: c.yearTo,
        code: c.code,
        name: c.name,
        finish: c.finish,
        hex: c.hex,
        source: 'api',
        verified: Boolean(c.verified),
        matchType: 'partial_code',
      }));
    } catch (err) {
      console.error("[MyCarColorProvider] searchByCode error:", err);
      return [];
    }
  }
}
