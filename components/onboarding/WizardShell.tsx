"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Check, LoaderCircle, ShieldCheck } from "lucide-react";
import { ONBOARDING_STEPS, ONBOARDING_STEP_CONFIG, type OnboardingStepId } from "@/lib/types/onboarding";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type WizardShellProps = {
  /** The current active step */
  currentStep: OnboardingStepId;
  /** Steps that have been completed */
  completedSteps: OnboardingStepId[];
  /** Whether a save/submit is in progress */
  isSaving: boolean;
  /** The step content (rendered by the parent via step mapping) */
  children: ReactNode;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

/**
 * Calculate the overall progress percentage based on completed steps.
 * Excludes the "welcome" and "complete" steps from the calculation.
 */
export function calculateProgress(completedSteps: OnboardingStepId[]): number {
  const formSteps = ONBOARDING_STEPS.filter(
    (s) => s !== "welcome" && s !== "complete"
  ) as string[];
  const completedFormSteps = completedSteps.filter((s) =>
    formSteps.includes(s)
  );
  return Math.round((completedFormSteps.length / formSteps.length) * 100);
}

/**
 * Get the numeric index of a step (0-based) for display.
 * Returns -1 for welcome/complete.
 */
export function getStepIndex(stepId: OnboardingStepId): number {
  const formSteps = ONBOARDING_STEPS.filter(
    (s) => s !== "welcome" && s !== "complete"
  ) as string[];
  return formSteps.indexOf(stepId);
}

/**
 * Get the total number of form steps (excluding welcome/complete).
 */
export function getTotalFormSteps(): number {
  return ONBOARDING_STEPS.filter(
    (s) => s !== "welcome" && s !== "complete"
  ).length;
}

/**
 * Get step configuration by ID.
 */
export function getStepConfig(stepId: OnboardingStepId) {
  return ONBOARDING_STEP_CONFIG.find((s) => s.id === stepId);
}

/**
 * Check whether a step is a form step (not welcome/complete).
 */
export function isFormStep(stepId: OnboardingStepId): boolean {
  return stepId !== "welcome" && stepId !== "complete";
}

/** Shared branded layout for the onboarding steps. */
export function WizardShell({
  currentStep,
  completedSteps,
  isSaving,
  children,
}: WizardShellProps) {
  const progress = calculateProgress(completedSteps);
  const stepIndex = getStepIndex(currentStep);
  const totalSteps = getTotalFormSteps();

  return (
    <div className="w-full bg-[radial-gradient(circle_at_top_right,_rgba(37,99,235,0.14),_transparent_30%),linear-gradient(135deg,_#f8fafc,_#eef2ff)] px-4 py-7 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[17rem_minmax(0,1fr)] lg:gap-10">
        <aside className="rounded-3xl bg-[#101b55] p-6 text-white shadow-2xl shadow-blue-950/20 lg:p-7">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-blue-100 transition hover:text-white"><span className="grid size-7 place-items-center rounded-lg bg-white/10">TC</span>TRUECOLOURS</Link>
          <div className="mt-10"><p className="text-xs font-black uppercase tracking-[0.2em] text-blue-200">Your account</p><h1 className="mt-3 text-4xl font-black leading-none" style={{ fontFamily: "var(--font-barlow-condensed)" }}>Get set up for the right finish.</h1><p className="mt-4 text-sm font-medium leading-6 text-blue-100/80">Save your delivery details and paint preferences in a few short steps.</p></div>
          <div className="mt-8 lg:hidden"><div className="flex items-center justify-between text-xs font-bold text-blue-100"><span>{stepIndex >= 0 ? `Step ${stepIndex + 1} of ${totalSteps}` : currentStep === "complete" ? "Setup complete" : "Let’s begin"}</span><span>{progress}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-red-500 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div></div>
          <ol className="mt-9 hidden space-y-1 lg:block">{ONBOARDING_STEP_CONFIG.filter((step) => step.id !== "welcome" && step.id !== "complete").map((step, index) => { const complete = completedSteps.includes(step.id); const active = currentStep === step.id; return <li key={step.id} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${active ? "bg-white/12" : ""}`}><span className={`grid size-7 place-items-center rounded-full text-xs font-black ${complete ? "bg-emerald-400 text-emerald-950" : active ? "bg-white text-blue-950" : "bg-white/10 text-blue-100"}`}>{complete ? <Check size={14} strokeWidth={3} /> : index + 1}</span><span className={`text-sm font-bold ${active ? "text-white" : "text-blue-100/70"}`}>{step.title}</span></li>; })}</ol>
          <div className="mt-8 flex items-center gap-2 border-t border-white/10 pt-5 text-xs font-semibold text-blue-100/75">{isSaving ? <LoaderCircle className="animate-spin" size={15} /> : <ShieldCheck size={15} />}{isSaving ? "Saving securely…" : "Your details are protected"}</div>
        </aside>
        <section className="min-w-0 rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-900/5">
          <div className="hidden border-b border-slate-100 px-7 py-5 lg:block">
            <div className="flex items-center justify-between gap-5">
              <div><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Account setup</p><p className="mt-1 text-sm font-bold text-slate-700">{stepIndex >= 0 ? `Step ${stepIndex + 1} of ${totalSteps}` : currentStep === "complete" ? "Complete" : "Welcome"}</p></div>
              <div className="w-44"><div className="mb-1 flex justify-between text-xs font-black text-slate-500"><span>Progress</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-red-600 to-red-500 transition-[width] duration-300" style={{ width: `${progress}%` }} /></div></div>
            </div>
          </div>
          <div className="p-5 sm:p-8 lg:p-10">{children}</div>
        </section>
      </div>
    </div>
  );
}
