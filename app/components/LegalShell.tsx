import type { ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { SUPPORT_EMAIL } from "@/lib/i18n/config";

export default function LegalShell({
  title,
  updated,
  locale = DEFAULT_LOCALE,
  children,
}: {
  title: string;
  updated: string;
  locale?: Locale;
  children: ReactNode;
}) {
  const t = getMessages(locale);
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--text)]">
      <header className="border-b border-[var(--border)]">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4 sm:px-8">
          <LocaleLink href="/" className="text-sm font-semibold tracking-wide text-[var(--text)]">
            Dreamly
          </LocaleLink>
          <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm text-[var(--muted)]">
            <LocaleLink href="/pricing" className="hover:text-[var(--text)]">
              {t.legal.pricingShort}
            </LocaleLink>
            <LocaleLink href="/privacy" className="hover:text-[var(--text)]">
              {t.legal.privacyShort}
            </LocaleLink>
            <LocaleLink href="/terms" className="hover:text-[var(--text)]">
              {t.legal.termsShort}
            </LocaleLink>
            <LocaleLink href="/refund" className="hover:text-[var(--text)]">
              {t.legal.refundShort}
            </LocaleLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">{t.dictionary.legal}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--text)] sm:text-4xl">{title}</h1>
        <p className="mt-3 text-sm text-[var(--muted)]">
          {t.legal.updated}: {updated}
        </p>
        <div className="prose-legal mt-10 space-y-8 text-[15px] leading-7 text-[var(--muted)] [&_a]:text-[var(--text)] [&_a]:underline [&_a]:underline-offset-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-tight [&_h2]:text-[var(--text)] [&_li]:mt-1 [&_strong]:font-semibold [&_strong]:text-[var(--text)] [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">
          {children}
        </div>
      </main>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-sm text-[var(--muted)] sm:px-8">
          <LocaleLink href="/" className="hover:text-[var(--text)]">
            ← {t.legal.home}
          </LocaleLink>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="hover:text-[var(--text)]">
            {SUPPORT_EMAIL}
          </a>
          <p>© {new Date().getFullYear()} Dreamly</p>
        </div>
      </footer>
    </div>
  );
}
