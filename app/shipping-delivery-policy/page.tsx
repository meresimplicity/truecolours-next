import { buildColourContactLink } from "@/lib/whatsapp";
import type { Metadata } from "next";
import PolicyShell from "@/components/legal/PolicyShell";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Shipping & Delivery Policy | T&R Auto Paints",
  description: "T&R Auto Paints delivery, collection, lead-time and damaged-delivery policy for automotive paint and supplies.",
};

export default function ShippingDeliveryPolicyPage() {
  return (
    <PolicyShell title="Shipping & Delivery Policy" effectiveDate="1 April 2026">
      <section><h2>1. Delivery Areas</h2><p>T&amp;R Auto Paints supplies automotive refinishing paint, consumables and workshop products from Mankweng, Limpopo. Delivery availability, charges and courier options depend on the delivery address, product type, order size and any dangerous-goods handling requirements. We will confirm the available option before dispatch.</p></section>
      <section><h2>2. Collection</h2><p>Collection is available from our Mankweng premises once we confirm that an order is ready. Please wait for our collection-ready message before travelling. Bring your order reference and proof of payment where applicable. A person collecting on behalf of a business or customer may be asked for authorisation and identification.</p></section>
      <section><h2>3. Order Processing and Lead Times</h2><p>Stocked items are normally prepared after payment or account approval has been confirmed. Indicative lead times are provided in business days and are estimates, not guaranteed delivery dates.</p><ul><li>Stocked consumables and standard products may be ready for collection or dispatch after confirmation.</li><li>Custom-mixed, colour-matched, special-order or imported paint products require additional preparation or supplier lead time.</li><li>Orders placed after cut-off times, over weekends or public holidays are processed on the next business day.</li></ul><p>We will contact you if a product is unavailable, a colour sample needs clarification, or a confirmed lead time changes materially.</p></section>
      <section><h2>4. Custom-Mixed Automotive Paint</h2><p>Colour-matched and custom-mixed automotive paint is prepared from the vehicle, paint code, panel/sample or information supplied. Please check the paint code, vehicle details, quantity, finish and collection/delivery details before approving your order. Differences in vehicle age, previous repairs, fading, substrate and application technique can affect the final result.</p><p>Once custom mixing has begun, the product cannot ordinarily be cancelled, returned or exchanged except where we confirm a manufacturing or fulfilment error.</p></section>
      <section><h2>5. Delivery Charges and Dispatch</h2><p>Delivery charges are quoted or confirmed before dispatch unless a written arrangement says otherwise. Some paints, thinners, hardeners, aerosols and other regulated products may require a suitable delivery method or may be collection-only. We may split an order where products have different availability or handling requirements; any additional charge will be discussed with you first.</p></section>
      <section><h2>6. Receiving Your Delivery</h2><p>Please ensure that someone authorised is available at the delivery address to receive the order. Before signing for delivery, inspect the outer packaging, number of parcels and any visible damage. Note visible damage or shortages on the courier’s proof of delivery where possible and keep all packaging until the issue is resolved.</p></section>
      <section><h2>7. Damaged, Missing or Incorrect Deliveries</h2><p>Notify us within 48 hours of delivery if an item is damaged, missing or incorrect. Send your order reference, clear photographs of the product and packaging, and any courier delivery note. Do not use a damaged product unless we ask you to do so for assessment.</p><p>After assessment, we may arrange collection, replacement, credit or refund as appropriate. Our Refunds &amp; Returns Policy explains eligibility and does not limit your rights under applicable South African consumer law.</p></section>
      <section><h2>8. Delays and Failed Delivery Attempts</h2><p>Courier delays, weather, traffic, remote-area access, supplier delays and incomplete or incorrect delivery information can affect lead times. We will assist with tracking where available. If a delivery cannot be completed because no authorised recipient is present or the address is inaccessible, a re-delivery or return-to-store charge may apply.</p></section>
      <section><h2>9. Contact Us</h2><p>For a delivery update, collection confirmation or to report a problem, contact us as soon as possible with your order reference.</p></section>
      <aside className="policy-contact"><h2>Need help with an order?</h2><p>Call <a href={`tel:${siteConfig.phonePrimaryRaw}`}>{siteConfig.phonePrimary}</a> or contact us on WhatsApp with your order reference.</p><a href={buildColourContactLink()} className="policy-contact-button">Contact us on WhatsApp</a></aside>
    </PolicyShell>
  );
}
