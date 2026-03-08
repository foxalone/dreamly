import data from "@emoji-mart/data";

export type DreamEmojiItem = {
  native: string;
  id?: string;
  name?: string;
};

type EmojiMartEntry = {
  id?: string;
  name?: string;
  native?: string;
  skins?: Array<{ native?: string }>;
};

type EmojiMartData = {
  emojis?: Record<string, EmojiMartEntry>;
};

function norm(s: unknown): string {
  return String(s ?? "").toLowerCase().trim();
}

function isGarbageEmoji(emoji: EmojiMartEntry): boolean {
  const id = norm(emoji?.id);
  const name = norm(emoji?.name);

  if (id.startsWith("flag-") || name.includes("flag")) return true;
  if (id.includes("skin-tone")) return true;
  if (id.startsWith("keycap_") || name.includes("keycap")) return true;
  if (name.includes("regional indicator")) return true;
  return false;
}

function toDreamEmojiLibrary(): DreamEmojiItem[] {
  const map = ((data as EmojiMartData)?.emojis ?? {}) as Record<string, EmojiMartEntry>;
  const all = Object.values(map);
  const uniqueByNative = new Map<string, DreamEmojiItem>();

  for (const item of all) {
    if (!item || isGarbageEmoji(item)) continue;
    const native = item.skins?.[0]?.native || item.native || "";
    if (!native || uniqueByNative.has(native)) continue;
    uniqueByNative.set(native, {
      native,
      id: item.id,
      name: item.name,
    });
  }

  return Array.from(uniqueByNative.values());
}

export const ALL_DREAM_EMOJIS: DreamEmojiItem[] = toDreamEmojiLibrary();

export const DREAM_EMOJI_ROWS: DreamEmojiItem[][] = [
  ALL_DREAM_EMOJIS.filter((_, index) => index % 3 === 0),
  ALL_DREAM_EMOJIS.filter((_, index) => index % 3 === 1),
  ALL_DREAM_EMOJIS.filter((_, index) => index % 3 === 2),
];

export const NUMBER_KEYS: string[] = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

const ALLOWED_SYMBOL_REGEX = /[\p{Extended_Pictographic}\p{Emoji_Modifier}\u200D\uFE0E\uFE0F]/u;

export function sanitizeIconMessage(value: string): string {
  const compact = value.replace(/\s+/g, " ").trim();
  let result = "";

  for (const char of compact) {
    if (char === " " || /\d/u.test(char) || ALLOWED_SYMBOL_REGEX.test(char)) {
      result += char;
    }
  }

  return result.replace(/\s+/g, " ").trim();
}

export function isValidIconMessage(value: string): boolean {
  const sanitized = sanitizeIconMessage(value);
  return sanitized.length > 0 && sanitized === value.replace(/\s+/g, " ").trim();
}

export function appendToken(current: string, token: string): string {
  const cleanCurrent = current.trimEnd();
  if (!cleanCurrent) return token;
  if (cleanCurrent.endsWith(" ")) return `${cleanCurrent}${token}`;
  return `${cleanCurrent} ${token}`;
}
