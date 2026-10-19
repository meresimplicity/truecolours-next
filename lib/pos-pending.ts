export type PosAttempt = { key: string; payload: Record<string, unknown> };
// A gateway timeout or throttled request may already have reached the database.
// Retain its key and exact payload until the same request has a known outcome.
export function isDefinitiveCommandFailure(status: number): boolean {
  // An expired/revoked session cannot tell us whether an earlier request saved.
  return (
    status >= 400 && status < 500 && ![401, 403, 408, 425, 429].includes(status)
  );
}
export class CommandResponseError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CommandResponseError";
    this.status = status;
  }
}
export function readPosAttempt(key: string): PosAttempt | null {
  if (typeof window === "undefined") return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(key) || "null");
    return value &&
      typeof value.key === "string" &&
      value.key.length >= 8 &&
      value.key.length <= 200 &&
      value.payload &&
      typeof value.payload === "object" &&
      !Array.isArray(value.payload)
      ? value
      : null;
  } catch {
    return null;
  }
}
export function storePosAttempt(key: string, value: PosAttempt | null) {
  // A retry intent is never an offline payment. Supabase remains authoritative.
  if (value) sessionStorage.setItem(key, JSON.stringify(value));
  else sessionStorage.removeItem(key);
}
