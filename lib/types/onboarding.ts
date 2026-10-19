import type { CommunicationChannel, CustomerType, ProductInterest } from "@/lib/account-types";

/* ─── Onboarding step identifiers ────────────────────────────────────────── */

export const ONBOARDING_STEPS = [
  "welcome",
  "personal-details",
  "business-details",
  "customer-type",
  "address",
  "preferences",
  "complete",
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number];

/** Total steps (excluding welcome & complete screens) for progress tracking */
export const ONBOARDING_FORM_STEPS = ONBOARDING_STEPS.filter(
  (s) => s !== "welcome" && s !== "complete"
) as OnboardingStepId[];

/* ─── Per-step data shapes ───────────────────────────────────────────────── */

export type PersonalDetailsData = {
  firstName: string;
  surname: string;
  phone: string;
  alternativePhone?: string;
  birthday?: string;
};

export type BusinessDetailsData = {
  companyName?: string;
  vatNumber?: string;
  businessRegNumber?: string;
  industry?: string;
};

export type CustomerTypeData = {
  customerType: CustomerType;
};

export type AddressData = {
  province: string;
  city: string;
  physicalAddress: string;
  deliveryAddress?: string;
};

export type PreferencesData = {
  productInterests: ProductInterest[];
  communicationPreferences: CommunicationChannel[];
  favouritePaintSystem?: string;
  preferredDelivery?: string;
  preferredBranch?: string;
};

/* ─── Aggregate onboarding payload ───────────────────────────────────────── */

export type OnboardingData = PersonalDetailsData &
  BusinessDetailsData &
  CustomerTypeData &
  AddressData &
  PreferencesData;

/* ─── Step configuration (for the wizard engine) ─────────────────────────── */

export type OnboardingStepConfig = {
  id: OnboardingStepId;
  title: string;
  description: string;
  /** Whether the step can be skipped */
  optional: boolean;
  /** Fields that belong to this step (used by progress / validation) */
  fields: (keyof OnboardingData)[];
};

export const ONBOARDING_STEP_CONFIG: OnboardingStepConfig[] = [
  {
    id: "welcome",
    title: "Welcome to TRUECOLOURS",
    description: "Let's set up your account so we can give you the best experience.",
    optional: false,
    fields: [],
  },
  {
    id: "personal-details",
    title: "Personal Details",
    description: "Tell us about yourself.",
    optional: false,
    fields: ["firstName", "surname", "phone", "alternativePhone", "birthday"],
  },
  {
    id: "business-details",
    title: "Business Details",
    description: "If you represent a business, add your details here.",
    optional: true,
    fields: ["companyName", "vatNumber", "businessRegNumber", "industry"],
  },
  {
    id: "customer-type",
    title: "Customer Type",
    description: "Help us understand how you'll use TRUECOLOURS.",
    optional: false,
    fields: ["customerType"],
  },
  {
    id: "address",
    title: "Address",
    description: "Where should we deliver to?",
    optional: false,
    fields: ["province", "city", "physicalAddress", "deliveryAddress"],
  },
  {
    id: "preferences",
    title: "Preferences",
    description: "Choose your product interests and communication preferences.",
    optional: true,
    fields: [
      "productInterests",
      "communicationPreferences",
      "favouritePaintSystem",
      "preferredDelivery",
      "preferredBranch",
    ],
  },
  {
    id: "complete",
    title: "You're All Set!",
    description: "Your account is ready. Let's get started.",
    optional: false,
    fields: [],
  },
];

/* ─── Onboarding status (stored in Firestore) ────────────────────────────── */

export type OnboardingStatus = {
  /** Whether onboarding is complete */
  completed: boolean;
  /** The step the user is currently on (for resume) */
  currentStep: OnboardingStepId;
  /** Steps that have been completed */
  completedSteps: OnboardingStepId[];
  /** Partial data saved as user progresses (server-side draft) */
  draftData: Partial<OnboardingData>;
  /** ISO timestamp of when onboarding started */
  startedAt: string | null;
  /** ISO timestamp of when onboarding was completed */
  completedAt: string | null;
  /** Number of times user has visited the onboarding flow */
  visitCount: number;
};

export const EMPTY_ONBOARDING_STATUS: OnboardingStatus = {
  completed: false,
  currentStep: "welcome",
  completedSteps: [],
  draftData: {},
  startedAt: null,
  completedAt: null,
  visitCount: 0,
};

/* ─── API request / response types ───────────────────────────────────────── */

export type SaveOnboardingStepRequest = {
  stepId: OnboardingStepId;
  data: Partial<OnboardingData>;
};

export type SaveOnboardingStepResponse = {
  success: boolean;
  status: OnboardingStatus;
};

export type CompleteOnboardingRequest = {
  data: OnboardingData;
};

export type CompleteOnboardingResponse = {
  success: boolean;
  redirectTo: string;
};

export type GetOnboardingStatusResponse = {
  status: OnboardingStatus;
  profile: {
    displayName: string;
    email: string;
    photoURL?: string;
  };
};
