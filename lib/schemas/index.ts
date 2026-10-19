import { z } from "zod";

/* ── Personal Details ─────────────────────────────────────────────── */

export const personalDetailsSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  surname: z.string().min(1, "Surname is required").max(100),
  phone: z
    .string()
    .min(10, "Enter a valid phone number")
    .max(15)
    .regex(/^[+\d\s()-]+$/, "Invalid phone number format"),
  birthday: z.string().optional(),
});

export type PersonalDetailsForm = z.infer<typeof personalDetailsSchema>;

/* ── Address ──────────────────────────────────────────────────────── */

export const addressSchema = z.object({
  label: z.string().min(1, "Label is required").max(50),
  recipient: z.string().min(1, "Recipient name is required").max(150),
  phone: z.string().min(10, "Phone number is required").max(15),
  streetAddress: z.string().min(1, "Street address is required").max(300),
  suburb: z.string().max(100).optional(),
  city: z.string().min(1, "City is required").max(100),
  province: z.string().min(1, "Province is required"),
  postalCode: z.string().min(4, "Postal code is required").max(10),
  country: z.string().default("South Africa"),
  gpsLatitude: z.number().optional(),
  gpsLongitude: z.number().optional(),
  isDefault: z.boolean().default(false),
  type: z.enum(["delivery", "billing", "workshop", "other"]).default("delivery"),
  specialInstructions: z.string().max(500).optional(),
});

export type AddressForm = z.infer<typeof addressSchema>;

/* ── Business Details ─────────────────────────────────────────────── */

export const businessDetailsSchema = z.object({
  companyName: z.string().max(200).optional(),
  vatNumber: z.string().max(20).optional(),
  businessRegNumber: z.string().max(30).optional(),
  industry: z.string().max(100).optional(),
});

export type BusinessDetailsForm = z.infer<typeof businessDetailsSchema>;

/* ── Vehicle ──────────────────────────────────────────────────────── */

export const vehicleSchema = z.object({
  manufacturer: z.string().min(1, "Manufacturer is required").max(100),
  model: z.string().min(1, "Model is required").max(100),
  year: z.number().min(1950).max(new Date().getFullYear() + 1),
  bodyType: z.string().min(1, "Body type is required"),
  vin: z.string().max(17).optional(),
  registrationNumber: z.string().max(20).optional(),
  originalPaintColour: z.string().min(1, "Paint colour is required").max(100),
  paintCode: z.string().min(1, "Paint code is required").max(50),
  colourName: z.string().max(100),
  panelBeingRepaired: z.string().max(200).optional(),
  insuranceClaim: z.boolean().default(false),
  vehiclePhotos: z.array(z.string()).default([]),
  damagePhotos: z.array(z.string()).default([]),
  repairNotes: z.string().max(1000).optional(),
  preferredFinish: z.string().optional(),
  preferredPaintSystem: z.string().optional(),
});

export type VehicleForm = z.infer<typeof vehicleSchema>;

/* ── Product (Admin) ──────────────────────────────────────────────── */

export const productSchema = z.object({
  name: z.string().min(1, "Product name is required").max(300),
  code: z.string().max(100),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  brand: z.string().max(100),
  supplier: z.string().max(100),
  price: z.string().max(50),
  priceNumeric: z.number().optional(),
  stockStatus: z.enum([
    "In Stock",
    "Limited Stock",
    "Out of Stock",
    "On Order",
    "Confirm availability",
  ]),
  description: z.string().max(5000),
  specifications: z.string().max(5000).optional(),
  imageUrl: z.string().max(2048),
  additionalImages: z.array(z.string()).optional(),
  visible: z.boolean().default(true),
  featured: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  seoTitle: z.string().max(150).optional(),
  seoDescription: z.string().max(300).optional(),
  weight: z.string().optional(),
  volume: z.string().optional(),
  packSize: z.string().optional(),
});

export type ProductForm = z.infer<typeof productSchema>;

/* ── Quote Request ────────────────────────────────────────────────── */

export const quoteRequestSchema = z.object({
  title: z.string().min(1, "Title is required").max(200),
  details: z.string().min(1, "Please describe what you need").max(5000),
  paintCode: z.string().max(50).optional(),
  vehicleId: z.string().optional(),
  vehicleDescription: z.string().optional(),
  deliveryAddressId: z.string().optional(),
  deliveryAddress: z.string().optional(),
  contactPreference: z.enum(["email", "phone", "whatsapp"]).optional(),
});

export type QuoteRequestForm = z.infer<typeof quoteRequestSchema>;

/* ── Support Ticket ───────────────────────────────────────────────── */

export const supportTicketSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  description: z.string().min(1, "Please describe your issue").max(5000),
  category: z.enum([
    "order_issue",
    "delivery",
    "product_quality",
    "account",
    "payment",
    "colour_matching",
    "general",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  orderId: z.string().optional(),
  quoteId: z.string().optional(),
});

export type SupportTicketForm = z.infer<typeof supportTicketSchema>;

/* ── Profile Update ───────────────────────────────────────────────── */

export const profileUpdateSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  surname: z.string().min(1, "Surname is required").max(100),
  displayName: z.string().min(1).max(200),
  phone: z.string().max(15).optional(),
  birthday: z.string().optional(),
  companyName: z.string().max(200).optional(),
  vatNumber: z.string().max(20).optional(),
  businessRegNumber: z.string().max(30).optional(),
  industry: z.string().max(100).optional(),
});

export type ProfileUpdateForm = z.infer<typeof profileUpdateSchema>;

/* ── Saved Colour ─────────────────────────────────────────────────── */

export const savedColourSchema = z.object({
  code: z.string().min(1, "Paint code is required").max(50),
  vehicle: z.string().min(1, "Vehicle is required").max(200),
  colourName: z.string().max(100),
  notes: z.string().max(1000),
});

export type SavedColourForm = z.infer<typeof savedColourSchema>;

/* ── Customer Message ─────────────────────────────────────────────── */

export const customerMessageSchema = z.object({
  subject: z.string().min(1, "Subject is required").max(200),
  body: z.string().min(1, "Message is required").max(5000),
});

export type CustomerMessageForm = z.infer<typeof customerMessageSchema>;

/* ── Registration ─────────────────────────────────────────────────── */

export const registrationStep1Schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export type RegistrationStep1Form = z.infer<typeof registrationStep1Schema>;

export const registrationStep2Schema = personalDetailsSchema;
export type RegistrationStep2Form = PersonalDetailsForm;

export const registrationStep3Schema = addressSchema.partial({
  label: true,
  recipient: true,
  phone: true,
  isDefault: true,
  type: true,
  country: true,
});
export type RegistrationStep3Form = z.infer<typeof registrationStep3Schema>;
