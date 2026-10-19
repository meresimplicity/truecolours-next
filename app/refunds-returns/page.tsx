import { buildColourContactLink } from "@/lib/whatsapp";
import type { Metadata } from "next";
import PolicyShell from "@/components/legal/PolicyShell";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Refunds & Returns Policy | T&R Auto Paints",
  description: "T&R Auto Paints terms for product returns, exchanges and refunds.",
};

export default function RefundsReturnsPage() {
  return (
    <PolicyShell title="Refunds & Returns Policy" effectiveDate="1 April 2026">
      <section>
        <h2>1. Overview</h2>
        <p>At T&amp;R Auto Paints, we are committed to delivering high-quality automotive paint products and accessories. Due to the specialised nature of our products, particularly custom-mixed paints, this policy outlines the terms under which returns, exchanges, and refunds are accepted.</p>
      </section>

      <section>
        <h2>2. Returns Eligibility</h2>
        <p>You may return a product if:</p>
        <ul>
          <li>The item is unused, unopened, and in its original packaging</li>
          <li>The return is requested within 7 days of purchase</li>
          <li>You provide valid proof of purchase (receipt or invoice)</li>
        </ul>
      </section>

      <section>
        <h2>3. Non-Returnable Items</h2>
        <p>The following items are non-refundable and non-returnable:</p>
        <ul>
          <li>Custom-mixed paints or colour-matched products</li>
          <li>Products that have been opened, used, or altered</li>
          <li>Clearance or sale items (unless defective)</li>
          <li>Special-order or imported items requested specifically for a customer</li>
        </ul>
      </section>

      <section>
        <h2>4. Defective or Damaged Products</h2>
        <p>If you receive a product that is defective or damaged:</p>
        <ul>
          <li>Notify us within 48 hours of receiving the product</li>
          <li>Provide photographic evidence where possible</li>
        </ul>
        <p>We will assess the issue and may offer:</p>
        <ul>
          <li>A replacement</li>
          <li>A repair</li>
          <li>A refund (if replacement is not possible)</li>
        </ul>
      </section>

      <section>
        <h2>5. Refunds</h2>
        <p>Approved refunds will be processed as follows:</p>
        <ul>
          <li>Refunds will be issued via the original method of payment</li>
          <li>Processing time may take 5–10 business days depending on your bank</li>
          <li>Cash refunds may require in-store processing with original proof of purchase</li>
        </ul>
      </section>

      <section>
        <h2>6. Exchanges</h2>
        <p>We offer exchanges on eligible items if:</p>
        <ul>
          <li>The product meets return conditions</li>
          <li>The requested replacement item is available</li>
        </ul>
        <p>Price differences may apply.</p>
      </section>

      <section>
        <h2>7. Incorrect Orders</h2>
        <p>If you receive the wrong item:</p>
        <ul>
          <li>Contact us within 48 hours</li>
          <li>We will arrange collection or replacement at no additional cost</li>
        </ul>
      </section>

      <section>
        <h2>8. Return Process</h2>
        <p>To initiate a return:</p>
        <ul>
          <li>Contact us via phone or email</li>
          <li>Provide your proof of purchase and reason for return</li>
          <li>Await approval and return instructions</li>
        </ul>
        <p>Returns sent without prior approval may not be accepted.</p>
      </section>

      <section>
        <h2>9. Shipping Costs</h2>
        <ul>
          <li>Customers are responsible for return shipping costs unless the product is defective or incorrect</li>
          <li>Original delivery fees are non-refundable</li>
        </ul>
      </section>

      <section>
        <h2>10. Consumer Rights (South Africa)</h2>
        <p>This policy is in accordance with the Consumer Protection Act (CPA). Nothing in this policy limits your statutory rights.</p>
      </section>

      <aside className="policy-contact">
        <h2>Start a Return</h2>
        <p>
          Call <a href={`tel:${siteConfig.phonePrimaryRaw}`}>{siteConfig.phonePrimary}</a> or contact us through WhatsApp before returning an item.
        </p>
        <a
          href={buildColourContactLink()}
          className="policy-contact-button"
        >
          Contact us on WhatsApp
        </a>
      </aside>
    </PolicyShell>
  );
}
