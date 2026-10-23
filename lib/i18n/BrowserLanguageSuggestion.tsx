"use client";

import { useState, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Globe2, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { LOCALE_META } from "./config";
import { browserLocale, suggestedLanguagePath } from "./browser-language";
import { browserLanguageMessages } from "./browser-language-messages";
import { localeFromPathname } from "./path";

function subscribe(onChange: () => void) {
  window.addEventListener("languagechange", onChange);
  return () => window.removeEventListener("languagechange", onChange);
}

function getBrowserLocale() {
  return browserLocale(navigator.languages?.length ? navigator.languages : [navigator.language]);
}

const getServerLocale = () => null;

export default function BrowserLanguageSuggestion() {
  const pathname = usePathname() || "/";
  const preferred = useSyncExternalStore(subscribe, getBrowserLocale, getServerLocale);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const suggestedPath = suggestedLanguagePath(pathname, preferred);
  const suggestionKey = `${pathname}:${preferred}`;

  if (!preferred || !suggestedPath || dismissed === suggestionKey) return null;

  const m = browserLanguageMessages[preferred];
  const meta = LOCALE_META[preferred];
  const params = { from_locale: localeFromPathname(pathname), to_locale: preferred, source: "browser_suggestion" };
  // A language change keeps the current page, filters and section anchor.
  const href = `${suggestedPath}${window.location.search}${window.location.hash}`;

  return (
    <aside
      lang={meta.htmlLang}
      dir={meta.dir}
      aria-label={m.title}
      className="fixed inset-x-3 bottom-[calc(var(--app-nav-height,4rem)+env(safe-area-inset-bottom)+1rem)] z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 text-[var(--text)] shadow-xl"
      style={preferred === "ar" ? { fontFamily: '"Noto Sans Arabic", sans-serif' } : undefined}
    >
      <Globe2 size={22} className="shrink-0 text-violet-500" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{m.title}</p>
        <Link
          href={href}
          hrefLang={meta.htmlLang}
          onClick={() => trackEvent("language_switch", params)}
          className="mt-2 inline-flex min-h-11 items-center rounded-full bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500"
        >
          {m.action}
        </Link>
      </div>
      <button
        type="button"
        aria-label={m.dismiss}
        onClick={() => {
          setDismissed(suggestionKey);
          trackEvent("language_suggestion_dismiss", params);
        }}
        className="flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-violet-500/10 focus-visible:outline-2 focus-visible:outline-violet-500"
      >
        <X size={18} aria-hidden="true" />
      </button>
    </aside>
  );
}
