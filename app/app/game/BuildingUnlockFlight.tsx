"use client";

import { useEffect, useRef, type RefObject } from "react";
import { BUILDINGS } from "@/lib/game/buildings";

/** Decorative first-affordability ceremony; buying and the ready-card animation stay unchanged. */
export default function BuildingUnlockFlight({ root, catcher, balance, placed, playerKey }: {
  root: RefObject<HTMLElement | null>;
  catcher: RefObject<HTMLImageElement | null>;
  balance: number;
  placed: Record<string, string>;
  playerKey: string;
}) {
  const seen = useRef<Set<string> | null>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const lifetime = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    lifetime.current = controller;
    return () => {
      controller.abort();
      seen.current = null;
      queue.current = Promise.resolve();
    };
  }, []);

  useEffect(() => {
    const storageKey = `dreamly_building_flights_v1:${playerKey}`;
    if (!seen.current) {
      let saved: unknown;
      try { saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]"); } catch { /* storage unavailable */ }
      seen.current = new Set(Array.isArray(saved) ? saved.filter((id): id is string => typeof id === "string") : []);
    }
    const signal = lifetime.current!.signal;
    for (const building of BUILDINGS) {
      if (placed[building.id] !== undefined || balance < building.cost || seen.current.has(building.id)) continue;
      seen.current.add(building.id);
      queue.current = queue.current.then(async () => {
        if (signal.aborted) return;
        const panel = root.current?.querySelector<HTMLElement>("[data-building-panel]");
        const target = panel?.querySelector<HTMLElement>(`[data-unlock-building="${building.id}"]`);
        const source = catcher.current;
        if (!target || !panel || !source) return;

        // Reveal lower rows inside the panel without scrolling the game or the page.
        const panelRect = panel.getBoundingClientRect();
        let destination = target.getBoundingClientRect();
        if (destination.top < panelRect.top || destination.bottom > panelRect.bottom) {
          panel.scrollTop += destination.top - panelRect.top - panel.clientHeight / 2 + destination.height / 2;
          destination = target.getBoundingClientRect();
        }
        destination = target.querySelector(".bdim")?.getBoundingClientRect() ?? destination;
        try {
          const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
          const ids = new Set(Array.isArray(saved) ? saved : []);
          ids.add(building.id);
          localStorage.setItem(storageKey, JSON.stringify([...ids]));
        } catch { /* The in-memory set still prevents repeats during this visit. */ }
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

        const origin = source.getBoundingClientRect();
        const x = origin.left + origin.width / 2;
        const y = origin.top + origin.height * 0.3;
        const dx = destination.left + destination.width / 2 - x;
        const dy = destination.top + destination.height / 2 - y;
        const sprite = document.createElement("span");
        sprite.textContent = building.emoji;
        sprite.setAttribute("aria-hidden", "true");
        Object.assign(sprite.style, {
          position: "fixed", left: `${x}px`, top: `${y}px`, zIndex: "45",
          pointerEvents: "none", fontSize: "48px", lineHeight: "1",
          filter: "drop-shadow(0 0 16px #fbbf24)",
        });
        document.body.appendChild(sprite);
        const animation = sprite.animate([
          { transform: "translate(-50%, -50%) scale(.2)", opacity: 0, offset: 0 },
          { transform: "translate(-50%, -90%) scale(1.35)", opacity: 1, offset: .2 },
          { transform: `translate(calc(-50% + ${dx * .5}px), calc(-50% + ${dy * .5 - 65}px)) scale(1.1)`, opacity: 1, offset: .6 },
          { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.5)`, opacity: 0, offset: 1 },
        ], { duration: 1100, easing: "ease-in-out", fill: "both" });
        const cancel = () => animation.cancel();
        signal.addEventListener("abort", cancel, { once: true });
        try { await animation.finished; } catch { /* unmounted */ }
        finally {
          signal.removeEventListener("abort", cancel);
          sprite.remove();
        }
      });
    }
  }, [balance, placed, playerKey, root, catcher]);

  return null;
}
