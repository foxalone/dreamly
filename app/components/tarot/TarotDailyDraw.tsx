"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { auth } from "@/lib/firebase";
import LocaleLink from "@/lib/i18n/LocaleLink";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { browserLocale } from "@/lib/i18n/browser-language";
import type { Locale } from "@/lib/i18n/config";
import { tarotDrawCopy } from "@/lib/i18n/tarotDraw";
import { trackTarotMoreClick } from "@/lib/trackTarotMoreClick";
import { MAJOR_ARCANA, tarotCopy, type MajorArcanaId } from "@/lib/tarot/deck";
import { TarotCardFace } from "./TarotCardFace";
import { TarotAccessDialog } from "./TarotAccessDialog";
import fanStyles from "../DreamMapGlobe.module.css";
import styles from "./TarotDailyDraw.module.css";

type DrawResponse = { day?: unknown; cardId?: unknown };
const FLIGHT_MS = 1200;
const DUST_COUNT = 76;

function scatterStardust(field: HTMLDivElement, from: { x: number; y: number }, to: { x: number; y: number }): Animation[] {
  return Array.from(field.children).map((particle, index) => {
    const star = particle as HTMLElement;
    const trail = index < 40;
    const progress = trail ? (index % 10) / 10 : 1;
    const angle = index * 2.39996;
    const reach = Math.min(Math.max(window.innerWidth, window.innerHeight) * .72, 760);
    const distance = trail
      ? 90 + ((index * 47) % 100) / 100 * reach * .55
      : 120 + ((index * 53) % 100) / 100 * reach;
    star.style.left = `${from.x + (to.x - from.x) * progress}px`;
    star.style.top = `${from.y + (to.y - from.y) * progress}px`;
    const dx = Math.cos(angle) * distance;
    const dy = Math.sin(angle) * distance;
    return star.animate([
      { opacity: 0, transform: "translate(0, 0) scale(.2)" },
      { opacity: 1, transform: `translate(${dx * .14}px, ${dy * .14}px) scale(1.35)`, offset: .14 },
      { opacity: 0, transform: `translate(${dx}px, ${dy}px) scale(.15)` },
    ], {
      duration: trail ? 1050 + (index % 4) * 110 : 1250 + (index % 5) * 100,
      delay: trail ? progress * 620 + (index % 3) * 20 : 560 + (index % 5) * 25,
      easing: "cubic-bezier(.12,.5,.18,1)",
      fill: "both",
    });
  });
}

