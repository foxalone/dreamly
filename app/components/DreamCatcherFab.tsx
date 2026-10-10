"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "@/lib/analytics";
import { ESCAPE_EVENT, readEscapePending } from "@/lib/game/escape";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import { stripLocalePrefix } from "@/lib/i18n/path";

/** Written by the game (GameClient → HINT_KEY): when the first building's storage fills up, to show a dot. */
const HINT_KEY = "dreamly_game_hint";

function storageIsFull(): boolean {
  try {
    const h = JSON.parse(localStorage.getItem(HINT_KEY) ?? "null") as { fullAt?: number | null; skew?: number } | null;
    return !!h?.fullAt && Date.now() + (h.skew ?? 0) >= h.fullAt;
  } catch {
    return false;
  }
}

/** Creatures that peek out of the catcher on hover: emoji + where they fly (px, up and inwards from the corner). */
const PEEK = [
  { e: "🦋", x: -46, y: -58, d: 0 },
  { e: "🦊", x: -18, y: -78, d: 0.25 },
  { e: "🐉", x: -64, y: -22, d: 0.5 },
  { e: "🦉", x: 6, y: -70, d: 0.75 },
];

/** Set on click so the game page can report `game_open { via: "fab" }`. Read and cleared by GameClient. */
export const GAME_ENTRY_KEY = "dreamly_game_entry";

/** GA page bucket: "home" | "dictionary" | "feed" | ... — a bounded set, not the raw path. */
export function fabPageKind(path: string): string {
  if (path === "/" || path === "") return "home";
  const first = path.split("/")[1] ?? "";
  if (first === "dreams") return path.split("/").length > 2 ? "dictionary" : "home";
  if (first === "app") return path.split("/")[2] || "app";
  return first || "other";
}

const HIDDEN_PREFIXES = ["/app/game", "/app/profile/admin-dashboard", "/signin", "/payment-success", "/app/tiktok-studio"];

export default function DreamCatcherFab() {
  const pathname = usePathname() ?? "/";
  const t = useMessages().game;
  const [full, setFull] = useState(false);
  /** Creatures that escaped from a dream reading and wait in the catcher (lib/game/escape.ts). */
  const [escaped, setEscaped] = useState<string[] | null>(null);
  useEffect(() => {
    const check = () => {
      setFull(storageIsFull());
      setEscaped(readEscapePending()?.emojis ?? null);
    };
    const first = window.setTimeout(check, 0);
    const every = window.setInterval(check, 60_000);
    window.addEventListener(ESCAPE_EVENT, check);
    window.addEventListener("storage", check);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(every);
      window.removeEventListener(ESCAPE_EVENT, check);
      window.removeEventListener("storage", check);
    };
  }, [pathname]);
  const { path } = stripLocalePrefix(pathname);
  const hidden = HIDDEN_PREFIXES.some((p) => path === p || path.startsWith(p + "/"));
  const page = fabPageKind(path);

  // One `game_fab_view` per page view; `game_fab_hover` once per page view (mouse/keyboard only).
  const hovered = useRef(false);
  useEffect(() => {
    if (hidden) return;
    hovered.current = false;
    trackEvent("game_fab_view", { page, full: storageIsFull(), escaped: (readEscapePending()?.emojis.length ?? 0) > 0 });
  }, [hidden, page, pathname]);
  const onHover = () => {
    if (hovered.current) return;
    hovered.current = true;
    trackEvent("game_fab_hover", { page, full, escaped: (escaped?.length ?? 0) > 0 });
  };
  const onClick = () => {
    trackEvent("game_fab_click", { page, full, escaped: (escaped?.length ?? 0) > 0 });
    try {
      sessionStorage.setItem(GAME_ENTRY_KEY, JSON.stringify({ via: "fab", page, at: Date.now() }));
    } catch {}
  };

  if (hidden) return null;

  return (
    <LocaleLink
      href="/app/game"
      aria-label={t.fabLabel}
      title={t.title}
      onMouseEnter={onHover}
      onFocus={onHover}
      onClick={onClick}
      className="dcf group fixed bottom-4 end-4 z-40 block h-[72px] w-12 outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      <style>{`
        .dcf img { transform-origin: 50% 0%; animation: dcf-sway 4.5s ease-in-out infinite;
          filter: drop-shadow(0 0 6px rgba(245,158,11,.55)) drop-shadow(0 0 14px rgba(168,85,247,.35)); transition: scale .2s; }
        .dcf:hover img { scale: 1.12; }
        .dcf-peek { position: absolute; left: 50%; top: 30%; font-size: 18px; line-height: 1; opacity: 0;
          translate: -50% -50%; pointer-events: none; }
        .dcf:hover .dcf-peek, .dcf:focus-visible .dcf-peek { animation: dcf-peek 1.2s ease-out infinite; }
        @keyframes dcf-peek {
          0% { opacity: 0; transform: translate(0,0) scale(.3); }
          20% { opacity: 1; }
          70% { opacity: 1; transform: translate(calc(var(--x) * var(--dir, 1)), var(--y)) scale(1); }
          100% { opacity: 0; transform: translate(calc(var(--x) * var(--dir, 1)), calc(var(--y) - 10px)) scale(.9); }
        }
        [dir="rtl"] .dcf { --dir: -1;
        }
        @keyframes dcf-sway { 0%,100% { rotate: -5deg; } 50% { rotate: 5deg; } }
        @media (prefers-reduced-motion: reduce) { .dcf img, .dcf:hover .dcf-peek { animation: none; } }
      `}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/game/dreamcatcher-small.webp" alt="" width={48} height={72} className="h-full w-full" draggable={false} />
      {escaped?.length ? (
        // Creatures from the player's own dream are waiting — this beats the storage dot.
        <span
          aria-hidden
          className="absolute -top-2 end-0 flex animate-pulse items-center gap-0.5 rounded-full bg-purple-600 px-1.5 py-0.5 text-[11px] leading-none shadow-md shadow-purple-500/40"
        >
          <span>{escaped[0]}</span>
          {escaped.length > 1 ? <span className="font-semibold text-white">+{escaped.length - 1}</span> : null}
        </span>
      ) : full ? (
        <span
          aria-hidden
          className="absolute -top-1 end-0 flex h-4 w-4 animate-pulse items-center justify-center rounded-full bg-amber-400 text-[10px] shadow"
        >
          🧺
        </span>
      ) : null}
      {PEEK.map((p) => (
        <span
          key={p.e}
          aria-hidden
          className="dcf-peek"
          style={{ "--x": `${p.x}px`, "--y": `${p.y}px`, animationDelay: `${p.d}s` } as React.CSSProperties}
        >
          {p.e}
        </span>
      ))}
    </LocaleLink>
  );
}
