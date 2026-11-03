import { EN_MESSAGES } from "./i18n/messages/en";
import type { UiMessages } from "./i18n/messages/types";

export type GuestShareCopy = {
  done: string;
  already: string;
  signIn: string;
  unicorn: string;
  wizard: string;
};

export function guestShareCopyFromMessages(t: Pick<UiMessages, "shareBadges">): GuestShareCopy {
  return {
    done: t.shareBadges.guestDone,
    already: t.shareBadges.guestAlready,
    signIn: t.shareBadges.signInCta,
    unicorn: t.shareBadges.names.unicorn,
    wizard: t.shareBadges.names.wizard,
  };
}

export const EN_GUEST_SHARE_COPY = guestShareCopyFromMessages(EN_MESSAGES);

export function normalizeGuestShareCopy(raw: unknown): GuestShareCopy | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const fields = ["done", "already", "signIn", "unicorn", "wizard"] as const;
  const copy = {} as GuestShareCopy;
  for (const field of fields) {
    if (typeof value[field] !== "string") return null;
    const text = value[field].trim();
    if (!text || text.length > 500) return null;
    copy[field] = text;
  }
  if (!copy.done.includes("{badge}") || !copy.done.includes("{next}")) return null;
  return copy;
}
