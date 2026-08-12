import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/app/components/LegalShell";

export const metadata: Metadata = {
  title: "Terms of Service | Dreamly",
  description:
    "Terms governing your use of Dreamly — AI dream interpretation, journal, dictionary, map, and related services.",
  alternates: { canonical: "/terms" },
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="August 12, 2026">
      <section>
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of <strong>Dreamly</strong> at{" "}
          <Link href="https://dreamly.art">https://dreamly.art</Link> and related apps, pages, and services (the
          &quot;Service&quot;). By using Dreamly, you agree to these Terms.
        </p>
      </section>

      <section>
        <h2>1. The Service</h2>
        <p>
          Dreamly provides AI-assisted dream interpretation, a personal dream journal, a dream dictionary, an
          anonymous dream map, and related features that may include social sharing and content publishing tools.
          Features may change, improve, or be discontinued over time.
        </p>
      </section>

      <section>
        <h2>2. Eligibility</h2>
        <p>
          You must be at least 13 years old (or the minimum age required in your country) and able to form a binding
          contract to use Dreamly. If you use Dreamly on behalf of an organization, you confirm you have authority to
          bind that organization.
        </p>
      </section>

      <section>
        <h2>3. Accounts</h2>
        <ul>
          <li>You are responsible for your account credentials and activity under your account.</li>
          <li>Provide accurate information and keep it up to date.</li>
          <li>Notify us promptly if you suspect unauthorized access.</li>
          <li>We may suspend or terminate accounts that violate these Terms or create risk for users or Dreamly.</li>
        </ul>
      </section>

      <section>
        <h2>4. Your content</h2>
        <p>
          You retain ownership of the dream text and other content you submit (&quot;User Content&quot;). You grant
          Dreamly a worldwide, non-exclusive license to host, process, display, and use User Content as needed to
          operate and improve the Service (including sending prompts to AI providers when you request
          interpretations or generations).
        </p>
        <p>
          If you choose to share content publicly or anonymously (for example on the dream map), you authorize us to
          make that content available as configured by the feature.
        </p>
        <p>
          You confirm you have the rights needed to submit User Content and that it does not violate law or others&apos;
          rights.
        </p>
      </section>

      <section>
        <h2>5. AI outputs and no professional advice</h2>
        <p>
          Dream interpretations and other AI outputs are for entertainment, reflection, and educational purposes only.
          They are <strong>not</strong> medical, psychological, psychiatric, legal, financial, or religious advice.
          Do not rely on Dreamly as a substitute for qualified professional help. If you are in crisis, contact local
          emergency services or a qualified helpline.
        </p>
      </section>

      <section>
        <h2>6. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Break the law or infringe others&apos; rights</li>
          <li>Upload malware, scrape the Service abusively, or attempt unauthorized access</li>
          <li>Harass, threaten, or exploit others</li>
          <li>Spam, manipulate rankings, or automate misuse of AI/credits features</li>
          <li>Reverse engineer the Service except where allowed by law</li>
          <li>Use Dreamly to generate or distribute unlawful or prohibited content</li>
        </ul>
      </section>

      <section>
        <h2>7. Paid features, credits, and refunds</h2>
        <p>
          Some features may require payment, subscriptions, or credits. Prices and benefits are shown at checkout.
          Payments may be processed by third parties such as PayPal. Except where required by law, fees are generally
          non-refundable once digital access or credits have been delivered. Chargebacks and payment disputes may lead
          to account review.
        </p>
      </section>

      <section>
        <h2>8. Third-party services</h2>
        <p>
          Dreamly relies on third parties (for example authentication, hosting, analytics, payments, AI providers, and
          social platforms). Their terms and privacy policies apply to their services. If you connect a platform such
          as TikTok to publish content, you also agree to that platform&apos;s rules and remain responsible for the
          content you publish.
        </p>
      </section>

      <section>
        <h2>9. Intellectual property</h2>
        <p>
          Dreamly&apos;s branding, software, design, dictionary materials we publish, and other Service elements are
          owned by Dreamly or its licensors. You may not copy, modify, or redistribute them except as allowed by these
          Terms or with prior written permission.
        </p>
      </section>

      <section>
        <h2>10. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM EXTENT PERMITTED BY
          LAW, DREAMLY DISCLAIMS WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
          NON-INFRINGEMENT. We do not guarantee uninterrupted availability, perfect accuracy of AI outputs, or that
          the Service will meet your expectations.
        </p>
      </section>

      <section>
        <h2>11. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, DREAMLY AND ITS OPERATORS WILL NOT BE LIABLE FOR INDIRECT,
          INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, DATA, OR GOODWILL. OUR TOTAL
          LIABILITY FOR CLAIMS RELATED TO THE SERVICE WILL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO
          DREAMLY IN THE 12 MONTHS BEFORE THE CLAIM OR (B) USD $50.
        </p>
      </section>

      <section>
        <h2>12. Indemnity</h2>
        <p>
          You agree to defend and indemnify Dreamly against claims arising from your use of the Service, your User
          Content, or your violation of these Terms or applicable law.
        </p>
      </section>

      <section>
        <h2>13. Termination</h2>
        <p>
          You may stop using Dreamly at any time. We may suspend or end access if you violate these Terms, create risk,
          or if we discontinue the Service. Sections that by nature should survive (including IP, disclaimers,
          limitation of liability, and indemnity) will survive termination.
        </p>
      </section>

      <section>
        <h2>14. Changes to the Terms</h2>
        <p>
          We may update these Terms. The &quot;Last updated&quot; date will change when we do. Continued use after
          changes means you accept the updated Terms. If you do not agree, stop using the Service.
        </p>
      </section>

      <section>
        <h2>15. Governing law</h2>
        <p>
          These Terms are governed by the laws applicable to the operator of Dreamly, without regard to conflict-of-law
          rules, except where mandatory consumer protections in your country apply.
        </p>
      </section>

      <section>
        <h2>16. Contact</h2>
        <p>
          Questions about these Terms: contact us through <Link href="https://dreamly.art">https://dreamly.art</Link>{" "}
          or in-app support channels.
        </p>
        <p>
          See also our <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </section>
    </LegalShell>
  );
}
