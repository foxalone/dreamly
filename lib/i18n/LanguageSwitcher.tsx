"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { usePathname } from "next/navigation";
import { LOCALES, LOCALE_META, type Locale } from "./config";
import { switchLocalePath } from "./path";
import { useLocale, useMessages } from "./LocaleProvider";
import { SegmentedPill, segmentedThumbClass } from "@/app/components/SegmentedPill";

const HOLD_MS = 450;

export default function LanguageSwitcher({
  compact = false,
  segmented = false,
}: {
  compact?: boolean;
  segmented?: boolean;
}) {
  const locale = useLocale();
  const t = useMessages();
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const holdTimer = useRef<number | null>(null);
  const openedByHold = useRef(false);

  function clearHold() {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  useEffect(() => () => clearHold(), []);

  useEffect(() => {
    if (!open) return;

    function onDocPointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onDocPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDocPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function onTriggerPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return;
    openedByHold.current = false;
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      openedByHold.current = true;
      setOpen(true);
    }, HOLD_MS);
  }

  function onTriggerClick() {
    if (openedByHold.current) {
      openedByHold.current = false;
      return;
    }
    setOpen((value) => !value);
  }

  function optionLabel(code: Locale) {
    return compact || segmented ? code.toUpperCase() : LOCALE_META[code].nativeLabel;
  }

  const trigger = (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={t.nav.language}
      title={t.nav.languageHold}
      onPointerDown={onTriggerPointerDown}
      onPointerUp={clearHold}
      onPointerCancel={clearHold}
      onPointerLeave={clearHold}
      onContextMenu={(event) => event.preventDefault()}
      onClick={onTriggerClick}
      className={
        segmented
          ? segmentedThumbClass(true)
          : "select-none rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-white touch-manipulation"
      }
      style={{ WebkitTouchCallout: "none" }}
    >
      {locale.toUpperCase()}
    </button>
  );

  const options = (
    <div role="listbox" aria-label={t.nav.language} className="flex items-center gap-0.5">
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <a
            key={code}
            href={switchLocalePath(pathname, code)}
            hrefLang={LOCALE_META[code].htmlLang}
            lang={LOCALE_META[code].htmlLang}
            role="option"
            aria-selected={active}
            aria-current={active ? "page" : undefined}
            title={LOCALE_META[code].nativeLabel}
            onClick={(event) => {
              if (active) {
                event.preventDefault();
                setOpen(false);
              }
            }}
            className={
              segmented
                ? segmentedThumbClass(active)
                : active
                  ? "rounded-full bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white"
                  : "rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--muted)] transition hover:text-[var(--text)]"
            }
          >
            {optionLabel(code)}
          </a>
        );
      })}
    </div>
  );

  return (
    <div ref={rootRef} className="relative shrink-0">
      {segmented ? <SegmentedPill ariaLabel={t.nav.language}>{trigger}</SegmentedPill> : trigger}
      {open ? (
        <div
          className={
            segmented
              ? "absolute end-0 top-full z-50 mt-1.5"
              : "absolute end-0 top-full z-50 mt-1.5 rounded-full bg-[var(--surface)] p-1 shadow-[0_8px_24px_rgba(15,23,42,0.16)] ring-1 ring-[var(--border)]"
          }
        >
          {segmented ? <SegmentedPill ariaLabel={t.nav.language}>{options}</SegmentedPill> : options}
        </div>
      ) : null}
    </div>
  );
}
