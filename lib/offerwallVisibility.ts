import { isOfferwallElement } from "./adUnlock";

/** Google can leave full-sized fc containers mounted after hiding the ad. */
export function offerwallVisible(root: Document = document): boolean {
  const nodes = root.querySelectorAll<HTMLElement>('[class*="fc-"], [id^="fc-"]');
  for (const el of nodes) {
    if (!isOfferwallElement(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width * rect.height <= 10_000) continue;
    let visible = true;
    for (let ancestor: HTMLElement | null = el; ancestor; ancestor = ancestor.parentElement) {
      const style = getComputedStyle(ancestor);
      if (ancestor.hidden || style.display === "none" || style.visibility === "hidden" ||
          style.visibility === "collapse" || style.opacity === "0" || style.contentVisibility === "hidden") {
        visible = false;
        break;
      }
    }
    if (visible) return true;
  }
  return false;
}
