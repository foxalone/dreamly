import { SUPPORT_EMAIL, type Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import LocaleLink from "@/lib/i18n/LocaleLink";

export default function SiteLegalFooter({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const linkClass = "text-sm text-[var(--muted)] transition hover:text-[var(--text)]";
  return (
    <footer className="border-t border-[var(--border)]">
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-6 py-8 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <nav aria-label={t.dictionary.legal} className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <LocaleLink href="/pricing" className={linkClass}>
            {t.legal.pricing}
          </LocaleLink>
          <LocaleLink href="/terms" className={linkClass}>
            {t.legal.terms}
          </LocaleLink>
          <LocaleLink href="/privacy" className={linkClass}>
            {t.legal.privacy}
          </LocaleLink>
          <LocaleLink href="/refund" className={linkClass}>
            {t.legal.refund}
          </LocaleLink>
          <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
            {SUPPORT_EMAIL}
          </a>
        </nav>
        <p className="text-sm text-[var(--muted)]">© {new Date().getFullYear()} Dreamly</p>
      </div>
    </footer>
  );
}
