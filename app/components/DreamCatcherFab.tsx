"use client";

import { usePathname } from "next/navigation";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { stripLocalePrefix } from "@/lib/i18n/path";

/**
 * Small floating dream catcher in the corner of every page → Dream Kingdoms (/app/game).
 * Hidden on the game itself and on pages where it would only get in the way.
 */
/** Creatures that peek out of the catcher on hover: emoji + where they fly (px, up and inwards from the corner). */
const PEEK = [
  { e: "🦋", x: -46, y: -58, d: 0 },
  { e: "🦊", x: -18, y: -78, d: 0.25 },
  { e: "🐉", x: -64, y: -22, d: 0.5 },
  { e: "🦉", x: 6, y: -70, d: 0.75 },
];

const HIDDEN_PREFIXES = ["/app/game", "/app/profile/admin-dashboard", "/signin", "/payment-success", "/app/tiktok-studio"];

export default function DreamCatcherFab() {
  const pathname = usePathname() ?? "/";
  const { path } = stripLocalePrefix(pathname);
  if (HIDDEN_PREFIXES.some((p) => path === p || path.startsWith(p + "/"))) return null;

  return (
    <LocaleLink
      href="/app/game"
      aria-label="Dream Kingdoms — catch dream creatures"
      title="Dream Kingdoms"
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
