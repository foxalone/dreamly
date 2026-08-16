// Single source of truth for the Dreamly call-to-action appended to every
// social caption (Facebook, Instagram, TikTok, Threads). Always the homepage —
// never a guessed /dreams/{slug} page, never "link in bio".

export const DREAMLY_SOCIAL_CTA_HEADLINE = "🌙 Understand your dreams with AI";
export const DREAMLY_SOCIAL_URL = "https://dreamly.art";
export const DREAMLY_SOCIAL_CTA = `${DREAMLY_SOCIAL_CTA_HEADLINE}\n👉 ${DREAMLY_SOCIAL_URL}`;

// Removes any existing Dreamly CTA, dreamly.art link or legacy "link in bio"
// line so a regenerated or retried caption never stacks duplicates.
export function stripDreamlySocialCta(text: string) {
  const kept = String(text || "")
    .split("\n")
    .filter((line) => {
      const value = line.trim();
      if (!value) return true;
      if (value === DREAMLY_SOCIAL_CTA_HEADLINE) return false;
      if (/dreamly\.art/i.test(value)) return false;
      if (/link in bio/i.test(value)) return false;
      return true;
    });
  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

// Appends the CTA, reserving room for it so truncation never clips the link.
export function appendDreamlySocialCta(text: string, maxLen = 2200) {
  const separator = "\n\n";
  const body = stripDreamlySocialCta(text);
  const room = maxLen - DREAMLY_SOCIAL_CTA.length - separator.length;
  if (room <= 0) return DREAMLY_SOCIAL_CTA.slice(0, maxLen);
  const trimmed = body.length > room ? body.slice(0, room).trimEnd() : body;
  return trimmed ? `${trimmed}${separator}${DREAMLY_SOCIAL_CTA}` : DREAMLY_SOCIAL_CTA;
}
