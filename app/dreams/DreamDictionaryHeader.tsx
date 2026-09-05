"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { MoonStar } from "lucide-react";
import QuickSymbolFab from "./QuickSymbolFab";

const DIRECTION_THRESHOLD = 8;
const TOP_REVEAL_Y = 24;

export default function DreamDictionaryHeader() {
  const pathname = usePathname();
  const headerRef = useRef<HTMLElement>(null);
  const lastYRef = useRef(0);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;
    header.classList.remove("is-hidden");
    lastYRef.current = window.scrollY;
  }, [pathname]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) return;

    const syncOffset = () => {
      header.style.setProperty("--hide-on-scroll-offset", `${header.offsetHeight}px`);
    };
    syncOffset();

    const resizeObserver = new ResizeObserver(syncOffset);
    resizeObserver.observe(header);

    lastYRef.current = window.scrollY;
    let ticking = false;
    let frame = 0;

    const update = () => {
      ticking = false;
      const y = window.scrollY;

      if (y <= TOP_REVEAL_Y) {
        header.classList.remove("is-hidden");
        lastYRef.current = y;
        return;
      }

      const delta = y - lastYRef.current;
      if (Math.abs(delta) < DIRECTION_THRESHOLD) return;

      header.classList.toggle("is-hidden", delta > 0);
      lastYRef.current = y;
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      frame = window.requestAnimationFrame(update);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <header
      ref={headerRef}
      className="hide-on-scroll-header sticky top-0 z-40 border-b border-[var(--dd-border)] bg-[var(--dd-header)] backdrop-blur-xl"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 sm:px-8">
        <Link href="/dreams" className="flex items-center gap-2.5 text-sm font-semibold tracking-wide text-[var(--dd-text)]">
          <span className="grid size-8 place-items-center rounded-xl bg-violet-500/15 text-[var(--dd-accent-text)] ring-1 ring-violet-400/20">
            <MoonStar size={17} aria-hidden="true" />
          </span>
          <span>Dreamly Dictionary</span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <QuickSymbolFab />
        </div>
      </div>
    </header>
  );
}
