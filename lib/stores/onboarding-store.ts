"use client";

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import type {
  OnboardingData,
  OnboardingStepId,
  OnboardingStatus,
} from "@/lib/types/onboarding";
import { EMPTY_ONBOARDING_STATUS, ONBOARDING_STEPS } from "@/lib/types/onboarding";

/* ─── Store shape ────────────────────────────────────────────────────────── */

type OnboardingState = {
  /** Current onboarding status (mirrored from Firestore) */
  status: OnboardingStatus;

  /** Whether the store has been hydrated from Firestore */
  hydrated: boolean;

  /** Whether a network operation is in progress */
  saving: boolean;

  /** Last error message from a save/load operation */
  error: string | null;

  /* ── Actions ─────────────────────────────────────────────────────── */

  /** Hydrate the store from Firestore status */
  hydrate: (status: OnboardingStatus) => void;

  /** Navigate to a specific step */
  goToStep: (stepId: OnboardingStepId) => void;

  /** Go to the next step in the sequence */
  nextStep: () => void;

  /** Go to the previous step in the sequence */
  prevStep: () => void;

  /** Save partial data for the current step (optimistic local update) */
  saveStepData: (stepId: OnboardingStepId, data: Partial<OnboardingData>) => void;

  /** Mark a step as completed */
  completeStep: (stepId: OnboardingStepId) => void;

  /** Mark the entire onboarding as complete */
  markComplete: () => void;

  /** Set saving state */
  setSaving: (saving: boolean) => void;

  /** Set error */
  setError: (error: string | null) => void;

  /** Reset the store (on sign out) */
  reset: () => void;
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function getNextStep(current: OnboardingStepId): OnboardingStepId {
  const idx = ONBOARDING_STEPS.indexOf(current);
  return idx < ONBOARDING_STEPS.length - 1
    ? ONBOARDING_STEPS[idx + 1]
    : current;
}

function getPrevStep(current: OnboardingStepId): OnboardingStepId {
  const idx = ONBOARDING_STEPS.indexOf(current);
  return idx > 0 ? ONBOARDING_STEPS[idx - 1] : current;
}

/* ─── Store ──────────────────────────────────────────────────────────────── */

export const useOnboardingStore = create<OnboardingState>()(
  devtools(
    persist(
      (set, get) => ({
        status: { ...EMPTY_ONBOARDING_STATUS },
        hydrated: false,
        saving: false,
        error: null,

        hydrate: (status) =>
          set({ status, hydrated: true, error: null }, false, "hydrate"),

        goToStep: (stepId) =>
          set(
            (state) => ({
              status: { ...state.status, currentStep: stepId },
            }),
            false,
            "goToStep"
          ),

        nextStep: () =>
          set(
            (state) => ({
              status: {
                ...state.status,
                currentStep: getNextStep(state.status.currentStep),
              },
            }),
            false,
            "nextStep"
          ),

        prevStep: () =>
          set(
            (state) => ({
              status: {
                ...state.status,
                currentStep: getPrevStep(state.status.currentStep),
              },
            }),
            false,
            "prevStep"
          ),

        saveStepData: (stepId, data) =>
          set(
            (state) => ({
              status: {
                ...state.status,
                draftData: { ...state.status.draftData, ...data },
              },
            }),
            false,
            "saveStepData"
          ),

        completeStep: (stepId) =>
          set(
            (state) => ({
              status: {
                ...state.status,
                completedSteps: state.status.completedSteps.includes(stepId)
                  ? state.status.completedSteps
                  : [...state.status.completedSteps, stepId],
              },
            }),
            false,
            "completeStep"
          ),

        markComplete: () =>
          set(
            (state) => ({
              status: {
                ...state.status,
                completed: true,
                currentStep: "complete",
                completedAt: new Date().toISOString(),
              },
            }),
            false,
            "markComplete"
          ),

        setSaving: (saving) => set({ saving }, false, "setSaving"),

        setError: (error) => set({ error }, false, "setError"),

        reset: () =>
          set(
            {
              status: { ...EMPTY_ONBOARDING_STATUS },
              hydrated: false,
              saving: false,
              error: null,
            },
            false,
            "reset"
          ),
      }),
      {
        name: "truecolours-onboarding",
        // Only persist the draft data and current step for resume
        partialize: (state) => ({
          status: {
            currentStep: state.status.currentStep,
            draftData: state.status.draftData,
            completedSteps: state.status.completedSteps,
          },
        }),
      }
    ),
    { name: "OnboardingStore" }
  )
);
