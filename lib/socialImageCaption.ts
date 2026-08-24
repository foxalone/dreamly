import { DREAMLY_SOCIAL_CTA_HEADLINE, DREAMLY_SOCIAL_URL } from "./socialCta";

export const IMAGE_CAPTION_LIMIT = 2200;
export const THREADS_IMAGE_CAPTION_LIMIT = 500;

export function dreamPageUrl(slug: string) {
  const cleaned = String(slug || "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
  if (!cleaned) return DREAMLY_SOCIAL_URL;
  return `${DREAMLY_SOCIAL_URL}/dreams/${cleaned}`;
}

export function subjectToDreamSlug(subject: string) {
  return String(subject || "")
    .trim()
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function firstInterpretationSentence(text: string) {
  const cleaned = String(text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return "";
  const match = cleaned.match(/^.*?[.!?](?=\s|$)/);
  return (match ? match[0] : cleaned).trim();
}

// Invitation + dream page URL first, then the opening sentence of the
// interpretation. Video captions keep using appendDreamlySocialCta (homepage).
export function buildDreamImageCaption(pageUrl: string, firstSentence: string, maxLen = IMAGE_CAPTION_LIMIT) {
  const url = String(pageUrl || "").trim() || DREAMLY_SOCIAL_URL;
  const invitation = `${DREAMLY_SOCIAL_CTA_HEADLINE}\n👉 ${url}`;
  const sentence = String(firstSentence || "").trim();
  const separator = "\n\n";
  const room = maxLen - invitation.length - separator.length;
  if (room <= 0) return invitation.slice(0, maxLen);
  if (!sentence) return invitation;
  const clipped = sentence.length > room ? sentence.slice(0, room).trimEnd() : sentence;
  return `${invitation}${separator}${clipped}`;
}
