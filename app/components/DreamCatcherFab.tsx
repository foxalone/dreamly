"use client";

import { usePathname } from "next/navigation";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { stripLocalePrefix } from "@/lib/i18n/path";

/**
 * Small floating dream catcher in the corner of every page → Dream Kingdoms (/app/game).
 * Hidden on the game itself and on pages where it would only get in the way.
 */
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
        @keyframes dcf-sway { 0%,100% { rotate: -5deg; } 50% { rotate: 5deg; } }
        @media (prefers-reduced-motion: reduce) { .dcf img { animation: none; } }
      `}</style>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/game/dreamcatcher-small.webp" alt="" width={48} height={72} className="h-full w-full" draggable={false} />
    </LocaleLink>
  );
}
