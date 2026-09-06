"use client";

import { useEffect, useRef } from "react";
import { MoonStar } from "lucide-react";
import PrimaryNav from "@/app/app/PrimaryNav";
import QuickSymbolFab from "./QuickSymbolFab";
import LocaleLink from "@/lib/i18n/LocaleLink";
import LanguageSwitcher from "@/lib/i18n/LanguageSwitcher";
import { useMessages } from "@/lib/i18n/LocaleProvider";

export default function DreamDictionaryHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const t = useMessages();

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const syncOffset = () => {
      document.documentElement.style.setProperty("--app-nav-height", `${header.offsetHeight}px`);
    };
    syncOffset();

    const resizeObserver = new ResizeObserver(syncOffset);
    resizeObserver.observe(header);
    return () => resizeObserver.disconnect();
  }, []);

  return (
    <header
      ref={headerRef}
      className="app-top-nav sticky top-0 z-40 border-b border-[var(--dd-border)] bg-[var(--dd-header)] backdrop-blur-xl"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 px-3 py-2 sm:px-6 sm:py-2.5 md:grid-cols-[auto_minmax(0,1fr)_auto] lg:px-8">
        <LocaleLink href="/dreams" className="flex items-center gap-2.5 text-sm font-semibold tracking-wide text-[var(--dd-text)]">
          <span className="grid size-8 place-items-center rounded-xl bg-violet-500/15 text-[var(--dd-accent-text)] ring-1 ring-violet-400/20">
            <MoonStar size={17} aria-hidden="true" />
          </span>
          <span className="hidden min-[380px]:inline">{t.brand.dictionary}</span>
        </LocaleLink>
        <div className="col-span-2 min-w-0 md:col-span-1 md:col-start-2 md:flex md:justify-center">
          <PrimaryNav tone="dictionary" />
        </div>
        <div className="col-start-2 row-start-1 flex items-center gap-2 md:col-start-3">
          <LanguageSwitcher compact />
          <QuickSymbolFab />
        </div>
      </div>
    </header>
  );
}
