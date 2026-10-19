import type { PaintProvider, PaintSearchQuery, RawPaintRecord } from "./types";
import type { PaintColor, PaintFitment } from "@/types/paint";
import { ProviderConfigError, ProviderUnavailableError } from "./types";

/**
 * MyCarColor (https://mycarcolor.com/) — advertises 110,000+ automotive
 * colours with make/model/year compatibility.
 *
 * STATUS CHECKED LIVE ON 8 SEP 2026: the marketing site says "Now in Public
 * Beta". Its /docs page requires sign-in ("Access is invite-only. Contact
 * your account manager for an invitation.") — meaning the actual API
 * contract, pricing, rate limits, and — critically — the storage /
 * redistribution terms could NOT be verified in this session. Everything
 * below beyond the single curl example on the landing page
 * (`GET /api/v1/colors/search?q=...&make=...`, `Authorization: Bearer
 * mcc_sk_...`) is a best-guess shape, not a confirmed one.
 *
 * DO NOT enable this provider (MYCARCOLOR_ENABLED=true) until someone with
 * real portal access has:
 *   1. Read the actual ToS/pricing and confirmed TRUECOLOURS may persist
 *      (not just live-query) results — this determines
 *      `redistributionAllowed` below, which currently defaults to false
 *      specifically because beta ToS commonly forbid caching.
 *   2. Confirmed the real response schema against /docs and fixed
 *      normalizePaintColor / normalizeFitment to match it.
 * Until then this class exists only so the provider-registry wiring is in
 * place — it throws rather than silently returning empty/fake results.
 */

export class MyCarColorProvider implements PaintProvider {
  readonly slug = "mycarcolor";
  readonly license = "proprietary-api-beta-unverified";
  readonly attribution = "Paint colour data via MyCarColor (mycarcolor.com)";
  readonly redistributionAllowed = false; // see header — flip only after real ToS review

  private readonly apiKey: string | undefined;
  private readonly enabled: boolean;

  constructor(opts?: { apiKey?: string; enabled?: boolean }) {
    this.apiKey = opts?.apiKey ?? process.env.MYCARCOLOR_API_KEY;
    this.enabled = opts?.enabled ?? process.env.MYCARCOLOR_ENABLED === "true";
  }

  async searchColors(input: PaintSearchQuery): Promise<RawPaintRecord[]> {
    if (!this.enabled) {
      throw new ProviderUnavailableError(
        "MyCarColor is disabled by default (unverified beta ToS). Set MYCARCOLOR_ENABLED=true only after confirming licence terms — see file header."
      );
    }
    if (!this.apiKey) {
      throw new ProviderConfigError("MYCARCOLOR_API_KEY is not set — see .env.example");
    }

    const params = new URLSearchParams({ make: input.make });
    if (input.model) params.set("model", input.model);
    if (input.year) params.set("year", String(input.year));
    if (input.code) params.set("q", input.code);

    const res = await fetch(`https://mycarcolor.com/api/v1/colors/search?${params}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    if (!res.ok) {
      throw new Error(`MyCarColor request failed: ${res.status} ${res.statusText} (schema unverified — see file header)`);
    }
    const body = (await res.json()) as { results?: unknown[] };
    // Shape genuinely unverified beyond this point — see file header.
    return (body.results ?? []).map((r, i) => ({
      sourceRecordId: `mycarcolor-${i}`,
      ...(r as Record<string, unknown>),
    }));
  }

  normalizePaintColor(): never {
    throw new Error("MyCarColorProvider.normalizePaintColor is unimplemented until the real schema is confirmed — see file header");
  }

  normalizeFitment(): never {
    throw new Error("MyCarColorProvider.normalizeFitment is unimplemented until the real schema is confirmed — see file header");
  }
}
