import type { Metadata } from "next";
import Link from "next/link";
import LegalShell from "@/app/components/LegalShell";

export const metadata: Metadata = {
  title: "Privacy Policy | Dreamly",
  description:
    "How Dreamly collects, uses, and protects your information when you use our AI dream interpreter, journal, map, and related services.",
  alternates: { canonical: "/privacy" },
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="August 12, 2026">
      <section>
        <p>
          This Privacy Policy explains how <strong>Dreamly</strong> (&quot;Dreamly&quot;, &quot;we&quot;, &quot;us&quot;)
          handles information when you use <Link href="https://dreamly.art">https://dreamly.art</Link> and related
          apps, pages, and services (the &quot;Service&quot;).
        </p>
      </section>

      <section>
        <h2>1. Who we are</h2>
        <p>
          Dreamly is an AI dream interpretation and journaling product. You can interpret dreams, keep a private
          journal, browse a dream dictionary, share dreams anonymously on a map, and use related social and
          publishing features.
        </p>
      </section>

      <section>
        <h2>2. Information we collect</h2>
        <p>Depending on how you use Dreamly, we may collect:</p>
        <ul>
          <li>
            <strong>Account information</strong> — such as name, email address, profile photo, and authentication
            identifiers when you sign in (for example with Google via Firebase Authentication).
          </li>
          <li>
            <strong>Dream content</strong> — dream text, interpretations, journal entries, symbols, and related notes
            you create or request.
          </li>
          <li>
            <strong>Usage and device data</strong> — pages viewed, feature usage, approximate location derived from
            IP (when needed for map/sharing features), browser/app type, and diagnostics.
          </li>
          <li>
            <strong>Payment and credit data</strong> — purchase status, order identifiers, and subscription/credit
            balance. Card details are processed by our payment provider (for example PayPal); we do not store full
            card numbers on Dreamly servers.
          </li>
          <li>
            <strong>Communications</strong> — messages you send through in-app chat/support features, if available.
          </li>
          <li>
            <strong>Social publishing connections</strong> — if you authorize Dreamly to publish content to a
            third-party platform (for example TikTok), we store the tokens and account identifiers needed to post on
            your behalf until you disconnect them.
          </li>
        </ul>
      </section>

      <section>
        <h2>3. How we use information</h2>
        <ul>
          <li>Provide dream interpretations, journaling, dictionary, map, and account features</li>
          <li>Operate authentication, billing, credits, and customer support</li>
          <li>Improve product quality, reliability, safety, and performance</li>
          <li>Prevent abuse, spam, fraud, and unauthorized access</li>
          <li>Publish content you explicitly ask us to publish to connected platforms</li>
          <li>Comply with legal obligations</li>
        </ul>
      </section>

      <section>
        <h2>4. AI processing</h2>
        <p>
          When you request an AI interpretation or related generation, your prompt and necessary context may be sent
          to third-party AI providers to generate a response. Do not submit information you are not comfortable
          processing for that purpose. AI outputs are informational and not medical, psychological, legal, or
          religious advice.
        </p>
      </section>

      <section>
        <h2>5. Sharing of information</h2>
        <p>We may share information with:</p>
        <ul>
          <li>
            <strong>Service providers</strong> that help us run Dreamly (hosting, databases, authentication,
            analytics, payments, AI processing, email/push infrastructure).
          </li>
          <li>
            <strong>Platforms you connect</strong> (for example TikTok or other social networks) when you authorize
            publishing or login integrations.
          </li>
          <li>
            <strong>Legal and safety recipients</strong> when required by law or to protect Dreamly, users, or the
            public.
          </li>
        </ul>
        <p>We do not sell your personal information.</p>
      </section>

      <section>
        <h2>6. Cookies and analytics</h2>
        <p>
          We use cookies/local storage for essentials like sign-in session and theme preferences, and may use
          analytics tools (including Firebase Analytics) to understand product usage. You can control cookies through
          your browser settings; some features may not work without them.
        </p>
      </section>

      <section>
        <h2>7. Data retention</h2>
        <p>
          We keep account and journal data while your account is active and as needed to provide the Service. We may
          retain limited records longer for security, billing, dispute resolution, and legal compliance. You may
          request deletion of your account data subject to those needs.
        </p>
      </section>

      <section>
        <h2>8. Security</h2>
        <p>
          We use reasonable technical and organizational measures to protect information. No method of transmission or
          storage is completely secure, so we cannot guarantee absolute security.
        </p>
      </section>

      <section>
        <h2>9. Children</h2>
        <p>
          Dreamly is not directed to children under 13 (or the minimum age required in your country). If you believe a
          child provided personal information, contact us so we can take appropriate action.
        </p>
      </section>

      <section>
        <h2>10. Your choices</h2>
        <ul>
          <li>Update profile information in your account settings</li>
          <li>Stop using the Service or request account deletion</li>
          <li>Disconnect third-party publishing authorizations</li>
          <li>Control browser cookies and analytics where available</li>
        </ul>
      </section>

      <section>
        <h2>11. International users</h2>
        <p>
          Dreamly may be operated using servers and providers in different countries. By using the Service, you
          understand your information may be processed outside your home country with appropriate safeguards where
          required.
        </p>
      </section>

      <section>
        <h2>12. Changes</h2>
        <p>
          We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at the top will
          change when we do. Continued use of Dreamly after an update means you accept the revised policy.
        </p>
      </section>

      <section>
        <h2>13. Contact</h2>
        <p>
          Questions about privacy: reach us through the Dreamly website at{" "}
          <Link href="https://dreamly.art">https://dreamly.art</Link> or your account support channels in the app.
        </p>
        <p>
          See also our <Link href="/terms">Terms of Service</Link>.
        </p>
      </section>
    </LegalShell>
  );
}
