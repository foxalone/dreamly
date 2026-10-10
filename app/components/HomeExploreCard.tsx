"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import { localePath } from "@/lib/i18n/path";
import { trackEvent } from "@/lib/analytics";

/**
 * The quarter-width card beside the homepage ask form: for visitors who are not
 * here to type a dream — search the dictionary, or jump straight into the site.
 */
export default function HomeExploreCard() {
  const t = useMessages();
  const locale = useLocale();
  const router = useRouter();
  const [q, setQ] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    const query = q.trim();
    trackEvent("home_explore", { action: "search", q_len: query.length });
    router.push(localePath(query ? `/dreams?q=${encodeURIComponent(query)}` : "/dreams", locale));
  }

  const links: { href: string; emoji: string; label: string }[] = [
    { href: "/dreams", emoji: "📖", label: t.nav.dictionary },
    { href: "/app/shared", emoji: "🌙", label: t.nav.feed },
    { href: "/app/map", emoji: "🗺️", label: t.nav.map },
    { href: "/gallery", emoji: "🎨", label: t.nav.gallery },
    { href: "/app/game", emoji: "🪄", label: t.game.title },
  ];

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 text-start">
      <h2 className="text-sm font-semibold text-[var(--text)]">{t.home.exploreTitle}</h2>
      <form onSubmit={submit} className="mt-3">
        <label className="sr-only" htmlFor="home-explore-q">{t.home.explorePlaceholder}</label>
        <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-2 focus-within:border-violet-400/70">
          <Search size={15} className="shrink-0 text-[var(--muted)]" aria-hidden="true" />
          <input
            id="home-explore-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.home.explorePlaceholder}
            className="w-full min-w-0 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
          />
        </div>
      </form>
      <nav className="hx-nav mt-3 flex flex-1 flex-col justify-evenly gap-1">
        <style>{`
          /* Attract loop: each link lights up and "presses" for a beat, one after another.
             One full cycle = 1.6s per link. Pauses while the visitor's cursor is in the list. */
          .hx { animation: hx-press calc(var(--hx-n) * 1.6s) ease-in-out infinite; animation-delay: calc(var(--hx-i) * 1.6s); }
          .hx-nav:hover .hx { animation-play-state: paused; }
          @keyframes hx-press {
            0%, 3% { background: transparent; transform: scale(1); }
            9% { background: color-mix(in srgb, #8b5cf6 18%, transparent); transform: scale(0.97); }
            15% { background: color-mix(in srgb, #8b5cf6 12%, transparent); transform: scale(1.015); }
            22%, 100% { background: transparent; transform: scale(1); }
          }
          @media (prefers-reduced-motion: reduce) { .hx { animation: none; } }
        `}</style>
        {links.map((l, i) => (
          <LocaleLink
            key={l.href}
            href={l.href}
            onClick={() => trackEvent("home_explore", { action: "link", href: l.href })}
            style={{ "--hx-i": i, "--hx-n": links.length } as React.CSSProperties}
            className="hx flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-[var(--text)] transition hover:bg-violet-500/10"
          >
            <span aria-hidden="true" className="text-base leading-none">{l.emoji}</span>
            {l.label}
          </LocaleLink>
        ))}
      </nav>
    </aside>
  );
}
