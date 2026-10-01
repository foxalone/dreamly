"use client";

import { useEffect } from "react";

import { trackEvent } from "@/lib/analytics";
import { symbolSlugFromPath } from "@/lib/symbolClicks";

const PICTOGRAPHIC_RE = /\p{Extended_Pictographic}/u;

/** The link shows a symbol icon (an aria-hidden emoji), not just a text link. */
function hasSymbolIcon(anchor: HTMLAnchorElement) {
  const hidden = anchor.querySelectorAll('[aria-hidden="true"]');
  for (const el of Array.from(hidden)) {
    if (el.tagName.toLowerCase() === "svg") continue;
    if (PICTOGRAPHIC_RE.test(el.textContent ?? "")) return true;
  }
  return false;
}

/**
 * One delegated listener for the whole site: logs clicks on dictionary symbol icons
 * (any link to /dreams/<slug> that carries the symbol's emoji) to dictionary_symbol_clicks.
 * The server validates the slug and works out where the click happened.
 */
export default function SymbolClickTracker() {
  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.type === "auxclick" && event.button !== 1) return;
      const target = event.target as Element | null;
      const anchor = target?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      let url: URL;
      try {
        url = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      const slug = symbolSlugFromPath(url.pathname);
      if (!slug || !hasSymbolIcon(anchor)) return;
      // Self-links (e.g. the variation aside pointing at the page you're on) are not a choice.
      if (symbolSlugFromPath(window.location.pathname) === slug) return;

      const inSearch = Boolean(anchor.closest('[aria-label="Dream search results"]'));
      trackEvent("dictionary_symbol_click", { symbol: slug, in_search: inSearch });
      try {
        void fetch("/api/dreams/symbol-click", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug, fromPath: window.location.pathname, inSearch }),
          keepalive: true,
        }).catch(() => {});
      } catch {
        // Analytics must never block navigation.
      }
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("auxclick", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("auxclick", onClick, true);
    };
  }, []);

  return null;
}
