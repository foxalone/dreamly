"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { MAJOR_ARCANA, tarotCopy, type MajorArcanaId } from "@/lib/tarot/deck";
import { TarotCardFace } from "@/app/components/tarot/TarotCardFace";

export default function TarotCardsPanel() {
  const locale = useLocale();
  const copy = tarotCopy[locale];
  const [selected, setSelected] = useState<MajorArcanaId | null>(null);
  const selectedCard = MAJOR_ARCANA.find(card => card.id === selected);

  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return <section className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-7" aria-labelledby="tarot-preview-title" dir={locale === "ar" ? "rtl" : undefined}>
    <div className="mb-6">
      <p className="text-xs uppercase tracking-[.2em] text-amber-300">{copy.tab} · {new Intl.NumberFormat(locale).format(MAJOR_ARCANA.length)}</p>
      <h2 id="tarot-preview-title" className="mt-2 text-2xl font-semibold">{copy.title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">{copy.intro}</p>
    </div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5 xl:grid-cols-6">
      {MAJOR_ARCANA.map(card => <button type="button" key={card.id} onClick={() => setSelected(card.id)} aria-label={`${card.numeral} · ${copy.cards[card.id]}`} className="min-w-0 rounded-xl text-start transition-transform hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">
        <TarotCardFace card={card} name={copy.cards[card.id]} />
      </button>)}
    </div>
    {selectedCard ? <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-md" role="presentation" onClick={() => setSelected(null)}>
      <div className="relative w-full max-w-[360px]" role="dialog" aria-modal="true" aria-label={copy.cards[selectedCard.id]} onClick={event => event.stopPropagation()}>
        <button type="button" onClick={() => setSelected(null)} aria-label={copy.close} className="absolute -end-2 -top-2 z-10 grid h-10 w-10 place-items-center rounded-full border border-amber-300/50 bg-[#1c1428] text-amber-100 shadow-lg focus-visible:outline-2 focus-visible:outline-amber-300"><X size={20} aria-hidden="true" /></button>
        <TarotCardFace card={selectedCard} name={copy.cards[selectedCard.id]} large />
      </div>
    </div> : null}
  </section>;
}
