"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { RotateCcw } from "lucide-react";
import { residentCard } from "./residentCard";
import MoonResidentDreams from "./MoonResidentDreams";
import type { Locale } from "@/lib/i18n/config";
import { moonMessages } from "@/lib/i18n/moon";
import styles from "./MoonGlobe.module.css";
import { shareBadgeById } from "@/lib/shareBadges";
import { shareBadgeLabel } from "@/lib/shareBadgeLabel";
import { getMessages } from "@/lib/i18n/messages";
import type { MoonPin } from "@/lib/moon/model";
import { moonAccessMessages } from "@/lib/i18n/moon-access";

type Side = "near" | "far";

function overviewZoom(host: HTMLDivElement) {
  return Math.min(1.15, Math.log2(Math.max(240, Math.min(host.clientWidth, host.clientHeight)) / 300));
}

export default function MoonGlobe({ locale, pins = [] }: { locale: Locale; pins?: MoonPin[] }) {
  const m = moonMessages[locale];
  const container = useRef<HTMLDivElement>(null);
  const globe = useRef<mapboxgl.Map | null>(null);
  const homeZoom = useRef(-0.4);
  const ownPin = pins.find(pin => pin.mine);
  const initialCenter = useRef<[number, number]>(ownPin ? [ownPin.lng, ownPin.lat] : [0, 0]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [side, setSide] = useState<Side>("near");
  const [attempt, setAttempt] = useState(0);
  const cardHost = useRef<HTMLDivElement>(null);
  const [residentId, setResidentId] = useState<string | null>(null);
  const activeResident = pins.find(pin => pin.id === residentId);
  const [selectedResident, setSelectedResident] = useState<MoonPin | null>(null);

  useEffect(() => {
    const host = container.current;
    if (!host) return;
    let map: mapboxgl.Map | undefined;
    let observer: ResizeObserver | undefined;
    let disposed = false;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    try {
      if (!token) throw new Error("Missing map token");
      homeZoom.current = overviewZoom(host);
      map = new mapboxgl.Map({
        container: host,
        accessToken: token,
        center: initialCenter.current,
        zoom: homeZoom.current,
        minZoom: -1.5,
        maxZoom: 4,
        maxPitch: 0,
        projection: { name: "globe" },
        renderWorldCopies: false,
        attributionControl: false,
        locale: {
          "Map.Title": m.globe,
          "AttributionControl.ToggleAttribution": m.credits,
          "NavigationControl.ZoomIn": m.zoomIn,
          "NavigationControl.ZoomOut": m.zoomOut,
        },
        style: {
          version: 8,
          sources: {
            moon: {
              type: "raster",
              tiles: [`${window.location.origin}/moon/tiles/{z}/{x}/{y}.webp`],
              tileSize: 256,
              minzoom: 0,
              maxzoom: 3,
              attribution: '<a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noopener noreferrer">NASA / LRO · NASA’s Scientific Visualization Studio</a>',
            },
          },
          layers: [
            { id: "space", type: "background", paint: { "background-color": "#030407" } },
            { id: "lunar-surface", type: "raster", source: "moon", paint: { "raster-fade-duration": 0 } },
          ],
        },
      });
      globe.current = map;
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
      map.on("style.load", () => {
        map?.setFog({
          range: [10, 12],
          color: "#07080b",
          "high-color": "#07080b",
          "space-color": "#030407",
          "horizon-blend": 0,
          "star-intensity": 0.45,
        });
      });
      map.once("idle", () => {
        if (!disposed) setStatus((value) => value === "error" ? value : "ready");
      });
      map.on("moveend", () => {
        const longitude = map?.getCenter().wrap().lng ?? 0;
        if (!disposed) setSide(Math.abs(longitude) < 90 ? "near" : "far");
      });
      map.on("error", () => { if (!disposed) setStatus("error"); });
      observer = new ResizeObserver(() => {
        if (!map) return;
        const atOverview = Math.abs(map.getZoom() - homeZoom.current) < 0.05;
        homeZoom.current = overviewZoom(host);
        map.resize();
        if (atOverview) map.jumpTo({ zoom: homeZoom.current });
      });
      observer.observe(host);
    } catch {
      queueMicrotask(() => { if (!disposed) setStatus("error"); });
    }
    return () => {
      disposed = true;
      observer?.disconnect();
      map?.remove();
      globe.current = null;
    };
  }, [attempt, m]);

  useEffect(() => {
    const map = globe.current;
    if (!map || status !== "ready") return;
    const markers: mapboxgl.Marker[] = [];
    const entries: { element: HTMLButtonElement; position: [number, number] }[] = [];
    for (const pin of pins) {
      const character = shareBadgeById(pin.character);
      if (!character) continue;
      const position: [number, number] = [pin.lng, pin.lat];
      const count = new Intl.NumberFormat(locale).format(pin.dreams);
      const label = `${shareBadgeLabel(getMessages(locale), character)} · ${moonAccessMessages[locale].dreamCount.replace("{count}", count)}`;
      const button = document.createElement("button");
      button.className = `${styles.resident} ${pin.mine ? styles.mine : ""}`;
      button.type = "button";
      button.textContent = character.emoji;
      const badge = document.createElement("span");
      badge.className = styles.dreamCount;
      badge.textContent = count;
      badge.setAttribute("aria-hidden", "true");
      button.appendChild(badge);
      button.setAttribute("aria-label", label);
      button.addEventListener("click", () => setResidentId(pin.id));
      const marker = new mapboxgl.Marker({ element: button }).setLngLat(position).addTo(map);
      entries.push({ element: button, position });
      markers.push(marker);
    }
    const updateVisibility = () => {
      const center = map.getCenter();
      const radians = Math.PI / 180;
      const size = Math.max(12, Math.min(30, 16 + map.getZoom() * 4));
      for (const { element, position: [lng, lat] } of entries) {
        const front = Math.sin(center.lat * radians) * Math.sin(lat * radians) + Math.cos(center.lat * radians) * Math.cos(lat * radians) * Math.cos((lng - center.lng) * radians) > 0;
        element.style.visibility = front ? "visible" : "hidden";
        element.style.fontSize = `${size}px`;
      }
    };
    updateVisibility();
    map.on("move", updateVisibility);
    return () => {
      map.off("move", updateVisibility);
      for (const marker of markers) marker.remove();
    };
  }, [pins, status, locale]);

  useEffect(() => {
    const host = cardHost.current;
    if (!host || !activeResident) return;
    host.replaceChildren(residentCard(activeResident, locale, () => setSelectedResident(activeResident), () => setResidentId(null)));
    return () => host.replaceChildren();
  }, [activeResident, locale]);

  useEffect(() => {
    if (!activeResident || selectedResident) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setResidentId(null); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [activeResident, selectedResident]);

  function focus(next: Side, reset = false) {
    setSide(next);
    if (reset && container.current) homeZoom.current = overviewZoom(container.current);
    globe.current?.easeTo({
      center: [next === "near" ? 0 : 180, 0],
      ...(reset ? { zoom: homeZoom.current, bearing: 0, pitch: 0 } : {}),
      duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1100,
    });
  }

  return (
    <main className={styles.shell} data-moon-page data-resident-open={activeResident ? "true" : undefined}>
      <div ref={container} className={styles.globe} role="region" aria-label={m.globe} />
      <h1 className="sr-only">{m.title}</h1>

      {status !== "ready" ? (
        <div className={styles.status} role="status">
          <p>{status === "error" ? m.error : m.loading}</p>
          {status === "error" ? <button onClick={() => { setStatus("loading"); setAttempt((n) => n + 1); }}>{m.retry}</button> : null}
        </div>
      ) : null}

      {activeResident ? <aside className={styles.residentPanel} aria-labelledby="moon-resident-title">
        <button className={styles.panelClose} onClick={() => setResidentId(null)} aria-label={moonAccessMessages[locale].close}>×</button>
        <div ref={cardHost} className={styles.panelContent} />
      </aside> : null}
      {selectedResident ? <MoonResidentDreams key={selectedResident.id} resident={selectedResident} locale={locale} onClose={() => setSelectedResident(null)} /> : null}
      <footer className={styles.footer}>
        <div className={styles.controls}>
          <button disabled={status !== "ready"} aria-pressed={side === "near"} onClick={() => focus("near")}>{m.near}</button>
          <button disabled={status !== "ready"} aria-pressed={side === "far"} onClick={() => focus("far")}>{m.far}</button>
          <span className={styles.divider} aria-hidden />
          <button disabled={status !== "ready"} onClick={() => focus("near", true)} aria-label={m.reset} title={m.reset}><RotateCcw size={17} aria-hidden /></button>
        </div>
        <p className={styles.hint}>{m.hint}</p>
      </footer>
    </main>
  );
}
