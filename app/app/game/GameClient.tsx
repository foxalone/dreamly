"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import LocaleLink from "@/lib/i18n/LocaleLink";

/**
 * Dream Kingdoms — phase 1, step 1: the tap screen.
 * Tap the dream catcher → random creatures fly out (guest 3 / signed-in 5 per tap).
 * Tapping a collected creature opens its dream-symbol card with a link to the dictionary.
 * Progress is kept in this browser for now; server sync, buildings and the map layer come next.
 * Rules: Admin → Game (app/app/profile/admin-dashboard/DreamKingdomsDoc.tsx).
 */

export type Creature = { emoji: string; slug: string; name: string; meaning: string };

const PER_TAP_GUEST = 3;
const PER_TAP_SIGNED_IN = 5;
/** Client-side tap cap per second (the server will enforce its own cap too). */
const MAX_TAPS_PER_SEC = 15;
const FLIGHT_MS = 950;
const TRAY_SIZE = 15;
const STORAGE_KEY = "dreamly_game_v1";

type Saved = { v: 1; creatures: number; taps: number; updatedAt: number };

type Flying = {
  id: number;
  creature: Creature;
  dx: number;
  dy: number;
  rot: number;
  delay: number;
};

function loadSaved(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<Saved>;
      if (typeof p.creatures === "number" && p.creatures >= 0) {
        return { v: 1, creatures: Math.floor(p.creatures), taps: Math.floor(p.taps ?? 0), updatedAt: p.updatedAt ?? 0 };
      }
    }
  } catch {
    /* storage unavailable — start fresh */
  }
  return { v: 1, creatures: 0, taps: 0, updatedAt: 0 };
}

