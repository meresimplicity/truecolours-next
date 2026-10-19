"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, CircleAlert, KeyRound, LoaderCircle, LockKeyhole } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";

function GoogleMark() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M21.6 12.23c0-.73-.07-1.43-.19-2.11H12v3.99h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.32 2.98-7.41Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.51c-.9.6-2.04.96-3.38.96-2.6 0-4.8-1.76-5.59-4.12H3.06v2.59A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.97A6.02 6.02 0 0 1 6.1 12c0-.68.11-1.34.31-1.97V7.44H3.06A10 10 0 0 0 2 12c0 1.61.39 3.14 1.06 4.56l3.35-2.59Z" />
      <path fill="#EA4335" d="M12 5.91c1.47 0 2.79.51 3.83 1.5l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.44l3.35 2.59C7.2 7.67 9.4 5.91 12 5.91Z" />
    </svg>
  );
}

export function AccountAccess({ compact = false, destination = "/catalogue?account=dashboard", onAuthenticated }: { compact?: boolean; destination?: string; onAuthenticated?: () => void }) {
  const router = useRouter();
  const { configured, configurationMessage, clearError, error, loading, signInWithGoogleAccount, user } = useAuth();
  const [busy, setBusy] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (!user || loading) return;
    if (onAuthenticated) {
      onAuthenticated();
      return;
    }
    router.replace(destination);
  }, [destination, loading, onAuthenticated, router, user]);

  async function continueWithGoogle() {
    clearError();
    setBusy(true);
    try {
      await signInWithGoogleAccount();
      // Close the catalogue panel immediately after the Google popup succeeds;
      // do not wait for the asynchronous Firebase auth-state listener to run.
      onAuthenticated?.();
    } catch {
      // The provider maps Firebase errors to the recovery message below.
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label="Sign in to TRUECOLOURS" className={`public-site tc-account-access ${compact ? "is-compact" : ""}`}>
      <div aria-hidden="true" className="tc-account-background" />
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="tc-account-inner"
      >
        {!compact && <Link href="/" className="tc-account-back"><ArrowLeft size={16} />Back to home</Link>}
        <div className="tc-account-heading">
          <div>
            <p className="tc-eyebrow">Your TRUECOLOURS account</p>
            <h1>Login to continue</h1>
            <p>Sign in to manage your quotes, orders and saved paint colours.</p>
          </div>
          <span aria-hidden="true" className="tc-account-lock"><LockKeyhole size={18} /></span>
        </div>
        {!configured ? (
          <div role="status" className="tc-account-alert tc-account-alert--configuration">
            <KeyRound size={20} />
            <div><strong>Google sign-in needs attention</strong><p>{configurationMessage}</p></div>
          </div>
        ) : (
          <div>
              {error && (
                <div role="alert" className="tc-account-alert">
                  <CircleAlert size={18} />
                  <div>
                    <strong>Google sign-in could not continue</strong>
                    <p>{error}</p>
                  </div>
                </div>
              )}
              <div className="tc-account-divider">secure Google login</div>
              <button
                type="button"
                onClick={continueWithGoogle}
                disabled={busy || loading}
                aria-busy={busy}
                className="tc-account-google"
              >
                {busy ? <LoaderCircle className="animate-spin" size={19} /> : <GoogleMark />}
                {busy ? "Connecting securely…" : "Continue with Google"}
              </button>

              <p className="tc-account-new">
                New to TRUECOLOURS? <span>Your account is created when you continue with Google.</span>
              </p>
              <p className="tc-account-footnote">Your quotes, orders and saved colours, together in your private account</p>
          </div>
        )}
      </motion.div>
    </section>
  );
}
