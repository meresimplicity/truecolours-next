"use client";

import { useCallback, useRef } from "react";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import type { OnboardingData, OnboardingStepId } from "@/lib/types/onboarding";
import { onboardingStepSchemas, type ValidatableStepId } from "@/lib/schemas/onboarding";

type UseWizardOptions = {
  /** Called when the wizard completes (all steps done) */
  onComplete: (data: OnboardingData) => Promise<void>;
  /** Called when a step is saved (for server persistence) */
  onSaveStep?: (stepId: OnboardingStepId, data: Partial<OnboardingData>) => Promise<void>;
};

/**
 * useWizard
 *
 * Reusable wizard engine hook for multi-step flows.
 * Manages step navigation, validation, auto-save, and completion.
 *
 * Designed to be generic enough for onboarding, registration, or any wizard flow.
 */
export function useWizard({ onComplete, onSaveStep }: UseWizardOptions) {
  const store = useOnboardingStore();
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Validate and advance to the next step */
  const handleNext = useCallback(
    async (stepId: OnboardingStepId, data: Partial<OnboardingData>) => {
      store.setError(null);
      // Validate if schema exists for this step
      if (stepId in onboardingStepSchemas) {
        const schema = onboardingStepSchemas[stepId as ValidatableStepId];
        const result = schema.safeParse(data);
        if (!result.success) {
          return {
            success: false as const,
            errors: result.error.issues.map((i) => ({
              field: i.path.join("."),
              message: i.message,
            })),
          };
        }
      }

      // Save step data
      store.saveStepData(stepId, data);
      store.completeStep(stepId);

      // Persist to server
      if (onSaveStep) {
        try {
          store.setSaving(true);
          await onSaveStep(stepId, data);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Your progress could not be saved. Please try again.";
          store.setError(message);
          console.error("[TRUECOLOURS] Wizard save failed:", error);
          return {
            success: false as const,
            errors: [{ field: "form", message }],
          };
        } finally {
          store.setSaving(false);
        }
      }

      // Advance
      store.nextStep();
      return { success: true as const, errors: [] };
    },
    [store, onSaveStep]
  );

  /** Go back to the previous step */
  const handlePrev = useCallback(() => {
    store.prevStep();
  }, [store]);

  /** Skip the current step (only for optional steps) */
  const handleSkip = useCallback(() => {
    store.nextStep();
  }, [store]);

  /** Go to a specific step */
  const handleGoTo = useCallback(
    (stepId: OnboardingStepId) => {
      store.goToStep(stepId);
    },
    [store]
  );

  /** Auto-save with debounce (for real-time draft saving) */
  const handleAutoSave = useCallback(
    (stepId: OnboardingStepId, data: Partial<OnboardingData>) => {
      // Save locally immediately
      store.saveStepData(stepId, data);

      // Debounce server save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        if (onSaveStep) {
          try {
            store.setSaving(true);
            await onSaveStep(stepId, data);
            store.setError(null);
          } catch (error) {
            store.setError(error instanceof Error ? error.message : "Your draft could not be saved.");
          } finally {
            store.setSaving(false);
          }
        }
      }, 2000);
    },
    [store, onSaveStep]
  );

  /** Complete the wizard */
  const handleComplete = useCallback(async () => {
    try {
      store.setSaving(true);
      store.setError(null);
      const allData = store.status.draftData as OnboardingData;
      await onComplete(allData);
      store.markComplete();
    } catch (error) {
      store.setError("Failed to complete onboarding. Please try again.");
      console.error("[TRUECOLOURS] Wizard complete failed:", error);
      throw error;
    } finally {
      store.setSaving(false);
    }
  }, [store, onComplete]);

  return {
    /** Current step ID */
    currentStep: store.status.currentStep,
    /** All accumulated draft data */
    draftData: store.status.draftData,
    /** Steps that have been completed */
    completedSteps: store.status.completedSteps,
    /** Whether the wizard is complete */
    isComplete: store.status.completed,
    /** Whether a save operation is in progress */
    isSaving: store.saving,
    /** Last error message */
    error: store.error,

    /** Navigation actions */
    handleNext,
    handlePrev,
    handleSkip,
    handleGoTo,
    handleAutoSave,
    handleComplete,
  };
}
