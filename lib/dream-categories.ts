/** Client-safe category metadata. Keep this module free of dictionary content. */
export const DREAM_CATEGORIES = {
  animals: {
    label: "Animal dreams",
    description: "Instinct, trust, boundaries, protection, and the untamed parts of the self.",
    icon: "🐾",
  },
  body: {
    label: "Body dreams",
    description: "Confidence, health awareness, expression, identity, and personal control.",
    icon: "🫧",
  },
  water: {
    label: "Water dreams",
    description: "Emotion, intuition, change, cleansing, and what moves below awareness.",
    icon: "🌊",
  },
  "life-events": {
    label: "Life event dreams",
    description: "Beginnings, endings, responsibility, relationships, value, and transition.",
    icon: "🌱",
  },
  "fear-nightmares": {
    label: "Fear & nightmare dreams",
    description: "Pressure, avoidance, insecurity, vulnerability, and the need for safety.",
    icon: "🌘",
  },
  places: {
    label: "Place dreams",
    description: "Belonging, memory, inner structure, privacy, and emotional foundations.",
    icon: "🏠",
  },
  movement: {
    label: "Movement dreams",
    description: "Freedom, direction, ambition, control, progress, and changing perspective.",
    icon: "🧭",
  },
  objects: {
    label: "Object & value dreams",
    description: "Security, opportunity, self-worth, resources, and practical priorities.",
    icon: "✨",
  },
  people: {
    label: "People & relationship dreams",
    description: "Love, family, attachment, betrayal, longing, and the bonds that shape identity.",
    icon: "💞",
  },
  nature: {
    label: "Nature & disaster dreams",
    description: "Elemental force, upheaval, renewal, and events larger than personal control.",
    icon: "🌪️",
  },
  spiritual: {
    label: "Spiritual & supernatural dreams",
    description: "Faith, the unseen, protection, fear of the beyond, and messages from within.",
    icon: "🔮",
  },
} as const;

export type DreamCategory = keyof typeof DREAM_CATEGORIES;
