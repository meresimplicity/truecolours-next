import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { VehiclesDbProvider } from "@/providers/vehiclesdb.provider";
import { PaintCalculatorsProvider } from "@/providers/paint-calculators.provider";
import { MyCarColorProvider } from "@/providers/mycarcolor.provider";
import { ProviderConfigError, ProviderUnavailableError } from "@/providers/types";

function mockFetchOnce(body: unknown, ok = true) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      statusText: ok ? "OK" : "Error",
      json: async () => body,
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("VehiclesDbProvider", () => {
  // Fictitious fixture, deliberately not a real manufacturer/model — this
  // exercises the normalization code path only, not real vehicle data.
  const FIXTURE = {
    version: "test",
    schema_version: 2,
    kinds: ["car"],
    makes: [
      {
        name: "Testmark",
        slug: "testmark",
        kinds: ["car"],
        models: [{ name: "Sample One", slug: "sample-one", kind: "car", body_type: "hatchback" }],
      },
    ],
  };

  it("normalizes makes and models, and never fabricates model years", async () => {
    mockFetchOnce(FIXTURE);
    const provider = new VehiclesDbProvider("car");

    const rawMakes = await provider.getMakes();
    expect(rawMakes).toHaveLength(1);
    const make = provider.normalizeMake(rawMakes[0]!);
    expect(make).toMatchObject({ name: "Testmark", slug: "testmark" });

    const rawModels = await provider.getModels("testmark");
    expect(rawModels).toHaveLength(1);
    const model = provider.normalizeModel(rawModels[0]!, "manufacturer-id-123");
    expect(model).toMatchObject({ name: "Sample One", slug: "sample-one", yearFrom: null, yearTo: null });

    // The documented gap: no per-model year data exists yet upstream.
    const years = await provider.getYears("testmark", "sample-one");
    expect(years).toEqual([]);
  });

  it("carries the required CC-BY attribution string", () => {
    const provider = new VehiclesDbProvider();
    expect(provider.attribution).toContain("VehiclesDB");
    expect(provider.attribution).toContain("CC-BY 4.0");
  });
});

describe("PaintCalculatorsProvider", () => {
  // This response body is copied from Paint Calculators' own published API
  // documentation example (paintcalculators.com/colour-codes/api/), used
  // here purely to test that the adapter parses their documented shape —
  // not asserted anywhere as TRUECOLOURS catalogue data.
  const DOCUMENTED_EXAMPLE = {
    success: true,
    data: {
      brand: "Tesla",
      model: "Model 3",
      colors: [
        {
          name: "Pearl White Multi-Coat",
          code: "PPSW",
          hex: "#F7F7F7",
          finish: "Pearl Multi-Coat",
          availability: ["Model 3", "Model Y"],
        },
      ],
    },
  };

  it("throws ProviderConfigError when no API key is configured", async () => {
    const provider = new PaintCalculatorsProvider({ apiKey: undefined });
    await expect(provider.searchColors({ make: "tesla" })).rejects.toBeInstanceOf(ProviderConfigError);
  });

  it("parses the documented response shape, including per-colour availability", async () => {
    mockFetchOnce(DOCUMENTED_EXAMPLE);
    const provider = new PaintCalculatorsProvider({ apiKey: "test-key" });
    const raw = await provider.searchColors({ make: "tesla", model: "model-3" });
    expect(raw).toHaveLength(1);

    const color = provider.normalizePaintColor(raw[0]!, "manufacturer-id-123");
    expect(color).toMatchObject({ code: "PPSW", name: "Pearl White Multi-Coat", hex: "#F7F7F7" });

    // Confirms the "don't stamp a year we didn't actually confirm" rule.
    const fitment = provider.normalizeFitment(raw[0]!, { paintColorId: "pc-1", manufacturerId: "manufacturer-id-123" });
    expect(fitment.yearFrom).toBeNull();
    expect(fitment.yearTo).toBeNull();
  });
});

describe("MyCarColorProvider", () => {
  it("refuses to call the API while disabled by default", async () => {
    const provider = new MyCarColorProvider({ enabled: false });
    await expect(provider.searchColors({ make: "toyota" })).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it("requires an API key once enabled", async () => {
    const provider = new MyCarColorProvider({ enabled: true, apiKey: undefined });
    await expect(provider.searchColors({ make: "toyota" })).rejects.toBeInstanceOf(ProviderConfigError);
  });
});
