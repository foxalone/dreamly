"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useMessages } from "@/lib/i18n/LocaleProvider";
import "./PwaLaunch.css";

/** Local Art images need no API round trip; normal browser visits skip this entirely. */
export default function PwaLaunch({ children }: { children: ReactNode }) {
  const t = useMessages();
  const contentRef = useRef<HTMLDivElement>(null);
  const continueRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const dismiss = useCallback(() => {
    document.documentElement.removeAttribute("data-pwa-launch");
    if (contentRef.current) contentRef.current.inert = false;
    previousFocus.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (!root.hasAttribute("data-pwa-launch")) return;
    const remaining = 2800 - (Date.now() - Number(root.getAttribute("data-pwa-launch-start")));
    // Slow hydration must never bring back a welcome that CSS already dismissed.
    if (remaining <= 0) {
      dismiss();
      return;
    }
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (contentRef.current) contentRef.current.inert = true;
    continueRef.current?.focus({ preventScroll: true });
    const content = contentRef.current;
    const timeout = window.setTimeout(dismiss, remaining);
    const onPageShow = (event: PageTransitionEvent) => { if (event.persisted) dismiss(); };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      window.clearTimeout(timeout);
      if (content) content.inert = false;
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [dismiss]);

  return (
    <>
      <div ref={contentRef}>{children}</div>
      <section
        className="pwa-launch"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-launch-title"
        onKeyDown={(event) => {
          if (event.key === "Escape") dismiss();
          if (event.key === "Tab") { event.preventDefault(); continueRef.current?.focus(); }
        }}
      >
        <div className="pwa-launch-art" aria-hidden="true" />
        <div className="pwa-launch-shade" aria-hidden="true" />
        <div className="pwa-launch-stars" aria-hidden="true">✦<span>✧</span><i>✦</i></div>
        <div className="pwa-launch-heading">
          <span className="pwa-launch-moon" aria-hidden="true">☾</span>
          <h1 id="pwa-launch-title" dir="ltr">Dreamly</h1>
          <p>{t.launch.tagline}</p>
        </div>
        <div className="pwa-launch-footer">
          <span className="pwa-launch-rule" aria-hidden="true" />
          <p>{t.launch.art}</p>
          <button ref={continueRef} type="button" onClick={dismiss}>{t.launch.enter}<span aria-hidden="true"> →</span></button>
        </div>
      </section>
    </>
  );
}
