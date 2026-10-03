"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import { formatMessage } from "@/lib/i18n/messages";
import { BUILDINGS, shortNumber } from "@/lib/game/buildings";
import { CREATURE_TIERS, NEWEST_TIER_WEIGHT, nextTier, openTier } from "@/lib/game/creatureTiers";
import {
  MAX_TAPS_PER_SEC,
  PER_TAP_GUEST,
  PER_TAP_SIGNED_IN,
  SYNC_INTERVAL_MS,
  STORAGE_MINUTES,
  buildingStorage,
  nextCost,
} from "@/lib/game/economy";

/**
 * Dream Kingdoms — phase 1.
 * Tap the dream catcher → random creatures fly out (guest 3 / signed-in 5 per tap).
 * The server owns the balance (/api/game/state, /api/game/action): taps are sent in batches,
 * buildings are bought and placed on the map (/api/game/buildings), they fill an 8-hour
 * storage that the player collects. Guest progress moves into the account on sign-in.
 * Rules: Admin → Game (app/app/profile/admin-dashboard/DreamKingdomsDoc.tsx).
 */

export type Creature = { emoji: string; slug: string; name: string; meaning: string; tier: number };

const FLIGHT_MS = 950;
/** Old browser-only save (before the server kept balances) — imported once, then removed. */
const LEGACY_KEY = "dreamly_game_v1";
/** Taps not yet confirmed by the server survive a reload here. */
const PENDING_KEY = "dreamly_game_pending_v2";
/** Read by the floating dream catcher (DreamCatcherFab) to show a dot when storage is full. */
export const HINT_KEY = "dreamly_game_hint";

/** Server state of the player (see app/api/game/_lib/player.ts → PlayerState). */
type ServerState = {
  creatures: number;
  lifetime: number;
  caught: Record<string, number>;
  recent: string[];
  placed: Record<string, string>;
  rate: number;
  lastCollectAt: number | null;
  collectedAt: Record<string, number>;
  owned: Record<string, number>;
  storage: { amount: number; full: boolean; by: Record<string, { amount: number; full: boolean }> };
  serverNow: number;
  signedIn: boolean;
  importedLocal: boolean;
};

/** Taps made on this device that the server has not confirmed yet. */
type Batch = { taps: number; n: number; catches: Record<string, number> };
const EMPTY_BATCH: Batch = { taps: 0, n: 0, catches: {} };

type Rank = { rank: number; total: number; city: string };

function mergeBatch(a: Batch, b: Batch): Batch {
  const catches = { ...a.catches };
  for (const [k, v] of Object.entries(b.catches)) catches[k] = (catches[k] ?? 0) + v;
  return { taps: a.taps + b.taps, n: a.n + b.n, catches };
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}

type Flying = {
  id: number;
  creature: Creature;
  dx: number;
  dy: number;
  rot: number;
  delay: number;
};

/** Space reserved at the top (title, counter, progress) and bottom (found line) of the stage. */
const TOP_RESERVE = 92;
const BOTTOM_RESERVE = 76;

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

/** Thin bar under a building: how much of its cost the player already has. */
function MiniBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <span className="mt-1 block h-1 w-full min-w-[28px] overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--text)_12%,transparent)]">
      <span
        className={`block h-full rounded-full transition-[width] duration-500 ${pct >= 100 ? "bg-amber-400" : "bg-purple-500"}`}
        style={{ width: `${pct}%` }}
      />
    </span>
  );
}

/** A building's storage: how many creatures are waiting inside; amber and ringing when full. */
function Cube({ amount, full }: { amount: number; full: boolean }) {
  return (
    <span
      className={`mt-1 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${
        full
          ? "border-amber-400 bg-amber-400 text-black"
          : amount > 0
            ? "border-amber-400/60 bg-[color-mix(in_srgb,#f59e0b_14%,var(--card))]"
            : "border-[var(--border)] text-[var(--muted)]"
      }`}
    >
      🧺 {shortNumber(amount)}
    </span>
  );
}

