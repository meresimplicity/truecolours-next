import { z } from "zod";
import { customerTypes, provinces, productInterests, communicationChannels } from "@/lib/account-types";

/* ─── Personal Details (onboarding step) ─────────────────────────────────── */

export const onboardingPersonalDetailsSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  surname: z.string().min(1, "Surname is required").max(100),
  phone: z
    .string()
    .min(10, "Enter a valid phone number")
    .max(15)
    .regex(/^[+\d\s()-]+$/, "Invalid phone number format"),
  alternativePhone: z.string().max(15).optional().or(z.literal("")),
  birthday: z.string().optional().or(z.literal("")),
});

export type OnboardingPersonalDetailsForm = z.infer<typeof onboardingPersonalDetailsSchema>;

/* ─── Business Details (onboarding step) ─────────────────────────────────── */

export const onboardingBusinessDetailsSchema = z.object({
  companyName: z.string().max(200).optional().or(z.literal("")),
  vatNumber: z.string().max(20).optional().or(z.literal("")),
  businessRegNumber: z.string().max(30).optional().or(z.literal("")),
  industry: z.string().max(100).optional().or(z.literal("")),
});

export type OnboardingBusinessDetailsForm = z.infer<typeof onboardingBusinessDetailsSchema>;

/* ─── Customer Type (onboarding step) ────────────────────────────────────── */

export const onboardingCustomerTypeSchema = z.object({
  customerType: z.enum(customerTypes, {
    error: "Please select your customer type",
  }),
});

export type OnboardingCustomerTypeForm = z.infer<typeof onboardingCustomerTypeSchema>;

/* ─── Address (onboarding step) ──────────────────────────────────────────── */

export const onboardingAddressSchema = z.object({
  province: z.enum(provinces, {
    error: "Please select your province",
  }),
  city: z.string().min(1, "City is required").max(100),
  physicalAddress: z.string().min(1, "Physical address is required").max(300),
  deliveryAddress: z.string().max(300).optional().or(z.literal("")),
});

export type OnboardingAddressForm = z.infer<typeof onboardingAddressSchema>;

/* ─── Preferences (onboarding step) ──────────────────────────────────────── */

export const onboardingPreferencesSchema = z.object({
  productInterests: z
    .array(z.enum(productInterests)),
  communicationPreferences: z
    .array(z.enum(communicationChannels)),
  favouritePaintSystem: z.string().max(100).optional().or(z.literal("")),
  preferredDelivery: z.string().max(100).optional().or(z.literal("")),
  preferredBranch: z.string().max(100).optional().or(z.literal("")),
});

export type OnboardingPreferencesForm = z.infer<typeof onboardingPreferencesSchema>;

/* ─── Combined onboarding payload ────────────────────────────────────────── */

export const onboardingCompleteSchema = onboardingPersonalDetailsSchema
  .merge(onboardingBusinessDetailsSchema)
  .merge(onboardingCustomerTypeSchema)
  .merge(onboardingAddressSchema)
  .merge(onboardingPreferencesSchema);

export type OnboardingCompleteForm = z.infer<typeof onboardingCompleteSchema>;

/* ─── Step ↔ Schema mapping (for generic wizard validation) ──────────────── */

export const onboardingStepSchemas = {
  "personal-details": onboardingPersonalDetailsSchema,
  "business-details": onboardingBusinessDetailsSchema,
  "customer-type": onboardingCustomerTypeSchema,
  "address": onboardingAddressSchema,
  "preferences": onboardingPreferencesSchema,
} as const;

export type OnboardingStepSchemaMap = typeof onboardingStepSchemas;
export type ValidatableStepId = keyof OnboardingStepSchemaMap;
