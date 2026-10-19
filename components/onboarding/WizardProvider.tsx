"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { OnboardingData, OnboardingStepId } from "@/lib/types/onboarding";

/* ─── Wizard context shape ───────────────────────────────────────────────── */

export type WizardContextValue = {
  /** Current step identifier */
  currentStep: OnboardingStepId;
  /** Steps that have been completed */
  completedSteps: OnboardingStepId[];
  /** All draft data accumulated across steps */
  draftData: Partial<OnboardingData>;
  /** Whether the wizard is fully complete */
  isComplete: boolean;
  /** Whether a save/submit is in progress */
  isSaving: boolean;
  /** Error message from the last operation */
  error: string | null;

  /** Validate the current step and advance */
  handleNext: (
    stepId: OnboardingStepId,
    data: Partial<OnboardingData>
  ) => Promise<{ success: boolean; errors: Array<{ field: string; message: string }> }>;
  /** Go back one step */
  handlePrev: () => void;
  /** Skip the current step (optional steps only) */
  handleSkip: () => void;
  /** Jump to a specific step */
  handleGoTo: (stepId: OnboardingStepId) => void;
  /** Auto-save draft data (debounced) */
  handleAutoSave: (stepId: OnboardingStepId, data: Partial<OnboardingData>) => void;
  /** Complete the entire wizard */
  handleComplete: () => Promise<void>;
};

const WizardContext = createContext<WizardContextValue | null>(null);

/* ─── Provider ───────────────────────────────────────────────────────────── */

type WizardProviderProps = {
  value: WizardContextValue;
  children: ReactNode;
};

/**
 * WizardProvider
 *
 * Wraps the onboarding flow (or any wizard) to provide navigation,
 * validation, and persistence through context. UI step components
 * consume this via `useWizardContext()`.
 */
export function WizardProvider({ value, children }: WizardProviderProps) {
  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

/* ─── Consumer hook ──────────────────────────────────────────────────────── */

export function useWizardContext() {
  const ctx = useContext(WizardContext);
  if (!ctx) {
    throw new Error("useWizardContext must be used inside <WizardProvider>.");
  }
  return ctx;
}
