import Link from "next/link";
import { ShieldX } from "lucide-react";

export default function AccessDenied() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f5f6f7] px-4 text-slate-950">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-xl shadow-slate-200/60 sm:p-9">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-red-50 text-red-700">
          <ShieldX size={24} />
        </span>
        <h1 className="mt-5 text-3xl font-black">Access denied</h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">
          You are not authorised to access the TRUECOLOURS administration area.
        </p>
        <Link
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-6 text-sm font-black text-white hover:bg-black"
          href="/"
        >
          Return to website
        </Link>
      </section>
    </main>
  );
}
