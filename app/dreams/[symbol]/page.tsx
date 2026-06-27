import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Brain,
  CircleHelp,
  Compass,
  LibraryBig,
  MoonStar,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import SectionJumpNav from "../SectionJumpNav";
import { DREAM_DICTIONARY, DREAM_SLUGS, getDreamEntry } from "@/lib/dream-dictionary";

type PageProps = { params: Promise<{ symbol: string }> };

export function generateStaticParams() {
  return DREAM_SLUGS.map((symbol) => ({ symbol }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { symbol } = await params;
  const entry = getDreamEntry(symbol);
  if (!entry) return {};

  const title = `${entry.symbol} Dream Meaning & Interpretation | Dreamly`;
  const url = `/dreams/${entry.slug}`;

  return {
    title,
    description: entry.metaDescription,
    alternates: { canonical: url },
    openGraph: { title, description: entry.metaDescription, url, type: "article" },
    twitter: { card: "summary", title, description: entry.metaDescription },
  };
}

function InterpretationSection({
  id,
  eyebrow,
  title,
  icon: Icon,
  accent,
  paragraphs,
}: {
  id: string;
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  accent: string;
  paragraphs: string[];
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-[var(--dd-border)] py-10 sm:py-14">
      <div className="grid gap-6 md:grid-cols-[190px_1fr] md:gap-12">
        <div>
          <span className="grid size-11 place-items-center rounded-2xl" style={{ backgroundColor: `${accent}18`, color: accent }}>
            <Icon size={21} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">{eyebrow}</p>
          <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-[var(--dd-text)]">{title}</h2>
        </div>
        <div className="space-y-5 text-[15px] leading-7 text-[var(--dd-text-soft)] sm:text-base sm:leading-8">
          {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
      </div>
    </section>
  );
}

export default async function DreamSymbolPage({ params }: PageProps) {
  const { symbol } = await params;
  const entry = getDreamEntry(symbol);
  if (!entry) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${entry.symbol} Dream Meaning & Interpretation`,
    description: entry.metaDescription,
    mainEntityOfPage: `https://dreamly.art/dreams/${entry.slug}`,
    author: { "@type": "Organization", name: "Dreamly" },
    publisher: { "@type": "Organization", name: "Dreamly" },
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entry.questions.map(({ question, answer }) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />

      <article className="mx-auto max-w-5xl px-5 pb-12 pt-8 sm:px-8 sm:pt-12">
        <Link href="/dreams" className="inline-flex items-center gap-2 text-sm text-[var(--dd-subtle)] transition hover:text-[var(--dd-text)]">
          <ArrowLeft size={15} aria-hidden="true" /> All dream symbols
        </Link>

        <header className="relative mt-8 overflow-hidden rounded-[2rem] border border-[var(--dd-border)] bg-[var(--dd-surface)] px-6 py-10 sm:px-10 sm:py-14">
          <div
            className="pointer-events-none absolute -right-12 -top-24 size-72 rounded-full blur-[85px]"
            style={{ backgroundColor: `${entry.accent}28` }}
          />
          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_190px]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: entry.accent }}>Dream symbol</p>
              <h1 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
                {entry.symbol} dream meaning
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-[var(--dd-muted)] sm:text-lg sm:leading-8">{entry.shortMeaning}</p>
            </div>
            <div className="hidden justify-center md:flex">
              <span className="text-8xl drop-shadow-2xl" aria-hidden="true">{entry.emoji}</span>
            </div>
          </div>
        </header>

        <SectionJumpNav accent={entry.accent} />

        <section id="meaning" className="scroll-mt-24 py-12 sm:py-16">
          <div className="grid gap-6 md:grid-cols-[190px_1fr] md:gap-12">
            <div>
              <span className="grid size-11 place-items-center rounded-2xl" style={{ backgroundColor: `${entry.accent}18`, color: entry.accent }}>
                <BookOpenText size={21} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Core symbol</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight">What it means</h2>
            </div>
            <div>
              <div className="space-y-5 text-[15px] leading-7 text-[var(--dd-text-soft)] sm:text-base sm:leading-8">
                {entry.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {entry.scenarios.map((scenario) => (
                  <div key={scenario.title} className="rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] p-4">
                    <h3 className="text-sm font-semibold text-[var(--dd-text)]">{scenario.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--dd-subtle)]">{scenario.meaning}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <InterpretationSection id="psychology" eyebrow="The inner mind" title="Psychological interpretation" icon={Brain} accent={entry.accent} paragraphs={entry.psychological} />
        <InterpretationSection id="spiritual" eyebrow="Personal meaning" title="Spiritual interpretation" icon={Sparkles} accent={entry.accent} paragraphs={entry.spiritual} />
        <InterpretationSection id="islamic" eyebrow="Faith perspective" title="Islamic interpretation" icon={MoonStar} accent={entry.accent} paragraphs={entry.islamic} />
        <InterpretationSection id="biblical" eyebrow="Faith perspective" title="Biblical interpretation" icon={LibraryBig} accent={entry.accent} paragraphs={entry.biblical} />

        <section id="questions" className="scroll-mt-24 border-t border-[var(--dd-border)] py-10 sm:py-14">
          <div className="grid gap-6 md:grid-cols-[190px_1fr] md:gap-12">
            <div>
              <span className="grid size-11 place-items-center rounded-2xl" style={{ backgroundColor: `${entry.accent}18`, color: entry.accent }}>
                <CircleHelp size={21} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Popular questions</p>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight">People also ask</h2>
            </div>
            <div className="space-y-3">
              {entry.questions.map(({ question, answer }) => (
                <details key={question} className="group rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] p-5 open:bg-[var(--dd-surface-hover)]">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-[var(--dd-text)] sm:text-base">
                    {question}
                    <span className="text-xl font-light text-[var(--dd-subtle)] transition group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-4 pr-6 text-sm leading-7 text-[var(--dd-muted)]">{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section id="related" className="scroll-mt-24 border-t border-[var(--dd-border)] py-10 sm:py-14">
          <div className="flex items-end justify-between gap-5">
            <div>
              <span className="grid size-11 place-items-center rounded-2xl" style={{ backgroundColor: `${entry.accent}18`, color: entry.accent }}>
                <Compass size={21} strokeWidth={1.8} aria-hidden="true" />
              </span>
              <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--dd-subtle)]">Keep exploring</p>
              <h2 className="mt-1.5 text-2xl font-semibold tracking-tight">Related dream symbols</h2>
            </div>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {entry.related.map(({ slug, reason }) => {
              const related = DREAM_DICTIONARY[slug];
              return (
                <Link key={slug} href={`/dreams/${slug}`} className="group rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface-soft)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--dd-border-strong)] hover:bg-[var(--dd-surface-hover)]">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl" aria-hidden="true">{related.emoji}</span>
                    <ArrowRight size={16} className="text-[var(--dd-faint)] transition group-hover:translate-x-1 group-hover:text-[var(--dd-text)]" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold text-[var(--dd-text)]">{related.symbol} dreams</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--dd-subtle)]">{reason}</p>
                </Link>
              );
            })}
          </div>
        </section>

        <aside className="rounded-2xl border border-amber-400/20 bg-amber-300/[0.07] p-5 text-xs leading-6 text-[var(--dd-subtle)]">
          Dream meanings are a tool for reflection, not prediction or diagnosis. Religious sections summarize broad interpretive traditions and are not religious rulings.
        </aside>
      </article>
    </main>
  );
}
