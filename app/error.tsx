"use client";

import Link from "next/link";
import { RefreshCw } from "lucide-react";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-slate-50 px-5">
      <div role="alert" className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/40">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-700">TRUECOLOURS</p>
        <h1 className="mt-4 text-4xl font-black text-slate-950">Something went wrong</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">This page could not load. Try again, or return to the homepage to contact our paint desk.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-blue-700 px-5 font-bold text-white hover:bg-blue-800"><RefreshCw size={16} />Try again</button>
          <Link href="/" className="inline-flex min-h-12 items-center rounded-xl border border-slate-200 px-5 font-bold text-slate-700 hover:bg-slate-50">Go home</Link>
        </div>
      </div>
    </main>
  );
}
