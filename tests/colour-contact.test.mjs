import test from "node:test";
import assert from "node:assert/strict";
import { buildColourContactLink, buildWhatsAppLink, formatColourHelpMessage, formatNotFoundEnquiryMessage, withOriginalEnquiry } from "../lib/whatsapp.ts";

test("contact starts in the finder and carries a complete product enquiry", () => {
  const enquiry = "Hi TRUECOLOURS,\n2 × Blue & Grey paint (#A2)\nPlease confirm stock + pricing.";
  const url = new URL(buildColourContactLink(enquiry), "https://truecolours.example");
  assert.equal(url.pathname, "/find-my-colour");
  assert.equal(url.searchParams.get("contact"), "whatsapp");
  assert.equal(url.searchParams.get("enquiry"), enquiry);
  assert.equal(url.hash, "#colour-finder", "Contact on a long results page must return to the choice at the top");
  assert.equal(buildColourContactLink(), "/find-my-colour?contact=whatsapp#colour-finder");
});

test("the unsure option needs no vehicle and prepares WhatsApp after that choice", () => {
  const message = formatColourHelpMessage(undefined, "I need help matching a sample.");
  const url = new URL(buildWhatsAppLink(message));
  assert.equal(url.hostname, "wa.me");
  assert.equal(url.searchParams.get("text"), message);
  assert.match(message, /not sure which colour/);
  assert.match(message, /help matching a sample/);
  assert.doesNotMatch(message, /Vehicle:|undefined|attached a photo/);
});

test("both selected colours and unsure enquiries retain vehicle and product context", () => {
  const enquiry = "Please quote a 1 litre clearcoat.";
  const message = formatColourHelpMessage({ brand: "Ford", model: "Model A", year: "1930", code: "436" }, "", enquiry);
  assert.match(message, /Vehicle: Ford Model A 1930/);
  assert.match(message, /reference: 436/);
  assert.ok(message.endsWith(enquiry));
  assert.ok(withOriginalEnquiry("Selected Gunmetal Blue, reference 436.", enquiry).endsWith(enquiry));
  assert.doesNotMatch(formatNotFoundEnquiryMessage({ brand: "Ford", year: "1930" }), /have attached/);
});
