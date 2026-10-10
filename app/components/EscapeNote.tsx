"use client";

import { useEffect, useRef } from "react";
import { readEscapePending } from "@/lib/game/escape";
import { useMessages } from "@/lib/i18n/LocaleProvider";

/** The fly-away runs once per escape (keyed by its grant time), not on every re-render. */
const flown = new Set<number>();

/**
 * "Creatures escaped from your dream" — the note above a fresh dream reading, plus a
 * one-shot animation of the same emojis flying into the floating dream catcher
 * (DreamCatcherFab, class .dcf). The emojis in the note stay put; only clones fly.
 */
export default function EscapeNote({ emojis }: { emojis: string[] }) {
  const t = useMessages().game;
  const rowRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const at = readEscapePending()?.at ?? 0;
    if (!at || flown.has(at)) return;
    flown.add(at);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const row = rowRef.current;
    if (!row) return;
    const spans = Array.from(row.querySelectorAll<HTMLElement>("[data-esc]"));
    const fab = document.querySelector(".dcf");
    const fr = fab?.getBoundingClientRect();
    const rtl = (document.dir || document.documentElement.dir) === "rtl";
    // Fallback: the catcher's corner (bottom-end) when the FAB is not on this page.
    const tx = fr ? fr.left + fr.width / 2 : rtl ? 40 : window.innerWidth - 40;
    const ty = fr ? fr.top + fr.height * 0.35 : window.innerHeight - 56;
    const timer = window.setTimeout(() => {
      spans.forEach((el, i) => {
        const r = el.getBoundingClientRect();
        if (!r.width) return;
        const clone = document.createElement("span");
        clone.textContent = el.textContent;
        clone.setAttribute("aria-hidden", "true");
        Object.assign(clone.style, {
          position: "fixed",
          left: `${r.left}px`,
          top: `${r.top}px`,
          fontSize: "22px",
          lineHeight: "1",
          zIndex: "90", // above the journal analysis popup (z-[70])
          pointerEvents: "none",
          willChange: "transform, opacity",
        });
        document.body.appendChild(clone);
        const anim = clone.animate(
          [
            { transform: "translate(0,0) scale(1)", opacity: 1 },
            { transform: `translate(${(tx - r.left) * 0.55}px, ${(ty - r.top) * 0.35 - 60}px) scale(1.25)`, opacity: 1, offset: 0.45 },
            { transform: `translate(${tx - r.left}px, ${ty - r.top}px) scale(0.35)`, opacity: 0.15 },
          ],
          { duration: 1100, delay: i * 160, easing: "cubic-bezier(.45,.05,.55,1)", fill: "forwards" }
        );
        anim.onfinish = () => clone.remove();
        window.setTimeout(() => clone.remove(), 2200 + i * 160);
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [emojis]);

  if (!emojis.length) return null;

  return (
    <p className="mb-3 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-2.5 text-sm leading-6 text-[var(--text)]">
      <span aria-hidden="true">✨ </span>
      {t.escapeLead}{" "}
      <span ref={rowRef} className="whitespace-nowrap align-middle text-lg leading-none">
        {emojis.map((e, i) => (
          <span key={`${e}-${i}`} data-esc className="mx-0.5 inline-block">
            {e}
          </span>
        ))}
      </span>{" "}
      — {t.escapeCta}
    </p>
  );
}
