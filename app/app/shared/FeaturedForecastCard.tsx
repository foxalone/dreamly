"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { trackHoroscopeMoreClick } from "@/lib/trackHoroscopeMoreClick";
import { localePath } from "@/lib/i18n/path";
import type { Locale } from "@/lib/i18n/config";
import { featuredCopy } from "@/lib/i18n/featured-horoscope";
import { horoscopeCopy } from "@/lib/i18n/horoscope";
import { SIGNS, SYMBOLS, type Sign } from "@/lib/horoscope/model";

export type FeaturedForecastPreview = { day: string; sign: Sign; headline: string; teaser: string; publishedAtMs: number };

export default function FeaturedForecastCard({ locale, item }: { locale: Locale; item: FeaturedForecastPreview }) {
  const t = featuredCopy[locale];
  const href = localePath(`/horoscope/daily/${item.day}`, locale);
  return (
    <article>
      <Link href={href} onClick={() => { void trackHoroscopeMoreClick(item.sign); }} className="group relative block overflow-hidden rounded-[1.6rem] border border-violet-300/30 bg-[radial-gradient(circle_at_95%_0%,rgba(156,109,255,.25),transparent_48%),linear-gradient(135deg,#1d1631,#15121f)] p-5 text-white shadow-[0_16px_45px_rgba(50,28,96,.18)] transition-colors hover:border-violet-300/55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300">
      <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[.16em] text-violet-200">
        <span className="inline-flex items-center gap-2"><Sparkles size={15} aria-hidden />{t.feedTag}</span>
        <time dateTime={item.day} className="shrink-0 whitespace-nowrap text-[10px] tracking-normal tabular-nums">{item.day}</time>
      </div>
      <div className="mt-5 flex items-center gap-3"><span className="flex size-12 shrink-0 items-center justify-center rounded-full border border-violet-300/40 bg-violet-300/10 text-3xl" aria-hidden>{SYMBOLS[SIGNS.indexOf(item.sign)]}</span><div><p className="text-sm text-violet-200">{horoscopeCopy[locale].signs[item.sign]}</p><h2 className="text-xl font-semibold leading-snug" lang="en">{item.headline}</h2></div></div>
      <p className="mt-4 line-clamp-2 text-sm leading-6 text-white/75" lang="en">{item.teaser}</p>
      <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-violet-200 group-hover:text-white">{t.feedMore}<ArrowUpRight size={15} aria-hidden /></span>
      </Link>
    </article>
  );
}
