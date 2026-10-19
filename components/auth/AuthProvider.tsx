"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  createAccountWithEmail,
  configureAuthPersistence,
  getAuthConfigurationMessage,
  getAuthErrorMessage,
  initializeAnalytics,
  isSupabaseConfigured,
  resetPassword,
  signInWithEmail,
  signInWithGoogle,
  signOutUser,
  updateDisplayName,
  watchAuthState,
  type AccountUser,
} from "@/lib/supabase/auth";
import {
  ensureCustomerProfile,
  getCustomerProfile,
  updateCustomerProfile,
  watchCustomerProfile,
} from "@/lib/customer-data";
import { type CustomerProfile } from "@/lib/account-types";

type Credentials = { email: string; password: string };

type AuthContextValue = {
  configured: boolean;
  canAccessAdmin: boolean;
  configurationMessage: string;
  clearError: () => void;
  error: string;
  loading: boolean;
  profileLoading: boolean;
  profile: CustomerProfile | null;
  profileComplete: boolean;
  markProfileComplete: () => void;
  signInWithEmailPassword: (credentials: Credentials) => Promise<void>;
  signInWithGoogleAccount: () => Promise<void>;
  signOut: () => Promise<void>;
  signUp: (credentials: Credentials & { displayName: string }) => Promise<void>;
  resetAccountPassword: (email: string) => Promise<void>;
  user: AccountUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [error, setError] = useState("");
  const [canAccessAdmin, setCanAccessAdmin] = useState(false);
  const authGeneration = useRef(0);
  const [loading, setLoading] = useState(configured);
  const [profileLoading, setProfileLoading] = useState(configured);
  const [user, setUser] = useState<AccountUser | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [profileCompleteOverride, setProfileCompleteOverride] = useState(false);

  useEffect(() => {
    if (!configured) return;

    let alive = true;
    configureAuthPersistence()
      .then(() => initializeAnalytics())
      .catch(
        () =>
          alive &&
          setError("Account services could not prepare a secure session."),
      );

    const unsubscribe = watchAuthState(async (nextUser) => {
      if (!alive) return;
      const generation = ++authGeneration.current;
      const current = () => alive && generation === authGeneration.current;
      setCanAccessAdmin(false);
      setUser(nextUser);
      setLoading(false);

      if (!nextUser) {
        setProfile(null);
        setProfileLoading(false);
        setProfileCompleteOverride(false);

        return;
      }

      // Show the signed-in identity immediately, but never assume the account
      // has completed onboarding until its profile has been read.
      setProfile({
        ...getCustomerProfile(nextUser),
        onboardingComplete: false,
      });
      setProfileCompleteOverride(false);
      setProfileLoading(true);

      // The admin shell performs the localhost build sign-in. This check only
      // observes its session so it cannot race the one-time magic link.
      void fetch("/api/admin/access?checkOnly=1", { cache: "no-store" })
        .then((response) => {
          if (current()) setCanAccessAdmin(response.ok);
        })
        .catch(() => undefined);
      void ensureCustomerProfile(nextUser)
        .then((syncedProfile) => {
          if (current()) setProfile(syncedProfile);
        })
        .catch((reason) => {
          if (current()) setError(getAuthErrorMessage(reason));
        })
        .finally(() => {
          if (current()) setProfileLoading(false);
        });
    });

    return () => {
      alive = false;
      unsubscribe();
    };
  }, [configured]);

  useEffect(() => {
    if (!user || !configured) return;
    return watchCustomerProfile(
      user.uid,
      (nextProfile) => nextProfile && setProfile(nextProfile),
      () => undefined,
    );
  }, [configured, user]);

  async function finishAuthentication(nextUser: AccountUser) {
    setProfile({ ...getCustomerProfile(nextUser), onboardingComplete: false });
    setProfileCompleteOverride(false);
    setError("");
  }

  async function signInWithGoogleAccount() {
    try {
      await signInWithGoogle();
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
      throw nextError;
    }
  }

  async function signInWithEmailPassword({ email, password }: Credentials) {
    try {
      const credential = await signInWithEmail(email.trim(), password);
      await finishAuthentication(credential.user);
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
      throw nextError;
    }
  }

  async function signUp({
    email,
    password,
    displayName,
  }: Credentials & { displayName: string }) {
    try {
      const credential = await createAccountWithEmail(email.trim(), password);
      const name = displayName.trim();
      if (name) {
        await updateDisplayName(credential.user, name);
      }
      await finishAuthentication(credential.user);
      if (name) {
        await updateCustomerProfile(credential.user.uid, {
          displayName: name,
          phone: "",
          companyName: "",
          deliveryAddress: "",
        });
      }
      // Flag as new signup so onboarding is shown
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
      throw nextError;
    }
  }

  async function resetAccountPassword(email: string) {
    try {
      await resetPassword(email.trim());
      setError("");
    } catch (nextError) {
      setError(getAuthErrorMessage(nextError));
      throw nextError;
    }
  }

  async function signOut() {
    await signOutUser();

    setProfile(null);
    setProfileCompleteOverride(false);

    setError("");
  }

  function markProfileComplete() {
    setProfileCompleteOverride(true);
  }

  function clearError() {
    setError("");
  }

  // Profile is complete if:
  // 1. User manually marked it after onboarding, OR
  // 2. Profile has real data AND this isn't a fresh signup that hasn't onboarded yet
  const profileComplete =
    profileCompleteOverride || Boolean(profile?.onboardingComplete);

  const value: AuthContextValue = {
    configured,
    canAccessAdmin,
    configurationMessage: getAuthConfigurationMessage(),
    clearError,
    error,
    loading,
    profileLoading,
    profile,
    profileComplete,
    markProfileComplete,
    signInWithEmailPassword,
    signInWithGoogleAccount,
    signOut,
    signUp,
    resetAccountPassword,
    user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider.");
  return context;
}

export function useCanAccessAdmin() {
  return useAuth().canAccessAdmin;
}
