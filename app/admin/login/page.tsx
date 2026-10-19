"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { useSession } from "@/components/auth/StaffSessionProvider";

export default function AdminLoginPage() {
  const router = useRouter();
  const { developmentBypass, message, status } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      router.replace("/admin/dashboard");
    }
  }, [router, status]);

  async function enter(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget);
      const username = String(form.get("username") || "").trim();
      const password = String(form.get("password") || "");
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message || "Sign-in could not be completed.");
      router.replace("/admin/dashboard");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Sign-in could not be completed.",
      );
      setBusy(false);
    }
  }

  if (status === "loading" || status === "authenticated") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6f7] text-slate-950">
        <LoaderCircle
          aria-label="Opening admin dashboard"
          className="animate-spin"
          size={30}
        />
      </main>
    );
  }

  if (developmentBypass) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f5f6f7] px-4 text-slate-950">
        <section className="max-w-md rounded-2xl border border-amber-200 bg-white p-6 text-center shadow-xl">
          <h1 className="text-xl font-black">Local admin access unavailable</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600" role="alert">
            {message ||
              "Restart the local development server and check the configured admin account."}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#f5f6f7] px-4 py-10 text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(15,23,42,.06),transparent_28%),radial-gradient(circle_at_90%_85%,rgba(15,23,42,.03),transparent_24%)]" />

      <motion.section
        initial={false}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="relative mx-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-xl shadow-slate-200/70 sm:p-8"
      >
        <div className="mx-auto flex h-20 w-full max-w-xs items-center">
          <Image
            alt="TRUECOLOURS Automotive &amp; Industrial Paints"
            className="h-full w-full object-contain"
            height={240}
            priority
            src="/images/logo.png"
            width={800}
          />
        </div>
        <h1 className="mt-6 text-3xl font-black">TRUECOLOURS Admin</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600">
          Manage your business from one place.
        </p>

        <form className="mt-8 space-y-4 text-left" onSubmit={enter}>
          {error ? (
            <p
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700"
              role="alert"
            >
              {error}
            </p>
          ) : null}
          <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
            Username
            <span className="mt-2 flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 normal-case tracking-normal focus-within:border-slate-500 focus-within:bg-white">
              <UserRound aria-hidden size={18} />
              <input
                autoComplete="username"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                name="username"
                required
                type="text"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="admin123"
              />
            </span>
          </label>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-600">
            Password
            <span className="mt-2 flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 normal-case tracking-normal focus-within:border-slate-500 focus-within:bg-white">
              <LockKeyhole aria-hidden size={18} />
              <input
                autoComplete="current-password"
                className="min-w-0 flex-1 bg-transparent text-sm font-semibold outline-none"
                minLength={6}
                name="password"
                required
                type="password"
              />
            </span>
          </label>
          <button
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busy}
          >
            {busy ? (
              <LoaderCircle className="animate-spin" size={18} />
            ) : (
              <LockKeyhole size={18} />
            )}
            {busy ? "Verifying staff identity..." : "Sign in securely"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs font-semibold text-slate-500">
          Individual staff access · activity is recorded
        </p>
      </motion.section>
    </main>
  );
}
