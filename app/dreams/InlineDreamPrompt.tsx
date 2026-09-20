"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ArrowRight, Loader2, Sparkles, X } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import DreamLensChips from "@/app/components/DreamLensChips";
import { useDreamAsk } from "@/app/components/useDreamAsk";

const OPEN_DELAY_MS = 160;
const CLOSE_DELAY_MS = 380;

/**
 * The first paragraph of a dictionary page with a highlighted, clickable sentence after
 * its opening lines: "Dreamed about this? Write it in your journal…". Hovering or tapping
 * it unfolds a small in-page panel (no overlay) where the reader writes the dream and gets
 * a reading through the same flow as the homepage ask box.
 */
export default function InlineDreamPrompt({
  lead,
  rest,
  accent,
  symbolSlug,
}: {
  lead: ReactNode;
  rest?: ReactNode;
  accent: string;
  symbolSlug: string;
}) {
  const t = useMessages();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const pinned = useRef(false);
  const openTimer = useRef<number | null>(null);
  const closeTimer = useRef<number | null>(null);
  const openedOnce = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focusRequested, setFocusRequested] = useState(0);

  const ask = useDreamAsk({
    source: "symbol_inline",
    interpretedEvent: "symbol_dream_interpreted",
    eventParams: { symbol: symbolSlug },
  });
  const { text, busy, analysis } = ask;

  function clearTimers() {
    if (openTimer.current) window.clearTimeout(openTimer.current);
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }

  function reveal(via: "hover" | "click") {
    setOpen(true);
    if (!openedOnce.current) {
      openedOnce.current = true;
      trackEvent("symbol_prompt_open", { symbol: symbolSlug, via });
    }
  }

  function onEnter() {
    clearTimers();
    openTimer.current = window.setTimeout(() => reveal("hover"), OPEN_DELAY_MS);
  }

  function holdsAttention() {
    const active = typeof document !== "undefined" ? document.activeElement : null;
    return (
      pinned.current ||
      busy ||
      !!analysis ||
      !!text.trim() ||
      (!!active && !!panelRef.current?.contains(active))
    );
  }

  function onLeave() {
    clearTimers();
    closeTimer.current = window.setTimeout(() => {
      if (!holdsAttention()) setOpen(false);
    }, CLOSE_DELAY_MS);
  }

  function onTriggerClick() {
    clearTimers();
    pinned.current = true;
    reveal("click");
    setFocusRequested((n) => n + 1);
  }

  function close() {
    clearTimers();
    pinned.current = false;
    setOpen(false);
  }

  useEffect(() => {
    if (!focusRequested || !open) return;
    const id = window.setTimeout(() => textareaRef.current?.focus({ preventScroll: true }), 60);
    return () => window.clearTimeout(id);
  }, [focusRequested, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, busy]);

  useEffect(() => () => clearTimers(), []);

  const accentVars = { "--cta": accent } as CSSProperties;

  return (
    <div style={accentVars}>
      <p>
        {lead}{" "}
        {/* A <span>, not a <button>: browsers render buttons as inline-block, which would break
            the sentence out of the paragraph flow. */}
        <span
          role="button"
          tabIndex={0}
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          onFocus={onEnter}
          onBlur={onLeave}
          onClick={onTriggerClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onTriggerClick();
            }
          }}
          aria-expanded={open}
          aria-controls={panelId}
          className="dd-inline-cta cursor-pointer select-none"
        >
          <Sparkles size={14} strokeWidth={2.2} className="me-1 inline-block align-[-2px]" aria-hidden="true" />
          {t.symbolPrompt.cta}
          <ArrowRight size={14} strokeWidth={2.2} className="dd-inline-cta__arrow ms-1 inline-block align-[-2px] rtl:rotate-180" aria-hidden="true" />
        </span>
        {/* Closed: the paragraph carries on right after the sentence. Open: the panel sits
            directly under the sentence and the rest of the paragraph resumes below it. */}
        {rest && !open ? <> {rest}</> : null}
      </p>

      <div
        id={panelId}
        ref={panelRef}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
        aria-hidden={!open}
      >
        <div className="overflow-hidden">
          <div
            className={`relative mt-4 overflow-hidden rounded-2xl border border-[var(--dd-border)] bg-[var(--dd-surface)] p-4 transition-opacity duration-300 sm:p-5 ${open ? "opacity-100" : "opacity-0"}`}
            {...(open ? {} : { inert: true })}
          >
            <div
              className="pointer-events-none absolute -end-16 -top-20 size-56 rounded-full blur-[70px]"
              style={{ backgroundColor: `${accent}2a` }}
              aria-hidden="true"
            />
            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: accent }}>
                    {t.brand.name}
                  </p>
                  <h3 className="mt-1 text-base font-semibold leading-snug text-[var(--dd-text)]">{t.symbolPrompt.title}</h3>
                  <p className="mt-1 text-[13px] leading-5 text-[var(--dd-muted)]">{analysis ? t.symbolPrompt.saved : t.symbolPrompt.lead}</p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  disabled={busy}
                  className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--dd-subtle)] transition hover:bg-[var(--dd-surface-hover)] hover:text-[var(--dd-text)] disabled:opacity-50"
                  aria-label={t.symbolPrompt.close}
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>

              <form onSubmit={ask.submit} className="mt-4 space-y-3">
                <label className="sr-only" htmlFor={`${panelId}-text`}>
                  {t.symbolPrompt.placeholder}
                </label>
                <textarea
                  id={`${panelId}-text`}
                  ref={textareaRef}
                  value={text}
                  onChange={(e) => {
                    pinned.current = true;
                    ask.setText(e.target.value);
                  }}
                  onFocus={() => {
                    pinned.current = true;
                  }}
                  rows={3}
                  maxLength={ask.maxChars}
                  placeholder={t.symbolPrompt.placeholder}
                  disabled={busy}
                  tabIndex={open ? 0 : -1}
                  className="w-full resize-none rounded-xl border border-[var(--dd-border)] bg-[var(--dd-bg)] px-3.5 py-3 text-[15px] leading-6 text-[var(--dd-text)] outline-none transition placeholder:text-[var(--dd-faint)] focus:border-[var(--cta)] disabled:opacity-70"
                />
                <div className="flex items-center justify-end text-[11px] font-medium tabular-nums text-[var(--dd-subtle)]">
                  <span className={text.length >= ask.maxChars ? "text-amber-500" : ""}>
                    {text.length}/{ask.maxChars}
                  </span>
                </div>
                <DreamLensChips value={ask.lens} onChange={ask.chooseLens} disabled={busy} tone="onDictionary" />
                <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex min-w-0 cursor-pointer items-start gap-2 text-xs text-[var(--dd-muted)]">
                    <input
                      type="checkbox"
                      checked={ask.shareToMap}
                      disabled={busy}
                      onChange={(e) => ask.setShareToMap(e.target.checked)}
                      tabIndex={open ? 0 : -1}
                      className="mt-0.5 size-3.5 shrink-0 rounded border-[var(--dd-border-strong)] accent-[var(--cta)]"
                    />
                    <span>{t.home.askShareMap}</span>
                  </label>
                  <button
                    type="submit"
                    disabled={busy || !text.trim()}
                    tabIndex={open ? 0 : -1}
                    className="inline-flex shrink-0 items-center justify-center gap-2 self-end rounded-full bg-[var(--dd-text)] px-4 py-2 text-sm font-semibold text-[var(--dd-bg)] transition hover:opacity-90 disabled:opacity-50 sm:self-auto"
                  >
                    {busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
                    {busy ? t.home.askBusy : t.home.askSubmit}
                  </button>
                </div>
              </form>

              {ask.error ? (
                <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-500" role="alert">
                  {ask.error}
                </p>
              ) : null}

              {analysis ? (
                <div className="mt-4 rounded-xl border border-[var(--dd-border)] bg-[var(--dd-bg)] p-4">
                  <p className="whitespace-pre-wrap text-[15px] leading-7 text-[var(--dd-text)]">{analysis}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => ask.goToJournal()}
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                      style={{ backgroundColor: accent }}
                    >
                      {t.home.askSave}
                      <ArrowRight size={15} className="rtl:rotate-180" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => ask.goToJournal()}
                      className="rounded-full border border-[var(--dd-border)] px-4 py-2 text-sm font-semibold text-[var(--dd-text)] transition hover:bg-[var(--dd-surface-hover)]"
                    >
                      {t.home.askMore}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      {rest && open ? <p className="mt-5">{rest}</p> : null}
    </div>
  );
}
