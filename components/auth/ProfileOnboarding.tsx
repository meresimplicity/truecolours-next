"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Car,
  Check,
  CheckCircle2,
  ChevronRight,
  CloudUpload,
  Heart,
  LoaderCircle,
  MapPin,
  Palette,
  PartyPopper,
  ShoppingBag,
  Sparkles,
  User,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { updateDisplayName } from "@/lib/supabase/auth";
import { communicationChannels, customerTypes, productInterests, provinces } from "@/lib/account-types";
import type { Vehicle, SavedColour } from "@/lib/account-types";
import confetti from "canvas-confetti";

/* ─── Types ───────────────────────────────────────────────────────────── */

type StepId = "personal" | "address" | "garage" | "colours" | "preferences" | "review" | "complete";

interface StepConfig {
  id: StepId;
  label: string;
  icon: typeof User;
  description: string;
}

const STEPS: StepConfig[] = [
  { id: "personal", label: "Personal Info", icon: UserRound, description: "Tell us about yourself" },
  { id: "address", label: "Address", icon: MapPin, description: "Where should we deliver?" },
  { id: "garage", label: "Garage", icon: Car, description: "Your vehicles" },
  { id: "colours", label: "Colours", icon: Palette, description: "Save your paint codes" },
  { id: "preferences", label: "Preferences", icon: ShoppingBag, description: "Shopping preferences" },
  { id: "review", label: "Review", icon: CheckCircle2, description: "Check your details" },
  { id: "complete", label: "Complete", icon: PartyPopper, description: "You're all set!" },
];

interface OnboardingData {
  displayName: string;
  firstName: string;
  surname: string;
  phone: string;
  alternativePhone: string;
  companyName: string;
  customerType: string;
  birthday: string;
  province: string;
  city: string;
  physicalAddress: string;
  deliveryAddress: string;
  favouritePaintSystem: string;
  preferredDelivery: string;
  preferredBranch: string;
  communicationPreferences: string[];
  productInterests: string[];
}

type VehicleInput = Omit<Vehicle, "id" | "createdAt" | "updatedAt">;
type ColourInput = Omit<SavedColour, "id" | "createdAt" | "updatedAt">;

const STORAGE_KEY = "tc-onboarding-step";

const emptyVehicle: VehicleInput = {
  manufacturer: "", model: "", year: "", bodyType: "", vin: "", registration: "",
  currentColour: "", factoryColourCode: "", fuelCapPhotoUrl: "", vehiclePhotoUrl: "",
  damagePhotoUrls: [], preferredPaintBrand: "", previousRepairs: "", notes: "",
};

const emptyColour: ColourInput = {
  code: "", vehicle: "", colourName: "", paintSystem: "", manufacturer: "", mixFormula: "", notes: "",
};

/* ─── Skeleton ────────────────────────────────────────────────────────── */

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-72" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
        <Skeleton className="h-12" />
      </div>
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────── */

