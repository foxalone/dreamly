"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { X } from "lucide-react";
import { TarotCardFace } from "@/app/components/tarot/TarotCardFace";
import { LOCALE_META } from "@/lib/i18n/config";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { tarotProfileCopy } from "@/lib/i18n/tarotProfile";
import { MAJOR_ARCANA, tarotCopy, type MajorArcanaId } from "@/lib/tarot/deck";
import styles from "./TarotProfileCards.module.css";

type CollectionEntry = { cardId: MajorArcanaId; count: number; lastDay: string };

export default function TarotProfileCards({ user }: { user: User }) {
  const locale = useLocale();
  const copy = tarotProfileCopy[locale];
  const [cards, setCards] = useState<CollectionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<CollectionEntry | null>(null);
  const cardsRow = useRef<HTMLDivElement>(null);
  const selectedCard = MAJOR_ARCANA.find(card => card.id === selected?.cardId);
  const revealedIds = new Set(cards.map(card => card.cardId));
  const hiddenCards = MAJOR_ARCANA.filter(card => !revealedIds.has(card.id));
  const dateFormat = new Intl.DateTimeFormat(LOCALE_META[locale].htmlLang.replace("_", "-"), { dateStyle: "medium", timeZone: "UTC" });

  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    void (async () => {
      const token = await user.getIdToken();
      const response = await fetch("/api/tarot/collection", {
        headers: { Authorization: `Bearer ${token}` }, credentials: "same-origin", cache: "no-store", signal: controller.signal,
      });
      if (!response.ok) throw new Error("Tarot collection unavailable");
      const result = await response.json() as { cards?: CollectionEntry[] };
      if (alive) {
        setCards(Array.isArray(result.cards) ? result.cards : []);
        setError(false);
      }
    })().catch(() => { if (alive) setError(true); }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; controller.abort(); };
  }, [user, retry]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  useEffect(() => {
    const refresh = () => setRetry(value => value + 1);
    const refreshWhenVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("dreamly:tarot-discovered", refresh);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("dreamly:tarot-discovered", refresh);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  useLayoutEffect(() => {
    // New discoveries are prepended; keep the row on them instead of a previously visible card back.
    if (!loading && !error && cardsRow.current) cardsRow.current.scrollLeft = 0;
  }, [cards, loading, error]);

  return <section className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5" aria-labelledby="profile-tarot-title" dir={locale === "ar" ? "rtl" : undefined}>
    <h2 id="profile-tarot-title" className="font-semibold text-[var(--text)]">{copy.title}</h2>
    <p className="mt-1 text-sm text-[var(--muted)]">{copy.intro}</p>
    {loading ? <p className="mt-5 text-sm text-[var(--muted)]" role="status">{copy.loading}</p> : null}
    {error ? <div className="mt-5 flex flex-wrap items-center gap-3 text-sm"><span role="alert" className="text-red-500">{copy.error}</span><button type="button" className="underline underline-offset-4" onClick={() => { setLoading(true); setError(false); setRetry(value => value + 1); }}>{copy.retry}</button></div> : null}
    {!loading && !error ? <div ref={cardsRow} className="mt-5 flex snap-x gap-4 overflow-x-auto pb-3" aria-label={copy.title}>
      {cards.map(item => {
        const card = MAJOR_ARCANA.find(entry => entry.id === item.cardId);
        if (!card) return null;
        const date = dateFormat.format(new Date(`${item.lastDay}T12:00:00Z`));
        return <button type="button" key={item.cardId} className={`w-[132px] shrink-0 snap-start rounded-xl text-start transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300 sm:w-[154px] ${styles.revealed}`} onClick={() => setSelected(item)} aria-label={`${tarotCopy[locale].cards[item.cardId]} · ${item.count} · ${date}`}>
          <span className="relative block">
            <TarotCardFace card={card} name={tarotCopy[locale].cards[item.cardId]} />
            {item.count > 1 ? <span className="absolute end-1 top-1 z-10 grid min-h-6 min-w-6 place-items-center rounded-full border border-amber-100 bg-amber-300 px-1 text-xs font-bold text-[#241129] shadow-lg">{item.count}</span> : null}
          </span>
          <span className="mt-2 block text-center text-xs text-[var(--muted)]">{date}</span>
        </button>;
      })}
      {hiddenCards.map(card => <div key={card.id} className="w-[132px] shrink-0 snap-start sm:w-[154px]" aria-hidden="true">
        <span className={styles.back}><span className={styles.innerFrame} /><span className={styles.emblem}>☾</span></span>
      </div>)}
    </div> : null}
    {selected && selectedCard ? <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" role="presentation" onClick={() => setSelected(null)}>
      <div className="relative w-full max-w-[360px]" role="dialog" aria-modal="true" aria-label={tarotCopy[locale].cards[selected.cardId]} onClick={event => event.stopPropagation()}>
        <button type="button" onClick={() => setSelected(null)} aria-label={copy.close} className="absolute -end-2 -top-2 z-10 grid h-10 w-10 place-items-center rounded-full border border-amber-300/50 bg-[#1c1428] text-amber-100 shadow-lg focus-visible:outline-2 focus-visible:outline-amber-300"><X size={20} aria-hidden="true" /></button>
        <span className="relative block">
          <TarotCardFace card={selectedCard} name={tarotCopy[locale].cards[selected.cardId]} large />
          {selected.count > 1 ? <span className="absolute end-2 top-2 z-10 grid min-h-7 min-w-7 place-items-center rounded-full border border-amber-100 bg-amber-300 px-1 text-sm font-bold text-[#241129] shadow-lg">{selected.count}</span> : null}
        </span>
        <p className="mt-3 text-center text-sm text-amber-100">{dateFormat.format(new Date(`${selected.lastDay}T12:00:00Z`))}</p>
      </div>
    </div> : null}
  </section>;
}
