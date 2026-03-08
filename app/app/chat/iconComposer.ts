export const ICON_KEYBOARD_ROWS: string[][] = [
  ["🌙", "✨", "🌟", "☁️", "🌧️", "🌈", "🌊", "🔥", "🌪️", "❄️"],
  ["🐍", "🐉", "🐺", "🦉", "🐈", "🐎", "🦋", "🕷️", "🐋", "🦅"],
  ["🏠", "🚪", "🪟", "🛏️", "🪞", "🌲", "🗻", "🌉", "🛣️", "🕯️"],
  ["👁️", "❤️", "🧠", "👤", "👥", "👶", "👑", "💍", "🗝️", "📖"],
  ["😨", "😢", "😍", "😴", "🤍", "💔", "😵", "🫥", "🙏", "⚡"],
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
