"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { onAuthStateChanged, type User } from "firebase/auth";
import { ArrowLeft, ArrowUpRight, BriefcaseBusiness, Heart, Languages, Leaf, MoonStar, Play, Sparkles } from "lucide-react";
import { auth } from "@/lib/firebase";
import { clearOfferwallEntitlement } from "@/lib/adUnlock";
import { localePath } from "@/lib/i18n/path";
import type { Locale } from "@/lib/i18n/config";
import { featuredCopy } from "@/lib/i18n/featured-horoscope";
import { horoscopeCopy } from "@/lib/i18n/horoscope";
import { type FeaturedForecast } from "@/lib/featuredHoroscope";
import type { FeaturedDreamRecommendation } from "@/lib/featuredDreamRecommendations";
import { SYMBOLS, SIGNS } from "@/lib/horoscope/model";
import { resolveTranslationLanguage, TRANSLATION_LANGUAGES } from "@/lib/translationLanguage";
import PlansModal from "@/app/components/PlansModal";
import { actionPurchaseCopy } from "@/lib/i18n/action-purchase";

type PublicForecast = Pick<FeaturedForecast, "day" | "sign" | "headline" | "teaser" | "publishedAtMs">;
type Content = Pick<FeaturedForecast, "headline" | "teaser" | "opening" | "relationships" | "work" | "wellbeing" | "takeaway">;
type Locked = "read" | "translate" | null;

