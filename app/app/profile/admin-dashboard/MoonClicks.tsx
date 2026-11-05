"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { adminMoonClicksCopy } from "@/lib/i18n/adminMoonClicks";

type Counts = { dreams: number; stories: number; journal: number; shared: number };
type Delta = Counts & { moon: number | null; earth: number | null };

function formatDelta(value: number | null, locale: string) {
  if (value == null) return null;
  const abs = Math.abs(value).toLocaleString(locale);
  if (value > 0) return `+${abs}`;
  if (value < 0) return `−${abs}`;
  return "0";
}

function deltaClass(value: number | null) {
  if (value == null || value === 0) return "text-[var(--muted)]";
  return value > 0 ? "text-emerald-400" : "text-red-300";
}

export default function MoonClicks({ user }: { user: User }) {
  const locale = useLocale();
  const copy = adminMoonClicksCopy[locale];
  const [moon, setMoon] = useState<number | null>(null);
  const [earth, setEarth] = useState<number | null>(null);
  const [translation, setTranslation] = useState<number | null>(null);
  const [horoscopeMore, setHoroscopeMore] = useState<number | null>(null);
  const [tarotMore, setTarotMore] = useState<number | null>(null);
  const [comments, setComments] = useState<number | null>(null);
  const [xp, setXp] = useState<number | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [delta, setDelta] = useState<Delta | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const response = await fetch(`/api/admin/content-counts?tzOffsetMin=${new Date().getTimezoneOffset()}`, {
          headers: { Authorization: `Bearer ${await user.getIdToken()}` },
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("COUNT_FAILED");
        const data = await response.json();
        if (controller.signal.aborted) return;
        setMoon(data.moon);
        setEarth(data.earth);
        setTranslation(data.translation);
        setHoroscopeMore(data.horoscopeMore);
        setTarotMore(data.tarotMore);
        setComments(data.comments);
        setXp(data.xp);
        setCounts(data.counts);
        setDelta(data.delta);
      } catch {
        if (!controller.signal.aborted) setError(true);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [user, revision]);

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener("dreamly:admin-comments-changed", refresh);
    return () => window.removeEventListener("dreamly:admin-comments-changed", refresh);
  }, []);

  const stats: { label: string; value: number | null; change: number | null }[] = [
    { label: copy.title, value: moon, change: delta?.moon ?? null },
    { label: copy.earth, value: earth, change: delta?.earth ?? null },
    { label: copy.translation, value: translation, change: null },
    { label: copy.horoscopeMore, value: horoscopeMore, change: null },
    { label: copy.tarotMore, value: tarotMore, change: null },
    { label: copy.dreams, value: counts?.dreams ?? null, change: delta?.dreams ?? null },
    { label: copy.stories, value: counts?.stories ?? null, change: delta?.stories ?? null },
    { label: copy.journal, value: counts?.journal ?? null, change: delta?.journal ?? null },
    { label: copy.shared, value: counts?.shared ?? null, change: delta?.shared ?? null },
    { label: copy.comments, value: comments, change: null },
    { label: copy.xp, value: xp, change: null },
  ];

  return <section className="mt-5 rounded-2xl border border-[var(--border)] p-4" aria-label={copy.title} dir={locale === "ar" ? "rtl" : undefined}>
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-semibold">🌙 {copy.title}</h2>
      <button type="button" onClick={() => setRevision(value => value + 1)} disabled={loading} className="rounded-full border border-[var(--border)] px-3 py-1 text-sm disabled:opacity-50">{copy.refresh}</button>
    </div>
    {error ? <p role="alert" className="mt-3 text-sm">{copy.error}</p> : (
      <div className="mt-3 flex flex-wrap items-end gap-x-8 gap-y-4">
        {stats.map((stat) => {
          const shown = loading || stat.value == null ? "…" : stat.value.toLocaleString(locale);
          const change = formatDelta(loading ? null : stat.change, locale);
          return (
            <div key={stat.label}>
              <p className="text-3xl font-semibold tabular-nums" role="status">{shown}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{stat.label}</p>
              <p className={`mt-0.5 h-4 text-[11px] font-medium tabular-nums ${deltaClass(stat.change)}`}>{change ?? ""}</p>
            </div>
          );
        })}
      </div>
    )}
    <p className="mt-2 text-xs text-[var(--muted)]">{copy.sinceYesterday}</p>
    <p className="mt-1 text-sm text-[var(--muted)]">{copy.note}</p>
    <p className="mt-1 text-sm text-[var(--muted)]">{copy.translationNote}</p>
    <p className="mt-1 text-sm text-[var(--muted)]">{copy.horoscopeMoreNote}</p>
    <p className="mt-1 text-sm text-[var(--muted)]">{copy.tarotMoreNote}</p>
    <p className="mt-1 text-sm text-[var(--muted)]">{copy.commentsXpNote}</p>
  </section>;
}
