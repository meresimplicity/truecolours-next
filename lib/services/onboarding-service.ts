"use client";

import type {
  OnboardingData,
  OnboardingStatus,
  OnboardingStepId,
} from "@/lib/types/onboarding";

type ApiError = {
  error?: string;
  message?: string;
  issues?: Array<{ field: string; message: string }>;
};

async function readJson(response: Response) {
  return response.json().catch(() => ({})) as Promise<
    ApiError & Record<string, unknown>
  >;
}

function apiFailure(response: Response, body: ApiError) {
  const error = new Error(
    body.error ||
      body.message ||
      "Your onboarding progress could not be saved.",
  ) as Error & { issues?: ApiError["issues"] };
  error.issues = body.issues;
  if (response.status === 401)
    error.message =
      "Your secure session has expired. Please sign in again, then continue.";
  return error;
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const response = await fetch("/api/onboarding/status", { cache: "no-store" });
  const body = await readJson(response);
  if (!response.ok) throw apiFailure(response, body);
  return body.status as OnboardingStatus;
}

export async function saveOnboardingStep(
  stepId: OnboardingStepId,
  data: Partial<OnboardingData>,
): Promise<OnboardingStatus> {
  const response = await fetch("/api/onboarding/save-step", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stepId, data }),
  });
  const body = await readJson(response);
  if (!response.ok) throw apiFailure(response, body);
  return body.status as OnboardingStatus;
}

export async function completeOnboardingFlow(
  data: OnboardingData,
): Promise<void> {
  const response = await fetch("/api/onboarding/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data }),
  });
  const body = await readJson(response);
  if (!response.ok) throw apiFailure(response, body);
}
