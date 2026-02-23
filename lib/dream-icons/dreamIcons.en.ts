// src/lib/dream-icons/dreamIcons.en.ts
import type { LucideIcon } from "lucide-react";
import {
  TreePine,
  Bell,
  Wind,
  Music,
  Sun,
  Moon,
  Stars,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Waves,
  Flame,
  Droplets,
  Mountain,
  Leaf,
  Flower2,
  Bird,
  Bug,
  Fish,
  PawPrint,
  Home,
  Building2,
  Hospital,
  School,
  Store,
  Car,
  Bus,
  Train,
  Plane,
  Ship,
  Route,
  Navigation,
  Footprints,
  MapPin,
  KeyRound,
  Lock,
  Shield,
  Eye,
  EyeOff,
  Search,
  Phone,
  MessageCircle,
  Users,
  User,
  Baby,
  Heart,
  HeartCrack,
  Smile,
  Frown,
  Angry,
  Laugh,
  Skull,
  Ghost,
  Sparkles,
  Lightbulb,
  Clock,
  Calendar,
  Hourglass,
  Camera,
  Tv,
  Gamepad2,
  BookOpen,
  Pencil,
  Scissors,
  ShoppingBag,
  CreditCard,
  Briefcase,
  Utensils,
  Coffee,
  Apple,
  Pizza,
  Drum,
  Guitar,
  Mic,
  VolumeX,
  Volume2,
  Swords,
  AlertTriangle,
} from "lucide-react";

export type DreamIconKey =
  | "forest"
  | "bell"
  | "wind"
  | "music"
  | "light"
  | "night"
  | "stars"
  | "rain"
  | "snow"
  | "storm"
  | "water"
  | "fire"
  | "tears"
  | "mountain"
  | "nature"
  | "flowers"
  | "bird"
  | "insects"
  | "fish"
  | "animals"
  | "home"
  | "city"
  | "hospital"
  | "school"
  | "shop"
  | "car"
  | "public_transport"
  | "train"
  | "plane"
  | "ship"
  | "route"
  | "navigation"
  | "footsteps"
  | "location"
  | "key"
  | "lock"
  | "protection"
  | "watching"
  | "hiding"
  | "search"
  | "phone"
  | "chat"
  | "people"
  | "person"
  | "baby"
  | "love"
  | "heartbreak"
  | "happy"
  | "sad"
  | "anger"
  | "laugh"
  | "death"
  | "ghost"
  | "magic"
  | "idea"
  | "time"
  | "date"
  | "waiting"
  | "camera"
  | "tv"
  | "game"
  | "reading"
  | "writing"
  | "cut"
  | "shopping"
  | "money"
  | "work"
  | "food"
  | "coffee"
  | "fruit"
  | "pizza"
  | "drums"
  | "guitar"
  | "singing"
  | "silence"
  | "loud"
  | "danger"
  | "fight";

type IconDef = {
  Icon: LucideIcon;
  /** Чем больше — тем выше шанс попасть в топ */
  base: number;
  /** Слова/фразы в нижнем регистре */
  keywords: string[];
};

/**
 * EN keyword → Lucide icon mapping
 * Добавляй/удаляй элементы спокойно — всё типизировано.
 */
