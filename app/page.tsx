import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenText,
  ChevronDown,
  Globe2,
  NotebookPen,
  Sparkles,
} from "lucide-react";
import { DREAM_DICTIONARY, POPULAR_DREAM_SLUGS } from "@/lib/dream-dictionary";

export const metadata: Metadata = {
  title: "Dreamly — AI Dream Interpreter & Dream Journal",
  description:
    "Interpret your dreams with AI, keep a private dream journal, and explore an anonymous world map of what people are dreaming. Free dream dictionary with psychological, spiritual, Islamic, and biblical meanings.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Dreamly — AI Dream Interpreter & Dream Journal",
    description:
      "Interpret your dreams with AI, keep a private dream journal, and explore an anonymous world map of what people are dreaming.",
    url: "/",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dreamly — AI Dream Interpreter & Dream Journal",
    description:
      "Interpret your dreams with AI, keep a private dream journal, and explore an anonymous world map of what people are dreaming.",
  },
};

const FEATURES = [
  {
    icon: Sparkles,
    title: "AI Dream Interpreter",
    description:
      "Describe any dream in your own words and get an instant, personal interpretation — the symbols, the emotions, and what they may be reflecting from your waking life.",
    href: "/app",
    linkLabel: "Interpret a dream",
  },
  {
    icon: NotebookPen,
    title: "Private Dream Journal",
    description:
      "Record your dreams the moment you wake up. Your journal stays private, and over time Dreamly helps you spot recurring symbols, themes, and patterns.",
    href: "/app",
    linkLabel: "Start your journal",
  },
  {
    icon: Globe2,
    title: "Anonymous Dream Map",
    description:
      "See what the world is dreaming. Dreams shared anonymously appear on a live world map, so you can discover the symbols people are dreaming about near you and far away.",
    href: "/app/map",
    linkLabel: "Explore the map",
  },
  {
    icon: BookOpenText,
    title: "Dream Dictionary",
    description:
      "Hundreds of dream symbols and variations explained — psychological, spiritual, Islamic, and biblical interpretations, common scenarios, and answers to popular questions.",
    href: "/dreams",
    linkLabel: "Browse the dictionary",
  },
];

const FAQ = [
  {
    question: "What is Dreamly?",
    answer:
      "Dreamly is an AI dream interpreter and dream journal. You describe a dream, and Dreamly analyzes its symbols and emotions to offer a personal interpretation. You can also keep a private journal of your dreams, browse a free dream dictionary, and explore an anonymous world map of what people are dreaming.",
  },
  {
    question: "Is Dreamly free to use?",
    answer:
      "Yes. You can start for free — create an account, journal your dreams, get AI interpretations, and read the full dream dictionary at no cost. Optional upgrades unlock more interpretations and features.",
  },
  {
    question: "How does AI dream interpretation work?",
    answer:
      "You write down your dream in plain language. Dreamly's AI identifies the key symbols, settings, and emotions in it, then combines established dream symbolism with the specific context of your dream to produce an interpretation. It is a tool for reflection, not prediction or diagnosis.",
  },
  {
    question: "Is my dream journal private?",
    answer:
      "Yes. Your dream journal is private by default and only visible to you. Dreams appear on the public dream map only if you choose to share them, and shared dreams are anonymous.",
  },
  {
    question: "What do common dreams like snakes or teeth falling out mean?",
    answer:
      "Common dreams tend to carry recurring themes: snakes often relate to transformation or hidden fear, teeth falling out to loss of control, being chased to avoidance, and water to emotion. Dreamly's dream dictionary covers these and hundreds of other symbols with psychological, spiritual, Islamic, and biblical interpretations.",
  },
];

