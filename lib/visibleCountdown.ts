/** Counts foreground viewing time; hidden-tab time never advances the countdown. */
export function visibleCountdown(durationMs: number) {
  let elapsed = 0;
  let last: number | undefined;
  let wasVisible = false;
  return (now: number, visible: boolean) => {
    if (last !== undefined && wasVisible && visible) elapsed = Math.min(durationMs, elapsed + Math.max(0, now - last));
    last = now;
    wasVisible = visible;
    return elapsed;
  };
}
