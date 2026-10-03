"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { CREATURE_TIERS, NEWEST_TIER_WEIGHT, nextTier, openTier } from "@/lib/game/creatureTiers";

/**
 * Dream Kingdoms — phase 1, step 1: the tap screen.
 * Tap the dream catcher → random creatures fly out (guest 3 / signed-in 5 per tap).
 * Tapping a collected creature opens its dream-symbol card with a link to the dictionary.
 * Progress is kept in this browser for now; server sync, buildings and the map layer come next.
 * Rules: Admin → Game (app/app/profile/admin-dashboard/DreamKingdomsDoc.tsx).
 */

export type Creature = { emoji: string; slug: string; name: string; meaning: string; tier: number };

const PER_TAP_GUEST = 3;
const PER_TAP_SIGNED_IN = 5;
/** Client-side tap cap per second (the server will enforce its own cap too). */
const MAX_TAPS_PER_SEC = 15;
const FLIGHT_MS = 950;
const STORAGE_KEY = "dreamly_game_v1";

/** creatures = spendable balance; caught = how many of each creature (by slug) were ever caught;
 *  recent = slugs in the order they were first discovered. */
type Saved = {
  v: 1;
  creatures: number;
  taps: number;
  updatedAt: number;
  caught: Record<string, number>;
  recent: string[];
};

const EMPTY: Saved = { v: 1, creatures: 0, taps: 0, updatedAt: 0, caught: {}, recent: [] };

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
        const caught: Record<string, number> = {};
        for (const [k, n] of Object.entries(p.caught ?? {})) {
          if (typeof n === "number" && n > 0) caught[k] = Math.floor(n);
        }
        const recent = Array.isArray(p.recent) ? p.recent.filter((k) => typeof k === "string" && caught[k]) : [];
        return {
          v: 1,
          creatures: Math.floor(p.creatures),
          taps: Math.floor(p.taps ?? 0),
          updatedAt: p.updatedAt ?? 0,
          caught,
          recent,
        };
      }
    }
  } catch {
    /* storage unavailable — start fresh */
  }
  return EMPTY;
}

function persist(s: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/** Space reserved at the top (title, counter, progress) and bottom (found line) of the stage. */
const TOP_RESERVE = 128;
const BOTTOM_RESERVE = 44;

type Box = { w: number; h: number };
type Spot = { x: number; y: number };
type Layout = {
  /** Creature chip size: smaller on phones so a full collection still fits. */
  chip: number;
  catcherH: number;
  cx: number;
  cy: number;
  /** Center of the web, where creatures fly out from. */
  originY: number;
  spots: Spot[];
};

/** Halton low-discrepancy sequence: spread-out positions that look random but are stable. */
function halton(i: number, base: number): number {
  let f = 1;
  let r = 0;
  while (i > 0) {
    f /= base;
    r += f * (i % base);
    i = Math.floor(i / base);
  }
  return r;
}

/**
 * Where each creature (by discovery index) sits around the dream catcher.
 * Stable for a given stage size, keeps clear of the catcher and of each other.
 */
function computeLayout(n: number, box: Box): Layout {
  const CHIP = box.w < 520 ? 36 : 42;
  const avail = Math.max(200, box.h - TOP_RESERVE - BOTTOM_RESERVE);
  const catcherH = Math.round(Math.min(440, avail * 0.82, box.w * 0.5 * 1.5));
  const catcherW = (catcherH * 600) / 900;
  const cx = box.w / 2;
  const cy = TOP_RESERVE + avail / 2;
  const rx = catcherW * 0.42 + CHIP * 0.6;
  const ry = catcherH * 0.46 + CHIP * 0.4;
  const pad = CHIP / 2 + 6;
  const spots: Spot[] = [];
  for (let minDist = CHIP + 12; spots.length < n && minDist >= CHIP * 0.7; minDist -= 6) {
    spots.length = 0;
    for (let i = 1; i < 5000 && spots.length < n; i++) {
      const x = pad + halton(i, 2) * (box.w - pad * 2);
      const y = TOP_RESERVE + pad + halton(i, 3) * (avail - pad * 2);
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1) continue;
      if (spots.some((p) => (p.x - x) ** 2 + (p.y - y) ** 2 < minDist * minDist)) continue;
      spots.push({ x, y });
    }
  }
  return { chip: CHIP, catcherH, cx, cy, originY: cy - catcherH * 0.2, spots };
}

