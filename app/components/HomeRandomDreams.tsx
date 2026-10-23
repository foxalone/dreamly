"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Locale } from "@/lib/i18n/config";
import { randomDreamMessages } from "@/lib/i18n/random-dreams";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { pickRandomDreams, type RandomDreamCard } from "@/lib/randomDreams";

export default function HomeRandomDreams({ locale }: { locale: Locale }) {
  const t = randomDreamMessages[locale];
  const section = useRef<HTMLElement>(null);
  const [dreams, setDreams] = useState<RandomDreamCard[] | null>(null);

  useEffect(() => {
    const abort = new AbortController();
    let started = false;
    const load = async () => {
      if (started) return;
      started = true;
      try {
        const response = await fetch("/api/dreams/random-public", { signal: abort.signal });
        if (!response.ok) throw new Error("Dreams unavailable");
        const data = await response.json();
        if (!abort.signal.aborted) setDreams(pickRandomDreams(Array.isArray(data.dreams) ? data.dreams : [], 3));
      } catch {
        if (!abort.signal.aborted) setDreams([]);
      }
    };
    const observer = typeof IntersectionObserver !== "undefined" ? new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { observer?.disconnect(); void load(); }
    }, { rootMargin: "300px" }) : null;
    if (observer && section.current) observer.observe(section.current);
    else void load();
    return () => { abort.abort(); observer?.disconnect(); };
  }, []);

  if (dreams?.length === 0) return null;

  return (
    <section ref={section} id="random-dreams" aria-labelledby="random-dreams-title" className="mx-auto max-w-4xl scroll-mt-8 pb-20" dir={locale === "ar" ? "rtl" : "ltr"}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="random-dreams-title" className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.title}</h2>
        <LocaleLink href="/app/shared" className="inline-flex items-center gap-1.5 text-sm font-semibold text-purple-500 hover:text-purple-400">{t.feed}<ArrowRight size={15} aria-hidden="true" /></LocaleLink>
      </div>
      <div aria-busy={dreams === null} className="mt-8 grid auto-cols-[85%] grid-flow-col gap-3 overflow-x-auto overscroll-x-contain pb-2 snap-x snap-mandatory sm:auto-cols-fr">
        {dreams === null ? <>
          <span className="sr-only" role="status">{t.loading}</span>
          {[0, 1, 2].map(index => <div key={index} aria-hidden="true" className="h-52 rounded-2xl border border-[var(--border)] bg-[var(--card)] motion-safe:animate-pulse" />)}
        </> : dreams.map(dream => (
          <LocaleLink key={dream.id} href={`/app/shared?dream=${encodeURIComponent(dream.id)}`} className="group flex min-w-0 snap-start flex-col rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 transition-colors hover:border-purple-400/60 focus-visible:outline-2 focus-visible:outline-purple-400">
            <span className="text-2xl" aria-hidden="true">{dream.emojis.length ? dream.emojis.join(" ") : "💭"}</span>
            <p dir="auto" className="mt-4 line-clamp-4 flex-1 text-sm leading-6 text-[var(--text)]">{dream.snippet}</p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-purple-500">{t.read}<ArrowRight size={14} aria-hidden="true" /></span>
          </LocaleLink>
        ))}
      </div>
    </section>
  );
}