export const DREAM_ICONS_EN: Record<DreamIconKey, IconDef> = {
  // ---- Your 4 core example icons ----
  forest: {
    Icon: TreePine,
    base: 100,
    keywords: ["forest", "woods", "woodland", "trees", "tree", "pine", "jungle"],
  },
  bell: {
    Icon: Bell,
    base: 92,
    keywords: ["bell", "bells", "ringing", "chime", "chimes", "ding", "toll"],
  },
  wind: {
    Icon: Wind,
    base: 88,
    keywords: ["wind", "breeze", "gust", "blowing", "windy"],
  },
  music: {
    Icon: Music,
    base: 86,
    keywords: ["music", "melody", "song", "sing", "singing", "tune", "rhythm", "notes"],
  },

  // ---- Atmosphere / nature ----
  light: { Icon: Sun, base: 70, keywords: ["light", "sun", "sunlight", "bright", "glow", "daylight"] },
  night: { Icon: Moon, base: 62, keywords: ["night", "moon", "dark", "midnight"] },
  stars: { Icon: Stars, base: 60, keywords: ["stars", "starry", "constellation"] },
  rain: { Icon: CloudRain, base: 65, keywords: ["rain", "raining", "stormy", "drizzle", "wet"] },
  snow: { Icon: CloudSnow, base: 64, keywords: ["snow", "snowing", "blizzard", "icy"] },
  storm: { Icon: CloudLightning, base: 66, keywords: ["thunder", "lightning", "storm", "hurricane"] },
  water: { Icon: Waves, base: 72, keywords: ["sea", "ocean", "waves", "river", "lake", "water", "swim", "swimming"] },
  fire: { Icon: Flame, base: 74, keywords: ["fire", "flame", "burn", "burning", "smoke", "wildfire"] },
  tears: { Icon: Droplets, base: 58, keywords: ["tears", "cry", "crying", "wet eyes", "sob"] },
  mountain: { Icon: Mountain, base: 55, keywords: ["mountain", "hill", "peak", "cliff"] },
  nature: { Icon: Leaf, base: 52, keywords: ["nature", "leaf", "leaves", "green", "garden"] },
  flowers: { Icon: Flower2, base: 48, keywords: ["flower", "flowers", "blossom", "rose", "bouquet"] },

  // ---- Animals ----
  bird: { Icon: Bird, base: 50, keywords: ["bird", "birds", "eagle", "crow", "owl"] },
  insects: { Icon: Bug, base: 44, keywords: ["bug", "insect", "spider", "ants", "bee", "wasp"] },
  fish: { Icon: Fish, base: 44, keywords: ["fish", "fishing", "aquarium"] },
  animals: { Icon: PawPrint, base: 46, keywords: ["dog", "cat", "wolf", "bear", "animal", "paw", "pet"] },

  // ---- Places ----
  home: { Icon: Home, base: 68, keywords: ["home", "house", "apartment", "room", "bedroom"] },
  city: { Icon: Building2, base: 45, keywords: ["city", "building", "street", "downtown"] },
  hospital: { Icon: Hospital, base: 52, keywords: ["hospital", "doctor", "nurse", "clinic", "surgery"] },
  school: { Icon: School, base: 50, keywords: ["school", "class", "teacher", "exam", "university", "college"] },
  shop: { Icon: Store, base: 42, keywords: ["shop", "store", "mall", "market"] },

  // ---- Travel / movement ----
  car: { Icon: Car, base: 56, keywords: ["car", "drive", "driving", "parking", "road"] },
  public_transport: { Icon: Bus, base: 40, keywords: ["bus", "subway", "metro"] },
  train: { Icon: Train, base: 44, keywords: ["train", "railway", "station"] },
  plane: { Icon: Plane, base: 48, keywords: ["plane", "flight", "airport", "flying"] },
  ship: { Icon: Ship, base: 44, keywords: ["ship", "boat", "sailing", "harbor"] },
  route: { Icon: Route, base: 46, keywords: ["route", "path", "journey", "trip"] },
  navigation: { Icon: Navigation, base: 40, keywords: ["navigate", "navigation", "compass", "direction"] },
  footsteps: { Icon: Footprints, base: 54, keywords: ["run", "running", "walk", "walking", "chase", "escape", "footsteps"] },
  location: { Icon: MapPin, base: 36, keywords: ["place", "location", "where", "map", "address"] },

  // ---- Objects / security ----
  key: { Icon: KeyRound, base: 44, keywords: ["key", "keys", "unlock"] },
  lock: { Icon: Lock, base: 52, keywords: ["lock", "locked", "closed door", "padlock"] },
  protection: { Icon: Shield, base: 50, keywords: ["protect", "protection", "safe", "safety", "guard"] },

  // ---- Perception / interaction ----
  watching: { Icon: Eye, base: 46, keywords: ["watching", "stare", "eyes", "looked at", "seen"] },
  hiding: { Icon: EyeOff, base: 46, keywords: ["hide", "hiding", "invisible", "secret"] },
  search: { Icon: Search, base: 42, keywords: ["search", "looking for", "find", "finding"] },
  phone: { Icon: Phone, base: 36, keywords: ["phone", "call", "calling"] },
  chat: { Icon: MessageCircle, base: 36, keywords: ["message", "chat", "texting", "sms"] },

  // ---- People / emotions ----
  people: { Icon: Users, base: 42, keywords: ["people", "crowd", "group", "everyone"] },
  person: { Icon: User, base: 40, keywords: ["person", "someone", "man", "woman", "stranger"] },
  baby: { Icon: Baby, base: 42, keywords: ["baby", "child", "kid", "newborn"] },
  love: { Icon: Heart, base: 62, keywords: ["love", "kiss", "romance", "heart"] },
  heartbreak: { Icon: HeartCrack, base: 58, keywords: ["breakup", "heartbreak", "betrayal", "cheating"] },
  happy: { Icon: Smile, base: 45, keywords: ["happy", "joy", "smile", "smiling"] },
  sad: { Icon: Frown, base: 45, keywords: ["sad", "depressed", "lonely", "cry"] },
  anger: { Icon: Angry, base: 50, keywords: ["angry", "anger", "rage", "furious"] },
  laugh: { Icon: Laugh, base: 38, keywords: ["laugh", "laughing", "funny"] },

  // ---- Dark themes ----
  death: { Icon: Skull, base: 60, keywords: ["death", "dead", "die", "dying", "corpse"] },
  ghost: { Icon: Ghost, base: 55, keywords: ["ghost", "haunted", "spirit", "paranormal"] },

  // ---- Abstract ----
  magic: { Icon: Sparkles, base: 42, keywords: ["magic", "magical", "spell", "sparkle"] },
  idea: { Icon: Lightbulb, base: 34, keywords: ["idea", "realize", "insight", "understand"] },
  time: { Icon: Clock, base: 36, keywords: ["time", "clock", "late", "early"] },
  date: { Icon: Calendar, base: 28, keywords: ["date", "calendar", "birthday", "anniversary"] },
  waiting: { Icon: Hourglass, base: 32, keywords: ["wait", "waiting", "delay"] },

  // ---- Media / hobbies ----
  camera: { Icon: Camera, base: 26, keywords: ["camera", "photo", "picture", "shooting"] },
  tv: { Icon: Tv, base: 24, keywords: ["tv", "television", "screen", "show"] },
  game: { Icon: Gamepad2, base: 24, keywords: ["game", "gaming", "console", "playstation", "xbox"] },
  reading: { Icon: BookOpen, base: 24, keywords: ["read", "reading", "book", "library"] },
  writing: { Icon: Pencil, base: 22, keywords: ["write", "writing", "pen", "note", "journal"] },
  cut: { Icon: Scissors, base: 18, keywords: ["cut", "scissors", "knife", "trim"] },

  // ---- Daily life ----
  shopping: { Icon: ShoppingBag, base: 20, keywords: ["shopping", "buy", "purchase", "bag"] },
  money: { Icon: CreditCard, base: 22, keywords: ["money", "pay", "payment", "credit", "card"] },
  work: { Icon: Briefcase, base: 24, keywords: ["work", "job", "office", "boss", "meeting"] },
  food: { Icon: Utensils, base: 22, keywords: ["food", "eat", "eating", "dinner", "lunch", "restaurant"] },
  coffee: { Icon: Coffee, base: 20, keywords: ["coffee", "cafe", "espresso"] },
  fruit: { Icon: Apple, base: 16, keywords: ["apple", "fruit"] },
  pizza: { Icon: Pizza, base: 16, keywords: ["pizza"] },

  // ---- Music sub-icons (optional but nice) ----
  drums: { Icon: Drum, base: 18, keywords: ["drum", "drums", "drumming"] },
  guitar: { Icon: Guitar, base: 18, keywords: ["guitar"] },
  singing: { Icon: Mic, base: 20, keywords: ["microphone", "mic", "singing", "karaoke"] },

  // ---- Sound states ----
  silence: { Icon: VolumeX, base: 30, keywords: ["silence", "silent", "quiet", "mute"] },
  loud: { Icon: Volume2, base: 24, keywords: ["loud", "noisy", "noise"] },

  // ---- Conflict / danger ----
  danger: { Icon: AlertTriangle, base: 54, keywords: ["danger", "warning", "threat", "panic"] },
  fight: { Icon: Swords, base: 52, keywords: ["fight", "fighting", "attack", "battle", "war"] },
};