/** Total creatures ever caught — drives which tiers are open. */
function lifetimeOf(s: Saved): number {
  let n = 0;
  for (const c of Object.values(s.caught)) n += c;
  return n;
}

/** Random creature from the open tiers; the newest open tier is weighted up so new kinds appear soon. */
function pickCreature(available: Creature[], newestTier: number): Creature {
  const w = (c: Creature) => (newestTier > 1 && c.tier === newestTier ? NEWEST_TIER_WEIGHT : 1);
  let total = 0;
  for (const c of available) total += w(c);
  let r = Math.random() * total;
  for (const c of available) {
    r -= w(c);
    if (r < 0) return c;
  }
  return available[available.length - 1];
}

export default function GameClient({ pool }: { pool: Creature[] }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [saved, setSaved] = useState<Saved>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [flying, setFlying] = useState<Flying[]>([]);
  /** Creatures still in the air, per slug — subtracted from the shown count until they land. */
  const [inFlight, setInFlight] = useState<Record<string, number>>({});
  /** Bumped per slug on landing to replay the badge "pop" animation. */
  const [landTick, setLandTick] = useState<Record<string, number>>({});
  const [plus, setPlus] = useState<Array<{ id: number; n: number; x: number }>>([]);
  const [card, setCard] = useState<Creature | null>(null);
  /** Tier just unlocked — shows the "new creatures" banner for a few seconds. */
  const [unlocked, setUnlocked] = useState<number | null>(null);

  const catcherRef = useRef<HTMLImageElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const [box, setBox] = useState<Box>({ w: 0, h: 0 });
  const [mainTop, setMainTop] = useState(0);
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

  // The game is one screen: no page scroll, the stage fills the space under the sticky header.
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    window.scrollTo(0, 0);
    const el = mainRef.current;
    const ro = new ResizeObserver(() => {
      if (!el) return;
      setMainTop(el.getBoundingClientRect().top + window.scrollY);
      setBox({ w: el.clientWidth, h: el.clientHeight });
    });
    if (el) ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCard(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card]);

  const perTap = user ? PER_TAP_SIGNED_IN : PER_TAP_GUEST;
  const lifetime = lifetimeOf(saved);
  const tierNow = openTier(lifetime);
  const upcoming = nextTier(lifetime);
  const layout = useMemo(() => computeLayout(pool.length, box), [pool.length, box]);

  const tap = (e: React.MouseEvent<HTMLButtonElement>) => {
    const available = pool.filter((c) => c.tier <= tierNow);
    if (!available.length || !loaded) return;
    const now = e.timeStamp;
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

    // Each creature flies from the web center to its own place around the catcher.
    const order = [...saved.recent];
    const born: Flying[] = Array.from({ length: perTap }, (_, i) => {
      const creature = pickCreature(available, tierNow);
      if (!order.includes(creature.slug)) order.push(creature.slug);
      const spot = layout.spots[order.indexOf(creature.slug)];
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
      return {
        id: nextId.current++,
        creature,
        dx: spot ? spot.x - layout.cx : Math.cos(angle) * 160,
        dy: spot ? spot.y - layout.originY : Math.sin(angle) * 160,
        rot: (Math.random() - 0.5) * 50,
        delay: i * 50,
      };
    });

    const plusId = nextId.current++;
    setPlus((p) => [...p, { id: plusId, n: perTap, x: (Math.random() - 0.5) * 60 }]);
    setFlying((f) => [...f, ...born]);
    const add: Record<string, number> = {};
    for (const b of born) add[b.creature.slug] = (add[b.creature.slug] ?? 0) + 1;
    setInFlight((m) => {
      const n = { ...m };
      for (const [k, c] of Object.entries(add)) n[k] = (n[k] ?? 0) + c;
      return n;
    });
    setSaved((s) => {
      const caught = { ...s.caught };
      for (const [k, c] of Object.entries(add)) caught[k] = (caught[k] ?? 0) + c;
      // Discovery order: a creature keeps its place; first-time catches join at the end.
      const recent = [...s.recent];
      for (const b of born) if (!recent.includes(b.creature.slug)) recent.push(b.creature.slug);
      return { v: 1, creatures: s.creatures + perTap, taps: s.taps + 1, updatedAt: Date.now(), caught, recent };
    });

    window.setTimeout(() => {
      const ids = new Set(born.map((b) => b.id));
      setFlying((f) => f.filter((x) => !ids.has(x.id)));
      setInFlight((m) => {
        const n = { ...m };
        for (const [k, c] of Object.entries(add)) {
          n[k] = (n[k] ?? 0) - c;
          if (n[k] <= 0) delete n[k];
        }
        return n;
      });
      setLandTick((t) => {
        const n = { ...t };
        for (const k of Object.keys(add)) n[k] = (n[k] ?? 0) + 1;
        return n;
      });
    }, FLIGHT_MS + perTap * 40);
    window.setTimeout(() => setPlus((p) => p.filter((x) => x.id !== plusId)), 900);

    const tierAfter = openTier(lifetime + perTap);
    if (tierAfter > tierNow) {
      setUnlocked(tierAfter);
      window.setTimeout(() => setUnlocked((u) => (u === tierAfter ? null : u)), 5000);
    }
  };

  const bySlug = useMemo(() => new Map(pool.map((c) => [c.slug, c])), [pool]);
  const collection = saved.recent
    .map((slug) => ({ creature: bySlug.get(slug), count: (saved.caught[slug] ?? 0) - (inFlight[slug] ?? 0) }))
    .filter((x): x is { creature: Creature; count: number } => !!x.creature && x.count > 0);

  return (
    <main
      ref={mainRef}
      className="relative mx-auto w-full max-w-5xl overflow-hidden select-none"
      style={{ height: `calc(100dvh - ${mainTop}px)` }}
    >
      <style>{CSS}</style>

      {/* Top: title, counter, progress to the next tier */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-4 text-center">
        <h1 className="text-xl font-semibold">Dream Kingdoms</h1>
        <div className="mt-1 flex items-baseline justify-center gap-2" aria-live="polite">
          <span className="text-3xl font-bold tabular-nums">{saved.creatures.toLocaleString()}</span>
          <span className="text-sm text-[var(--muted)]">creatures</span>
        </div>
        {loaded && upcoming ? (
          <div className="mx-auto mt-2 max-w-xs">
            {/* Just the bar: progress to the next tier, no numbers or labels. */}
            <div className="h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--text)_10%,transparent)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-500 to-amber-400 transition-[width] duration-500"
                style={{
                  width: `${Math.min(
                    100,
                    ((lifetime - (CREATURE_TIERS[upcoming.tier - 2]?.unlockAt ?? 0)) /
                      (upcoming.unlockAt - (CREATURE_TIERS[upcoming.tier - 2]?.unlockAt ?? 0))) *
                      100
                  )}%`,
                }}
              />
            </div>
          </div>
        ) : null}
        {unlocked ? (
          <div className="dk-card mx-auto mt-2 max-w-sm rounded-2xl border border-amber-400/50 bg-[color-mix(in_srgb,#f59e0b_12%,var(--card))] px-4 py-2 text-sm">
            <div className="font-semibold">✨ New creatures can now come out of the dream catcher!</div>
            <div className="mt-1 text-2xl tracking-wide">
              {pool.filter((c) => c.tier === unlocked).map((c) => c.emoji).join(" ")}
            </div>
          </div>
        ) : null}
      </div>

      {box.w > 0 ? (
        <>
          {/* Dream catcher */}
          <button
            type="button"
            onClick={tap}
            aria-label={`Tap the dream catcher (+${perTap} creatures)`}
            className="dk-sway absolute cursor-pointer border-0 bg-transparent p-0 outline-none"
            style={{
              left: layout.cx,
              top: layout.cy,
              height: layout.catcherH,
              marginLeft: -(layout.catcherH * 600) / 900 / 2,
              marginTop: -layout.catcherH / 2,
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
            }}
          >
            <span className="dk-halo" aria-hidden style={{ width: layout.catcherH * 0.55, height: layout.catcherH * 0.55 }} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={catcherRef}
              src="/game/dreamcatcher.webp"
              alt=""
              width={600}
              height={900}
              draggable={false}
              className="dk-catcher relative w-auto"
              style={{ height: layout.catcherH }}
            />
          </button>

          {/* Caught creatures, scattered around the catcher (one per kind, with a counter). */}
          {collection.map(({ creature, count }, i) => {
            const spot = layout.spots[saved.recent.indexOf(creature.slug)];
            if (!spot) return null;
            return (
              <button
                key={creature.slug}
                type="button"
                onClick={() => setCard(creature)}
                className="dk-land absolute z-[5] flex items-center justify-center rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_88%,transparent)] text-xl shadow-sm transition hover:scale-110"
                style={{
                  left: spot.x - layout.chip / 2,
                  top: spot.y - layout.chip / 2,
                  width: layout.chip,
                  height: layout.chip,
                }}
                aria-label={`${creature.name}: ${count}`}
                title={creature.name}
              >
                <span className="dk-float" style={{ animationDelay: `${-(i * 0.37) % 3}s` }}>
                  {creature.emoji}
                </span>
                <span
                  key={landTick[creature.slug] ?? 0}
                  className="dk-bump absolute -right-1.5 -top-1.5 min-w-[20px] rounded-full bg-purple-500 px-1 text-center text-[10px] font-bold leading-[18px] text-white shadow"
                >
                  {count > 999 ? `${Math.floor(count / 1000)}k` : count}
                </span>
              </button>
            );
          })}

          {/* Flights start at the center of the web. */}
          <div
            className="pointer-events-none absolute z-20"
            style={{ left: layout.cx, top: layout.originY }}
            aria-hidden
          >
            {flying.map((f) => (
              <span
                key={f.id}
                className="dk-fly absolute text-3xl"
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
                className="dk-plus absolute -translate-x-1/2 text-lg font-bold text-amber-400"
                style={{ left: p.x }}
              >
                +{p.n}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {/* Bottom line */}
      <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-3 text-center text-xs text-[var(--muted)]">
        {/* No "N of M found": how many creatures exist stays a surprise. */}
        {collection.length ? null : <span>Tap the dream catcher to catch dream creatures</span>}
        {authReady && !user ? (
          <span>
            {collection.length ? "" : " · "}Guests get {PER_TAP_GUEST} per tap —{" "}
            <LocaleLink href="/signin?next=/app/game" className="font-semibold text-purple-400 underline underline-offset-2">
              sign in
            </LocaleLink>{" "}
            for {PER_TAP_SIGNED_IN}
          </span>
        ) : null}
      </div>

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
              {card.meaning}
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
.dk-halo { position:absolute; left:50%; top:30%; translate:-50% -50%; border-radius:9999px;
  background: radial-gradient(circle, rgba(251,191,36,.35), rgba(168,85,247,.18) 45%, transparent 70%);
  animation: dk-halo 2.6s ease-in-out infinite; pointer-events:none; }
@keyframes dk-halo { 0%,100% { opacity:.55; scale:.95; } 50% { opacity:1; scale:1.08; } }
.dk-fly { animation-name: dk-fly; animation-timing-function: cubic-bezier(.3,.6,.35,1); animation-fill-mode: both; }
@keyframes dk-fly {
  0%   { opacity:0; transform: translate(-50%,-50%) scale(.2) rotate(0deg); }
  12%  { opacity:1; transform: translate(-50%,-50%) scale(1.25) rotate(0deg); }
  55%  { opacity:1; transform: translate(calc(-50% + var(--dx) * .55), calc(-50% + var(--dy) * .55 - 50px)) scale(1.1) rotate(var(--rot)); }
  100% { opacity:.9; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(.75) rotate(0deg); }
}
.dk-float { display:inline-block; animation: dk-float 3s ease-in-out infinite; }
@keyframes dk-float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
.dk-plus { top:-10px; animation: dk-plus .9s ease-out both; text-shadow: 0 0 10px rgba(251,191,36,.7); }
@keyframes dk-plus { from { opacity:1; transform: translate(-50%,0); } to { opacity:0; transform: translate(-50%,-70px); } }
.dk-land { animation: dk-land .35s ease-out both; }
@keyframes dk-land { from { opacity:0; transform: scale(.4); } to { opacity:1; transform: scale(1); } }
.dk-bump { animation: dk-bump .35s ease-out both; }
@keyframes dk-bump { 0% { transform: scale(1); } 40% { transform: scale(1.45); background:#f59e0b; } 100% { transform: scale(1); } }
.dk-card { animation: dk-land .2s ease-out both; }
@media (prefers-reduced-motion: reduce) {
  .dk-sway, .dk-catcher, .dk-halo, .dk-float { animation: none; }
  .dk-fly { animation-duration: 1ms !important; }
}
`;
