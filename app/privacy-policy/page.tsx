import type { Metadata } from "next";
import PolicyShell from "@/components/legal/PolicyShell";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy | T&R Auto Paints",
  description: "How T&R Auto Paints collects, uses, protects and retains personal information.",
};

export default function PrivacyPolicyPage() {
  return (
    <PolicyShell title="Privacy Policy">
      <section>
        <h2>1. Introduction</h2>
        <p>
          T&amp;R Auto Paints (“we”, “us”, “our”) is committed to protecting your privacy and
          ensuring that your personal information is collected and used properly, lawfully,
          and transparently.
        </p>
        <p>
          This Privacy Policy explains how we collect, use, and safeguard your information
          when you visit our website or interact with our services.
        </p>
      </section>

      <section>
        <h2>2. Information We Collect</h2>
        <p>We may collect and process the following information:</p>
        <ul>
          <li><strong>Personal Information:</strong> Name, contact number, email address, and any details submitted via contact forms or enquiries</li>
          <li><strong>Business Information:</strong> Company name and details (if applicable)</li>
          <li><strong>Technical Data:</strong> IP address, browser type, device information, and website usage data</li>
          <li><strong>Transaction Information:</strong> Purchase or order details (if applicable)</li>
        </ul>
      </section>

      <section>
        <h2>3. How We Use Your Information</h2>
        <p>We use your information to:</p>
        <ul>
          <li>Respond to enquiries and provide customer support</li>
          <li>Process orders and service requests</li>
          <li>Improve our products, services, and website functionality</li>
          <li>Communicate updates, promotions, or relevant information (only if consent is given)</li>
          <li>Comply with legal and regulatory requirements</li>
        </ul>
      </section>

      <section>
        <h2>4. Sharing of Information</h2>
        <p>We do not sell or rent your personal information.</p>
        <p>We may share your information with:</p>
        <ul>
          <li>Service providers assisting in business operations (e.g., payment processors, IT services)</li>
          <li>Legal or regulatory authorities when required by law</li>
        </ul>
      </section>

      <section>
        <h2>5. Cookies and Tracking Technologies</h2>
        <p>Our website may use cookies to:</p>
        <ul>
          <li>Enhance user experience</li>
          <li>Analyse website traffic and performance</li>
        </ul>
        <p>You can disable cookies through your browser settings, although this may affect certain website functionality.</p>
      </section>

      <section>
        <h2>6. Data Security</h2>
        <p>We take reasonable technical and organisational measures to protect your personal information from loss, misuse, or unauthorised access.</p>
      </section>

      <section>
        <h2>7. Your Rights</h2>
        <p>In terms of applicable data protection laws (including POPIA), you have the right to:</p>
        <ul>
          <li>Access your personal information</li>
          <li>Request correction or deletion of your data</li>
          <li>Object to processing of your personal information</li>
          <li>Withdraw consent at any time</li>
        </ul>
        <p>To exercise these rights, please contact us using the details below.</p>
      </section>

      <section>
        <h2>8. Data Retention</h2>
        <p>We retain your personal information only for as long as necessary to fulfil the purposes outlined in this policy or as required by law.</p>
      </section>

      <section>
        <h2>9. Third-Party Links</h2>
        <p>Our website may contain links to third-party websites. We are not responsible for their privacy practices.</p>
      </section>

      <section>
        <h2>10. Changes to This Policy</h2>
        <p>We may update this Privacy Policy from time to time. Updates will be posted on this page with a revised effective date.</p>
      </section>

      <aside className="policy-contact">
        <h2>Contact Us</h2>
        <p>
          Phone: <a href={`tel:${siteConfig.phonePrimaryRaw}`}>{siteConfig.phonePrimary}</a><br />
          Alternative: <a href={`tel:${siteConfig.phoneSecondaryRaw}`}>{siteConfig.phoneSecondary}</a><br />
          Address: {siteConfig.location}
        </p>
      </aside>
    </PolicyShell>
  );
}
