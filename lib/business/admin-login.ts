export const DEFAULT_ADMIN_USERNAME = "admin123";
export const DEFAULT_ADMIN_EMAIL = "admin123@truecolours.internal";

/** A username is an alias for a Supabase identity; it never bypasses Auth. */
export function resolveAdminLoginEmail(
  username: string,
  configuredUsername = DEFAULT_ADMIN_USERNAME,
  configuredEmail = DEFAULT_ADMIN_EMAIL,
): string | null {
  const value = username.trim().toLowerCase();
  if (value === configuredUsername.trim().toLowerCase()) {
    return configuredEmail.trim().toLowerCase();
  }
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value) ? value : null;
}
