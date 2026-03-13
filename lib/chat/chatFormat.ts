import type { MessageType } from "./chatTypes";

const ICON_REGEX = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\u200D\uFE0E\uFE0F]/u;

export function formatMessageTime(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return "";

  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function buildAvatarText(name?: string | null, email?: string | null): string {
  const source = (name || email || "?").trim();
  if (!source) return "?";

  const parts = source
    .split(/[\s@._-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) return source.slice(0, 2).toUpperCase();

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function buildPreviewText(
  text: string,
  icons: string[],
  type: MessageType
): string {
  const safeText = text.trim();
  const safeIcons = icons.filter(Boolean).join(" ").trim();

  if (type === "icons") return safeIcons || safeText;
  if (type === "text") return safeText;

  return [safeText, safeIcons].filter(Boolean).join(" ").trim();
}

export function extractIcons(value: string): string[] {
  return value
    .split(" ")
    .map((token) => token.trim())
    .filter((token) => ICON_REGEX.test(token));
}

export function detectMessageType(text: string, icons: string[]): MessageType {
  const hasText = text.trim().length > 0;
  const hasIcons = icons.length > 0;

  if (hasText && hasIcons) return "mixed";
  if (hasIcons) return "icons";
  return "text";
}
