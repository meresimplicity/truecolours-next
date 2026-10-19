"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

/**
 * useOnboardingGuard
 *
 * Client-side guard that enforces the onboarding redirect contract:
 * - If user is authenticated and profile.onboardingComplete === false → redirect to /account/onboarding
 * - If user is on the onboarding page and profile.onboardingComplete === true → redirect to /account/dashboard
 *
 * This hook is designed to be used in layouts to create an automatic redirect gate.
 *
 * @param context - "protected" for dashboard/account pages, "onboarding" for the onboarding flow
 */
export function useOnboardingGuard(context: "protected" | "onboarding") {
  const { user, profile, loading, profileLoading } = useAuth();
  const router = useRouter();
  const hasRedirected = useRef(false);

  useEffect(() => {
    // Wait until auth is resolved
    if (loading || profileLoading || !user) return;

    // Don't redirect more than once per mount
    if (hasRedirected.current) return;

    const onboardingComplete = profile?.onboardingComplete ?? false;

    if (context === "protected" && !onboardingComplete) {
      // User hasn't completed onboarding → send them there
      hasRedirected.current = true;
      router.replace("/account/onboarding");
      return;
    }

    if (context === "onboarding" && onboardingComplete) {
      // User already completed onboarding → send to dashboard
      hasRedirected.current = true;
      router.replace("/account/dashboard");
      return;
    }
  }, [user, profile, loading, profileLoading, context, router]);

  return {
    /** True while auth/profile is still loading */
    isLoading: loading || profileLoading,
    /** True if the user should see the current page (no redirect needed) */
    isReady: !loading && !profileLoading && !!user && (
      (context === "protected" && (profile?.onboardingComplete ?? false)) ||
      (context === "onboarding" && !(profile?.onboardingComplete ?? false))
    ),
    /** True if the user is not authenticated at all */
    isUnauthenticated: !loading && !user,
  };
}
