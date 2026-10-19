export type Address = {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  streetAddress: string;
  suburb?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  isDefault: boolean;
  type: "delivery" | "billing" | "workshop" | "other";
  specialInstructions?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type AddressInput = Omit<Address, "id" | "createdAt" | "updatedAt">;

export const southAfricanProvinces = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
] as const;

export const addressTypes = [
  { value: "delivery" as const, label: "Delivery" },
  { value: "billing" as const, label: "Billing" },
  { value: "workshop" as const, label: "Workshop" },
  { value: "other" as const, label: "Other" },
];
