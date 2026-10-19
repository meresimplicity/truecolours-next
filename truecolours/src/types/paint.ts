/**
 * Layer B — paint catalogue types, plus the paint_fitments join layer.
 *
 * IMPORTANT: PaintColor describes a colour that exists somewhere in a
 * source. PaintFitment is the *only* thing that says a colour was offered
 * on a given vehicle. Never infer a fitment from two records merely
 * sharing a manufacturer — see src/lib/conflict.ts and README "No fake
 * data".
 */

export type VerificationStatus =
  | "source_verified"
  | "team_verified"
  | "unverified"
  | "conflicting"
  | "deprecated";

export interface DataSourceRef {
  id: string;
  slug: string;
}

export interface PaintColor {
  id: string;
  manufacturerId: string;
  code: string;
  codeNormalized: string;
  auxCode?: string | null;
  standardNumber?: string | null;
  name: string;
  alternativeNames: string[];
  baseColor?: string | null;
  finish?: string | null;
  /** UI presentation only. Never treat as the authoritative identifier — see README "hex is not the authority". */
  hex?: string | null;
  source: DataSourceRef;
  sourceUrl?: string | null;
  sourceRecordId?: string | null;
  verificationStatus: VerificationStatus;
}

export interface PaintFitment {
  id: string;
  paintColorId: string;
  manufacturerId: string;
  modelId?: string | null;
  variantId?: string | null;
  yearFrom?: number | null;
  yearTo?: number | null;
  market?: string | null;
  source: DataSourceRef;
  sourceUrl?: string | null;
  sourceRecordId?: string | null;
  /** 0..1, computed by TRUECOLOURS — see src/lib/conflict.ts. Not copied from a provider. */
  confidence: number;
  verificationStatus: VerificationStatus;
}

/** A paint colour already joined to the fitment that made it match a search — what the API returns. */
export interface PaintResult extends PaintColor {
  fitment: Pick<PaintFitment, "yearFrom" | "yearTo" | "market" | "confidence" | "verificationStatus">;
}

export interface DataConflict {
  id: string;
  paintColorId?: string | null;
  paintFitmentId?: string | null;
  fieldName: string;
  sourceA: { source: DataSourceRef; value: string };
  sourceB: { source: DataSourceRef; value: string };
  status: "open" | "resolved" | "dismissed";
  resolutionNote?: string | null;
}

export interface PaintSearchInput {
  make: string;
  model?: string;
  variant?: string;
  year?: number;
  /** Direct code/alias/name search, independent of the make/model/year selectors. */
  code?: string;
  market?: string;
  verifiedOnly?: boolean;
  baseColor?: string;
  finish?: string;
  sort?: "name_asc" | "code_asc";
  page?: number;
  pageSize?: number;
}

export interface PaintSearchResult {
  vehicle: { make: string; model?: string; variant?: string; year?: number };
  results: PaintResult[];
  page: number;
  pageSize: number;
  total: number;
}
