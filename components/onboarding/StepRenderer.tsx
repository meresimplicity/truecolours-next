"use client";

import type { ReactNode } from "react";
import type { OnboardingStepId } from "@/lib/types/onboarding";
import { useWizardContext } from "@/components/onboarding/WizardProvider";

/* ─── Types ──────────────────────────────────────────────────────────────── */

export type StepRendererMap = Partial<Record<OnboardingStepId, ReactNode>>;

type StepRendererProps = {
  /** Map of step IDs to their React components */
  steps: StepRendererMap;
  /** Fallback content when a step is not found */
  fallback?: ReactNode;
};

/**
 * StepRenderer
 *
 * Renders the component for the current step based on a step→component map.
 * This enables lazy composition — the parent provides which components
 * render for which steps, and StepRenderer handles the switching.
 *
 * Usage:
 * ```tsx
 * <StepRenderer
 *   steps={{
 *     "welcome": <WelcomeStep />,
 *     "personal-details": <PersonalDetailsStep />,
 *     "business-details": <BusinessDetailsStep />,
 *     // ...
 *   }}
 * />
 * ```
 */
export function StepRenderer({ steps, fallback }: StepRendererProps) {
  const { currentStep } = useWizardContext();
  return <>{steps[currentStep] ?? fallback ?? null}</>;
}
