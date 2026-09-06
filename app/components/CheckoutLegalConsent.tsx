"use client";

import LocaleLink from "@/lib/i18n/LocaleLink";
import { useMessages } from "@/lib/i18n/LocaleProvider";

export default function CheckoutLegalConsent({ className }: { className?: string }) {
  const t = useMessages();
  return (
    <p className={className}>
      {t.legal.checkoutPrefix}{" "}
      <LocaleLink href="/terms" className="underline underline-offset-2 hover:text-[var(--text)]">
        {t.legal.terms}
      </LocaleLink>{" "}
      {t.legal.checkoutAnd}{" "}
      <LocaleLink href="/refund" className="underline underline-offset-2 hover:text-[var(--text)]">
        {t.legal.refund}
      </LocaleLink>
      .
    </p>
  );
}
