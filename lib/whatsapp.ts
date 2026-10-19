import { siteConfig } from "../config/site.ts";
import type { VehicleEnquiryDetails } from "@/types/paint";

/**
 * TRUECOLOURS trade desk primary WhatsApp number in international format.
 */
export const WHATSAPP_NUMBER = siteConfig?.whatsappNumber || '27672885241';

/**
 * Builds a direct wa.me link with URL-encoded text.
 */
export function buildWhatsAppLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message.trim())}`;
}

/** Public contact entry points start with colour selection, before WhatsApp. */
export function buildColourContactLink(enquiry?: string): string {
  const params = new URLSearchParams({ contact: "whatsapp" });
  if (enquiry?.trim()) params.set("enquiry", enquiry.trim());
  return `/find-my-colour?${params.toString()}#colour-finder`;
}

export function withOriginalEnquiry(message: string, enquiry?: string): string {
  return enquiry?.trim() ? `${message.trim()}\n\nMy enquiry:\n${enquiry.trim()}` : message.trim();
}

export function formatColourHelpMessage(details?: Partial<VehicleEnquiryDetails>, note?: string, enquiry?: string): string {
  const vehicle = [details?.brand, details?.model, details?.year].filter(Boolean).join(" ");
  return withOriginalEnquiry([
    "Hi TRUECOLOURS, I'm not sure which colour I need. Please help me choose or match it.",
    vehicle ? `Vehicle: ${vehicle}` : "",
    details?.code ? `Paint code or reference: ${details.code}` : "",
    note?.trim() || "",
    "I can send a photo of the vehicle, paint-code label or sample if needed.",
  ].filter(Boolean).join("\n"), enquiry);
}

/**
 * Formats a standardized enquiry message for the TRUECOLOURS trade desk.
 */
export function formatVehicleEnquiryMessage(details: VehicleEnquiryDetails): string {
  const parts: string[] = [
    "Hi TRUECOLOURS,",
    "",
    "I'd like to check a vehicle paint colour.",
    "",
    `Vehicle: ${details.brand} ${details.model}`.trim(),
  ];

  if (details.year) {
    parts.push(`Year: ${details.year}`);
  }

  if (details.colourName) {
    parts.push(`Colour: ${details.colourName}`);
  }

  if (details.code) {
    parts.push(`Paint Code: ${details.code}`);
  }

  parts.push(
    "",
    "Please confirm the correct colour formula, product availability and pricing."
  );

  return parts.join("\n");
}

/**
 * Formats a fallback message for when a paint code or vehicle is not found.
 */
export function formatNotFoundEnquiryMessage(details?: Partial<VehicleEnquiryDetails>): string {
  const vehicleDesc = [details?.brand, details?.model, details?.year ? `(${details.year})` : '']
    .filter(Boolean)
    .join(' ');

  if (vehicleDesc) {
    return `Hi TRUECOLOURS, I'm looking for the factory paint code for my ${vehicleDesc}. I can send a photo of the vehicle or paint-code label. Could your team help match it?`;
  }

  if (details?.code) {
    return `Hi TRUECOLOURS, I have paint code "${details.code}", but couldn't find a matching record on the site. Could you check your formulation database for me?`;
  }

  return "Hi TRUECOLOURS, I'm looking for a vehicle paint colour code and would like help matching it from a photo / sample.";
}
