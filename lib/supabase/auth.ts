"use client";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "./client";
import { isSupabaseConfigured } from "./config";
export { isSupabaseConfigured } from "./config";
export type AccountUser = {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
};
export const accountUser = (user: User): AccountUser => ({
  uid: user.id,
  email: user.email || null,
  displayName:
    user.user_metadata?.display_name || user.user_metadata?.full_name || null,
  photoURL: user.user_metadata?.avatar_url || null,
  emailVerified: Boolean(user.email_confirmed_at),
});
export const getAuthConfigurationMessage = () =>
  "Account services are being configured. Please contact TRUECOLOURS for assistance.";
export const configureAuthPersistence = async () => undefined;
export const initializeAnalytics = async () => undefined;
export function watchAuthState(callback: (user: AccountUser | null) => void) {
  if (!isSupabaseConfigured()) {
    queueMicrotask(() => callback(null));
    return () => undefined;
  }
  const { data } = getSupabaseBrowser().auth.onAuthStateChange(
    (_event, session) => {
      queueMicrotask(() =>
        callback(session?.user ? accountUser(session.user) : null),
      );
    },
  );
  return () => data.subscription.unsubscribe();
}
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await getSupabaseBrowser().auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return { user: accountUser(data.user) };
}
export async function createAccountWithEmail(email: string, password: string) {
  const { data, error } = await getSupabaseBrowser().auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${location.origin}/auth/callback` },
  });
  if (error) throw error;
  if (!data.user || !data.session)
    throw new Error("Check your email to confirm your account, then sign in.");
  return { user: accountUser(data.user) };
}
export async function signInWithGoogle(next = "/account/dashboard") {
  const redirectTo = new URL("/auth/callback", location.origin);
  redirectTo.searchParams.set("next", next);
  const { error } = await getSupabaseBrowser().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: redirectTo.toString() },
  });
  if (error) throw error;
}
export async function signOutUser() {
  if (!isSupabaseConfigured()) return;
  const { error } = await getSupabaseBrowser().auth.signOut();
  if (error) throw error;
}
export async function resetPassword(email: string) {
  const { error } = await getSupabaseBrowser().auth.resetPasswordForEmail(
    email,
    {
      redirectTo: `${location.origin}/auth/callback?next=/account/reset-password`,
    },
  );
  if (error) throw error;
}
export async function updateDisplayName(
  _user: AccountUser,
  displayName: string,
) {
  const { error } = await getSupabaseBrowser().auth.updateUser({
    data: { display_name: displayName },
  });
  if (error) throw error;
}
export function getAuthErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Account request failed. Check your connection and try again.";
}