export default function HomePage() {
  const popularDreams = POPULAR_DREAM_SLUGS.map((slug) => DREAM_DICTIONARY[slug]).filter(Boolean);

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Dreamly",
    url: "https://dreamly.art",
    logo: "https://dreamly.art/icon-512.png",
  };

  const webSiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Dreamly",
    alternateName: "Dreamly AI",
    url: "https://dreamly.art",
    description:
      "AI dream interpreter, private dream journal, anonymous dream map, and a free dream dictionary.",
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://dreamly.art/dreams?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  };

  const webAppJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Dreamly",
    url: "https://dreamly.art",
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    description:
      "Interpret your dreams with AI, keep a private dream journal, and explore an anonymous world map of dreams.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  return (
    <main className="min-h-screen bg-black text-white px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <section className="relative min-h-[92svh] flex items-center justify-center">
        <div className="text-center max-w-2xl">
          <p
            className="text-4xl sm:text-6xl font-semibold tracking-wide mb-8 bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #ff4d6d 0%, #ff9e00 18%, #ffd60a 36%, #38d39f 54%, #4dabf7 72%, #9775fa 100%)",
            }}
          >
            Dreamly
          </p>

          <h1 className="text-xl sm:text-2xl font-medium">
            AI Dream Interpreter, Dream Journal & Anonymous Dream Map
          </h1>

          <p className="mt-6 text-neutral-400 text-base sm:text-lg">
            Capture your dreams. Discover shared symbols.
            See what the world is dreaming.
          </p>

          <Link
            href="/dreams"
            className="mt-10 inline-block bg-purple-600 hover:bg-purple-500
                       text-white text-lg font-semibold
                       px-10 py-4 rounded-2xl
                       transition-all duration-200
                       hover:scale-105 active:scale-95"
          >
            Start Free
          </Link>
        </div>

        <a
          href="#features"
          className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-neutral-400 transition-colors hover:text-white"
        >
          <span className="text-sm font-medium">Discover Dreamly</span>
          <ChevronDown size={20} className="animate-bounce" aria-hidden="true" />
        </a>
      </section>

      <section id="features" aria-labelledby="features-title" className="mx-auto max-w-4xl scroll-mt-8 pb-20 pt-6">
        <div className="text-center">
          <h2 id="features-title" className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Everything your dreams deserve
          </h2>
          <p className="mt-4 text-neutral-400 text-base sm:text-lg">
            One place to understand your dreams — interpret them with AI, keep
            them safe in a journal, and see how they connect to the rest of the world.
          </p>
        </div>

        <div className="mt-10 grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, description, href, linkLabel }) => (
            <div key={title} className="flex flex-col rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
              <span className="grid size-11 place-items-center rounded-xl bg-purple-600/15 text-purple-400">
                <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-2 flex-1 text-sm leading-6 text-neutral-400">{description}</p>
              <Link href={href} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-purple-400 transition-colors hover:text-purple-300">
                {linkLabel} <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section id="popular-dreams" aria-labelledby="popular-dreams-title" className="mx-auto max-w-4xl scroll-mt-8 pb-20">
        <div className="text-center">
          <h2 id="popular-dreams-title" className="text-2xl sm:text-3xl font-semibold tracking-tight">
            Popular dream meanings
          </h2>
          <p className="mt-4 text-neutral-400 text-base sm:text-lg">
            Explore the dream dictionary — psychological, spiritual, Islamic, and
            biblical interpretations of the symbols people dream about most.
          </p>
        </div>

        <div className="mt-10 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {popularDreams.map((entry) => (
            <Link
              key={entry.slug}
              href={`/dreams/${entry.slug}`}
              className="group flex min-w-0 items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 transition hover:-translate-y-0.5 hover:border-neutral-600 hover:bg-neutral-900"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-neutral-900 text-2xl" aria-hidden="true">
                {entry.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{entry.title}</span>
                <span className="mt-0.5 block truncate text-xs text-neutral-500">{entry.shortMeaning}</span>
              </span>
              <ArrowRight size={15} className="shrink-0 text-neutral-600 transition group-hover:translate-x-0.5 group-hover:text-white" aria-hidden="true" />
            </Link>
          ))}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/dreams"
            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-700 px-8 py-3.5 text-base font-semibold transition-all duration-200 hover:border-neutral-500 hover:bg-neutral-900"
          >
            Browse the full dream dictionary
            <ArrowRight size={17} aria-hidden="true" />
          </Link>
        </div>
      </section>

      <section aria-labelledby="faq-title" className="mx-auto max-w-3xl pb-20">
        <h2 id="faq-title" className="text-center text-2xl sm:text-3xl font-semibold tracking-tight">
          Frequently asked questions
        </h2>
        <div className="mt-8 space-y-3">
          {FAQ.map(({ question, answer }) => (
            <details key={question} className="group rounded-2xl border border-neutral-800 bg-neutral-950 p-5 open:bg-neutral-900">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold sm:text-base">
                {question}
                <span className="text-xl font-light text-neutral-500 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 pr-6 text-sm leading-7 text-neutral-400">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-2xl pb-24 text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Start understanding your dreams tonight
        </h2>
        <p className="mt-4 text-neutral-400 text-base sm:text-lg">
          Free to start. Your first interpretation is a dream away.
        </p>
        <Link
          href="/dreams"
          className="mt-8 inline-block bg-purple-600 hover:bg-purple-500 text-white text-lg font-semibold px-10 py-4 rounded-2xl transition-all duration-200 hover:scale-105 active:scale-95"
        >
          Start Free
        </Link>
      </section>
    </main>
  );
}
