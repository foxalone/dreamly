import {
  ArrowRight,
  BookOpenText,
  Globe2,
  Images,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import { POPULAR_DREAM_SLUGS } from "@/lib/dream-dictionary";
import type { Locale } from "@/lib/i18n/config";
import { SITE_URL } from "@/lib/i18n/config";
import { getLocalizedEntry } from "@/lib/i18n/localize-dictionary";
import { getMessages } from "@/lib/i18n/messages";
import { absoluteLocaleUrl, localePath } from "@/lib/i18n/path";
import LocaleLink from "@/lib/i18n/LocaleLink";
import LanguageSwitcher from "@/lib/i18n/LanguageSwitcher";
import HomeHero from "@/app/components/HomeHero";

export default function HomeView({ locale }: { locale: Locale }) {
  const t = getMessages(locale);
  const popularDreams = POPULAR_DREAM_SLUGS.map((slug) => getLocalizedEntry(slug, locale)).filter(Boolean);

  const features = [
    { icon: Sparkles, title: t.home.interpreterTitle, description: t.home.interpreterBody, href: "/app/dreams", linkLabel: t.home.interpreterCta },
    { icon: NotebookPen, title: t.home.journalTitle, description: t.home.journalBody, href: "/app/dreams", linkLabel: t.home.journalCta },
    { icon: Globe2, title: t.home.mapTitle, description: t.home.mapBody, href: "/app/map", linkLabel: t.home.mapCta },
    { icon: Images, title: t.home.galleryTitle, description: t.home.galleryBody, href: "/gallery", linkLabel: t.home.galleryCta },
    { icon: BookOpenText, title: t.home.dictionaryTitle, description: t.home.dictionaryBody, href: "/dreams", linkLabel: t.home.dictionaryCta },
  ];

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Dreamly",
    url: SITE_URL,
    logo: `${SITE_URL}/icon-512.png`,
  };

  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Dreamly",
    url: absoluteLocaleUrl("/", locale),
    description: t.home.lead,
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteLocaleUrl("/dreams", locale)}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: t.home.faqs.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  return (
    <main className="min-h-screen bg-[var(--bg)] px-6 text-[var(--text)]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <div className="flex justify-end pt-4">
        <LanguageSwitcher />
      </div>

      <HomeHero />

      <section id="features" aria-labelledby="features-title" className="mx-auto max-w-4xl scroll-mt-8 pb-20 pt-6">
        <div className="text-center">
          <h2 id="features-title" className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.home.featuresTitle}</h2>
          <p className="mt-4 text-[var(--muted)] text-base sm:text-lg">{t.home.featuresLead}</p>
        </div>
        <div className="mt-10 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          {features.map(({ icon: Icon, title, description, href, linkLabel }) => (
            <div key={title} className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-purple-600/15 text-purple-400">
                <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-[var(--muted)]">{description}</p>
              <LocaleLink href={href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-purple-400 transition-colors hover:text-purple-300">
                {linkLabel} <ArrowRight size={14} aria-hidden="true" />
              </LocaleLink>
            </div>
          ))}
        </div>
      </section>

      <section id="popular-dreams" aria-labelledby="popular-dreams-title" className="mx-auto max-w-4xl scroll-mt-8 pb-20">
        <div className="text-center">
          <h2 id="popular-dreams-title" className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.home.popularTitle}</h2>
          <p className="mt-4 text-[var(--muted)] text-base sm:text-lg">{t.home.popularLead}</p>
        </div>
        <div className="mt-10 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {popularDreams.map((entry) => (
            <LocaleLink
              key={entry!.slug}
              href={`/dreams/${entry!.slug}`}
              className="group flex min-w-0 items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--text)] hover:bg-[var(--surface)]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--surface)] text-2xl" aria-hidden="true">
                {entry!.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{entry!.title}</span>
                <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">{entry!.shortMeaning}</span>
              </span>
              <ArrowRight size={15} className="shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--text)]" aria-hidden="true" />
            </LocaleLink>
          ))}
        </div>
        <div className="mt-10 text-center">
          <LocaleLink
            href="/dreams"
            className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border)] px-8 py-3.5 text-base font-semibold transition-all duration-200 hover:border-[var(--text)] hover:bg-[var(--card)]"
          >
            {t.home.browseFull}
            <ArrowRight size={17} aria-hidden="true" />
          </LocaleLink>
        </div>
      </section>

      <section aria-labelledby="faq-title" className="mx-auto max-w-3xl pb-20">
        <h2 id="faq-title" className="text-center text-2xl sm:text-3xl font-semibold tracking-tight">{t.home.faqTitle}</h2>
        <div className="mt-8 space-y-3">
          {t.home.faqs.map(({ question, answer }) => (
            <details key={question} className="group rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 open:bg-[var(--surface)]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold sm:text-base">
                {question}
                <span className="text-xl font-light text-[var(--muted)] transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 pr-6 text-sm leading-7 text-[var(--muted)]">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-2xl pb-24 text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.home.closingTitle}</h2>
        <p className="mt-4 text-[var(--muted)] text-base sm:text-lg">{t.home.closingLead}</p>
        <LocaleLink
          href="/dreams"
          className="mt-8 inline-block bg-purple-600 hover:bg-purple-500 text-white text-lg font-semibold px-10 py-4 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95"
        >
          {t.home.cta}
        </LocaleLink>
      </section>
    </main>
  );
}

export function homeMetadata(locale: Locale) {
  const t = getMessages(locale);
  const url = localePath("/", locale);
  return {
    title: t.home.h1,
    description: t.home.lead,
    alternates: {
      canonical: url,
      languages: {
        "x-default": "/",
        en: "/",
        es: "/es",
        ar: "/ar",
        pt: "/pt",
        de: "/de",
        ru: "/ru",
      },
    },
    openGraph: { title: t.home.h1, description: t.home.lead, url, type: "website" as const },
  };
}