/** нормализация EN текста: lower + убираем пунктуацию */
function normalizeEnText(s: string) {
  return (s ?? "")
    .toLowerCase()
    .replace(/['’]/g, "") // don't / don't → dont (чуть стабильнее)
    .replace(/[^a-z0-9\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Выбирает иконки из текста (title+body+summary).
 * Скоринг:
 * - base (важность категории)
 * - +15 если keyword найден как отдельное слово/фраза
 * - + до 20 за частоту совпадений (кап)
 */
export function pickDreamIconsEn(text: string, maxIcons = 4): DreamIconKey[] {
  const t = normalizeEnText(text);
  if (!t) return [];

  const scores = new Map<DreamIconKey, number>();

  (Object.keys(DREAM_ICONS_EN) as DreamIconKey[]).forEach((key) => {
    const def = DREAM_ICONS_EN[key];

    let hitCount = 0;
    for (const kwRaw of def.keywords) {
      const kw = normalizeEnText(kwRaw);

      // простая проверка по includes, но:
      // - для коротких слов лучше не спамить (tree, sun) — всё равно ок для EN MVP
      // - хочешь точнее: можно заменить на regex word boundary
      if (!kw) continue;
      if (t.includes(kw)) hitCount++;
    }

    if (hitCount > 0) {
      const bonus = 15;
      const freq = Math.min(20, hitCount * 5);
      scores.set(key, def.base + bonus + freq);
    }
  });

  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxIcons)
    .map(([k]) => k);
}

/** утилита: получаем компоненты-иконки для рендера */
export function getDreamIconComponentsEn(keys: DreamIconKey[]) {
  return keys.map((k) => ({
    key: k,
    Icon: DREAM_ICONS_EN[k].Icon,
  }));
}