export function ProfileOnboarding({ onComplete }: { onComplete: () => void }) {
  const { profile, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [submitState, setSubmitState] = useState<'idle'|'saving'|'success'>('idle');
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Vehicles and colours added during onboarding
  const [vehicles, setVehicles] = useState<VehicleInput[]>([]);
  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [currentVehicle, setCurrentVehicle] = useState<VehicleInput>({ ...emptyVehicle });

  const [colours, setColours] = useState<ColourInput[]>([]);
  const [showColourForm, setShowColourForm] = useState(false);
  const [currentColour, setCurrentColour] = useState<ColourInput>({ ...emptyColour });

  const [formData, setFormData] = useState<OnboardingData>({
    displayName: "",
    firstName: "",
    surname: "",
    phone: "",
    alternativePhone: "",
    companyName: "",
    customerType: "",
    birthday: "",
    province: "",
    city: "",
    physicalAddress: "",
    deliveryAddress: "",
    favouritePaintSystem: "",
    preferredDelivery: "",
    preferredBranch: "",
    communicationPreferences: [],
    productInterests: [],
  });

  // Load saved step from localStorage + profile data from Firestore
  useEffect(() => {
    let alive = true;
    async function loadStatus() {
      try {
        const res = await fetch("/api/onboarding/status");
        if (!res.ok) throw new Error("Failed to load status");
        const json = await res.json();
        if (json.status && json.status.draftData && alive) {
          const draft = json.status.draftData;
          setFormData((prev) => ({ ...prev, ...draft }));
          if (draft.vehicles) setVehicles(draft.vehicles);
          if (draft.colours) setColours(draft.colours);
          
          if (json.status.currentStep) {
            const idx = STEPS.findIndex(s => s.id === json.status.currentStep);
            if (idx >= 0 && idx < STEPS.length - 1) setCurrentStep(idx);
          }
        }
      } catch (e) {
        console.error("Failed to load onboarding status", e);
      } finally {
        if (alive) setInitialLoading(false);
      }
    }
    
    if (user) {
      loadStatus();
    } else {
      setTimeout(() => setInitialLoading(false), 600);
    }
    return () => { alive = false; };
  }, [user]);

  // Save current step ID to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, STEPS[currentStep].id);
  }, [currentStep]);

  // Auto-save with debounce
  const autoSave = useCallback(
    async (dataToSave: Partial<OnboardingData> | { vehicles: VehicleInput[] } | { colours: ColourInput[] }) => {
      if (!user) return;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      setSaved(false);

      saveTimerRef.current = setTimeout(async () => {
        try {
          setSaving(true);
          setError("");

          const stepId = STEPS[currentStep].id;
          const res = await fetch("/api/onboarding/save-step", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ stepId, data: dataToSave }),
          });

          if (!res.ok) throw new Error("Save failed");

          setSaving(false);
          setSaved(true);
          savedTimerRef.current = setTimeout(() => setSaved(false), 2500);
        } catch (err) {
          setSaving(false);
          console.error("[TRUECOLOURS] Auto-save failed:", err);
        }
      }, 800);
    },
    [user, currentStep]
  );

  function updateField(field: keyof OnboardingData, value: string) {
    const updated = { ...formData, [field]: value };

    // Auto-split displayName into first/surname
    if (field === "displayName") {
      const parts = value.trim().split(" ");
      updated.firstName = parts[0] || "";
      updated.surname = parts.slice(1).join(" ") || "";
    }

    setFormData(updated);
    autoSave({ [field]: value, ...(field === "displayName" ? { firstName: updated.firstName, surname: updated.surname } : {}) });
  }

  function toggleArrayField(field: "communicationPreferences" | "productInterests", value: string) {
    const current = formData[field];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    const newData = { ...formData, [field]: updated };
    setFormData(newData);
    autoSave({ [field]: updated });
  }

  // Navigation
  function goTo(step: number) {
    if (step < 0 || step >= STEPS.length) return;
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  }

  function next() {
    if (currentStep === 0 && !formData.displayName.trim()) {
      setError("Please enter your full name to continue.");
      return;
    }
    setError("");
    goTo(currentStep + 1);
  }

  function prev() {
    setError("");
    goTo(currentStep - 1);
  }

  // Add vehicle
  async function addVehicle() {
    if (!currentVehicle.manufacturer || !currentVehicle.model) return;
    try {
      const newVehicles = [...vehicles, currentVehicle];
      setVehicles(newVehicles);
      setCurrentVehicle({ ...emptyVehicle });
      setShowVehicleForm(false);
      autoSave({ vehicles: newVehicles });
    } catch (err) {
      console.error("[TRUECOLOURS] Save vehicle failed:", err);
      setError("Could not save vehicle. Please try again.");
    }
  }

  // Add colour
  async function addColour() {
    if (!currentColour.code || !currentColour.colourName) return;
    try {
      const newColours = [...colours, currentColour];
      setColours(newColours);
      setCurrentColour({ ...emptyColour });
      setShowColourForm(false);
      autoSave({ colours: newColours });
    } catch (err) {
      console.error("[TRUECOLOURS] Save colour failed:", err);
      setError("Could not save colour. Please try again.");
    }
  }

  async function handleComplete() {
    if (!user) return;
    setSubmitState('saving');
    setError("");
    try {
      await updateDisplayName(user, formData.displayName);
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { ...formData, vehicles, colours } })
      });
      if (!res.ok) {
        const data = await res.json();
        const code = data.error || "";
        if (code === "SESSION_EXPIRED" || res.status === 401) {
          throw new Error("SESSION_EXPIRED");
        } else if (code === "Validation failed" || res.status === 422) {
          throw new Error("VALIDATION_FAILED");
        } else {
          throw new Error(code || "Failed to complete onboarding");
        }
      }
      localStorage.removeItem(STORAGE_KEY);
      setSubmitState('success');
      goTo(STEPS.length - 1);

      // Fire confetti celebration
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#dc2626", "#ef4444", "#fbbf24", "#10b981", "#3b82f6"],
      });
      setTimeout(() =>
        confetti({ particleCount: 60, spread: 100, origin: { x: 0, y: 0.7 }, angle: 60 }),
        300
      );
      setTimeout(() =>
        confetti({ particleCount: 60, spread: 100, origin: { x: 1, y: 0.7 }, angle: 120 }),
        500
      );

      let timeLeft = 3;
      setCountdown(timeLeft);
      const timer = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(timer);
          window.location.href = "/account/dashboard?onboarded=true";
        }
      }, 1000);
    } catch (err) {
      setSubmitState('idle');
      console.error("[TRUECOLOURS] Complete onboarding failed:", err);
      const msg = err instanceof Error ? err.message : "";
      if (msg === "SESSION_EXPIRED") {
        setError("Your session has expired. Please sign out and sign back in, then try again.");
      } else if (msg === "VALIDATION_FAILED") {
        setError("Validation failed. Please check your details and try again.");
      } else if (msg.includes("permission") || msg.includes("PERMISSION_DENIED")) {
        setError("Permission denied. Please sign out and sign back in.");
      } else if (msg.includes("network") || msg.includes("unavailable")) {
        setError("Network error. Please check your connection and try again.");
      } else if (msg.includes("already completed")) {
        window.location.href = "/account/dashboard?onboarded=true";
      } else {
        setError("Your profile could not be saved. Please try again.");
      }
    }
  }

  const stepConfig = STEPS[currentStep];
  const isLastContentStep = currentStep === STEPS.length - 2; // Review step
  const isComplete = currentStep === STEPS.length - 1;
  const firstName = formData.firstName || formData.displayName?.split(" ")[0] || "";

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  };

  if (initialLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <div className="hidden space-y-3 lg:block">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-900/5">
            <FormSkeleton />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 lg:py-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 text-center lg:text-left"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-red-600">
          <Sparkles size={13} />
          Complete your profile
        </span>
        <h1
          className="mt-4 text-3xl font-black text-gray-950 sm:text-4xl"
          style={{ fontFamily: "var(--font-barlow-condensed)" }}
        >
          {firstName ? `Welcome, ${firstName}!` : "Welcome to TRUECOLOURS!"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Set up your profile so we can personalise your experience. You can update these details anytime.
        </p>
      </motion.div>

      {/* Mobile Progress Bar */}
      <div className="mb-6 lg:hidden">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500">
          <span>Step {currentStep + 1} of {STEPS.length}</span>
          <span>{stepConfig.label}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-600"
            initial={false}
            animate={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
          />
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        {/* Sidebar (desktop) */}
        <nav className="hidden lg:block">
          <div className="sticky top-28 space-y-1">
            {STEPS.map((step, i) => {
              const isActive = i === currentStep;
              const isDone = i < currentStep;
              const Icon = step.icon;
              return (
                <button
                  key={step.id}
                  onClick={() => isDone && goTo(i)}
                  disabled={!isDone && !isActive}
                  className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition-all duration-200 ${
                    isActive
                      ? "bg-red-600 text-white shadow-lg shadow-red-600/20"
                      : isDone
                        ? "bg-white text-slate-700 shadow-sm hover:bg-red-50 hover:text-red-700"
                        : "text-slate-400"
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 flex-shrink-0 place-items-center rounded-lg text-xs font-black ${
                      isActive
                        ? "bg-white/20"
                        : isDone
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100"
                    }`}
                  >
                    {isDone ? <Check size={14} /> : <Icon size={14} />}
                  </span>
                  <span className="truncate">{step.label}</span>
                  {isActive && <ChevronRight size={14} className="ml-auto" />}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Main Content */}
        <div className="min-w-0">
          {/* Save indicator */}
          <AnimatePresence>
            {(saving || saved) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-4 flex items-center gap-2 text-xs font-bold"
              >
                {saving ? (
                  <><LoaderCircle size={13} className="animate-spin text-slate-400" /><span className="text-slate-400">Saving…</span></>
                ) : (
                  <><CloudUpload size={13} className="text-emerald-500" /><span className="text-emerald-600">Saved</span></>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg shadow-slate-900/5">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={stepConfig.id}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="p-6 sm:p-8"
              >
                {/* Step header */}
                {!isComplete && (
                  <div className="mb-6 flex items-center gap-4 border-b border-slate-100 pb-6">
                    <span className="grid h-12 w-12 place-items-center rounded-xl bg-red-50 text-red-600">
                      {(() => { const Icon = stepConfig.icon; return <Icon size={22} />; })()}
                    </span>
                    <div>
                      <h2 className="text-lg font-black text-gray-950">{stepConfig.label}</h2>
                      <p className="text-sm text-slate-500">{stepConfig.description}</p>
                    </div>
                  </div>
                )}

                {/* Step content */}
                {stepConfig.id === "personal" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-bold text-slate-700">
                      Full name <span className="text-red-500">*</span>
                      <input value={formData.displayName} onChange={(e) => updateField("displayName", e.target.value)} className="account-input mt-2" placeholder="e.g. Thabo Molefe" />
                    </label>
                    <label className="text-sm font-bold text-slate-700">
                      Mobile number
                      <input value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} type="tel" className="account-input mt-2" placeholder="e.g. 071 234 5678" />
                    </label>
                    <label className="text-sm font-bold text-slate-700">
                      Alternative phone
                      <input value={formData.alternativePhone} onChange={(e) => updateField("alternativePhone", e.target.value)} type="tel" className="account-input mt-2" placeholder="Optional" />
                    </label>
                    <label className="text-sm font-bold text-slate-700">
                      Company / Business
                      <input value={formData.companyName} onChange={(e) => updateField("companyName", e.target.value)} className="account-input mt-2" placeholder="Panel shop or business" />
                    </label>
                    <label className="text-sm font-bold text-slate-700">
                      Customer type
                      <select value={formData.customerType} onChange={(e) => updateField("customerType", e.target.value)} className="account-input mt-2">
                        <option value="">Select type…</option>
                        {customerTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-bold text-slate-700">
                      Birthday
                      <input value={formData.birthday} onChange={(e) => updateField("birthday", e.target.value)} type="date" className="account-input mt-2" />
                    </label>
                    <label className="text-sm font-bold text-slate-700 sm:col-span-2">
                      Email address
                      <input disabled value={profile?.email || user?.email || ""} className="account-input mt-2 cursor-not-allowed bg-slate-50" />
                    </label>
                  </div>
                )}

                {stepConfig.id === "address" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-bold text-slate-700">
                      Province
                      <select value={formData.province} onChange={(e) => updateField("province", e.target.value)} className="account-input mt-2">
                        <option value="">Select province…</option>
                        {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </label>
                    <label className="text-sm font-bold text-slate-700">
                      City / Town
                      <input value={formData.city} onChange={(e) => updateField("city", e.target.value)} className="account-input mt-2" placeholder="e.g. Mankweng" />
                    </label>
                    <label className="text-sm font-bold text-slate-700 sm:col-span-2">
                      Physical address
                      <textarea value={formData.physicalAddress} onChange={(e) => updateField("physicalAddress", e.target.value)} rows={3} className="account-input mt-2 resize-y" placeholder="Street, suburb, city, province, postal code" />
                    </label>
                    <label className="text-sm font-bold text-slate-700 sm:col-span-2">
                      Delivery address
                      <textarea value={formData.deliveryAddress} onChange={(e) => updateField("deliveryAddress", e.target.value)} rows={3} className="account-input mt-2 resize-y" placeholder="If different from physical address" />
                    </label>
                  </div>
                )}

                {stepConfig.id === "garage" && (
                  <div>
                    {vehicles.length > 0 && (
                      <div className="mb-6 space-y-3">
                        {vehicles.map((v, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <Car size={20} className="flex-shrink-0 text-slate-400" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-bold text-slate-800">{v.year} {v.manufacturer} {v.model}</p>
                              <p className="text-xs text-slate-500">{v.currentColour} · {v.registration || "No reg"}</p>
                            </div>
                            <button onClick={() => {
                              const newVehicles = vehicles.filter((_, idx) => idx !== i);
                              setVehicles(newVehicles);
                              autoSave({ vehicles: newVehicles });
                            }} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
                          </div>
                        ))}
                      </div>
                    )}

                    {showVehicleForm ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input value={currentVehicle.manufacturer} onChange={(e) => setCurrentVehicle({ ...currentVehicle, manufacturer: e.target.value })} className="account-input" placeholder="Manufacturer (e.g. Toyota)" />
                          <input value={currentVehicle.model} onChange={(e) => setCurrentVehicle({ ...currentVehicle, model: e.target.value })} className="account-input" placeholder="Model (e.g. Hilux)" />
                          <input value={currentVehicle.year} onChange={(e) => setCurrentVehicle({ ...currentVehicle, year: e.target.value })} className="account-input" placeholder="Year (e.g. 2022)" />
                          <input value={currentVehicle.currentColour} onChange={(e) => setCurrentVehicle({ ...currentVehicle, currentColour: e.target.value })} className="account-input" placeholder="Current colour" />
                          <input value={currentVehicle.factoryColourCode} onChange={(e) => setCurrentVehicle({ ...currentVehicle, factoryColourCode: e.target.value })} className="account-input" placeholder="Factory colour code" />
                          <input value={currentVehicle.registration} onChange={(e) => setCurrentVehicle({ ...currentVehicle, registration: e.target.value })} className="account-input" placeholder="Registration" />
                          <input value={currentVehicle.bodyType} onChange={(e) => setCurrentVehicle({ ...currentVehicle, bodyType: e.target.value })} className="account-input sm:col-span-2" placeholder="Body type (e.g. SUV, Sedan)" />
                        </div>
                        <div className="mt-4 flex gap-3">
                          <button onClick={addVehicle} className="account-primary !w-auto px-6">Save vehicle</button>
                          <button onClick={() => { setShowVehicleForm(false); setCurrentVehicle({ ...emptyVehicle }); }} className="account-secondary">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowVehicleForm(true)} className="account-secondary w-full gap-2">
                        <Car size={16} /> Add a vehicle
                      </button>
                    )}

                    {vehicles.length === 0 && !showVehicleForm && (
                      <p className="mt-4 text-center text-sm text-slate-400">No vehicles added yet. You can skip this step and add vehicles later.</p>
                    )}
                  </div>
                )}

                {stepConfig.id === "colours" && (
                  <div>
                    {colours.length > 0 && (
                      <div className="mb-6 space-y-3">
                        {colours.map((c, i) => (
                          <div key={i} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                            <Palette size={20} className="flex-shrink-0 text-slate-400" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-bold text-slate-800">{c.colourName} — {c.code}</p>
                              <p className="text-xs text-slate-500">{c.paintSystem} · {c.manufacturer || "No brand"}</p>
                            </div>
                            <button onClick={() => {
                              const newColours = colours.filter((_, idx) => idx !== i);
                              setColours(newColours);
                              autoSave({ colours: newColours });
                            }} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
                          </div>
                        ))}
                      </div>
                    )}

                    {showColourForm ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <input value={currentColour.code} onChange={(e) => setCurrentColour({ ...currentColour, code: e.target.value })} className="account-input" placeholder="Colour code (e.g. 1F7)" />
                          <input value={currentColour.colourName} onChange={(e) => setCurrentColour({ ...currentColour, colourName: e.target.value })} className="account-input" placeholder="Colour name (e.g. Silver Metallic)" />
                          <input value={currentColour.vehicle} onChange={(e) => setCurrentColour({ ...currentColour, vehicle: e.target.value })} className="account-input" placeholder="Vehicle (e.g. 2022 Toyota Hilux)" />
                          <input value={currentColour.paintSystem} onChange={(e) => setCurrentColour({ ...currentColour, paintSystem: e.target.value })} className="account-input" placeholder="Paint system (e.g. Glasurit)" />
                          <input value={currentColour.manufacturer} onChange={(e) => setCurrentColour({ ...currentColour, manufacturer: e.target.value })} className="account-input" placeholder="Manufacturer" />
                          <input value={currentColour.notes} onChange={(e) => setCurrentColour({ ...currentColour, notes: e.target.value })} className="account-input" placeholder="Notes" />
                        </div>
                        <div className="mt-4 flex gap-3">
                          <button onClick={addColour} className="account-primary !w-auto px-6">Save colour</button>
                          <button onClick={() => { setShowColourForm(false); setCurrentColour({ ...emptyColour }); }} className="account-secondary">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowColourForm(true)} className="account-secondary w-full gap-2">
                        <Palette size={16} /> Add a colour
                      </button>
                    )}

                    {colours.length === 0 && !showColourForm && (
                      <p className="mt-4 text-center text-sm text-slate-400">No colours saved yet. You can skip this and add colours later.</p>
                    )}
                  </div>
                )}

                {stepConfig.id === "preferences" && (
                  <div className="space-y-6">
                    <div>
                      <p className="mb-3 text-sm font-bold text-slate-700">Product interests</p>
                      <div className="flex flex-wrap gap-2">
                        {productInterests.map((interest) => {
                          const selected = formData.productInterests.includes(interest);
                          return (
                            <button
                              key={interest}
                              onClick={() => toggleArrayField("productInterests", interest)}
                              className={`rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                                selected
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50"
                              }`}
                            >
                              {selected && <Check size={12} className="mr-1 inline" />}
                              {interest}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-bold text-slate-700">
                        Favourite paint system
                        <input value={formData.favouritePaintSystem} onChange={(e) => updateField("favouritePaintSystem", e.target.value)} className="account-input mt-2" placeholder="e.g. Glasurit, Standox" />
                      </label>
                      <label className="text-sm font-bold text-slate-700">
                        Preferred delivery
                        <select value={formData.preferredDelivery} onChange={(e) => updateField("preferredDelivery", e.target.value)} className="account-input mt-2">
                          <option value="">Select…</option>
                          <option value="Collection">Collection</option>
                          <option value="Delivery">Delivery</option>
                          <option value="Courier">Courier</option>
                        </select>
                      </label>
                    </div>

                    <div>
                      <p className="mb-3 text-sm font-bold text-slate-700">Communication preferences</p>
                      <div className="flex flex-wrap gap-2">
                        {communicationChannels.map((channel) => {
                          const selected = formData.communicationPreferences.includes(channel);
                          return (
                            <button
                              key={channel}
                              onClick={() => toggleArrayField("communicationPreferences", channel)}
                              className={`rounded-full border px-4 py-2 text-xs font-bold transition-all ${
                                selected
                                  ? "border-red-200 bg-red-50 text-red-700"
                                  : "border-slate-200 bg-white text-slate-600 hover:border-red-200 hover:bg-red-50"
                              }`}
                            >
                              {selected && <Check size={12} className="mr-1 inline" />}
                              {channel}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {stepConfig.id === "review" && (
                  <div className="space-y-6">
                    <ReviewBlock title="Personal Information" onEdit={() => goTo(0)}>
                      <ReviewRow label="Name" value={formData.displayName} />
                      <ReviewRow label="Phone" value={formData.phone} />
                      <ReviewRow label="Company" value={formData.companyName} />
                      <ReviewRow label="Type" value={formData.customerType} />
                    </ReviewBlock>
                    <ReviewBlock title="Address" onEdit={() => goTo(1)}>
                      <ReviewRow label="Province" value={formData.province} />
                      <ReviewRow label="City" value={formData.city} />
                      <ReviewRow label="Physical" value={formData.physicalAddress} />
                      <ReviewRow label="Delivery" value={formData.deliveryAddress} />
                    </ReviewBlock>
                    <ReviewBlock title="Garage" onEdit={() => goTo(2)}>
                      {vehicles.length > 0 ? vehicles.map((v, i) => (
                        <ReviewRow key={i} label={`Vehicle ${i + 1}`} value={`${v.year} ${v.manufacturer} ${v.model}`} />
                      )) : <p className="text-sm text-slate-400">No vehicles added</p>}
                    </ReviewBlock>
                    <ReviewBlock title="Saved Colours" onEdit={() => goTo(3)}>
                      {colours.length > 0 ? colours.map((c, i) => (
                        <ReviewRow key={i} label={c.code} value={c.colourName} />
                      )) : <p className="text-sm text-slate-400">No colours saved</p>}
                    </ReviewBlock>
                    <ReviewBlock title="Preferences" onEdit={() => goTo(4)}>
                      <ReviewRow label="Interests" value={formData.productInterests.join(", ") || "None selected"} />
                      <ReviewRow label="Paint system" value={formData.favouritePaintSystem} />
                      <ReviewRow label="Delivery" value={formData.preferredDelivery} />
                      <ReviewRow label="Communication" value={formData.communicationPreferences.join(", ") || "None selected"} />
                    </ReviewBlock>
                  </div>
                )}

                {stepConfig.id === "complete" && (
                  <div className="py-8 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                      className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full bg-emerald-100"
                    >
                      <Check size={48} className="text-emerald-600" />
                    </motion.div>
                    <h2 className="text-4xl font-black text-gray-950" style={{ fontFamily: "var(--font-barlow-condensed)" }}>
                      🎉 Profile Completed!
                    </h2>
                    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-500">
                      Your TRUECOLOURS account is now fully configured and ready to use.
                    </p>

                    <div className="mx-auto mt-8 max-w-sm text-left">
                      <ul className="space-y-3 font-bold text-slate-700">
                        <motion.li initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay: 0.1}} className="flex items-center gap-3">
                          <CheckCircle2 size={18} className="text-emerald-500" /> Personal Information Saved
                        </motion.li>
                        <motion.li initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay: 0.2}} className="flex items-center gap-3">
                          <CheckCircle2 size={18} className="text-emerald-500" /> Address Saved
                        </motion.li>
                        <motion.li initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay: 0.3}} className="flex items-center gap-3">
                          <CheckCircle2 size={18} className="text-emerald-500" /> Garage Information Saved
                        </motion.li>
                        <motion.li initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay: 0.4}} className="flex items-center gap-3">
                          <CheckCircle2 size={18} className="text-emerald-500" /> Colour Preferences Saved
                        </motion.li>
                        <motion.li initial={{opacity:0, x:-20}} animate={{opacity:1, x:0}} transition={{delay: 0.5}} className="flex items-center gap-3">
                          <CheckCircle2 size={18} className="text-emerald-500" /> Account Activated
                        </motion.li>
                      </ul>
                    </div>

                    <motion.div initial={{opacity:0, y:20}} animate={{opacity:1, y:0}} transition={{delay: 0.7}} className="mx-auto mt-8 max-w-sm rounded-2xl border border-slate-200 bg-slate-50 p-6 text-left">
                      <p className="font-black text-gray-950">Welcome, {firstName}!</p>
                      <div className="mt-4 space-y-3 text-sm">
                        <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">Email</span><span className="font-bold text-slate-800">{profile?.email || user?.email || ""}</span></div>
                        <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">Customer Type</span><span className="font-bold text-slate-800">{formData.customerType || "N/A"}</span></div>
                        <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">Province</span><span className="font-bold text-slate-800">{formData.province || "N/A"}</span></div>
                        <div className="flex justify-between border-b border-slate-200 pb-2"><span className="text-slate-500">Company</span><span className="font-bold text-slate-800">{formData.companyName || "N/A"}</span></div>
                      </div>
                    </motion.div>

                    <div className="mt-8 text-sm text-slate-500">
                      <p>Your profile is now complete.</p>
                      <p className="mt-2">From now on you can edit any information<br/>from your Profile Settings page.</p>
                      <p className="mt-2 text-xs italic text-slate-400">The onboarding wizard will never appear again.</p>
                    </div>

                    <div className="mt-8">
                      <p className="mb-4 text-sm font-bold text-slate-700">Redirecting to your dashboard in {countdown}...</p>
                      <button
                        onClick={onComplete}
                        className="inline-flex items-center gap-2 rounded-xl bg-gray-950 px-8 py-3 text-sm font-black text-white shadow-lg transition hover:bg-gray-800"
                      >
                        Go to Dashboard Now
                        <ArrowRight size={17} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    role="alert"
                    className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
                  >
                    {error}
                  </motion.p>
                )}

                {/* Navigation buttons */}
                {!isComplete && (
                  <div className="mt-8 flex items-center justify-between border-t border-slate-100 pt-6">
                    <button
                      onClick={prev}
                      disabled={currentStep === 0}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
                    >
                      <ArrowLeft size={16} />
                      Back
                    </button>

                    {isLastContentStep ? (
                      <button
                        onClick={handleComplete}
                        disabled={submitState !== 'idle'}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-8 py-3 text-sm font-black text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700 disabled:opacity-60"
                      >
                        {submitState === 'saving' ? (
                          <><LoaderCircle size={16} className="animate-spin" /> Saving...</>
                        ) : submitState === 'success' ? (
                          <><Check size={16} />✓ Profile Completed</>
                        ) : (
                          <><CheckCircle2 size={16} />Complete Profile</>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={next}
                        className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white shadow-lg shadow-red-600/20 transition hover:bg-red-700"
                      >
                        Next
                        <ArrowRight size={16} />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Review helpers ──────────────────────────────────────────────────── */

function ReviewBlock({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-800">{title}</h3>
        <button onClick={onEdit} className="text-xs font-bold text-red-600 hover:text-red-700">Edit</button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="w-28 flex-shrink-0 font-bold text-slate-500">{label}</span>
      <span className="text-slate-800">{value || "—"}</span>
    </div>
  );
}
