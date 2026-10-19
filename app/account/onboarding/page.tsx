"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { CompleteStep, CustomerTypeStep, AddressStep, BusinessDetailsStep, PersonalDetailsStep, PreferencesStep, WelcomeStep } from "@/components/onboarding/OnboardingSteps";
import { StepRenderer } from "@/components/onboarding/StepRenderer";
import { WizardProvider } from "@/components/onboarding/WizardProvider";
import { WizardShell } from "@/components/onboarding/WizardShell";
import { useOnboardingGuard } from "@/lib/hooks/useOnboardingGuard";
import { useWizard } from "@/lib/hooks/useWizard";
import { completeOnboardingFlow, getOnboardingStatus, saveOnboardingStep } from "@/lib/services/onboarding-service";
import { useOnboardingStore } from "@/lib/stores/onboarding-store";
import type { OnboardingData, OnboardingStepId } from "@/lib/types/onboarding";

function OnboardingSkeleton() {
  return <div className="w-full px-4 py-7 sm:px-6 sm:py-10"><div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]"><div className="hidden min-h-[36rem] animate-pulse rounded-3xl bg-[#101b55] lg:block" /><div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-900/5 sm:p-10"><div className="h-12 w-12 rounded-2xl bg-slate-100" /><div className="mt-6 h-10 max-w-md rounded bg-slate-100" /><div className="mt-4 h-5 max-w-xl rounded bg-slate-100" /><div className="mt-10 grid gap-5 sm:grid-cols-2">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-16 rounded-xl bg-slate-100" />)}</div><div className="mt-10 h-12 w-40 rounded-xl bg-slate-100" /></div></div></div>;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { isLoading: guardLoading, isReady, isUnauthenticated } = useOnboardingGuard("onboarding");
  const hydrate = useOnboardingStore((state) => state.hydrate);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");

  const loadStatus = useCallback(async () => {
    if (!user) return;
    setStatusLoading(true);
    setStatusError("");
    try {
      const status = await getOnboardingStatus();
      hydrate(status);
      if (status.completed) router.replace("/account/dashboard?onboarded=true");
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Your onboarding progress could not be loaded.");
    } finally {
      setStatusLoading(false);
    }
  }, [hydrate, router, user]);

  useEffect(() => { if (isReady && user) void loadStatus(); }, [isReady, loadStatus, user]);

  const wizard = useWizard({
    onSaveStep: async (stepId: OnboardingStepId, data: Partial<OnboardingData>) => { await saveOnboardingStep(stepId, data); },
    onComplete: async (data: OnboardingData) => { await completeOnboardingFlow(data); router.replace("/account/dashboard?onboarded=true"); },
  });

  if (isUnauthenticated) { router.replace("/account"); return null; }
  if (guardLoading || !isReady || statusLoading) return <OnboardingSkeleton />;
  if (statusError) return <div className="w-full px-4 py-10"><div className="mx-auto max-w-xl rounded-3xl border border-amber-200 bg-white p-7 text-center shadow-xl shadow-slate-900/5"><AlertCircle className="mx-auto text-amber-600" size={30} /><h1 className="mt-4 text-3xl font-black text-slate-950" style={{ fontFamily: "var(--font-barlow-condensed)" }}>We need to reconnect your account.</h1><p className="mt-3 text-sm font-medium leading-6 text-slate-600">{statusError}</p><button type="button" onClick={() => void loadStatus()} className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#101b55] px-5 text-sm font-black text-white"><RefreshCw size={17} />Try again</button></div></div>;

  return <WizardProvider value={wizard}><WizardShell currentStep={wizard.currentStep} completedSteps={wizard.completedSteps} isSaving={wizard.isSaving}><StepRenderer steps={{ welcome: <WelcomeStep />, "personal-details": <PersonalDetailsStep />, "business-details": <BusinessDetailsStep />, "customer-type": <CustomerTypeStep />, address: <AddressStep />, preferences: <PreferencesStep />, complete: <CompleteStep /> }} /></WizardShell></WizardProvider>;
}
