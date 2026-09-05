"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { MoonStar } from "lucide-react";
import PrimaryNav from "./PrimaryNav";

function syncNavHeight(el: HTMLElement) {
  document.documentElement.style.setProperty("--app-nav-height", `${el.offsetHeight}px`);
}

export default function AppHeader({ hidden }: { hidden?: boolean }) {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const sync = () => syncNavHeight(header);
    sync();

    const resizeObserver = new ResizeObserver(sync);
    resizeObserver.observe(header);
    return () => resizeObserver.disconnect();
  }, []);

  if (hidden) return null;

  return (
    <header
      ref={headerRef}
      className="app-top-nav sticky top-0 z-40 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--bg)_86%,transparent)] backdrop-blur-xl"
    >
      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-1 px-3 py-2 md:grid-cols-[auto_minmax(0,1fr)] md:gap-3 sm:px-6 sm:py-2.5 lg:px-8">
        <Link
          href="/app/dreams"
          className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-wide text-[var(--text)]"
        >
          <span className="grid size-8 place-items-center rounded-xl bg-violet-500/15 text-violet-400 ring-1 ring-violet-400/20">
            <MoonStar size={17} aria-hidden="true" />
          </span>
          <span className="hidden min-[380px]:inline">Dreamly</span>
        </Link>
        <div className="min-w-0 md:flex md:justify-center">
          <PrimaryNav tone="app" />
        </div>
      </div>
    </header>
  );
}
