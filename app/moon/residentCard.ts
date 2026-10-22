import type { MoonPin } from "@/lib/moon/model";
import type { Locale } from "@/lib/i18n/config";
import { getMessages } from "@/lib/i18n/messages";
import { moonAccessMessages } from "@/lib/i18n/moon-access";
import { moonResidentMessages } from "@/lib/i18n/moon-resident";
import { nextShareBadge, shareBadgeById } from "@/lib/shareBadges";
import { shareBadgeLabel } from "@/lib/shareBadgeLabel";
import styles from "./MoonGlobe.module.css";

export function residentCard(pin: MoonPin, locale: Locale, read: () => void, close: () => void) {
  const m = moonResidentMessages[locale];
  const character = shareBadgeById(pin.character)!;
  const root = document.createElement("section");
  root.className = styles.residentCard;
  root.dir = locale === "ar" ? "rtl" : "ltr";
  function text(tag: string, value: string, className?: string) {
    const element = document.createElement(tag);
    element.textContent = value;
    if (className) element.className = className;
    root.appendChild(element);
    return element;
  }
  const dismiss = document.createElement("button");
  dismiss.className = styles.cardClose;
  dismiss.type = "button";
  dismiss.textContent = "×";
  dismiss.setAttribute("aria-label", moonAccessMessages[locale].close);
  dismiss.onclick = close;
  root.appendChild(dismiss);
  text("h2", shareBadgeLabel(getMessages(locale), character)).id = "moon-resident-title";
  if (pin.joinedAtMs > 0) {
    const date = new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric" }).format(pin.joinedAtMs);
    text("p", m.since.replace("{date}", date), styles.cardMuted);
  }
  text("p", moonAccessMessages[locale].dreamCount.replace("{count}", new Intl.NumberFormat(locale).format(pin.dreams)));
  if (pin.topEmojis?.length) {
    text("h3", m.common);
    text("p", pin.topEmojis.join("  "), styles.cardEmojis);
  }
  if (pin.latest) {
    text("h3", m.latest);
    const snippet = text("blockquote", pin.latest.snippet);
    snippet.dir = "auto";
  }
  if (pin.mine) {
    const next = nextShareBadge(pin.dreams);
    text("p", next ? m.remaining.replace("{count}", new Intl.NumberFormat(locale).format(next.remaining)).replace("{badge}", shareBadgeLabel(getMessages(locale), next.badge)) : m.highest, styles.cardProgress);
  }
  const button = document.createElement("button");
  button.className = styles.readDreams;
  button.type = "button";
  button.textContent = m.read;
  button.onclick = read;
  root.appendChild(button);
  return root;
}