function persist(s: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function GameClient({ pool }: { pool: Creature[] }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [saved, setSaved] = useState<Saved>({ v: 1, creatures: 0, taps: 0, updatedAt: 0 });
  const [loaded, setLoaded] = useState(false);
  const [flying, setFlying] = useState<Flying[]>([]);
  const [tray, setTray] = useState<Array<{ id: number; creature: Creature }>>([]);
  const [plus, setPlus] = useState<Array<{ id: number; n: number; x: number }>>([]);
  const [card, setCard] = useState<Creature | null>(null);

  const catcherRef = useRef<HTMLImageElement | null>(null);
  const tapTimes = useRef<number[]>([]);
  const nextId = useRef(1);

  useEffect(() => {
    // Browser progress is read on the first auth callback (client-only, after hydration).
    let first = true;
    return onAuthStateChanged(auth, (u) => {
      if (first) {
        first = false;
        setSaved(loadSaved());
        setLoaded(true);
      }
      setUser(u);
      setAuthReady(true);
    });
  }, []);

  useEffect(() => {
    if (loaded) persist(saved);
  }, [saved, loaded]);

  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCard(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card]);

  const perTap = user ? PER_TAP_SIGNED_IN : PER_TAP_GUEST;

  const tap = useCallback(() => {
    if (!pool.length || !loaded) return;
    const now = performance.now();
    tapTimes.current = tapTimes.current.filter((t) => now - t < 1000);
    if (tapTimes.current.length >= MAX_TAPS_PER_SEC) return;
    tapTimes.current.push(now);

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Dream catcher reaction: a quick squeeze + flash.
    catcherRef.current?.animate(
      [
        { transform: "scale(1)", filter: "brightness(1)" },
        { transform: "scale(0.93) rotate(-2deg)", filter: "brightness(1.45)" },
        { transform: "scale(1.04) rotate(1deg)", filter: "brightness(1.2)" },
        { transform: "scale(1)", filter: "brightness(1)" },
      ],
      { duration: reduced ? 1 : 320, easing: "ease-out" }
    );

    const born: Flying[] = Array.from({ length: perTap }, (_, i) => {
      // Fan out mostly upwards and sideways from the web center.
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
      const dist = 110 + Math.random() * 90;
      return {
        id: nextId.current++,
        creature: pick(pool),
        dx: Math.cos(angle) * dist * 0.85,
        dy: Math.sin(angle) * dist,
        rot: (Math.random() - 0.5) * 70,
        delay: i * 40,
      };
    });

    const plusId = nextId.current++;
    setPlus((p) => [...p, { id: plusId, n: perTap, x: (Math.random() - 0.5) * 60 }]);
    setFlying((f) => [...f, ...born]);
    setSaved((s) => ({ v: 1, creatures: s.creatures + perTap, taps: s.taps + 1, updatedAt: Date.now() }));

    window.setTimeout(() => {
      const ids = new Set(born.map((b) => b.id));
      setFlying((f) => f.filter((x) => !ids.has(x.id)));
      setTray((t) => [...born.map((b) => ({ id: b.id, creature: b.creature })).reverse(), ...t].slice(0, TRAY_SIZE));
    }, FLIGHT_MS + perTap * 40);
    window.setTimeout(() => setPlus((p) => p.filter((x) => x.id !== plusId)), 900);
  }, [perTap, pool, loaded]);

  return (
    <main className="mx-auto max-w-xl px-4 pb-16 pt-6 select-none">
      <style>{CSS}</style>

      <div className="text-center">
        <h1 className="text-2xl font-semibold">Dream Kingdoms</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Tap the dream catcher to catch dream creatures</p>
      </div>

      <div className="mt-5 flex items-center justify-center gap-2" aria-live="polite">
        <span className="text-3xl font-bold tabular-nums">{saved.creatures.toLocaleString()}</span>
        <span className="text-sm text-[var(--muted)]">creatures</span>
      </div>

      {/* Stage */}
      <div className="dk-stage relative mx-auto mt-2 flex h-[440px] items-center justify-center">
        <button
          type="button"
          onClick={tap}
          aria-label={`Tap the dream catcher (+${perTap} creatures)`}
          className="dk-sway relative cursor-pointer rounded-full outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
          style={{ WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}
        >
          <span className="dk-halo" aria-hidden />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={catcherRef}
            src="/game/dreamcatcher.webp"
            alt=""
            width={600}
            height={900}
            draggable={false}
            className="dk-catcher relative h-[400px] w-auto"
          />
        </button>

        {/* Origin of flights = center of the web (upper third of the image). */}
        <div className="pointer-events-none absolute left-1/2 top-[30%]" aria-hidden>
          {flying.map((f) => (
            <span
              key={f.id}
              className="dk-fly absolute -translate-x-1/2 -translate-y-1/2 text-4xl"
              style={
                {
                  "--dx": `${f.dx}px`,
                  "--dy": `${f.dy}px`,
                  "--rot": `${f.rot}deg`,
                  animationDuration: `${FLIGHT_MS}ms`,
                  animationDelay: `${f.delay}ms`,
                } as React.CSSProperties
              }
            >
              {f.creature.emoji}
            </span>
          ))}
          {plus.map((p) => (
            <span
              key={p.id}
              className="dk-plus absolute -translate-x-1/2 text-lg font-bold text-amber-300"
              style={{ left: p.x }}
            >
              +{p.n}
            </span>
          ))}
        </div>
      </div>

      {/* Recently caught */}
      <div className="mt-2 min-h-[64px]">
        {tray.length ? (
          <>
            <div className="text-center text-xs text-[var(--muted)]">Tap a creature to see what it means in a dream</div>
            <div className="mt-2 flex flex-wrap justify-center gap-1.5">
              {tray.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setCard(t.creature)}
                  className="dk-land flex h-11 w-11 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--card)] text-2xl transition hover:scale-110"
                  aria-label={t.creature.name}
                  title={t.creature.name}
                >
                  {t.creature.emoji}
                </button>
              ))}
            </div>
          </>
        ) : null}
      </div>

      {authReady && !user ? (
        <div className="mx-auto mt-6 max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-center text-sm">
          You get <b>{PER_TAP_GUEST}</b> creatures per tap as a guest.{" "}
          <LocaleLink href="/signin?next=/app/game" className="font-semibold text-purple-400 underline underline-offset-2">
            Sign in
          </LocaleLink>{" "}
          to get <b>{PER_TAP_SIGNED_IN}</b>.
        </div>
      ) : null}

      {/* Symbol card */}
      {card ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          onClick={() => setCard(null)}
          role="dialog"
          aria-modal="true"
          aria-label={card.name}
        >
          <div
            className="dk-card w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 text-[var(--text)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <span className="text-5xl">{card.emoji}</span>
              <div>
                <div className="text-xs uppercase tracking-wide text-[var(--muted)]">Dream symbol</div>
                <div className="text-xl font-semibold capitalize">{card.name}</div>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              Dreaming of a {card.name} is linked with {card.meaning}.
            </p>
            <div className="mt-4 flex gap-2">
              <LocaleLink
                href={`/dreams/${card.slug}`}
                className="flex-1 rounded-full bg-[var(--text)] px-4 py-2 text-center text-sm font-semibold text-[var(--bg)]"
              >
                Full meaning →
              </LocaleLink>
              <button
                type="button"
                onClick={() => setCard(null)}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

const CSS = `
.dk-sway { transform-origin: 50% 0%; animation: dk-sway 5s ease-in-out infinite; }
@keyframes dk-sway { 0%,100% { transform: rotate(-1.6deg); } 50% { transform: rotate(1.6deg); } }
.dk-catcher { animation: dk-pulse 2.6s ease-in-out infinite; filter: drop-shadow(0 0 0 transparent); }
@keyframes dk-pulse { 0%,100% { scale: 1; } 50% { scale: 1.025; } }
.dk-halo { position:absolute; left:50%; top:30%; width:240px; height:240px; translate:-50% -50%; border-radius:9999px;
  background: radial-gradient(circle, rgba(251,191,36,.35), rgba(168,85,247,.18) 45%, transparent 70%);
  animation: dk-halo 2.6s ease-in-out infinite; pointer-events:none; }
@keyframes dk-halo { 0%,100% { opacity:.55; scale:.95; } 50% { opacity:1; scale:1.08; } }
.dk-fly { animation-name: dk-fly; animation-timing-function: cubic-bezier(.2,.7,.3,1); animation-fill-mode: both; }
@keyframes dk-fly {
  0%   { opacity:0; transform: translate(-50%,-50%) scale(.2) rotate(0deg); }
  15%  { opacity:1; }
  70%  { opacity:1; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(1.15) rotate(var(--rot)); }
  100% { opacity:0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy) + 40px)) scale(.8) rotate(var(--rot)); }
}
.dk-plus { top:-10px; animation: dk-plus .9s ease-out both; text-shadow: 0 0 10px rgba(251,191,36,.7); }
@keyframes dk-plus { from { opacity:1; transform: translate(-50%,0); } to { opacity:0; transform: translate(-50%,-70px); } }
.dk-land { animation: dk-land .35s ease-out both; }
@keyframes dk-land { from { opacity:0; transform: scale(.4); } to { opacity:1; transform: scale(1); } }
.dk-card { animation: dk-land .2s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .dk-sway, .dk-catcher, .dk-halo { animation: none; }
  .dk-fly { animation-duration: 1ms !important; }
}
`;
