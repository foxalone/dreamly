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

export type DreamEmojiCategory =
  | "recent"
  | "smileys"
  | "people"
  | "animals"
  | "food"
  | "travel"
  | "activities"
  | "objects"
  | "symbols"
  | "misc";

export type DreamEmojiCategorySection = {
  key: Exclude<DreamEmojiCategory, "recent">;
  label: string;
  icon: string;
  items: DreamEmojiItem[];
};

export const NUMBER_KEYS: string[] = [
  "1",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "0",
];

function norm(s: unknown): string {
  return String(s ?? "").toLowerCase().trim();
}

function containsAny(source: string, words: string[]) {
  return words.some((word) => source.includes(word));
}

function isGarbageEmoji(emoji: EmojiMartEntry): boolean {
  const id = norm(emoji?.id);
  const name = norm(emoji?.name);

  if (id.startsWith("flag-") || name.includes("flag")) return true;
  if (id.includes("skin-tone") || name.includes("skin tone")) return true;
  if (id.startsWith("keycap_") || name.includes("keycap")) return true;
  if (name.includes("regional indicator")) return true;
  if (id.includes("selector")) return true;

  return false;
}

function toDreamEmojiLibrary(): DreamEmojiItem[] {
  const map = ((data as EmojiMartData)?.emojis ?? {}) as Record<
    string,
    EmojiMartEntry
  >;

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

function pickCategory(
  item: DreamEmojiItem
): Exclude<DreamEmojiCategory, "recent"> {
  const id = norm(item.id);
  const name = norm(item.name);
  const source = `${id} ${name}`;

  if (
    containsAny(source, [
      "face",
      "smile",
      "grin",
      "laugh",
      "joy",
      "wink",
      "kiss",
      "sad",
      "cry",
      "sob",
      "angry",
      "rage",
      "fear",
      "scream",
      "surprise",
      "sleep",
      "mask",
      "emotion",
      "thinking",
      "confused",
      "melting",
      "drool",
      "woozy",
      "nause",
      "vomit",
      "hot",
      "cold",
      "mind blown",
      "halo",
      "cowboy",
      "party",
      "pleading",
      "relieved",
      "neutral",
      "upside",
      "smirk",
      "expressionless",
      "rolling",
      "shushing",
    ])
  ) {
    return "smileys";
  }

  if (
    containsAny(source, [
      "person",
      "man",
      "woman",
      "boy",
      "girl",
      "people",
      "adult",
      "baby",
      "family",
      "hand",
      "finger",
      "thumb",
      "clap",
      "wave",
      "pray",
      "muscle",
      "leg",
      "foot",
      "eye",
      "ear",
      "mouth",
      "nose",
      "hair",
      "beard",
      "brain",
      "anatomical",
      "kiss",
      "couple",
      "holding hands",
    ])
  ) {
    return "people";
  }

  if (
    containsAny(source, [
      "cat",
      "dog",
      "monkey",
      "horse",
      "cow",
      "pig",
      "bird",
      "chicken",
      "duck",
      "eagle",
      "owl",
      "wolf",
      "fox",
      "tiger",
      "lion",
      "rabbit",
      "bear",
      "panda",
      "koala",
      "unicorn",
      "dragon",
      "snake",
      "frog",
      "whale",
      "dolphin",
      "fish",
      "octopus",
      "butterfly",
      "bug",
      "ant",
      "bee",
      "spider",
      "animal",
      "pet",
      "paw",
      "camel",
      "deer",
      "goat",
      "zebra",
      "giraffe",
      "elephant",
      "kangaroo",
      "sloth",
      "otter",
      "llama",
      "hippo",
      "bat",
      "shark",
      "crocodile",
      "turtle",
      "leaf",
      "tree",
      "flower",
      "blossom",
      "rose",
      "sunflower",
      "mushroom",
      "plant",
      "herb",
      "nature",
      "seedling",
    ])
  ) {
    return "animals";
  }

  if (
    containsAny(source, [
      "apple",
      "pear",
      "peach",
      "banana",
      "grapes",
      "melon",
      "watermelon",
      "strawberry",
      "blueberries",
      "cherries",
      "kiwi",
      "tomato",
      "eggplant",
      "avocado",
      "broccoli",
      "pepper",
      "corn",
      "carrot",
      "garlic",
      "onion",
      "bread",
      "croissant",
      "bagel",
      "pancakes",
      "waffle",
      "cheese",
      "meat",
      "bacon",
      "burger",
      "fries",
      "pizza",
      "sandwich",
      "taco",
      "burrito",
      "ramen",
      "spaghetti",
      "salad",
      "soup",
      "popcorn",
      "cake",
      "cookie",
      "chocolate",
      "candy",
      "coffee",
      "tea",
      "bubble tea",
      "milk",
      "beer",
      "wine",
      "cocktail",
      "drink",
      "food",
    ])
  ) {
    return "food";
  }

  if (
    containsAny(source, [
      "house",
      "home",
      "hut",
      "building",
      "office",
      "hospital",
      "bank",
      "hotel",
      "school",
      "church",
      "mosque",
      "synagogue",
      "castle",
      "stadium",
      "factory",
      "city",
      "bridge",
      "fountain",
      "tent",
      "camp",
      "mountain",
      "volcano",
      "desert",
      "beach",
      "island",
      "map",
      "park",
      "station",
      "airport",
      "railway",
      "train",
      "tram",
      "metro",
      "ship",
      "boat",
      "car",
      "taxi",
      "bus",
      "truck",
      "bike",
      "airplane",
      "rocket",
      "helicopter",
      "ferris",
      "carousel",
      "statue",
      "tower",
      "travel",
      "place",
    ])
  ) {
    return "travel";
  }

  if (
    containsAny(source, [
      "soccer",
      "basketball",
      "football",
      "baseball",
      "tennis",
      "volleyball",
      "rugby",
      "golf",
      "bowling",
      "cricket",
      "hockey",
      "boxing",
      "martial",
      "ski",
      "snowboard",
      "skate",
      "swim",
      "surf",
      "fishing",
      "running",
      "weight",
      "trophy",
      "medal",
      "game",
      "video game",
      "chess",
      "dice",
      "puzzle",
      "slot",
      "activity",
      "ball",
      "dance",
      "guitar",
      "drum",
      "music",
      "microphone",
      "headphone",
      "art",
      "paint",
      "clapper",
      "movie",
      "camera",
      "book",
    ])
  ) {
    return "activities";
  }

  if (
    containsAny(source, [
      "phone",
      "computer",
      "laptop",
      "keyboard",
      "mouse",
      "printer",
      "tv",
      "radio",
      "light",
      "bulb",
      "flashlight",
      "candle",
      "battery",
      "money",
      "coin",
      "gem",
      "key",
      "lock",
      "hammer",
      "axe",
      "tool",
      "knife",
      "syringe",
      "pill",
      "door",
      "bed",
      "chair",
      "toilet",
      "shower",
      "mirror",
      "window",
      "gift",
      "shopping",
      "cart",
      "bag",
      "box",
      "mail",
      "package",
      "clock",
      "watch",
      "hourglass",
      "magnifying",
      "crown",
      "ring",
      "glasses",
      "mask",
      "backpack",
      "umbrella",
      "object",
    ])
  ) {
    return "objects";
  }

  if (
    containsAny(source, [
      "heart",
      "star",
      "sparkle",
      "sparkles",
      "fire",
      "flame",
      "sun",
      "moon",
      "cloud",
      "rain",
      "snow",
      "lightning",
      "zap",
      "boom",
      "warning",
      "exclamation",
      "question",
      "diamond",
      "bell",
      "ghost",
      "skull",
      "alien",
      "poop",
      "bomb",
      "magic",
      "fortune",
      "peace",
      "yin",
      "om",
      "cross",
      "menorah",
      "wheel",
      "trident",
      "biohazard",
      "radioactive",
      "recycle",
      "infinity",
      "check",
      "x",
      "plus",
      "minus",
      "arrow",
      "symbol",
      "zzz",
      "anger",
      "sweat",
      "thought",
    ])
  ) {
    return "symbols";
  }

  return "misc";
}

const grouped: Record<
  Exclude<DreamEmojiCategory, "recent">,
  DreamEmojiItem[]
> = {
  smileys: [],
  people: [],
  animals: [],
  food: [],
  travel: [],
  activities: [],
  objects: [],
  symbols: [],
  misc: [],
};

for (const item of ALL_DREAM_EMOJIS) {
  grouped[pickCategory(item)].push(item);
}

export const DREAM_EMOJI_CATEGORIES: DreamEmojiCategorySection[] = [
  {
    key: "smileys",
    label: "Faces",
    icon: "🙂",
    items: grouped.smileys,
  },
  {
    key: "people",
    label: "People",
    icon: "🧑",
    items: grouped.people,
  },
  {
    key: "animals",
    label: "Animals",
    icon: "🐶",
    items: grouped.animals,
  },
  {
    key: "food",
    label: "Food",
    icon: "🍔",
    items: grouped.food,
  },
  {
    key: "travel",
    label: "Travel",
    icon: "🚗",
    items: grouped.travel,
  },
  {
    key: "activities",
    label: "Activities",
    icon: "⚽",
    items: grouped.activities,
  },
  {
    key: "objects",
    label: "Objects",
    icon: "💡",
    items: grouped.objects,
  },
  {
    key: "symbols",
    label: "Symbols",
    icon: "🔣",
    items: grouped.symbols,
  },
  {
    key: "misc",
    label: "More",
    icon: "🧩",
    items: grouped.misc,
  },
];

const ALLOWED_SYMBOL_REGEX =
  /[\p{Extended_Pictographic}\p{Emoji_Modifier}\u200D\uFE0E\uFE0F]/u;

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
  return (
    sanitized.length > 0 &&
    sanitized === value.replace(/\s+/g, " ").trim()
  );
}

export function appendToken(current: string, token: string): string {
  const cleanCurrent = current.trimEnd();

  if (!cleanCurrent) return token;
  if (cleanCurrent.endsWith(" ")) return `${cleanCurrent}${token}`;

  return `${cleanCurrent} ${token}`;
}