import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import Footer from "@/components/Footer";
import Navbar from "@/components/Navbar";
import WhatsAppButton from "@/components/WhatsAppButton";

export default function PolicyShell({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate?: string;
  children: ReactNode;
}) {
  return (
    <main className="public-site min-h-screen">
      <Navbar />

      <header className="border-b border-neutral-200 bg-neutral-950 px-4 pb-14 pt-32 text-white sm:pb-16 lg:pt-40">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-bold text-white/70 transition hover:text-white"
          >
            <ArrowLeft size={16} />
            Back to website
          </Link>

          <div className="mt-8 flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/20">
              <FileText size={23} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-400">
                TRUECOLOURS
              </p>
              <h1
                className="mt-2 text-4xl font-semibold leading-none sm:text-5xl"
                style={{ fontFamily: "var(--font-public-sans)" }}
              >
                {title}
              </h1>
              {effectiveDate && (
                <p className="mt-3 text-sm font-semibold text-white/70">
                  Effective Date: {effectiveDate}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8 lg:p-12">
          <div className="policy-content">{children}</div>
        </div>
      </article>

      <Footer />
      <WhatsAppButton />
    </main>
  );
}
