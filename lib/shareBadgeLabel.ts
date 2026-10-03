import type { UiMessages } from "@/lib/i18n/messages/types";
import type { ShareBadge } from "@/lib/shareBadges";

/** "🧙 Wizard" in the current locale. */
export function shareBadgeLabel(t: Pick<UiMessages, "shareBadges">, badge: ShareBadge) {
  return `${badge.emoji} ${t.shareBadges.names[badge.id]}`;
}
