import Link from "next/link";
import { ArrowRight, Palette } from "lucide-react";

export default function NotFound() {
  return (
    <main className="public-site flex min-h-[100svh] items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-lg text-center">
        <p className="text-xs font-bold uppercase tracking-widest text-neutral-600">TRUECOLOURS · 404</p>
        <h1 className="mt-4 text-5xl font-semibold text-slate-950">Let’s find the right page</h1>
        <p className="mt-4 text-sm leading-relaxed text-slate-600">This page may have moved. Explore our catalogue or find your vehicle’s paint code.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/catalogue" className="inline-flex min-h-12 items-center gap-2 rounded-full bg-neutral-950 px-5 font-bold text-white hover:bg-neutral-800">Browse catalogue <ArrowRight size={16} /></Link>
          <Link href="/find-my-colour" className="inline-flex min-h-12 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 font-bold text-slate-700 hover:bg-slate-100"><Palette size={16} />Find my colour</Link>
        </div>
        <Link href="/" className="mt-6 inline-flex min-h-11 items-center rounded-lg text-sm font-bold text-neutral-800 hover:underline">Return home</Link>
      </div>
    </main>
  );
}