export function TarotDailyDraw({ blocked, path }: { blocked: boolean; path: string }) {
  const locale = useLocale();
  const copy = tarotDrawCopy[locale];
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [cardId, setCardId] = useState<MajorArcanaId | null>(null);
  const [drawDay, setDrawDay] = useState<string | null>(null);
  const [flightDone, setFlightDone] = useState(false);
  const [settled, setSettled] = useState(false);
  const [blurStarted, setBlurStarted] = useState(false);
  const [closing, setClosing] = useState(false);
  const [access, setAccess] = useState<{ day: string; cardId: MajorArcanaId; locale: Locale } | null>(null);
  const fan = useRef<HTMLButtonElement>(null);
  const stage = useRef<HTMLButtonElement>(null);
  const dust = useRef<HTMLDivElement>(null);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const request = useRef<AbortController | null>(null);
  const flightAnimation = useRef<Animation | null>(null);
  const particleAnimations = useRef<Animation[]>([]);
  const closeTimer = useRef<number | null>(null);
  const card = MAJOR_ARCANA.find(item => item.id === cardId);

  const dismiss = useCallback(() => {
    if (closing) return;
    request.current?.abort();
    request.current = null;
    flightAnimation.current?.cancel();
    particleAnimations.current.forEach(particle => particle.cancel());
    setClosing(true);
    setBlurStarted(false);
    setBusy(false);
    closeTimer.current = window.setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setFlightDone(false);
      setSettled(false);
      closeTimer.current = null;
    }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 850);
  }, [closing]);

  useLayoutEffect(() => {
    if (!open) return;
    const cardStage = stage.current;
    const dustField = dust.current;
    const start = origin.current;
    if (!cardStage || !start || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFlightDone(true);
      return;
    }
    const bounds = cardStage.getBoundingClientRect();
    const target = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
    const dx = start.x - target.x;
    const dy = start.y - target.y;
    const flight = cardStage.animate([
      { opacity: .85, filter: "brightness(1.7)", transform: `translate(${dx}px, ${dy}px) scale(.18) rotateZ(-12deg) rotateY(0deg)` },
      { opacity: 1, filter: "brightness(1.5)", transform: `translate(${dx * .65}px, ${dy * .63}px) scale(.38) rotateZ(200deg) rotateY(180deg)`, offset: .38 },
      { opacity: 1, filter: "brightness(1.35)", transform: `translate(${dx * .22}px, ${dy * .23}px) scale(.62) rotateZ(510deg) rotateY(540deg)`, offset: .78 },
      { opacity: 1, filter: "brightness(1)", transform: "translate(0, 0) scale(1) rotateZ(720deg) rotateY(720deg)" },
    ], { duration: FLIGHT_MS, easing: "cubic-bezier(.45,0,.2,1)", fill: "both" });
    const particles = dustField ? scatterStardust(dustField, start, target) : [];
    flightAnimation.current = flight;
    particleAnimations.current = particles;
    flight.onfinish = () => setFlightDone(true);
    return () => {
      flight.cancel();
      particles.forEach(particle => particle.cancel());
      flightAnimation.current = null;
      particleAnimations.current = [];
    };
  }, [open]);
  useEffect(() => () => {
    request.current?.abort();
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);
  useEffect(() => {
    if (!open || closing) return;
    const frame = window.requestAnimationFrame(() => setBlurStarted(true));
    return () => window.cancelAnimationFrame(frame);
  }, [open, closing]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (!access) dismiss();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, dismiss, access]);

  async function reveal() {
    setSettled(false);
    if (!open) {
      const bounds = fan.current?.getBoundingClientRect();
      origin.current = bounds ? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 } : null;
      setFlightDone(false);
    } else setFlightDone(true);
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setOpen(true);
    setBusy(true);
    setError(false);
    setCardId(null);
    setDrawDay(null);
    try {
      await auth.authStateReady();
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : null;
      const response = await fetch("/api/tarot/draw", {
        method: "POST",
        headers: { "x-tarot-request": "1", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "same-origin",
        cache: "no-store",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Tarot draw failed");
      const result = await response.json() as DrawResponse;
      const chosen = MAJOR_ARCANA.find(item => item.id === result.cardId);
      if (!chosen || typeof result.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(result.day)) throw new Error("Unknown tarot draw");
      if (!controller.signal.aborted) {
        setCardId(chosen.id);
        setDrawDay(result.day);
        window.dispatchEvent(new Event("dreamly:tarot-discovered"));
      }
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  }

  useEffect(() => {
    const openFromPage = () => fan.current?.click();
    window.addEventListener("dreamly:open-tarot", openFromPage);
    return () => window.removeEventListener("dreamly:open-tarot", openFromPage);
  }, []);

  return <>
    <button
      ref={fan}
      type="button"
      className={fanStyles.tarotFan}
      data-map-rail={path === "/moon" || path === "/app/map" || undefined}
      style={{ visibility: blocked ? "hidden" : undefined }}
      aria-label={copy.open}
      title={copy.open}
      onClick={() => void reveal()}
    >
      <span aria-hidden="true">
        {["☾", "✦", "☼"].map((symbol, index) => <span className={fanStyles.tarotCard} key={symbol} style={{ "--card": index } as CSSProperties}><span className={fanStyles.tarotMark}>{symbol}</span></span>)}
        <span className={fanStyles.tarotSparkle}>✦</span>
        <span className={fanStyles.tarotSparkle}>✧</span>
      </span>
    </button>
    {open && typeof document !== "undefined" ? createPortal(<div className={styles.overlay} aria-live="polite" dir={locale === "ar" ? "rtl" : undefined}>
      <button type="button" className={`${styles.backdrop} ${blurStarted && !closing ? styles.backdropVisible : ""}`} aria-label={copy.close} onClick={dismiss} />
      <div className={`${styles.anchor} ${!path.startsWith("/tarot") ? styles.anchorWithGuide : ""}`}>
        <button
          ref={stage}
          type="button"
          className={`${styles.cardStage} ${closing ? styles.cardStageClosing : ""}`}
          aria-label={error ? copy.retry : card && settled ? `${tarotCopy[locale].cards[card.id]} · ${copy.read}` : copy.loading}
          onClick={() => {
            if (error) { void reveal(); return; }
            if (!card || !settled || !drawDay || closing) return;
            const preferredLocale = browserLocale(navigator.languages?.length ? navigator.languages : [navigator.language]) ?? locale;
            void trackTarotMoreClick(drawDay, card.id);
            setAccess({ day: drawDay, cardId: card.id, locale: preferredLocale });
          }}
        >
          {card && flightDone ? <div className={styles.revealed} key={card.id} onAnimationEnd={(event) => { if (!closing && event.target === event.currentTarget) setSettled(true); }}><TarotCardFace card={card} name={tarotCopy[locale].cards[card.id]} large /></div>
            : <div className={styles.cardBack} aria-hidden="true"><span>✧</span><span>☾</span><span>✧</span></div>}
          {card && settled ? <span className={styles.tapHint} aria-hidden="true"><Image src="/tarot/tap-hand.png" alt="" width={1254} height={1254} /></span> : null}
        </button>
        {card && settled && !closing && !path.startsWith("/tarot") ? <LocaleLink href="/tarot" className={styles.guideBanner} onClick={dismiss}>
          <span className={styles.guideDeck} aria-hidden="true"><span>✧</span><span>✦</span><span>☾</span></span>
          <span className={styles.guideBannerText}>
            <span className={styles.guideEyebrow}>{copy.guideEyebrow}</span>
            <strong>{copy.guideAction}</strong>
            <span className={styles.guideDetail}>{copy.guideDetail}</span>
          </span>
          <ArrowUpRight className={styles.guideArrow} size={22} aria-hidden="true" />
        </LocaleLink> : null}
      </div>
      <div ref={dust} className={styles.dust} aria-hidden="true">{Array.from({ length: DUST_COUNT }, (_, index) => <span key={index} />)}</div>
      {closing ? <div className={styles.fallingStars} aria-hidden="true">{Array.from({ length: 32 }, (_, index) => <span key={index} style={{ "--star-x": `${((index * 47) % 300) - 150}px`, "--star-drift": `${((index * 37) % 180) - 90}px`, "--star-delay": `${(index % 8) * 25}ms` } as CSSProperties}>{index % 3 === 0 ? "✧" : "✦"}</span>)}</div> : null}
      {error && flightDone ? <span className={styles.srOnly} role="alert">{copy.error}</span> : null}
      {busy && flightDone ? <span className={styles.srOnly} role="status">{copy.loading}</span> : null}
    </div>, document.body) : null}
    {access ? <TarotAccessDialog day={access.day} cardId={access.cardId} locale={access.locale} onClose={() => setAccess(null)} /> : null}
  </>;
}