export default function FeaturedArticleClient({ forecast, locale, dreams = [] }: { forecast: PublicForecast; locale: Locale; dreams?: FeaturedDreamRecommendation[] }) {
  const t = featuredCopy[locale];
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [full, setFull] = useState<FeaturedForecast | null>(null);
  const [translated, setTranslated] = useState<Content | null>(null);
  const [targetLang, setTargetLang] = useState<keyof typeof TRANSLATION_LANGUAGES>("en");
  const [locked, setLocked] = useState<Locked>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [purchasePurpose, setPurchasePurpose] = useState<"read" | "translate" | null>(null);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  useEffect(() => {
    const update = () => setTargetLang(resolveTranslationLanguage(null, navigator.languages?.length ? navigator.languages : [navigator.language]));
    update(); window.addEventListener("languagechange", update);
    return () => window.removeEventListener("languagechange", update);
  }, []);

  const headersFor = useCallback(async (account: User | null) => ({
    "Content-Type": "application/json",
    ...(account ? { Authorization: `Bearer ${await account.getIdToken()}` } : {}),
  }), []);

  const translate = useCallback(async (account: User | null, lang: typeof targetLang) => {
    if (lang === "en") return;
    setBusy(true); setError(false);
    try {
      const response = await fetch("/api/featured-horoscope/translate", { method: "POST", headers: await headersFor(account), body: JSON.stringify({ day: forecast.day, lang }) });
      if (response.status === 402) { setLocked("translate"); return; }
      if (!response.ok) throw new Error("Translation failed");
      const data = await response.json() as { translation: Content };
      setTranslated(data.translation); setLocked(null);
    } catch { setError(true); }
    finally { setBusy(false); }
  }, [forecast.day, headersFor]);

  useEffect(() => {
    if (user === undefined) return;
    let cancelled = false;
    void (async () => {
      setBusy(true); setError(false);
      try {
        const response = await fetch("/api/featured-horoscope", { method: "POST", headers: await headersFor(user), body: JSON.stringify({ day: forecast.day }) });
        if (cancelled) return;
        if (response.status === 402) { setLocked("read"); return; }
        if (!response.ok) throw new Error("Forecast failed");
        const data = await response.json() as { forecast: FeaturedForecast };
        setFull(data.forecast); setLocked(null);
        const requested = new URLSearchParams(window.location.search).get("translate");
        if (requested && requested === targetLang && requested !== "en") void translate(user, targetLang);
      } catch { if (!cancelled) setError(true); }
      finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [user, forecast.day, headersFor, targetLang, translate]);

  async function watchAd(purpose: "read" | "translate") {
    if (busy) return;
    setBusy(true); setError(false);
    try {
      const response = await fetch("/api/featured-horoscope/ad", {
        method: "POST", headers: await headersFor(user ?? null),
        body: JSON.stringify({ action: "start", day: forecast.day, purpose, ...(purpose === "translate" ? { lang: targetLang } : {}) }),
      });
      if (!response.ok) throw new Error("Ad unavailable");
      const { challenge } = await response.json() as { challenge: string };
      clearOfferwallEntitlement();
      const next = localePath(`/horoscope/daily/${forecast.day}`, locale) + (purpose === "translate" ? `?translate=${targetLang}` : "");
      const params = new URLSearchParams({ kind: "featured", challenge, next, locale });
      window.location.assign(`/ad/unlock?${params}`);
    } catch { setBusy(false); setError(true); setPurchasePurpose(purpose); }
  }

  const name = horoscopeCopy[locale].signs[forecast.sign];
  const symbol = SYMBOLS[SIGNS.indexOf(forecast.sign)];
  const date = new Intl.DateTimeFormat(locale === "pt" ? "pt-BR" : locale, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${forecast.day}T12:00:00Z`));
  const content: Content | null = translated ?? full;
  return (
    <main className="min-h-screen bg-[#090714] text-white">
      <div className="mx-auto max-w-4xl px-5 pb-20 pt-8 sm:px-8">
        <Link href={localePath("/app/shared", locale)} className="inline-flex items-center gap-2 text-sm text-violet-200 hover:text-white"><ArrowLeft size={16} aria-hidden />{t.feedTag}</Link>
        <div className="relative mt-7 overflow-hidden rounded-[2rem] border border-violet-300/20 bg-[radial-gradient(circle_at_80%_8%,rgba(159,111,255,.35),transparent_35%),linear-gradient(145deg,#21143d,#100d22_62%,#171026)] p-7 shadow-[0_25px_80px_rgba(60,30,110,.35)] sm:p-12">
          <div className="pointer-events-none absolute -right-8 top-4 select-none text-[12rem] leading-none text-violet-100/10 sm:text-[18rem]" aria-hidden>{symbol}</div>
          <p className="relative text-xs font-semibold uppercase tracking-[.24em] text-violet-200">✦ Dreamly · {t.title}</p>
          <p className="relative mt-5 text-sm text-violet-100/75"><time dateTime={forecast.day}>{date}</time></p>
          <h1 className="relative mt-4 max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">{name}<span className="ms-3 text-violet-300" aria-hidden>{symbol}</span></h1>
          <h2 className="relative mt-5 max-w-2xl text-2xl font-medium leading-snug text-white/90 sm:text-3xl" lang={translated ? targetLang : "en"}>{content?.headline ?? forecast.headline}</h2>
          <p className="relative mt-6 max-w-2xl border-s-2 border-violet-300/70 ps-5 text-lg leading-8 text-violet-50/85" lang={translated ? targetLang : "en"}>{content?.teaser ?? forecast.teaser}</p>
        </div>

        {error ? <p role="alert" className="mt-5 rounded-2xl border border-rose-300/30 bg-rose-900/20 p-4 text-rose-100">{t.error}</p> : null}
        {busy && !full ? <p role="status" className="mt-8 text-center text-violet-200">{t.loading}</p> : null}
        {locked === "read" ? (
          <div className="mt-8 rounded-3xl border border-violet-300/25 bg-[#18122d] p-6 text-center sm:p-9">
            <Sparkles className="mx-auto text-violet-300" size={28} aria-hidden />
            <p className="mt-4 text-lg font-medium">{t.locked}</p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button type="button" disabled={busy} onClick={() => void watchAd("read")} className="inline-flex items-center gap-2 rounded-full bg-violet-400 px-5 py-3 font-semibold text-[#120c24] disabled:opacity-60"><Play size={17} aria-hidden />{t.watchAd}</button>
              <Link href={localePath("/app/upgrade", locale)} className="inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 font-semibold text-white">{t.subscribe}<ArrowUpRight size={17} aria-hidden /></Link>
            </div>
          </div>
        ) : null}

        {full ? <>
          {targetLang !== "en" ? <div className="mt-8 flex justify-end"><button type="button" disabled={busy} onClick={() => translated ? setTranslated(null) : void translate(user ?? null, targetLang)} className="inline-flex items-center gap-2 rounded-full border border-violet-300/35 bg-violet-300/10 px-4 py-2 text-sm font-semibold text-violet-100 disabled:opacity-60"><Languages size={16} aria-hidden />{translated ? t.showEnglish : t.translate.replace("{language}", TRANSLATION_LANGUAGES[targetLang])}</button></div> : null}
          {locked === "translate" ? <div className="mt-4 rounded-2xl border border-violet-300/25 bg-[#18122d] p-5"><p>{t.translateLocked}</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={busy} onClick={() => void watchAd("translate")} className="rounded-full bg-violet-400 px-4 py-2 font-semibold text-[#120c24]">{t.watchAd}</button><Link href={localePath("/app/upgrade", locale)} className="rounded-full border border-white/25 px-4 py-2 font-semibold">{t.subscribe}</Link></div></div> : null}
          <article className="mt-5 space-y-5" lang={translated ? targetLang : "en"} dir={translated && (targetLang === "ar" || targetLang === "he") ? "rtl" : "ltr"}>
            <section className="rounded-3xl border border-white/10 bg-white/[.045] p-6 text-lg leading-8 text-white/85 sm:p-9"><p>{content?.opening}</p></section>
            <div className="grid gap-5 md:grid-cols-3">
              {([{ key: "relationships", label: t.relationships, Icon: Heart }, { key: "work", label: t.work, Icon: BriefcaseBusiness }, { key: "wellbeing", label: t.wellbeing, Icon: Leaf }] as const).map(({ key, label, Icon }) => <section key={key} className="rounded-3xl border border-white/10 bg-white/[.045] p-6"><div className="flex items-center gap-3"><Icon className="shrink-0 text-violet-300" size={22} aria-hidden /><h3 className="whitespace-nowrap text-lg font-semibold">{label}</h3></div><p className="mt-4 leading-7 text-white/75">{content?.[key]}</p></section>)}
            </div>
            <section className="rounded-3xl border border-violet-300/25 bg-violet-300/10 p-6 sm:p-8"><p className="text-sm font-semibold uppercase tracking-[.18em] text-violet-200">{t.takeaway}</p><p className="mt-3 text-xl leading-8">{content?.takeaway}</p></section>
          </article>
        </> : null}
        <section className="mt-12 overflow-hidden rounded-3xl border border-violet-300/25 bg-[radial-gradient(circle_at_100%_0%,rgba(145,94,245,.28),transparent_45%),linear-gradient(135deg,#211638,#141122)] p-6 shadow-[0_18px_55px_rgba(38,21,75,.2)] sm:p-8">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[.18em] text-violet-200"><Sparkles size={16} aria-hidden />{t.personalEyebrow}</p>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">{t.personalTitle}</h2>
          <p className="mt-3 max-w-xl leading-7 text-white/70">{t.personalDescription}</p>
          <Link href={localePath("/horoscope", locale)} className="mt-6 inline-flex items-center gap-2 rounded-full bg-violet-300 px-5 py-3 font-semibold text-[#160e2b] transition hover:bg-violet-200">{t.personalAction}<ArrowUpRight size={18} aria-hidden /></Link>
        </section>

        {dreams.length > 0 ? <section className="mt-12" aria-labelledby="featured-more-dreams">
          <h2 id="featured-more-dreams" className="text-2xl font-semibold tracking-tight">{t.discoverDreams}</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {dreams.map(dream => <Link key={dream.id} href={localePath(`/dream/${dream.id}`, locale)} className="group flex min-h-44 flex-col rounded-3xl border border-white/10 bg-white/[.045] p-5 transition hover:border-violet-300/45 hover:bg-violet-300/[.08]">
              <span className="flex items-center justify-between text-violet-200"><MoonStar size={20} aria-hidden /><ArrowUpRight size={16} className="transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden /></span>
              <span className="mt-5 line-clamp-3 flex-1 break-words leading-6 text-white/80" lang={dream.lang ?? undefined} dir="auto">{dream.excerpt}</span>
              <span className="mt-5 text-sm font-semibold text-violet-200">{t.openDream}</span>
            </Link>)}
          </div>
        </section> : null}
      </div>
      <PlansModal open={purchasePurpose !== null} onClose={() => setPurchasePurpose(null)} source="featured_ad_unavailable" title={t.title} body={actionPurchaseCopy[locale].unavailable} oneTime={purchasePurpose ? { kind: "featured", day: forecast.day, purpose: purchasePurpose, lang: purchasePurpose === "translate" ? targetLang : undefined, next: localePath(`/horoscope/daily/${forecast.day}`, locale) + (purchasePurpose === "translate" ? `?translate=${targetLang}` : "") } : null} />
    </main>
  );
}
