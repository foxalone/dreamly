import type { Map } from "mapbox-gl";

/** Gentle overview rotation; direct input, close-ups and open cards take priority. */
export function startMapGlobeRotation(map: Map, hasOpenPopup: () => boolean) {
  const container = map.getContainer();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let frame = 0;
  let previous = performance.now();
  let resumeAt = 0;
  let pointerDown = false;

  function pause() {
    resumeAt = performance.now() + 6000;
  }
  function onPointerDown() {
    pointerDown = true;
    pause();
  }
  function onPointerUp() {
    if (!pointerDown) return;
    pointerDown = false;
    pause();
  }
  function tick(now: number) {
    const elapsed = Math.min(now - previous, 64) / 1000;
    previous = now;
    const zoom = map.getZoom();
    if (!document.hidden && !reducedMotion.matches && !pointerDown && now >= resumeAt &&
        zoom < 5 && !map.isMoving() && map.isStyleLoaded() && !hasOpenPopup()) {
      const speed = 0.6 * Math.min(1, (5 - zoom) / 2);
      const center = map.getCenter();
      map.jumpTo({ center: [center.lng - speed * elapsed, center.lat] });
    }
    frame = requestAnimationFrame(tick);
  }

  container.addEventListener("pointerdown", onPointerDown, true);
  container.addEventListener("wheel", pause, { passive: true, capture: true });
  container.addEventListener("keydown", pause, true);
  window.addEventListener("pointerup", onPointerUp);
  window.addEventListener("pointercancel", onPointerUp);
  window.addEventListener("blur", onPointerUp);
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    container.removeEventListener("pointerdown", onPointerDown, true);
    container.removeEventListener("wheel", pause, true);
    container.removeEventListener("keydown", pause, true);
    window.removeEventListener("pointerup", onPointerUp);
    window.removeEventListener("pointercancel", onPointerUp);
    window.removeEventListener("blur", onPointerUp);
  };
}
