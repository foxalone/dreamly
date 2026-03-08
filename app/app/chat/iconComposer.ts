import { DREAM_ICONS_EN, type DreamIconKey } from "@/lib/dream-icons/dreamIcons.en";

const ICON_GLYPHS_BY_KEY: Record<DreamIconKey, { emoji: string; label: string }> = {
  forest: { emoji: "🌲", label: "Forest" },
  bell: { emoji: "🔔", label: "Bell" },
  wind: { emoji: "💨", label: "Wind" },
  music: { emoji: "🎵", label: "Music" },
  light: { emoji: "☀️", label: "Light" },
  night: { emoji: "🌙", label: "Night" },
  stars: { emoji: "✨", label: "Stars" },
  rain: { emoji: "🌧️", label: "Rain" },
  snow: { emoji: "🌨️", label: "Snow" },
  storm: { emoji: "⛈️", label: "Storm" },
  water: { emoji: "🌊", label: "Water" },
  fire: { emoji: "🔥", label: "Fire" },
  tears: { emoji: "💧", label: "Tears" },
  mountain: { emoji: "⛰️", label: "Mountain" },
  nature: { emoji: "🍃", label: "Nature" },
  flowers: { emoji: "🌸", label: "Flowers" },
  bird: { emoji: "🐦", label: "Bird" },
  insects: { emoji: "🐛", label: "Insects" },
  fish: { emoji: "🐟", label: "Fish" },
  animals: { emoji: "🐾", label: "Animals" },
  home: { emoji: "🏠", label: "Home" },
  city: { emoji: "🏙️", label: "City" },
  hospital: { emoji: "🏥", label: "Hospital" },
  school: { emoji: "🏫", label: "School" },
  shop: { emoji: "🏪", label: "Shop" },
  car: { emoji: "🚗", label: "Car" },
  public_transport: { emoji: "🚌", label: "Public transport" },
  train: { emoji: "🚆", label: "Train" },
  plane: { emoji: "✈️", label: "Plane" },
  ship: { emoji: "🚢", label: "Ship" },
  route: { emoji: "🛣️", label: "Route" },
  navigation: { emoji: "🧭", label: "Navigation" },
  footsteps: { emoji: "👣", label: "Footsteps" },
  location: { emoji: "📍", label: "Location" },
  key: { emoji: "🗝️", label: "Key" },
  lock: { emoji: "🔒", label: "Lock" },
  protection: { emoji: "🛡️", label: "Protection" },
  watching: { emoji: "👁️", label: "Watching" },
  hiding: { emoji: "🙈", label: "Hiding" },
  search: { emoji: "🔍", label: "Search" },
  phone: { emoji: "📞", label: "Phone" },
  chat: { emoji: "💬", label: "Chat" },
  people: { emoji: "👥", label: "People" },
  person: { emoji: "🧍", label: "Person" },
  baby: { emoji: "👶", label: "Baby" },
  love: { emoji: "❤️", label: "Love" },
  heartbreak: { emoji: "💔", label: "Heartbreak" },
  happy: { emoji: "🙂", label: "Happy" },
  sad: { emoji: "😔", label: "Sad" },
  anger: { emoji: "😠", label: "Anger" },
  laugh: { emoji: "😆", label: "Laugh" },
  death: { emoji: "💀", label: "Death" },
  ghost: { emoji: "👻", label: "Ghost" },
  magic: { emoji: "✨", label: "Magic" },
  idea: { emoji: "💡", label: "Idea" },
  time: { emoji: "🕒", label: "Time" },
  date: { emoji: "📅", label: "Date" },
  waiting: { emoji: "⏳", label: "Waiting" },
  camera: { emoji: "📷", label: "Camera" },
  tv: { emoji: "📺", label: "TV" },
  game: { emoji: "🎮", label: "Game" },
  reading: { emoji: "📖", label: "Reading" },
  writing: { emoji: "✏️", label: "Writing" },
  cut: { emoji: "✂️", label: "Cut" },
  shopping: { emoji: "🛍️", label: "Shopping" },
  money: { emoji: "💳", label: "Money" },
  work: { emoji: "💼", label: "Work" },
  food: { emoji: "🍽️", label: "Food" },
  coffee: { emoji: "☕", label: "Coffee" },
  fruit: { emoji: "🍎", label: "Fruit" },
  pizza: { emoji: "🍕", label: "Pizza" },
  drums: { emoji: "🥁", label: "Drums" },
  guitar: { emoji: "🎸", label: "Guitar" },
  singing: { emoji: "🎤", label: "Singing" },
  silence: { emoji: "🔇", label: "Silence" },
  loud: { emoji: "🔊", label: "Loud" },
  danger: { emoji: "⚠️", label: "Danger" },
  fight: { emoji: "⚔️", label: "Fight" },
};

export type IconKeyboardItem = {
  key: DreamIconKey;
  emoji: string;
  label: string;
};

export const ALL_ICON_ITEMS: IconKeyboardItem[] = (Object.keys(DREAM_ICONS_EN) as DreamIconKey[])
  .map((key) => ({ key, ...(ICON_GLYPHS_BY_KEY[key] ?? { emoji: "", label: key }) }))
  .filter((item) => Boolean(item.emoji?.trim()));

const ROW_SIZE = Math.ceil(ALL_ICON_ITEMS.length / 3);

export const ICON_KEYBOARD_ROWS: IconKeyboardItem[][] = [
  ALL_ICON_ITEMS.slice(0, ROW_SIZE),
  ALL_ICON_ITEMS.slice(ROW_SIZE, ROW_SIZE * 2),
  ALL_ICON_ITEMS.slice(ROW_SIZE * 2),
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