export default function GameClient({ pool }: { pool: Creature[] }) {
  const t = useMessages().game;
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [server, setServer] = useState<ServerState | null>(null);
  /** Taps waiting to be sent, and the batch currently on its way to the server. */
  const [pending, setPending] = useState<Batch>(EMPTY_BATCH);
  const [inflight, setInflight] = useState<Batch>(EMPTY_BATCH);
  const pendingRef = useRef<Batch>(EMPTY_BATCH);
  const syncingRef = useRef(false);
  const userRef = useRef<User | null>(null);
  /** serverNow − Date.now() at load, so the storage counter runs on server time. */
  const [skew, setSkew] = useState(0);
  const [now, setNow] = useState(0);
  const loaded = server !== null;

  const [flying, setFlying] = useState<Flying[]>([]);
  /** Creatures still in the air, per slug — subtracted from the shown count until they land. */
  const [inFlight, setInFlight] = useState<Record<string, number>>({});
  /** Bumped per slug on landing to replay the badge "pop" animation. */
  const [landTick, setLandTick] = useState<Record<string, number>>({});
  const [plus, setPlus] = useState<Array<{ id: number; n: number; x: number }>>([]);
  const [card, setCard] = useState<Creature | null>(null);
  const [showCollection, setShowCollection] = useState(false);
  /** Tier just unlocked — shows the "new creatures" banner for a few seconds. */
  const [unlocked, setUnlocked] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [placing, setPlacing] = useState<string | null>(null);
  const [collecting, setCollecting] = useState(false);
  /** "While you were away" screen. */
  const [away, setAway] = useState<{ amount: number; full: boolean } | null>(null);
  const [rank, setRank] = useState<Rank | null>(null);
  const [overtaken, setOvertaken] = useState<Rank | null>(null);

  const catcherRef = useRef<HTMLImageElement | null>(null);
  const mainRef = useRef<HTMLElement | null>(null);
  const [box, setBox] = useState<Box>({ w: 0, h: 0 });
  const [mainTop, setMainTop] = useState(0);
  const tapTimes = useRef<number[]>([]);
  const nextId = useRef(1);

  function showToast(text: string, ms = 2800) {
    setToast(text);
    window.setTimeout(() => setToast((x) => (x === text ? null : x)), ms);
  }

  async function authHeaders(u: User | null): Promise<Record<string, string>> {
    const token = u ? await u.getIdToken().catch(() => "") : "";
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function acceptServer(state: ServerState) {
    setServer(state);
    setSkew(state.serverNow - Date.now());
    setNow(Date.now());
    // When the first building's cube will be full (server time) — for the floating catcher's dot.
    const starts = Object.keys(state.placed).map((id) => state.collectedAt?.[id] ?? state.lastCollectAt ?? 0).filter(Boolean);
    writeJson(HINT_KEY, {
      fullAt: starts.length ? Math.min(...starts) + STORAGE_MINUTES * 60_000 : null,
      skew: state.serverNow - Date.now(),
    });
  }

  async function postAction(body: object): Promise<{ ok?: boolean; delta?: number; state?: ServerState } | null> {
    try {
      const res = await fetch("/api/game/action", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders(userRef.current)) },
        body: JSON.stringify(body),
        keepalive: true,
      });
      return res.ok ? await res.json() : null;
    } catch {
      return null;
    }
  }

  /** Send the waiting taps. On failure they go back into the queue. */
  async function flush() {
    if (syncingRef.current) return;
    const batch = pendingRef.current;
    if (!batch.taps) return;
    syncingRef.current = true;
    pendingRef.current = EMPTY_BATCH;
    setPending(EMPTY_BATCH);
    setInflight(batch);
    const res = await postAction({ type: "sync", taps: batch.taps, catches: batch.catches });
    if (res?.ok && res.state) {
      acceptServer(res.state);
    } else {
      pendingRef.current = mergeBatch(batch, pendingRef.current);
      setPending(pendingRef.current);
    }
    setInflight(EMPTY_BATCH);
    syncingRef.current = false;
  }

  async function loadState(u: User | null) {
    try {
      const res = await fetch("/api/game/state", { headers: await authHeaders(u), cache: "no-store" });
      const data = (await res.json()) as {
        state: ServerState;
        merged?: number;
        rank?: Rank | null;
        overtaken?: boolean;
      };
      let state = data.state;

      // One-time import of the old browser-only save.
      const legacy = readJson<{ creatures?: number; caught?: Record<string, number>; recent?: string[] }>(LEGACY_KEY);
      if (legacy && !state.importedLocal && (legacy.creatures ?? 0) > 0) {
        const imp = await postAction({ type: "import", local: legacy });
        if (imp?.state) state = imp.state;
      }
      if (legacy) writeJson(LEGACY_KEY, null);

      acceptServer(state);
      setRank(data.rank ?? null);
      if (data.overtaken && data.rank) setOvertaken(data.rank);
      if (data.merged) showToast(t.merged, 4000);
      // At least ~10 minutes of production waiting → "While you were away".
      if (state.storage.amount > 0 && state.storage.amount >= state.rate * 10) {
        setAway({ amount: state.storage.amount, full: state.storage.full });
      }

      // Taps left from the last visit (not confirmed before the tab closed).
      const left = readJson<Batch>(PENDING_KEY);
      if (left?.taps) {
        pendingRef.current = mergeBatch(left, pendingRef.current);
        setPending(pendingRef.current);
        void flush();
      }
    } catch {
      showToast(t.offline);
    }
  }

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      userRef.current = u;
      setUser(u);
      setAuthReady(true);
      void loadState(u);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once
  }, []);

  // Keep unsent taps across reloads.
  useEffect(() => {
    writeJson(PENDING_KEY, pending.taps ? pending : null);
  }, [pending]);

  // Send taps in batches, and when the tab is hidden; tick the storage counter.
  useEffect(() => {
    const sync = window.setInterval(() => void flush(), SYNC_INTERVAL_MS);
    const tick = window.setInterval(() => setNow(Date.now()), 5_000);
    const onHide = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(sync);
      window.clearInterval(tick);
      document.removeEventListener("visibilitychange", onHide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flush reads refs
  }, []);

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
    if (!showCollection) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setShowCollection(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showCollection]);

  useEffect(() => {
    if (!card) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setCard(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card]);

  const perTap = user ? PER_TAP_SIGNED_IN : PER_TAP_GUEST;

  // What the player sees = server state + taps on their way + taps waiting.
  const local = mergeBatch(inflight, pending);
  const creatures = (server?.creatures ?? 0) + local.n;
  const lifetime = (server?.lifetime ?? 0) + local.n;
  const caught: Record<string, number> = { ...(server?.caught ?? {}) };
  for (const [k, v] of Object.entries(local.catches)) caught[k] = (caught[k] ?? 0) + v;
  const recent = [...(server?.recent ?? [])];
  for (const k of Object.keys(local.catches)) if (!recent.includes(k)) recent.push(k);
  const placed = server?.placed ?? {};
  // Each building's cube keeps filling on the client between server updates.
  const cubes = server
    ? buildingStorage(Object.keys(server.placed), server.collectedAt, server.lastCollectAt, (now || server.serverNow - skew) + skew, server.owned).by
    : {};

  /** Empty one building's cube (or all of them) into the balance. */
  async function collect(buildingId?: string) {
    if (collecting) return;
    setCollecting(true);
    await flush();
    const res = await postAction({ type: "collect", buildingId });
    if (res?.ok && res.state) {
      acceptServer(res.state);
      if (res.delta) showToast(formatMessage(t.collected, { n: res.delta.toLocaleString() }));
    } else {
      showToast(t.error);
    }
    setAway(null);
    setCollecting(false);
  }

  /** Build = pay the cost on the server and put the building on the map in the player's city. */
  /** Copies of a building the player owns (0 = not built yet). */
  const ownedOf = (id: string) => (placed[id] === undefined ? 0 : Math.max(1, server?.owned?.[id] ?? 1));

  /** Build the first copy (placed on the map) or buy one more copy of a building that already stands. */
  async function placeBuilding(b: (typeof BUILDINGS)[number]) {
    const owned = ownedOf(b.id);
    if (placing || creatures < nextCost(b.cost, owned)) return;
    setPlacing(b.id);
    try {
      await flush();
      const res = await fetch("/api/game/buildings", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders(userRef.current)) },
        body: JSON.stringify({ buildingId: b.id }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; code?: string; city?: string; copies?: number; state?: ServerState };
      const name = t.buildingNames[b.id as keyof typeof t.buildingNames] ?? b.name;
      if (data.ok) {
        if (data.state) acceptServer(data.state);
        showToast(
          (data.copies ?? 1) > 1
            ? formatMessage(t.copyToast, { emoji: b.emoji, name, n: data.copies ?? 2 })
            : formatMessage(data.city ? t.placedToastCity : t.placedToast, { emoji: b.emoji, name, city: data.city ?? "" }),
          3500
        );
      } else if (data.code === "AUTH_REQUIRED") {
        showToast(t.guestOnlyHut, 3500);
      } else if (data.code === "NO_CITY") {
        showToast(t.noCity, 3500);
      } else if (data.code === "NOT_ENOUGH") {
        showToast(t.notEnough);
      } else {
        showToast(t.error);
      }
    } catch {
      showToast(t.offline);
    } finally {
      setPlacing(null);
    }
  }

  const tierNow = openTier(lifetime);
  const upcoming = nextTier(lifetime);
  /** Right-hand column with the buildings: full cards on wide screens, icons only on narrow ones. */
  const colW = box.w >= 900 ? 220 : box.w >= 520 ? 68 : 56;
  const wideCol = colW > 100;
  const stageW = Math.max(0, box.w - colW);
  const layout = useMemo(() => computeLayout(pool.length, { w: stageW, h: box.h }), [pool.length, stageW, box.h]);

  const tap = (e: React.MouseEvent<HTMLButtonElement>) => {
    const available = pool.filter((c) => c.tier <= tierNow);
    if (!available.length || !loaded) return;
    const stamp = e.timeStamp;
    tapTimes.current = tapTimes.current.filter((x) => stamp - x < 1000);
    if (tapTimes.current.length >= MAX_TAPS_PER_SEC) return;
    tapTimes.current.push(stamp);

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
    const order = [...recent];
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
    pendingRef.current = mergeBatch(pendingRef.current, { taps: 1, n: perTap, catches: add });
    setPending(pendingRef.current);

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
      setLandTick((tk) => {
        const n = { ...tk };
        for (const k of Object.keys(add)) n[k] = (n[k] ?? 0) + 1;
        return n;
      });
    }, FLIGHT_MS + perTap * 40);
    window.setTimeout(() => setPlus((p) => p.filter((x) => x.id !== plusId)), 900);

    const tierAfter = openTier(lifetime + perTap);
    if (tierAfter > tierNow) {
      setUnlocked(tierAfter);
      window.setTimeout(() => setUnlocked((x) => (x === tierAfter ? null : x)), 5000);
    }
  };

  const bySlug = useMemo(() => new Map(pool.map((c) => [c.slug, c])), [pool]);
  /** Pieces of the collection puzzle in a random-looking order that stays the same between visits. */
  const puzzleOrder = useMemo(() => {
    const h = (str: string) => {
      let x = 2166136261;
      for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619);
      return x >>> 0;
    };
    return [...pool].sort((a, b) => h(a.slug) - h(b.slug));
  }, [pool]);
  const foundCount = pool.reduce((n, c) => n + ((caught[c.slug] ?? 0) > 0 ? 1 : 0), 0);
  const collection = recent
    .map((slug) => ({ creature: bySlug.get(slug), count: (caught[slug] ?? 0) - (inFlight[slug] ?? 0) }))
    .filter((x): x is { creature: Creature; count: number } => !!x.creature && x.count > 0);

  return (
    <main
      ref={mainRef}
      className="relative mx-auto w-full max-w-5xl overflow-hidden select-none"
      style={{ height: `calc(100dvh - ${mainTop}px)` }}
    >
      <style>{CSS}</style>

      {/* Top: title, counter, progress to the next tier */}
      <div className="pointer-events-none absolute left-0 top-0 z-10 px-4 pt-3" style={{ right: colW }}>
        {/* Title, fairy-tale lettering, top-left. */}
        <h1
          className="dk-title text-left text-2xl leading-tight sm:text-3xl"
          style={{ fontFamily: "'Cinzel Decorative', Georgia, serif", fontWeight: 700 }}
        >
          {t.title}
        </h1>
        <span className="sr-only" aria-live="polite">
          {creatures}
        </span>
        {loaded && upcoming ? (
          <div className="mt-2 w-full max-w-[min(100%,26rem)]">
            {/* Just the bar: progress to the next tier, no numbers or labels. */}
            <div className="h-3 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--text)_10%,transparent)]">
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
        {rank ? (
          <div className="mt-1.5 text-xs font-semibold text-[var(--muted)]">
            {formatMessage(t.rank, { rank: rank.rank, city: rank.city })}
          </div>
        ) : null}
        {overtaken ? (
          <button
            type="button"
            onClick={() => setOvertaken(null)}
            className="dk-card pointer-events-auto mt-2 block max-w-sm rounded-2xl border border-rose-400/50 bg-[color-mix(in_srgb,#f43f5e_10%,var(--card))] px-3 py-2 text-left text-sm font-semibold"
          >
            {formatMessage(t.overtaken, { city: overtaken.city, rank: overtaken.rank })}
          </button>
        ) : null}
        {unlocked ? (
          <div className="dk-card mx-auto mt-2 max-w-sm rounded-2xl border border-amber-400/50 bg-[color-mix(in_srgb,#f59e0b_12%,var(--card))] px-4 py-2 text-sm">
            <div className="font-semibold">{t.newCreatures}</div>
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
            aria-label={formatMessage(t.tapAria, { n: perTap })}
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
            const spot = layout.spots[recent.indexOf(creature.slug)];
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

      {/* Buildings column (right). Grey = not affordable yet; lit = enough creatures to build it. */}
      {box.w > 0 ? (
        <aside
          className="absolute bottom-0 right-0 top-0 z-10 flex flex-col justify-start gap-1.5 overflow-y-auto border-l border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_60%,transparent)] px-1.5 py-3"
          style={{ width: colW }}
          aria-label={t.buildings}
        >
          {wideCol ? (
            <div className="mb-1 px-1 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{t.buildings}</div>
          ) : null}
          {BUILDINGS.map((b) => {
            const bName = t.buildingNames[b.id as keyof typeof t.buildingNames] ?? b.name;
            const isPlaced = placed[b.id] !== undefined;
            const cube = isPlaced ? cubes[b.id] : undefined;
            const ready = !isPlaced && creatures >= b.cost;
            const busy = placing === b.id;
            const cls = [
              "relative flex items-center gap-2 rounded-xl border text-left transition",
              wideCol ? "px-2 py-1.5" : "justify-center py-1.5",
              isPlaced
                ? cube?.full
                  ? "dk-ring border-amber-400 bg-[color-mix(in_srgb,#f59e0b_18%,var(--card))] shadow-[0_0_14px_rgba(245,158,11,.45)]"
                  : "border-emerald-400/60 bg-[color-mix(in_srgb,#10b981_10%,var(--card))] hover:scale-[1.02]"
                : ready
                  ? "dk-ring border-amber-400/70 bg-[color-mix(in_srgb,#f59e0b_14%,var(--card))] shadow-[0_0_14px_rgba(245,158,11,.35)]"
                  : "cursor-not-allowed border-transparent [&_.bdim]:opacity-40 [&_.bdim]:grayscale",
            ].join(" ");
            const inner = (
              <>
                <span className="flex flex-col items-center gap-1">
                  <span className="bdim relative text-2xl leading-none">
                    {b.emoji}
                    {isPlaced ? (
                      <span className="absolute -bottom-1 -right-2 text-sm" aria-hidden>
                        🌍
                      </span>
                    ) : null}
                  </span>
                  {!wideCol && !isPlaced ? <MiniBar value={creatures / b.cost} /> : null}
                  {!wideCol && cube ? <Cube amount={cube.amount} full={cube.full} /> : null}
                </span>
                {wideCol ? (
                  <span className="min-w-0 flex-1">
                    <span className="bdim block truncate text-sm font-semibold">
                      {bName}
                      {isPlaced && ownedOf(b.id) > 1 ? <span className="ml-1 text-amber-500">×{ownedOf(b.id)}</span> : null}
                    </span>
                    {isPlaced ? (
                      <>
                        <span className="block truncate text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          {t.onMap}{placed[b.id] ? ` · ${placed[b.id]}` : ""}
                        </span>
                        {cube ? <Cube amount={cube.amount} full={cube.full} /> : null}
                      </>
                    ) : (
                      <>
                        <span className="bdim flex justify-between text-[11px] text-[var(--muted)]">
                          <span className="tabular-nums">{busy ? t.placing : ready ? t.tapToBuild : shortNumber(b.cost)}</span>
                          <span className="tabular-nums">{formatMessage(t.perMin, { n: b.perMin })}</span>
                        </span>
                        <MiniBar value={creatures / b.cost} />
                      </>
                    )}
                  </span>
                ) : null}
              </>
            );
            const title = `${bName} · ${b.cost.toLocaleString()} · ${formatMessage(t.perMin, { n: b.perMin })}`;
            // A built building is its own "cube": it keeps filling with creatures; a tap releases them.
            return isPlaced ? (
              <div key={b.id} className="relative">
                <button
                  type="button"
                  onClick={() => void collect(b.id)}
                  disabled={collecting || !cube?.amount}
                  className={`${cls} w-full`}
                  title={cube?.amount ? formatMessage(t.collect, { n: cube.amount.toLocaleString() }) : bName}
                >
                  {inner}
                </button>
                {/* One more copy: the price grows 15% per copy, the cube fills faster. */}
                {(() => {
                  const price = nextCost(b.cost, ownedOf(b.id));
                  const can = creatures >= price && !!user;
                  return (
                    <button
                      type="button"
                      onClick={() => void placeBuilding(b)}
                      disabled={!can || busy}
                      title={`${t.buyMore} · ${price.toLocaleString()}`}
                      className={`mt-1 flex w-full items-center gap-2 rounded-lg border px-2 py-0.5 text-[11px] font-semibold transition ${
                        can
                          ? "border-amber-400/70 bg-[color-mix(in_srgb,#f59e0b_12%,var(--card))] hover:scale-[1.02]"
                          : "cursor-not-allowed border-[var(--border)] text-[var(--muted)]"
                      }`}
                    >
                      {wideCol ? (
                        <>
                          <span className="whitespace-nowrap">{busy ? t.placing : t.buyMore}</span>
                          <span className="ml-auto tabular-nums">{shortNumber(price)}</span>
                        </>
                      ) : (
                        <span className="mx-auto">+</span>
                      )}
                    </button>
                  );
                })()}
                {wideCol ? (
                  <LocaleLink
                    href="/app/map?layer=kingdoms"
                    className="absolute right-2 top-1.5 text-xs opacity-60 hover:opacity-100"
                    title={t.onMap}
                    aria-label={t.onMap}
                  >
                    🗺️
                  </LocaleLink>
                ) : null}
              </div>
            ) : (
              <button
                key={b.id}
                type="button"
                disabled={!ready || busy}
                onClick={() => placeBuilding(b)}
                title={title}
                className={cls}
              >
                {inner}
              </button>
            );
          })}
        </aside>
      ) : null}

      {toast ? (
        <div
          className="dk-card absolute bottom-10 z-30 -translate-x-1/2 rounded-full bg-[var(--text)] px-4 py-2 text-sm font-semibold text-[var(--bg)] shadow-lg"
          style={{ left: stageW / 2 }}
        >
          {toast}
        </div>
      ) : null}

      {/* All-time catch counter (Cookie Clicker's "baked all time"), bottom-left, fairy-tale numerals. */}
      {loaded ? (
        <div className="pointer-events-none absolute bottom-3 left-4 z-10 select-none" aria-live="polite">
          <div
            key={Math.floor(lifetime / 1000)}
            className="dk-lifetime dk-title text-3xl leading-none tabular-nums sm:text-4xl"
            style={{ fontFamily: "'Cinzel Decorative', Georgia, serif", fontWeight: 700 }}
          >
            {lifetime.toLocaleString()}
          </div>
          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            ✦ {t.lifetimeLabel} ✦
          </div>
        </div>
      ) : null}

      {/* Bottom line: first hint, and for guests the sign-in offer (stronger once there is something to lose). */}
      <div className="absolute bottom-0 left-0 z-10 px-4 pb-3 text-center text-xs text-[var(--muted)] sm:pl-56 sm:pr-20" style={{ right: colW }}>
        {authReady && !user && loaded && (creatures >= 200 || placed.hut !== undefined) ? (
          <div className="dk-card mx-auto inline-flex max-w-md flex-wrap items-center justify-center gap-2 rounded-2xl border border-purple-400/50 bg-[color-mix(in_srgb,#a855f7_10%,var(--card))] px-3 py-2 text-sm text-[var(--text)]">
            <span>{formatMessage(t.keepProgress, { n: creatures.toLocaleString(), u: PER_TAP_SIGNED_IN, g: PER_TAP_GUEST })}</span>
            <LocaleLink href="/signin?next=/app/game" className="rounded-full bg-purple-500 px-3 py-1 font-semibold text-white">
              {t.signIn}
            </LocaleLink>
          </div>
        ) : (
          <>
            {collection.length ? null : <span>{t.tapHint}</span>}
            {authReady && !user ? (
              <span>
                {collection.length ? "" : " · "}
                {formatMessage(t.guestLine, { g: PER_TAP_GUEST })} ·{" "}
                <LocaleLink href="/signin?next=/app/game" className="font-semibold text-purple-400 underline underline-offset-2">
                  {t.signIn}
                </LocaleLink>
              </span>
            ) : null}
          </>
        )}
      </div>

      {/* Collection puzzle: small 3×3 at the bottom-right of the stage, lit in proportion to what is collected. */}
      {loaded && box.w > 0 ? (
        <button
          type="button"
          onClick={() => setShowCollection(true)}
          aria-label={t.collectionOpen}
          title={t.collectionTitle}
          className="dk-puzzle absolute bottom-3 z-20 rounded-xl p-1.5 transition hover:scale-110"
          style={{ right: colW + 12 }}
        >
          <span className="grid grid-cols-3 gap-[3px]">
            {Array.from({ length: 9 }, (_, i) => {
              const lit = i < Math.round((foundCount / Math.max(1, pool.length)) * 9) || (i === 0 && foundCount > 0);
              return (
                <span
                  key={i}
                  className={`block h-3.5 w-3.5 rounded-[4px] ${lit ? "dk-piece-lit" : "bg-[color-mix(in_srgb,var(--text)_14%,transparent)]"}`}
                />
              );
            })}
          </span>
        </button>
      ) : null}

      {showCollection ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setShowCollection(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t.collectionTitle}
        >
          <div
            className="dk-card max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-amber-400/40 bg-[var(--card)] p-5 text-[var(--text)] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  className="dk-title text-2xl leading-tight"
                  style={{ fontFamily: "'Cinzel Decorative', Georgia, serif", fontWeight: 700 }}
                >
                  {t.collectionTitle}
                </h2>
                <p className="mt-1 text-xs text-[var(--muted)]">{t.collectionHint}</p>
              </div>
              <div className="text-right">
                <div
                  className="dk-title text-2xl tabular-nums"
                  style={{ fontFamily: "'Cinzel Decorative', Georgia, serif", fontWeight: 700 }}
                >
                  {foundCount}/{pool.length}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCollection(false)}
                  className="mt-1 text-xs font-semibold text-[var(--muted)] underline underline-offset-2"
                >
                  {t.close}
                </button>
              </div>
            </div>
            {/* The big puzzle: one piece per creature, scattered in a stable random order. */}
            <div className="mt-4 grid grid-cols-6 gap-1.5 rounded-2xl border border-amber-400/30 bg-[color-mix(in_srgb,#f59e0b_6%,transparent)] p-2 sm:grid-cols-8">
              {puzzleOrder.map((c) => {
                const have = (caught[c.slug] ?? 0) > 0;
                const locked = !have && c.tier > tierNow;
                return (
                  <button
                    key={c.slug}
                    type="button"
                    disabled={!have}
                    onClick={() => {
                      setShowCollection(false);
                      setCard(c);
                    }}
                    title={have ? c.name : locked ? t.collectionLocked : "?"}
                    className={`relative flex aspect-square items-center justify-center rounded-lg text-2xl transition ${
                      have
                        ? "dk-piece-have hover:scale-110"
                        : "cursor-default bg-[color-mix(in_srgb,var(--text)_8%,transparent)]"
                    }`}
                  >
                    <span className={have ? "" : "opacity-25 grayscale"}>{c.emoji}</span>
                    {locked ? <span className="absolute bottom-0.5 right-1 text-[9px] opacity-60">🔒</span> : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* "While you were away" */}
      {away && !card ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="dk-card w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center text-[var(--text)] shadow-2xl">
            <div className="text-4xl">🌙</div>
            <div className="mt-2 text-lg font-semibold">{t.awayTitle}</div>
            <p className="mt-1 text-sm text-[var(--muted)]">
              {formatMessage(t.awayBody, { n: away.amount.toLocaleString() })}
              {away.full ? <span className="mt-1 block font-semibold text-amber-500">{t.storageFull}</span> : null}
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => void collect()}
                disabled={collecting}
                className="flex-1 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-black"
              >
                🧺 {formatMessage(t.collect, { n: shortNumber(away.amount) })}
              </button>
              <button
                type="button"
                onClick={() => setAway(null)}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold"
              >
                {t.later}
              </button>
            </div>
          </div>
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
                <div className="text-xs uppercase tracking-wide text-[var(--muted)]">{t.dreamSymbol}</div>
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
                {t.fullMeaning}
              </LocaleLink>
              <button
                type="button"
                onClick={() => setCard(null)}
                className="rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold"
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}

const CSS = `
.dk-title { background: linear-gradient(90deg, #7c3aed, #c026d3 45%, #f59e0b); -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 1px 6px rgba(168,85,247,.25)); letter-spacing: .02em; }
.dk-ring { animation: dk-ring 2.4s ease-in-out infinite; transform-origin: 50% 20%; }
@keyframes dk-ring { 0%, 70%, 100% { rotate: 0deg; } 74% { rotate: -4deg; } 78% { rotate: 4deg; } 82% { rotate: -3deg; } 86% { rotate: 3deg; } 90% { rotate: -1deg; } 94% { rotate: 1deg; } }
.dk-lifetime { animation: dk-lifetime .6s ease-out both; text-shadow: none; filter: drop-shadow(0 0 10px rgba(245,158,11,.35)) drop-shadow(0 1px 6px rgba(168,85,247,.3)); }
@keyframes dk-lifetime { 0% { transform: scale(1); } 35% { transform: scale(1.08); } 100% { transform: scale(1); } }
.dk-puzzle { background: color-mix(in srgb, var(--card) 80%, transparent); border: 1px solid rgba(245,158,11,.45);
  box-shadow: 0 0 14px rgba(245,158,11,.25), 0 0 22px rgba(168,85,247,.18); animation: dk-puzzle 3.2s ease-in-out infinite; }
@keyframes dk-puzzle { 0%,100% { box-shadow: 0 0 10px rgba(245,158,11,.2), 0 0 18px rgba(168,85,247,.12); } 50% { box-shadow: 0 0 18px rgba(245,158,11,.45), 0 0 28px rgba(168,85,247,.3); } }
.dk-piece-lit { background: linear-gradient(135deg, #a855f7, #f59e0b); box-shadow: 0 0 6px rgba(245,158,11,.6); }
.dk-piece-have { background: radial-gradient(circle at 30% 25%, color-mix(in srgb, #f59e0b 22%, var(--card)), color-mix(in srgb, #a855f7 16%, var(--card)));
  border: 1px solid rgba(245,158,11,.55); box-shadow: inset 0 0 8px rgba(245,158,11,.2); }
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
  .dk-sway, .dk-catcher, .dk-halo, .dk-float, .dk-ring, .dk-puzzle { animation: none; }
  .dk-fly { animation-duration: 1ms !important; }
}
`;
