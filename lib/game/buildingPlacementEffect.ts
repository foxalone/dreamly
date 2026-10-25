export const BUILDING_PLACED_EVENT = "dreamly:building-placed";

/** Run only after the server confirms a purchase. Never changes the game balance. */
export async function celebrateBuildingPlacement(root: HTMLElement, building: { id: string; emoji: string }, signal: AbortSignal) {
  const source = root.querySelector(`[data-building-id="${building.id}"] .bdim`);
  const earth = root.querySelector<HTMLElement>("[data-game-earth]");
  if (signal.aborted || !earth) return;
  window.dispatchEvent(new Event(BUILDING_PLACED_EVENT));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const destination = earth.getBoundingClientRect();
  const origin = source?.getBoundingClientRect();
  if (!origin || reduced) return;

  const x = origin.left + origin.width / 2;
  const y = origin.top + origin.height / 2;
  const dx = destination.left + destination.width / 2 - x;
  const dy = destination.top + destination.height / 2 - y;
  const sprite = document.createElement("span");
  sprite.setAttribute("aria-hidden", "true");
  sprite.textContent = building.emoji;
  Object.assign(sprite.style, {
    position: "fixed", left: `${x}px`, top: `${y}px`, pointerEvents: "none",
    zIndex: "45", fontSize: "40px", lineHeight: "1", filter: "drop-shadow(0 0 12px #fbbf24)",
  });
  document.body.appendChild(sprite);
  const flight = sprite.animate([
    { transform: "translate(-50%, -50%) scale(.6)", opacity: 1, offset: 0 },
    { transform: `translate(calc(-50% + ${dx * .45}px), calc(-50% + ${dy * .45 - 90}px)) scale(1.3) rotate(-12deg)`, opacity: 1, offset: .5 },
    { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.15) rotate(12deg)`, opacity: 0, offset: 1 },
  ], { duration: 1100, easing: "cubic-bezier(.3,.6,.35,1)", fill: "both" });
  let landing: Animation | undefined;
  const cancel = () => { flight.cancel(); landing?.cancel(); };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    await flight.finished;
    sprite.remove();
    if (signal.aborted) return;
    landing = earth.animate([
      { transform: "scale(1)", filter: "brightness(1)" },
      { transform: "scale(1.22)", filter: "brightness(1.8) drop-shadow(0 0 18px #fbbf24)" },
      { transform: "scale(1)", filter: "brightness(1)" },
    ], { duration: 600, easing: "ease-out" });
    await landing.finished;
  } catch { /* Navigation cancels the decorative animation. */ }
  finally {
    signal.removeEventListener("abort", cancel);
    sprite.remove();
  }
}
