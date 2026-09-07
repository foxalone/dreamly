"use client";

import { useEffect, useRef } from "react";
import PrimaryNav from "@/app/app/PrimaryNav";
import QuickSymbolFab from "./QuickSymbolFab";

export default function DreamDictionaryHeader() {
  const headerRef = useRef<HTMLElement>(null);

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
      <div className="mx-auto max-w-6xl px-3 py-2 sm:px-6 sm:py-2.5 lg:px-8">
        <PrimaryNav tone="dictionary" />
      </div>
      <QuickSymbolFab />
    </header>
  );
}
