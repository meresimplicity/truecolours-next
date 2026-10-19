import type { PaintResult } from "@/types/paint";

/**
 * Builds a wa.me deep link pre-filled with the vehicle + colour context, so
 * a WhatsApp lead arrives with useful detail instead of "hi".
 */
export function buildWhatsAppLink(params: {
  phoneNumber: string; // digits only, country code, no '+' — e.g. "27821234567"
  vehicle: { make: string; model?: string; variant?: string; year?: number };
  color?: Pick<PaintResult, "name" | "code" | "auxCode">;
}): string {
  const { phoneNumber, vehicle, color } = params;
  const vehicleLine = [vehicle.make, vehicle.model, vehicle.variant, vehicle.year]
    .filter(Boolean)
    .join(" ");

  let text = `Hi TRUECOLOURS, I'm looking for paint for my ${vehicleLine}.`;
  if (color) {
    text += ` I found: ${color.name} (code ${color.code}${color.auxCode ? ` / ${color.auxCode}` : ""}).`;
  } else {
    text += " I couldn't find my colour in the online catalogue and would like help.";
  }

  const digits = phoneNumber.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}
