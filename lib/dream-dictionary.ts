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

export type DreamScenario = {
  title: string;
  meaning: string;
};

export type DreamFaq = {
  question: string;
  answer: string;
};

export type DreamSections = {
  introduction: string[];
  general: string[];
  psychological: string[];
  spiritual: string[];
  islamic: string[];
  biblical: string[];
  commonScenarios: DreamScenario[];
  faq: DreamFaq[];
};

export type DreamEntry = {
  slug: string;
  canonicalSlug: string;
  parentSlug?: string;
  title: string;
  name: string;
  category: DreamCategory;
  icon: string;
  accent: string;
  aliases: string[];
  variationSlugs: string[];
  relatedSymbols: string[];
  shortMeaning: string;
  seoTitle: string;
  seoDescription: string;
  /** ISO date (YYYY-MM-DD) the entry's content last materially changed. Drives sitemap lastmod. */
  updatedAt: string;
  /** Set when this entry is a combination page joining two parent symbols. */
  comboOf?: [string, string];
  sections: DreamSections;
};

type VariationSeed = {
  slug: string;
  name: string;
  focus: string;
  aliases?: string[];
};

type ClusterSeed = {
  slug: string;
  name: string;
  category: DreamCategory;
  icon: string;
  accent: string;
  summary: string;
  aliases: string[];
  relatedSymbols: string[];
  /** Set (YYYY-MM-DD) when a cluster's content materially changes; falls back to DICTIONARY_UPDATED_AT. */
  updatedAt?: string;
  variations: VariationSeed[];
};

// Last date the shared dictionary templates/content changed. Bump this when editing
// makeSections/makeTitle etc.; bump a cluster's own updatedAt when editing just that cluster.
const DICTIONARY_UPDATED_AT = "2026-07-21";

const CLUSTERS: ClusterSeed[] = [
  {
    slug: "snake",
    name: "snake",
    category: "animals",
    icon: "🐍",
    accent: "#72d572",
    summary: "transformation, hidden fear, instinct, healing, and situations that require alertness",
    aliases: [
      "serpent",
      "snakes",
      "dream about snake",
      "snake in a dream",
      "dreaming of snakes",
      "snake dream meaning",
      "snake in water in dream meaning",
    ],
    relatedSymbols: ["water", "death", "dog", "cat", "spider", "being-chased", "forest", "rat", "alligator"],
    variations: [
      { slug: "black-snake", name: "black snake", focus: "an unknown threat, repressed fear, mystery, or a change that is difficult to read" },
      { slug: "white-snake", name: "white snake", focus: "unfamiliar wisdom, clarity, healing, or a truth arriving in an unexpected form" },
      { slug: "green-snake", name: "green snake", focus: "growth, renewal, jealousy, health, or instinct connected with a new opportunity" },
      { slug: "snake-bite", name: "snake bite", focus: "a sudden wake-up call, painful truth, conflict, or urgent boundary issue" },
      { slug: "dead-snake", name: "dead snake", focus: "the end of a threat, a completed transformation, or instinct that has been suppressed" },
      { slug: "many-snakes", name: "many snakes", focus: "multiple pressures, social mistrust, overstimulation, or several changes happening together" },
      { slug: "big-snake", name: "big snake", focus: "a fear, temptation, responsibility, or personal power that feels impossible to ignore" },
      {
        slug: "snakes-in-water",
        name: "snakes in water",
        focus: "hidden threat inside emotion, intuition mixed with fear, or change moving through a deep feeling",
        aliases: [
          "dreaming of snakes in water",
          "snake in water",
          "snakes swimming",
          "snake in water in dream meaning",
          "dream meaning snakes in water",
          "snakes in water dream meaning",
        ],
      },
    ],
  },
  {
    slug: "teeth",
    name: "teeth",
    category: "body",
    icon: "🦷",
    accent: "#a78bfa",
    summary: "confidence, communication, appearance, control, aging, and anxiety about change or loss",
    aliases: ["tooth", "dream about teeth", "teeth dream", "teeth in a dream"],
    relatedSymbols: ["death", "falling", "money", "baby", "blood", "hair", "mirror"],
    variations: [
      { slug: "teeth-falling-out", name: "teeth falling out", focus: "loss of control, embarrassment, transition, or concern about how others see you" },
      { slug: "broken-teeth", name: "broken teeth", focus: "damaged confidence, regret after conflict, or pressure that has exceeded your limits" },
      { slug: "loose-teeth", name: "loose teeth", focus: "uncertainty, an unstable decision, or awareness that a change can no longer be postponed" },
      { slug: "pulling-teeth", name: "pulling teeth", focus: "choosing a painful release, forcing change, or removing a problem at personal cost" },
      { slug: "rotten-teeth", name: "rotten teeth", focus: "a neglected concern, lingering shame, harmful communication, or fear that something is worsening" },
      { slug: "losing-teeth", name: "losing teeth", focus: "vulnerability, aging, social anxiety, or difficulty holding onto a familiar identity" },
    ],
  },
  {
    slug: "water",
    name: "water",
    category: "water",
    icon: "🌊",
    accent: "#38bdf8",
    summary: "emotion, intuition, cleansing, uncertainty, and the changing state of your inner world",
    aliases: [
      "dream about water",
      "water in a dream",
      "water dream meaning",
      "water dream dictionary",
      "dream dictionary water",
    ],
    relatedSymbols: [
      "snake",
      "death",
      "baby",
      "pregnancy",
      "falling",
      "beach",
      "fish",
      "shark",
      "fire",
      "storm",
      "alligator",
      "tunnel",
      "tsunami",
      "swimming",
      "boat",
    ],
    variations: [
      { slug: "flood", name: "flood", focus: "feelings, demands, or changes that seem to be exceeding your current capacity" },
      { slug: "ocean", name: "ocean", focus: "vast emotion, freedom, uncertainty, or contact with forces larger than the conscious self" },
      { slug: "river", name: "river", focus: "the direction of life, emotional flow, passage of time, or movement through transition" },
      { slug: "drowning", name: "drowning", focus: "emotional overwhelm, exhaustion, loss of control, or difficulty asking for support" },
      { slug: "dirty-water", name: "dirty water", focus: "confusion, emotional residue, mixed motives, or a situation that is hard to read clearly" },
      { slug: "clear-water", name: "clear water", focus: "peace, honesty, emotional clarity, recovery, or trust in the direction of your life" },
      { slug: "rain", name: "rain", focus: "release, renewal, sadness, fertility, or a cleansing process that cannot be rushed" },
    ],
  },
  {
    slug: "death",
    name: "death",
    category: "life-events",
    icon: "🕯️",
    accent: "#94a3b8",
    summary: "endings, transformation, grief, mortality, release, and the closing of an old identity",
    aliases: [
      "dying",
      "dream about death",
      "death in a dream",
      "death dream meaning",
      "dream interpretation death",
      "what is the meaning of a dream about death",
      "meaning of a dream about death",
    ],
    relatedSymbols: [
      "snake",
      "water",
      "falling",
      "teeth",
      "baby",
      "cemetery",
      "church",
      "hospital",
      "being-chased",
      "blood",
      "wedding",
      "ghost",
      "angel",
      "mother",
      "fire",
      "father",
      "illness",
      "tunnel",
      "nightmare",
      "grandparents",
    ],
    variations: [
      { slug: "someone-dying", name: "someone dying", focus: "fear of separation, a changing relationship, grief, or recognition that another person is changing" },
      { slug: "dead-person", name: "a dead person", focus: "memory, unfinished emotion, longing, comfort, or qualities associated with someone who has died" },
      { slug: "funeral", name: "a funeral", focus: "acknowledging an ending, honoring what has passed, and beginning the process of letting go" },
      { slug: "being-killed", name: "being killed", focus: "feeling overpowered, abruptly changed, silenced, or unable to control an important ending" },
      { slug: "killing-someone", name: "killing someone", focus: "intense conflict, rejected traits, buried anger, or a forceful attempt to end a pattern" },
      { slug: "dead-relative", name: "a dead relative", focus: "grief, family memory, inherited values, unresolved words, or a wish for comfort and connection" },
      {
        slug: "own-death",
        name: "your own death",
        focus: "the end of an identity, chapter, or role — not a prediction of literal death",
        aliases: ["dreaming of my own death", "dreaming I died", "dying in a dream meaning"],
      },
      {
        slug: "dead-parent",
        name: "a dead parent",
        focus: "grief, unfinished conversations, inherited patterns, or comfort associated with a parent who has died",
        aliases: ["dreaming of dead mother", "dreaming of dead father", "deceased parent dream"],
      },
    ],
  },
  {
    slug: "baby",
    name: "baby",
    category: "life-events",
    icon: "👶",
    accent: "#fb923c",
    summary: "new beginnings, vulnerability, potential, responsibility, and a tender part of life that needs care",
    aliases: [
      "infant",
      "dream about baby",
      "baby in a dream",
      "baby dream meaning",
      "dream dictionary baby",
      "baby dream dictionary",
      "psychological meaning of dreaming about a baby",
    ],
    relatedSymbols: ["pregnancy", "water", "death", "dog", "hospital", "teeth", "house", "wedding", "mother", "crawling", "twins", "rabbit"],
    variations: [
      { slug: "newborn-baby", name: "newborn baby", focus: "very recent potential, a fragile beginning, or a responsibility that has only just arrived" },
      { slug: "crying-baby", name: "crying baby", focus: "an unmet emotional need, neglected project, or vulnerable issue asking directly for attention" },
      { slug: "baby-boy", name: "baby boy", focus: "new active energy, emerging confidence, family hopes, or a beginning shaped by masculine associations" },
      { slug: "baby-girl", name: "baby girl", focus: "new receptive energy, tenderness, family hopes, or a beginning shaped by feminine associations" },
      { slug: "holding-a-baby", name: "holding a baby", focus: "accepting responsibility, protecting potential, or forming a bond with something newly important" },
      { slug: "lost-baby", name: "lost baby", focus: "fear of failure, neglected potential, separation anxiety, or uncertainty about caring for what matters" },
    ],
  },
  {
    slug: "pregnancy",
    name: "pregnancy",
    category: "life-events",
    icon: "🤰",
    accent: "#f472b6",
    summary: "creation, development, anticipation, responsibility, and something important growing before it is ready to emerge",
    aliases: ["pregnant", "dream about pregnancy", "pregnancy in a dream", "pregnancy dream meaning"],
    relatedSymbols: ["baby", "water", "hospital", "house", "wedding", "twins"],
    variations: [
      { slug: "being-pregnant", name: "being pregnant", focus: "personally carrying an idea, identity, responsibility, or change that is still developing" },
      { slug: "pregnancy-test", name: "a pregnancy test", focus: "waiting for confirmation, fearing consequences, or needing clarity about a life-changing possibility" },
      { slug: "giving-birth", name: "giving birth", focus: "bringing a project, role, relationship, or new phase into visible and demanding reality" },
      { slug: "miscarriage", name: "miscarriage", focus: "grief, fear of lost potential, interrupted plans, or direct processing of a deeply personal experience" },
      { slug: "pregnant-woman", name: "a pregnant woman", focus: "witnessing potential, sensing change in another person, or recognizing growth around you" },
      {
        slug: "pregnant-with-twins",
        name: "pregnant with twins",
        focus: "double potential, divided attention, or two developments growing at once and competing for care",
        aliases: ["twins pregnancy dream", "dreaming of twin pregnancy"],
      },
    ],
  },
  {
    slug: "dog",
    name: "dog",
    category: "animals",
    icon: "🐕",
    accent: "#f59e0b",
    summary: "loyalty, friendship, protection, instinct, companionship, and boundaries under pressure",
    aliases: ["dogs", "puppy", "dream about dog", "dog in a dream"],
    relatedSymbols: ["cat", "snake", "baby", "spider", "forest", "wolf", "being-chased", "rabbit"],
    variations: [
      { slug: "black-dog", name: "black dog", focus: "unknown instinct, grief, protection, depression, or a loyal presence that is difficult to understand" },
      { slug: "white-dog", name: "white dog", focus: "trustworthy support, peace, protection, innocence, or reassurance from a familiar bond" },
      { slug: "dog-bite", name: "dog bite", focus: "betrayal, threatened boundaries, conflict, or anger breaking through a relationship built on trust" },
      { slug: "friendly-dog", name: "friendly dog", focus: "companionship, emotional safety, dependable support, or comfort with your own instincts" },
      { slug: "aggressive-dog", name: "aggressive dog", focus: "defensive anger, social conflict, fear of betrayal, or a protective response that feels uncontrolled" },
      { slug: "dead-dog", name: "dead dog", focus: "grief, the end of a friendship, lost trust, or a dependable part of life that has changed" },
    ],
  },
  {
    slug: "cat",
    name: "cat",
    category: "animals",
    icon: "🐈",
    accent: "#c084fc",
    summary: "independence, intuition, curiosity, sensuality, boundaries, and relationships that resist control",
    aliases: ["cats", "kitten", "dream about cat", "cat in a dream"],
    relatedSymbols: ["dog", "snake", "spider", "tiger", "owl", "rat", "rabbit"],
    variations: [
      { slug: "black-cat", name: "black cat", focus: "mystery, intuition, superstition, independence, or anxiety about something you cannot fully predict" },
      { slug: "white-cat", name: "white cat", focus: "gentle intuition, apparent innocence, emotional distance, or a subtle issue beneath a calm surface" },
      { slug: "cat-attack", name: "cat attack", focus: "scratched boundaries, indirect conflict, mistrust, or an independent person resisting pressure" },
      { slug: "kittens", name: "kittens", focus: "playfulness, vulnerable independence, small responsibilities, or new curiosity that needs protection" },
      { slug: "dead-cat", name: "dead cat", focus: "lost independence, ignored intuition, grief, or the ending of a private and self-protective phase" },
    ],
  },
  {
    slug: "flying",
    name: "flying",
    category: "movement",
    icon: "🪽",
    accent: "#8b5cf6",
    summary: "freedom, ambition, perspective, escape, confidence, and the desire to move beyond limits",
    aliases: ["flight", "dream about flying", "flying in a dream", "flying dream meaning"],
    relatedSymbols: ["falling", "being-chased", "car", "airport", "bird", "butterfly", "tornado", "heights", "plane"],
    variations: [
      { slug: "flying-high", name: "flying high", focus: "big ambition, expanded perspective, confidence, or distance from practical concerns on the ground" },
      { slug: "flying-over-water", name: "flying over water", focus: "gaining perspective on strong emotions or moving between freedom and emotional depth" },
      { slug: "flying-without-wings", name: "flying without wings", focus: "unexpected agency, imagination, spiritual possibility, or confidence without familiar support" },
      { slug: "falling-while-flying", name: "falling while flying", focus: "fear of losing success, status, confidence, control, or a promising opportunity" },
    ],
  },
  {
    slug: "falling",
    name: "falling",
    category: "fear-nightmares",
    icon: "🪂",
    accent: "#fb7185",
    summary: "loss of control, insecurity, surrender, sudden change, and anxiety about failing or losing support",
    aliases: [
      "fall",
      "dream about falling",
      "falling in a dream",
      "falling dream meaning",
      "dreams about heights",
    ],
    relatedSymbols: [
      "flying",
      "being-chased",
      "death",
      "water",
      "school",
      "teeth",
      "car",
      "being-naked",
      "crawling",
      "tunnel",
      "heights",
      "nightmare",
      "plane",
      "stairs",
      "trapped",
    ],
    variations: [
      { slug: "falling-from-height", name: "falling from a height", focus: "fear of failure after progress, loss of status, or anxiety about a risk with serious consequences", aliases: ["dreams about heights", "falling from heights dream"] },
      { slug: "falling-off-building", name: "falling off a building", focus: "instability in a structured area of life such as work, reputation, plans, or achievement" },
      { slug: "falling-into-water", name: "falling into water", focus: "sudden immersion in emotion, surrender to uncertainty, or an abrupt loss of emotional distance" },
      { slug: "falling-and-waking-up", name: "falling and waking up", focus: "a body-startle response, accumulated stress, or a fear that becomes urgent enough to interrupt sleep" },
      {
        slug: "fear-of-heights",
        name: "fear of heights",
        focus: "acrophobia, exposure after progress, vertigo at a life edge, and the dread of losing footing",
        aliases: [
          "traumdeutung höhenangst",
          "höhenangst traumdeutung",
          "höhenangst traum",
          "acrophobia dream meaning",
          "dreaming of fear of heights",
          "fear of heights dream meaning",
          "dreaming about heights and being scared",
          "сонник боязнь высоты",
          "soñar con alturas y tener miedo",
        ],
      },
    ],
  },
  {
    slug: "being-chased",
    name: "being chased",
    category: "fear-nightmares",
    icon: "🏃",
    accent: "#ef4444",
    summary: "avoidance, pressure, unresolved conflict, threatened safety, and a problem that keeps demanding attention",
    aliases: ["chasing", "dream about being chased", "chased in a dream", "running away dream"],
    relatedSymbols: [
      "falling",
      "flying",
      "death",
      "dog",
      "snake",
      "prison",
      "school",
      "forest",
      "demon",
      "being-naked",
      "crawling",
      "tunnel",
      "heights",
      "nightmare",
      "trapped",
      "being-lost",
    ],
    variations: [
      { slug: "chased-by-man", name: "being chased by a man", focus: "pressure connected with authority, conflict, unfamiliar intent, or a threatening masculine presence" },
      { slug: "chased-by-animal", name: "being chased by an animal", focus: "instinct, fear, anger, desire, or a natural reaction that the conscious mind is avoiding" },
      { slug: "chased-by-monster", name: "being chased by a monster", focus: "an exaggerated fear, shame, trauma, or problem that has become larger through avoidance" },
      { slug: "hiding-from-someone", name: "hiding from someone", focus: "self-protection, secrecy, avoidance of confrontation, or the need for a safer boundary" },
    ],
  },
  {
    slug: "house",
    name: "house",
    category: "places",
    icon: "🏠",
    accent: "#14b8a6",
    summary: "the self, family, privacy, memory, emotional foundations, and the different rooms of inner life",
    aliases: ["home", "dream about house", "house in a dream", "home dream meaning"],
    relatedSymbols: [
      "castle",
      "hotel",
      "prison",
      "school",
      "church",
      "money",
      "baby",
      "pregnancy",
      "fire",
      "earthquake",
      "mother",
      "ghost",
      "rat",
      "father",
      "mirror",
      "grandparents",
      "stairs",
      "being-lost",
      "lottery",
      "debt",
    ],
    variations: [
      { slug: "old-house", name: "old house", focus: "past identity, family history, neglected memories, or a foundation that needs repair and attention" },
      { slug: "new-house", name: "new house", focus: "a fresh identity, changed circumstances, future plans, or emotional space that is still unfamiliar" },
      { slug: "burning-house", name: "burning house", focus: "intense change, family conflict, emotional overload, purification, or fear of losing security" },
      { slug: "empty-house", name: "empty house", focus: "loneliness, unused potential, emotional absence, or a part of the self waiting to be inhabited" },
      { slug: "childhood-house", name: "childhood house", focus: "formative memory, family patterns, safety, unresolved history, or comparison between past and present" },
      { slug: "haunted-house", name: "haunted house", focus: "persistent memory, unresolved fear, family history, or an avoided part of your inner world" },
    ],
  },
  {
    slug: "money",
    name: "money",
    category: "objects",
    icon: "💰",
    accent: "#22c55e",
    summary: "value, security, opportunity, self-worth, exchange, power, and anxiety about available resources",
    aliases: ["cash", "dream about money", "money in a dream", "money dream meaning"],
    relatedSymbols: ["house", "car", "teeth", "castle", "work", "phone", "mirror", "lottery", "debt"],
    variations: [
      { slug: "finding-money", name: "finding money", focus: "unexpected opportunity, rediscovered value, confidence, or recognition of a resource you already possess" },
      { slug: "losing-money", name: "losing money", focus: "insecurity, missed opportunity, depleted energy, or concern about value and practical stability" },
      { slug: "coins", name: "coins", focus: "small but tangible value, accumulated effort, everyday choices, luck, or attention to modest resources" },
      { slug: "gold", name: "gold", focus: "lasting value, aspiration, spiritual richness, status, temptation, or something precious that requires discernment" },
      { slug: "wallet", name: "wallet", focus: "identity, personal resources, privacy, financial access, or the practical container for what you value" },
      { slug: "stealing-money", name: "stealing money", focus: "guilt, unfair exchange, desperation, envy, or taking value without a secure sense of deserving it" },
    ],
  },
  {
    slug: "spider",
    name: "spider",
    category: "animals",
    icon: "🕷️",
    accent: "#64748b",
    summary: "patience, creativity, entanglement, fear, careful strategy, and the networks being built around you",
    aliases: ["spiders", "dream about spider", "spider in a dream", "spider dream meaning"],
    relatedSymbols: ["snake", "cat", "dog", "butterfly", "rat", "crawling"],
    variations: [
      { slug: "big-spider", name: "big spider", focus: "a fear, influence, creative task, or complicated situation that has become difficult to overlook" },
      { slug: "black-spider", name: "black spider", focus: "hidden anxiety, patient strategy, an unknown influence, or a complicated issue operating quietly" },
      { slug: "spider-bite", name: "spider bite", focus: "a small but potent conflict, betrayal, warning, or consequence from an entangled situation" },
      { slug: "killing-spider", name: "killing a spider", focus: "confronting fear, ending manipulation, breaking a pattern, or rejecting a patient creative process" },
      { slug: "spider-web", name: "spider web", focus: "connection, creativity, careful planning, entrapment, or consequences woven over time" },
    ],
  },
  {
    slug: "car",
    name: "car",
    category: "movement",
    icon: "🚗",
    accent: "#0ea5e9",
    summary: "direction, agency, progress, status, control, and the way you are moving through practical life",
    aliases: ["vehicle", "automobile", "dream about car", "car in a dream"],
    relatedSymbols: ["flying", "falling", "money", "airport", "horse", "phone", "train", "plane"],
    variations: [
      {
        slug: "car-accident",
        name: "car accident",
        focus: "a collision of plans, fear of consequences, sudden disruption, or concern about the direction of life",
        aliases: [
          "car accident dream meaning",
          "car accident dream meaning islam",
          "dream about car accident",
          "car accident dream",
          "dream analysis car accident",
        ],
      },
      { slug: "driving-car", name: "driving a car", focus: "personal agency, responsibility, confidence, and how much control you feel over your current direction" },
      { slug: "losing-car", name: "losing a car", focus: "lost direction, reduced independence, confusion about progress, or difficulty accessing your usual agency" },
      { slug: "stolen-car", name: "stolen car", focus: "violated autonomy, stolen opportunity, identity disruption, or fear that someone else controls your direction" },
      {
        slug: "car-crash",
        name: "car crash",
        focus: "conflicting goals, abrupt failure, accumulated pressure, or an urgent need to change course",
        aliases: [
          "car crash dream meaning",
          "car crash dream symbolism",
          "dream interpretation car crash",
          "car crash dream interpretation",
        ],
      },
      { slug: "brake-failure", name: "brake failure", focus: "inability to slow down, weak boundaries, accelerating pressure, or fear that consequences cannot be stopped" },
    ],
  },
  {
    slug: "school",
    name: "school",
    category: "places",
    icon: "🏫",
    accent: "#3b82f6",
    summary: "performance pressure, evaluation, growth, social belonging, and unfinished lessons from earlier life",
    aliases: ["schoolyard", "classroom", "dream about school", "school in a dream"],
    relatedSymbols: ["house", "being-chased", "falling", "hospital", "being-naked", "work"],
    variations: [
      { slug: "old-school", name: "old school", focus: "nostalgia, unresolved memories from an earlier stage of life, or comparing past growth with where you stand now" },
      { slug: "being-late-to-school", name: "being late to school", focus: "fear of falling behind, missed responsibility, or anxiety about meeting an important expectation" },
      { slug: "school-exam", name: "a school exam", focus: "performance pressure, self-doubt, or feeling unprepared for a real evaluation in waking life" },
      { slug: "empty-school", name: "an empty school", focus: "loneliness, a paused stage of growth, or absence of the structure and support you once depended on" },
      { slug: "getting-lost-in-school", name: "getting lost in school", focus: "confusion about direction, an unclear path forward, or difficulty navigating new expectations" },
      { slug: "childhood-school", name: "your childhood school", focus: "formative memory, early identity, or family and social patterns learned at a young age" },
      { slug: "school-classroom", name: "a school classroom", focus: "structured learning, comparison with peers, or a setting where your performance feels watched and measured" },
      { slug: "failing-at-school", name: "failing at school", focus: "fear of disappointing others, self-criticism, or anxiety about a serious lapse in competence or preparation" },
    ],
  },
  {
    slug: "hospital",
    name: "hospital",
    category: "places",
    icon: "🏥",
    accent: "#ef4444",
    summary: "vulnerability, healing, urgent need, dependence on others, and the body's call for attention and care",
    aliases: ["hospitalized", "dream about hospital", "hospital in a dream"],
    relatedSymbols: ["death", "baby", "pregnancy", "school", "prison", "blood", "illness"],
    variations: [
      { slug: "being-in-hospital", name: "being in hospital", focus: "vulnerability, dependence on others, or a part of life that urgently needs attention and care" },
      { slug: "hospital-bed", name: "a hospital bed", focus: "forced rest, surrender of control, or a slow recovery that cannot be rushed" },
      { slug: "visiting-someone-in-hospital", name: "visiting someone in hospital", focus: "concern for another person, guilt, or a wish to support someone through a difficult time" },
      { slug: "empty-hospital", name: "an empty hospital", focus: "isolation, an unmet need for care, or fear of facing a crisis without support" },
      { slug: "hospital-emergency", name: "a hospital emergency", focus: "urgency, sudden crisis, fear of losing control, or a problem that can no longer be postponed" },
      { slug: "surgery-in-hospital", name: "surgery in hospital", focus: "deep change, exposure, trust in others, or a necessary but frightening intervention" },
      { slug: "lost-in-hospital", name: "being lost in hospital", focus: "confusion about a health concern, difficulty finding help, or disorientation during a vulnerable time" },
      { slug: "hospital-room", name: "a hospital room", focus: "a private struggle, recovery, or quiet waiting during an uncertain personal situation" },
    ],
  },
  {
    slug: "church",
    name: "church",
    category: "places",
    icon: "⛪",
    accent: "#a855f7",
    summary: "faith, community, conscience, ritual, and the search for meaning, forgiveness, or moral clarity",
    aliases: ["chapel", "cathedral", "dream about church", "church in a dream"],
    relatedSymbols: ["house", "death", "cemetery", "castle", "wedding", "angel", "god"],
    variations: [
      { slug: "praying-in-church", name: "praying in church", focus: "sincere reflection, a need for guidance, or surrender of a burden too heavy to carry alone" },
      { slug: "empty-church", name: "an empty church", focus: "spiritual loneliness, doubt, or a quiet space waiting to be filled with renewed meaning" },
      { slug: "old-church", name: "an old church", focus: "inherited belief, tradition, family history, or values passed down over a long time" },
      { slug: "church-wedding", name: "a church wedding", focus: "commitment, public vows, blended families, or a significant life transition witnessed by community" },
      { slug: "church-bells", name: "church bells", focus: "a call to attention, an announcement, urgency, or a marker of time and ritual" },
      { slug: "burning-church", name: "a burning church", focus: "a crisis of faith, loss of a moral foundation, or intense upheaval within a belief system" },
      { slug: "church-service", name: "a church service", focus: "community, shared ritual, accountability, or reflection guided by a larger structure of meaning" },
      { slug: "abandoned-church", name: "an abandoned church", focus: "lost faith, neglected values, or a once-important belief that no longer feels active" },
    ],
  },
  {
    slug: "cemetery",
    name: "cemetery",
    category: "places",
    icon: "🪦",
    accent: "#4b5563",
    summary: "grief, memory, closure, and the quiet presence of what has ended but is not forgotten",
    aliases: ["graveyard", "dream about cemetery", "cemetery in a dream"],
    relatedSymbols: ["death", "church", "forest", "owl", "ghost"],
    variations: [
      { slug: "walking-through-cemetery", name: "walking through a cemetery", focus: "processing grief, reflecting on mortality, or moving through unresolved memories at your own pace" },
      { slug: "graveyard", name: "a graveyard", focus: "endings, memory, respect for the past, or an honest confrontation with loss" },
      { slug: "visiting-a-grave", name: "visiting a grave", focus: "unfinished grief, a wish to reconnect, or honoring someone or something that has ended" },
      { slug: "open-grave", name: "an open grave", focus: "anticipated loss, fear of an ending, or anxiety about a change that feels final" },
      { slug: "old-cemetery", name: "an old cemetery", focus: "long-held memory, ancestral history, or grief that has settled into quiet acceptance over time" },
      { slug: "cemetery-at-night", name: "a cemetery at night", focus: "fear of the unknown, unresolved grief, or anxiety surfacing when defenses are lowered" },
      { slug: "seeing-your-own-grave", name: "seeing your own grave", focus: "confronting mortality, a major identity shift, or the symbolic end of an old version of yourself" },
      { slug: "flowers-on-a-grave", name: "flowers on a grave", focus: "tribute, ongoing love, closure, or a gentle way of honoring what has been lost" },
    ],
  },
  {
    slug: "hotel",
    name: "hotel",
    category: "places",
    icon: "🏨",
    accent: "#f97316",
    summary: "transition, temporary identity, privacy among strangers, and life lived outside your usual routine",
    aliases: ["motel", "dream about hotel", "hotel in a dream"],
    relatedSymbols: ["house", "airport", "castle", "beach"],
    variations: [
      { slug: "staying-in-hotel", name: "staying in a hotel", focus: "a temporary phase, transition, or identity that feels comfortable but not permanent" },
      { slug: "luxury-hotel", name: "a luxury hotel", focus: "aspiration, reward, self-worth, or a wish for comfort and recognition" },
      { slug: "dirty-hotel-room", name: "a dirty hotel room", focus: "disappointment, neglected self-care, or a situation that looks acceptable but feels wrong up close" },
      { slug: "getting-lost-in-hotel", name: "getting lost in a hotel", focus: "disorientation during a transition, or difficulty finding stability in an unfamiliar situation" },
      { slug: "hotel-elevator", name: "a hotel elevator", focus: "rapid change in status or mood, transition between levels of a situation, or anxiety about losing control" },
      { slug: "empty-hotel", name: "an empty hotel", focus: "isolation during a transition, or a temporary phase that feels unexpectedly lonely" },
      { slug: "hotel-check-in", name: "a hotel check-in", focus: "entering a new phase, presenting an identity to others, or beginning an unfamiliar chapter" },
      { slug: "strange-hotel-room", name: "a strange hotel room", focus: "unfamiliarity, vulnerability, or discomfort with a temporary situation that feels out of your control" },
    ],
  },
  {
    slug: "airport",
    name: "airport",
    category: "places",
    icon: "✈️",
    accent: "#0284c7",
    summary: "transition, departure, anticipation, and the pressure of timing during a major life change",
    aliases: ["terminal", "dream about airport", "airport in a dream"],
    relatedSymbols: ["flying", "car", "hotel", "train", "plane", "being-lost"],
    variations: [
      { slug: "missing-flight", name: "missing a flight", focus: "fear of lost opportunity, poor timing, or anxiety about a chance that may not return" },
      { slug: "waiting-at-airport", name: "waiting at an airport", focus: "anticipation, suspended plans, or impatience during an unresolved transition" },
      { slug: "running-through-airport", name: "running through an airport", focus: "urgency, racing against time, or pressure to keep a plan from falling apart" },
      { slug: "empty-airport", name: "an empty airport", focus: "isolation during a transition, or uncertainty about a journey that feels unsupported" },
      { slug: "airport-security", name: "airport security", focus: "scrutiny, exposure, or anxiety about being judged before a significant change" },
      { slug: "lost-luggage-at-airport", name: "lost luggage at an airport", focus: "fear of losing resources, identity, or important parts of yourself during a transition" },
      { slug: "boarding-a-plane", name: "boarding a plane", focus: "committing to a change, accepting a new direction, or readiness to move forward" },
      { slug: "cancelled-flight", name: "a cancelled flight", focus: "blocked plans, frustration, or a transition that is delayed beyond your control" },
    ],
  },
  {
    slug: "prison",
    name: "prison",
    category: "places",
    icon: "⛓️",
    accent: "#78716c",
    summary: "restriction, guilt, powerlessness, and the wish to be released from a situation that feels inescapable",
    aliases: ["jail", "incarceration", "dream about prison", "prison in a dream"],
    relatedSymbols: ["house", "being-chased", "hospital", "trapped"],
    variations: [
      { slug: "being-in-prison", name: "being in prison", focus: "restriction, guilt, or a situation in waking life that feels inescapable or unfairly limiting" },
      { slug: "escaping-prison", name: "escaping prison", focus: "a wish for freedom, breaking free from limitation, or reclaiming control over a restrictive situation" },
      { slug: "visiting-someone-in-prison", name: "visiting someone in prison", focus: "concern for another person, guilt by association, or witnessing someone else's restricted circumstances" },
      { slug: "prison-cell", name: "a prison cell", focus: "isolation, confinement, or a narrow set of choices that feels suffocating" },
      { slug: "being-wrongly-imprisoned", name: "being wrongly imprisoned", focus: "injustice, misunderstanding, or feeling blamed for something outside your control" },
      { slug: "prison-guards", name: "prison guards", focus: "authority, surveillance, or pressure from someone who controls your choices" },
      { slug: "breaking-out-of-prison", name: "breaking out of prison", focus: "rebellion, urgency, or a determined attempt to escape a limiting circumstance" },
      { slug: "locked-in-prison", name: "being locked in prison", focus: "powerlessness, despair, or a prolonged sense of being trapped without resolution" },
    ],
  },
  {
    slug: "castle",
    name: "castle",
    category: "places",
    icon: "🏰",
    accent: "#facc15",
    summary: "status, ambition, protection, isolation, and the distance that power or achievement can create",
    aliases: ["palace", "fortress", "dream about castle", "castle in a dream"],
    relatedSymbols: ["house", "church", "forest", "hotel", "horse", "money"],
    variations: [
      { slug: "old-castle", name: "an old castle", focus: "inherited status, history, tradition, or a legacy that still shapes your identity" },
      { slug: "haunted-castle", name: "a haunted castle", focus: "unresolved family history, lingering fear, or grandeur shadowed by something unfinished" },
      { slug: "living-in-castle", name: "living in a castle", focus: "achieved status, ambition fulfilled, or comfort that comes with new responsibility" },
      { slug: "castle-ruins", name: "castle ruins", focus: "fallen status, lost achievement, or grief over something once powerful that has since declined" },
      { slug: "castle-on-a-hill", name: "a castle on a hill", focus: "aspiration, distance from others, or a goal that feels both desirable and hard to reach" },
      { slug: "entering-a-castle", name: "entering a castle", focus: "approaching a new level of status, opportunity, or an unfamiliar position of influence" },
      { slug: "being-trapped-in-castle", name: "being trapped in a castle", focus: "isolation that comes with status, protective walls that have become limiting, or loneliness at the top" },
      { slug: "royal-castle", name: "a royal castle", focus: "authority, legacy, formality, or pressure connected with a position of leadership" },
    ],
  },
  {
    slug: "beach",
    name: "beach",
    category: "places",
    icon: "🏖️",
    accent: "#06b6d4",
    summary: "relaxation, emotional exposure, the meeting point of conscious life and deeper feeling, and a need for renewal",
    aliases: ["seaside", "shore", "dream about beach", "beach in a dream"],
    relatedSymbols: ["water", "ocean", "fish", "shark", "hotel", "storm", "swimming", "tsunami", "boat"],
    variations: [
      { slug: "walking-on-beach", name: "walking on a beach", focus: "reflection, slow progress, or finding calm at the edge of strong emotion" },
      { slug: "empty-beach", name: "an empty beach", focus: "solitude, peaceful withdrawal, or a need for space away from daily demands" },
      { slug: "beach-waves", name: "beach waves", focus: "rhythms of emotion, repeated challenges, or the natural rise and fall of a feeling you cannot fully control" },
      { slug: "stormy-beach", name: "a stormy beach", focus: "emotional turbulence at the edge of awareness, or a calm area of life being disrupted by sudden feeling" },
      { slug: "sunny-beach", name: "a sunny beach", focus: "ease, optimism, reward, or a well-earned period of relaxation and clarity" },
      { slug: "beach-at-night", name: "a beach at night", focus: "mystery, introspection, or emotional depths that surface only when defenses are lowered" },
      { slug: "finding-something-on-beach", name: "finding something on a beach", focus: "unexpected insight, a forgotten resource, or meaning surfacing from beneath conscious awareness" },
      { slug: "lost-on-beach", name: "being lost on a beach", focus: "disorientation during a time meant for rest, or difficulty finding direction during a calm period" },
    ],
  },
  {
    slug: "forest",
    name: "forest",
    category: "places",
    icon: "🌲",
    accent: "#16a34a",
    summary: "the unconscious, uncertainty, instinct, growth, and the unknown territory beyond familiar structure",
    aliases: ["woods", "jungle", "dream about forest", "forest in a dream"],
    relatedSymbols: ["snake", "dog", "wolf", "bear", "owl", "horse", "being-chased", "cemetery", "castle", "being-lost", "rabbit"],
    variations: [
      { slug: "dark-forest", name: "a dark forest", focus: "fear of the unknown, confusion, or an unresolved part of the unconscious mind" },
      { slug: "walking-in-forest", name: "walking in a forest", focus: "exploration, self-discovery, or steady progress through an uncertain stage of life" },
      { slug: "getting-lost-in-forest", name: "getting lost in a forest", focus: "disorientation, loss of direction, or difficulty trusting your own judgment in unfamiliar territory" },
      { slug: "burning-forest", name: "a burning forest", focus: "rapid destructive change, anxiety about loss of resources, or an overwhelming transformation" },
      { slug: "green-forest", name: "a green forest", focus: "growth, vitality, renewal, or trust in a natural process unfolding in its own time" },
      { slug: "forest-animals", name: "forest animals", focus: "instinct, hidden influences, or unfamiliar parts of yourself appearing in an unguarded setting" },
      { slug: "running-through-forest", name: "running through a forest", focus: "urgency, avoidance, or a pressing need to escape an unclear threat" },
      { slug: "enchanted-forest", name: "an enchanted forest", focus: "imagination, hidden potential, or an unfamiliar opportunity that feels both inviting and uncertain" },
    ],
  },
  {
    slug: "fish",
    name: "fish",
    category: "animals",
    icon: "🐟",
    accent: "#0ea5e9",
    summary: "intuition, emotional resources, abundance, fertility, and ideas or feelings moving beneath the surface",
    aliases: ["fishes", "dream about fish", "fish in a dream"],
    relatedSymbols: ["water", "shark", "beach", "swimming"],
    variations: [
      { slug: "big-fish", name: "a big fish", focus: "a major opportunity, significant ambition, or an emotional resource that feels unusually large or important" },
      { slug: "dead-fish", name: "a dead fish", focus: "lost opportunity, emotional numbness, or a resource or feeling that has stopped developing" },
      { slug: "catching-fish", name: "catching a fish", focus: "successful effort, captured opportunity, or gaining insight into something previously hidden" },
      { slug: "swimming-fish", name: "swimming fish", focus: "ease with emotion, healthy intuition, or comfortable movement through a changing situation" },
      { slug: "fish-jumping", name: "a fish jumping", focus: "sudden insight, unexpected opportunity, or an emotion breaking briefly into conscious awareness" },
      { slug: "colorful-fish", name: "a colorful fish", focus: "vivid emotion, creative potential, or an attractive opportunity that stands out from the rest" },
      { slug: "fish-in-clear-water", name: "fish in clear water", focus: "emotional clarity, honest insight, or an opportunity that is easy to recognize and understand" },
      { slug: "fish-tank", name: "a fish tank", focus: "contained emotion, a controlled environment, or feelings observed safely from a protected distance" },
    ],
  },
  {
    slug: "bird",
    name: "bird",
    category: "animals",
    icon: "🐦",
    accent: "#fbbf24",
    summary: "freedom, perspective, communication, hope, and messages or insight arriving from beyond your usual viewpoint",
    aliases: ["birds", "dream about bird", "bird in a dream"],
    relatedSymbols: ["flying", "owl", "butterfly", "angel"],
    variations: [
      { slug: "flying-bird", name: "a flying bird", focus: "freedom, ambition, optimism, or a message of hope reaching you at the right time" },
      { slug: "black-bird", name: "a black bird", focus: "unfamiliar news, mystery, grief, or transition arriving in a form that is difficult to predict" },
      { slug: "white-bird", name: "a white bird", focus: "peace, clarity, spiritual reassurance, or a hopeful sign during an uncertain time" },
      { slug: "bird-attack", name: "a bird attack", focus: "sudden criticism, anxiety about being judged, or a message that feels aggressive or unwelcome" },
      { slug: "dead-bird", name: "a dead bird", focus: "lost hope, a stalled plan, or grief over a freedom or opportunity that has ended" },
      { slug: "bird-nest", name: "a bird's nest", focus: "home, family, preparation, or the careful building of safety for something new" },
      { slug: "singing-bird", name: "a singing bird", focus: "joy, communication, encouragement, or a positive message worth paying attention to" },
      { slug: "flock-of-birds", name: "a flock of birds", focus: "community, shared direction, social belonging, or a collective movement you are part of" },
    ],
  },
  {
    slug: "horse",
    name: "horse",
    category: "animals",
    icon: "🐎",
    accent: "#b45309",
    summary: "power, drive, freedom, instinct, and the energy that carries you toward an important goal",
    aliases: ["horses", "dream about horse", "horse in a dream", "horse in dream meaning", "horse in dream meaning islam"],
    relatedSymbols: ["forest", "castle", "car", "elephant"],
    variations: [
      { slug: "white-horse", name: "a white horse", focus: "purity of purpose, hope, or a powerful drive guided by clear intention" },
      { slug: "black-horse", name: "a black horse", focus: "unfamiliar power, hidden drive, or strong instinct that has not yet been fully understood" },
      { slug: "riding-horse", name: "riding a horse", focus: "personal control, confidence, and direct command over your own energy and direction" },
      { slug: "wild-horse", name: "a wild horse", focus: "untamed ambition, raw instinct, or freedom that resists structure and control" },
      { slug: "injured-horse", name: "an injured horse", focus: "depleted energy, blocked progress, or a powerful drive that has been weakened" },
      { slug: "dead-horse", name: "a dead horse", focus: "lost momentum, the end of a major effort, or grief over abandoned ambition" },
      { slug: "horse-race", name: "a horse race", focus: "competition, urgency, ambition, or pressure to outpace others toward a goal" },
      { slug: "horse-chasing-you", name: "a horse chasing you", focus: "overwhelming drive, pressure from your own ambition, or a powerful force you feel unable to control" },
    ],
  },
  {
    slug: "wolf",
    name: "wolf",
    category: "animals",
    icon: "🐺",
    accent: "#475569",
    summary: "instinct, loyalty, social belonging, danger, and the tension between independence and the pack",
    aliases: ["wolves", "dream about wolf", "wolf in a dream"],
    relatedSymbols: ["dog", "forest", "bear", "lion"],
    variations: [
      { slug: "black-wolf", name: "a black wolf", focus: "hidden instinct, unfamiliar danger, or a powerful presence that is difficult to read" },
      { slug: "white-wolf", name: "a white wolf", focus: "guidance, protection, or a trustworthy instinct guiding you through uncertainty" },
      { slug: "wolf-attack", name: "a wolf attack", focus: "betrayal, social conflict, or a sudden threat connected with loyalty or trust" },
      { slug: "pack-of-wolves", name: "a pack of wolves", focus: "group pressure, social dynamics, or feeling outnumbered by a coordinated threat" },
      { slug: "friendly-wolf", name: "a friendly wolf", focus: "trustworthy instinct, loyalty, or comfort with your own untamed nature" },
      { slug: "dead-wolf", name: "a dead wolf", focus: "the end of a threat, lost loyalty, or instinct that has been suppressed or ignored" },
      { slug: "howling-wolf", name: "a howling wolf", focus: "a call for connection, warning, loneliness, or an urgent signal demanding attention" },
      { slug: "wolf-chasing-you", name: "a wolf chasing you", focus: "fear of betrayal, social pressure, or an instinctive threat that feels difficult to outrun" },
    ],
  },
  {
    slug: "bear",
    name: "bear",
    category: "animals",
    icon: "🐻",
    accent: "#92400e",
    summary: "strength, protection, solitude, and a powerful instinct that can be either nurturing or dangerous",
    aliases: ["bears", "dream about bear", "bear in a dream"],
    relatedSymbols: ["forest", "wolf", "lion", "tiger", "elephant"],
    variations: [
      { slug: "black-bear", name: "a black bear", focus: "hidden strength, unfamiliar threat, or a powerful instinct beneath a calm surface" },
      { slug: "brown-bear", name: "a brown bear", focus: "grounded strength, protective instinct, or a dependable power you can call on when needed" },
      { slug: "bear-attack", name: "a bear attack", focus: "overwhelming threat, a protective boundary broken, or fear of a powerful uncontrollable force" },
      { slug: "friendly-bear", name: "a friendly bear", focus: "comfort with your own strength, protective support, or trustworthy power nearby" },
      { slug: "baby-bear", name: "a baby bear", focus: "vulnerable potential, a new responsibility, or strength that is still developing" },
      { slug: "dead-bear", name: "a dead bear", focus: "lost protection, diminished strength, or the end of a powerful but difficult phase" },
      { slug: "giant-bear", name: "a giant bear", focus: "an exaggerated threat, overwhelming responsibility, or power that feels too large to manage" },
      { slug: "running-from-bear", name: "running from a bear", focus: "avoidance of a serious threat, fear of confrontation, or pressure from a powerful force" },
    ],
  },
  {
    slug: "lion",
    name: "lion",
    category: "animals",
    icon: "🦁",
    accent: "#ca8a04",
    summary: "courage, authority, pride, leadership, and the confrontation between confidence and aggression",
    aliases: ["lions", "dream about lion", "lion in a dream"],
    relatedSymbols: ["tiger", "bear", "wolf", "elephant"],
    variations: [
      { slug: "lion-attack", name: "a lion attack", focus: "fear of authority, sudden confrontation, or an aggressive force testing your courage" },
      { slug: "friendly-lion", name: "a friendly lion", focus: "confidence, earned respect, or a powerful ally supporting your leadership" },
      { slug: "lion-chasing-you", name: "a lion chasing you", focus: "pressure from authority, fear of confrontation, or an aggressive challenge to your confidence" },
      { slug: "dead-lion", name: "a dead lion", focus: "lost authority, diminished confidence, or the end of a powerful leadership role" },
      { slug: "roaring-lion", name: "a roaring lion", focus: "a bold announcement, assertion of authority, or warning that demands attention" },
      { slug: "lion-cub", name: "a lion cub", focus: "developing confidence, emerging leadership, or potential strength that is not yet fully grown" },
      { slug: "black-lion", name: "a black lion", focus: "hidden authority, unfamiliar power, or confidence that has not yet been recognized" },
      { slug: "white-lion", name: "a white lion", focus: "pure authority, rare leadership, or a respected strength that stands apart from the rest" },
    ],
  },
  {
    slug: "tiger",
    name: "tiger",
    category: "animals",
    icon: "🐅",
    accent: "#ea580c",
    summary: "passion, aggression, independence, and a fierce power that demands respect and careful boundaries",
    aliases: ["tigers", "dream about tiger", "tiger in a dream"],
    relatedSymbols: ["lion", "cat", "bear"],
    variations: [
      { slug: "tiger-attack", name: "a tiger attack", focus: "sudden aggression, fear of a fierce confrontation, or a powerful threat testing your boundaries" },
      { slug: "white-tiger", name: "a white tiger", focus: "rare strength, striking individuality, or a powerful instinct that stands out from the ordinary" },
      { slug: "black-tiger", name: "a black tiger", focus: "hidden aggression, unfamiliar power, or an intense force that is difficult to predict" },
      { slug: "friendly-tiger", name: "a friendly tiger", focus: "respected strength, confidence, or comfort with your own fierce and passionate nature" },
      { slug: "dead-tiger", name: "a dead tiger", focus: "lost intensity, diminished passion, or the end of an aggressive but powerful phase" },
      { slug: "tiger-chasing-you", name: "a tiger chasing you", focus: "fear of a fierce confrontation, pressure from an intense rival, or an unavoidable aggressive force" },
      { slug: "baby-tiger", name: "a baby tiger", focus: "developing strength, emerging independence, or passion that has not yet fully matured" },
      { slug: "giant-tiger", name: "a giant tiger", focus: "an exaggerated threat, overwhelming intensity, or power that feels disproportionate to the situation" },
    ],
  },
  {
    slug: "shark",
    name: "shark",
    category: "animals",
    icon: "🦈",
    accent: "#0f172a",
    summary: "danger, ruthlessness, deep fear, and the powerful threats that move unseen beneath the surface",
    aliases: ["sharks", "dream about shark", "shark in a dream"],
    relatedSymbols: ["water", "fish", "beach", "alligator", "swimming"],
    variations: [
      { slug: "shark-attack", name: "a shark attack", focus: "sudden danger, fear of betrayal, or a ruthless threat striking without warning" },
      { slug: "dead-shark", name: "a dead shark", focus: "the end of a serious threat, removed danger, or fear that has finally been confronted" },
      { slug: "giant-shark", name: "a giant shark", focus: "an exaggerated threat, overwhelming fear, or danger that feels far larger than the situation warrants" },
      { slug: "swimming-with-sharks", name: "swimming with sharks", focus: "calculated risk, exposure to danger, or navigating a threatening situation with deliberate caution" },
      { slug: "black-shark", name: "a black shark", focus: "hidden danger, unfamiliar ruthlessness, or a threat that is difficult to see coming" },
      { slug: "shark-chasing-you", name: "a shark chasing you", focus: "fear of being targeted, an inescapable threat, or anxiety about a ruthless rival" },
      { slug: "shark-in-clear-water", name: "a shark in clear water", focus: "a visible danger, an acknowledged risk, or a threat that is easier to assess clearly" },
      { slug: "shark-bite", name: "a shark bite", focus: "sudden loss, painful betrayal, or an abrupt consequence from a dangerous situation" },
    ],
  },
  {
    slug: "owl",
    name: "owl",
    category: "animals",
    icon: "🦉",
    accent: "#6d28d9",
    summary: "wisdom, intuition, hidden knowledge, and an awareness that sees clearly even in darkness",
    aliases: ["owls", "dream about owl", "owl in a dream"],
    relatedSymbols: ["bird", "forest", "cat", "cemetery"],
    variations: [
      { slug: "white-owl", name: "a white owl", focus: "pure insight, spiritual guidance, or wisdom arriving at a meaningful moment" },
      { slug: "black-owl", name: "a black owl", focus: "hidden knowledge, unfamiliar intuition, or wisdom connected with something not yet understood" },
      { slug: "owl-watching-you", name: "an owl watching you", focus: "a sense of being observed, inner guidance, or awareness surfacing about a situation you have been avoiding" },
      { slug: "dead-owl", name: "a dead owl", focus: "lost wisdom, ignored intuition, or insight that arrived too late to be useful" },
      { slug: "flying-owl", name: "a flying owl", focus: "active intuition, perspective gained through quiet observation, or wisdom in motion" },
      { slug: "owl-at-night", name: "an owl at night", focus: "insight surfacing when defenses are lowered, or clarity found in an otherwise uncertain time" },
      { slug: "giant-owl", name: "a giant owl", focus: "an exaggerated sense of being watched, or wisdom that feels larger than the situation calls for" },
      { slug: "talking-owl", name: "a talking owl", focus: "direct guidance, an inner voice of wisdom, or a message you are meant to consciously register" },
    ],
  },
  {
    slug: "butterfly",
    name: "butterfly",
    category: "animals",
    icon: "🦋",
    accent: "#ec4899",
    summary: "transformation, lightness, fragile beauty, and the delicate process of becoming something new",
    aliases: ["butterflies", "dream about butterfly", "butterfly in a dream"],
    relatedSymbols: ["flying", "bird", "spider"],
    variations: [
      { slug: "white-butterfly", name: "a white butterfly", focus: "purity, peace, or a gentle sign accompanying a meaningful personal change" },
      { slug: "black-butterfly", name: "a black butterfly", focus: "an unfamiliar transformation, grief, or change that feels mysterious rather than threatening" },
      { slug: "colorful-butterfly", name: "a colorful butterfly", focus: "creative transformation, joy, or a vivid new phase of personal expression" },
      { slug: "dead-butterfly", name: "a dead butterfly", focus: "an interrupted transformation, fragile hope lost, or a beautiful change that did not complete" },
      { slug: "giant-butterfly", name: "a giant butterfly", focus: "an exaggerated sense of change, a transformation that feels larger than expected" },
      { slug: "butterfly-landing-on-you", name: "a butterfly landing on you", focus: "personal significance, a gentle sign, or transformation that feels directly meant for you" },
      { slug: "many-butterflies", name: "many butterflies", focus: "widespread change, collective renewal, or many small transformations happening together" },
      { slug: "butterfly-transformation", name: "a butterfly transformation", focus: "the core process of change itself: fragile, gradual, and ultimately freeing" },
    ],
  },
  {
    slug: "fire",
    name: "fire",
    category: "nature",
    icon: "🔥",
    accent: "#f97316",
    summary: "transformation, passion, anger, destruction, purification, and energy that can either warm or consume",
    aliases: [
      "flames",
      "burning",
      "dream about fire",
      "fire in a dream",
      "fire dream dictionary",
      "fire dream meaning",
      "meaning of fire dreams",
      "dream of a fire meaning",
      "significance of fire in dreams",
    ],
    relatedSymbols: ["water", "house", "storm", "tornado", "demon", "death", "tsunami"],
    variations: [
      { slug: "escaping-a-fire", name: "escaping a fire", focus: "survival instinct, urgent change, or getting clear of a situation before it consumes you" },
      { slug: "starting-a-fire", name: "starting a fire", focus: "initiative, suppressed anger, a desire to force change, or the consequences of a deliberate act" },
      { slug: "putting-out-a-fire", name: "putting out a fire", focus: "crisis management, restoring control, or the exhausting work of containing a volatile situation" },
      { slug: "wildfire", name: "a wildfire", focus: "a change or emotion spreading faster than it can be controlled" },
      { slug: "fire-smoke", name: "fire and smoke", focus: "an obscured danger, confusion around a heated situation, or early warning before real damage" },
      { slug: "clothes-on-fire", name: "your clothes on fire", focus: "public exposure, damaged reputation, or an identity under sudden intense pressure" },
      { slug: "fire-in-the-sky", name: "fire in the sky", focus: "dramatic upheaval, a warning, or awe before events much larger than personal control" },
    ],
  },
  {
    slug: "tornado",
    name: "tornado",
    category: "nature",
    icon: "🌪️",
    accent: "#64748b",
    summary: "chaotic emotion, sudden upheaval, anxiety, and destructive change that arrives without warning",
    aliases: ["twister", "cyclone", "dream about tornado", "tornado in a dream", "tornado dream meaning"],
    relatedSymbols: ["storm", "earthquake", "fire", "flying", "tsunami"],
    variations: [
      { slug: "tornado-coming", name: "a tornado coming toward you", focus: "an approaching crisis, dread about a change you can see but not stop" },
      { slug: "hiding-from-tornado", name: "hiding from a tornado", focus: "self-protection, seeking safety, or bracing for an upheaval outside your control" },
      { slug: "surviving-a-tornado", name: "surviving a tornado", focus: "resilience, relief after turmoil, or discovering strength during a destructive period" },
      { slug: "multiple-tornadoes", name: "multiple tornadoes", focus: "several volatile situations at once, or anxiety multiplying across areas of life" },
      { slug: "tornado-destroying-house", name: "a tornado destroying a house", focus: "upheaval striking your sense of home, family stability, or personal foundations" },
      { slug: "tornado-far-away", name: "a tornado far away", focus: "witnessing turmoil at a distance, or a threat that is real but not yet personal" },
    ],
  },
  {
    slug: "earthquake",
    name: "earthquake",
    category: "nature",
    icon: "🌋",
    accent: "#a16207",
    summary: "shaken foundations, sudden instability, insecurity, and change striking what once felt permanent",
    aliases: ["earth shaking", "dream about earthquake", "earthquake in a dream"],
    relatedSymbols: ["tornado", "storm", "house"],
    variations: [
      { slug: "ground-shaking", name: "the ground shaking", focus: "instability in something you assumed was solid: a job, relationship, belief, or plan" },
      { slug: "building-collapsing", name: "a building collapsing", focus: "the failure of a structure you depended on, or fear that achievements cannot hold" },
      { slug: "surviving-an-earthquake", name: "surviving an earthquake", focus: "endurance through upheaval and the reassessment that follows a major shock" },
      { slug: "earthquake-cracks", name: "cracks opening in the ground", focus: "growing divisions, a rift in a relationship, or hidden instability becoming visible" },
      { slug: "earthquake-at-home", name: "an earthquake at home", focus: "family instability, domestic conflict, or insecurity in your most personal foundations" },
      { slug: "aftershocks", name: "aftershocks", focus: "the lingering effects of a crisis, or anxiety that a disruption is not yet finished" },
    ],
  },
  {
    slug: "storm",
    name: "storm",
    category: "nature",
    icon: "⛈️",
    accent: "#475569",
    summary: "emotional turbulence, conflict, accumulated pressure, and a difficult season that eventually passes",
    aliases: ["thunderstorm", "dream about storm", "storm in a dream"],
    relatedSymbols: ["fire", "tornado", "earthquake", "water", "beach", "tsunami", "boat"],
    variations: [
      { slug: "thunder-and-lightning", name: "thunder and lightning", focus: "sudden insight, shock, anger discharging, or a dramatic emotional release" },
      { slug: "caught-in-a-storm", name: "being caught in a storm", focus: "feeling exposed in the middle of conflict or turmoil without adequate shelter" },
      { slug: "storm-approaching", name: "a storm approaching", focus: "tension building, a conflict you sense coming, or dread ahead of a difficult conversation" },
      { slug: "sheltering-from-storm", name: "sheltering from a storm", focus: "self-protection, patience, and waiting out a period that cannot be fought directly" },
      { slug: "storm-passing", name: "a storm passing", focus: "relief, resolution after conflict, or the calm perspective that follows turmoil" },
      { slug: "storm-at-sea", name: "a storm at sea", focus: "emotional crisis in deep waters: turbulence in the least controllable parts of life" },
    ],
  },
  {
    slug: "blood",
    name: "blood",
    category: "body",
    icon: "🩸",
    accent: "#dc2626",
    summary: "life force, vitality, injury, sacrifice, family bonds, and energy being spent or lost",
    aliases: ["bleeding", "dream about blood", "blood in a dream"],
    relatedSymbols: ["teeth", "death", "hospital", "hair", "illness", "wedding"],
    variations: [
      { slug: "bleeding", name: "bleeding", focus: "energy draining away, an emotional wound still open, or a loss that has not been addressed" },
      { slug: "blood-on-hands", name: "blood on your hands", focus: "guilt, responsibility for harm, or anxiety about the consequences of your actions" },
      { slug: "blood-on-clothes", name: "blood on your clothes", focus: "a visible mark of conflict, exposure of something you hoped to keep private" },
      { slug: "someone-else-bleeding", name: "someone else bleeding", focus: "concern for another person, empathy for their struggle, or witnessing harm you cannot stop" },
      { slug: "blood-on-the-floor", name: "blood on the floor", focus: "the aftermath of conflict, evidence of damage, or a situation that has already cost something" },
      { slug: "coughing-blood", name: "coughing up blood", focus: "health anxiety, words held in too long, or vitality being spent from the inside" },
    ],
  },
  {
    slug: "hair",
    name: "hair",
    category: "body",
    icon: "💇",
    accent: "#d97706",
    summary: "identity, strength, attractiveness, self-image, and control over how you present yourself",
    aliases: ["dream about hair", "hair in a dream", "hair dream meaning"],
    relatedSymbols: ["teeth", "blood", "mirror"],
    variations: [
      { slug: "hair-falling-out", name: "hair falling out", focus: "loss of confidence, health anxiety, aging, or fear of losing strength and attractiveness", aliases: ["dream dictionary hair falling out", "hair falling out dream meaning", "dreaming of hair falling out"] },
      { slug: "cutting-hair", name: "cutting hair", focus: "a deliberate change of identity, letting go of the past, or asserting control over self-image" },
      { slug: "long-hair", name: "long hair", focus: "freedom, strength, sensuality, patience, or an identity grown over a long time" },
      { slug: "white-or-gray-hair", name: "white or gray hair", focus: "aging, wisdom, anxiety about time passing, or respect earned through experience" },
      { slug: "someone-cutting-your-hair", name: "someone cutting your hair", focus: "another person influencing your identity, or control over your image taken by someone else" },
      { slug: "washing-hair", name: "washing hair", focus: "clearing your mind, renewal, or releasing old thoughts and worries" },
    ],
  },
  {
    slug: "ex",
    name: "your ex",
    category: "people",
    icon: "💔",
    accent: "#f43f5e",
    summary: "unresolved feelings, closure, nostalgia, repeated patterns, and lessons from a past relationship",
    aliases: [
      "ex boyfriend",
      "ex girlfriend",
      "ex partner",
      "dream about ex",
      "dreaming of your ex",
      "what does it mean when you dream of your ex",
      "what do dreams about my ex mean",
    ],
    relatedSymbols: ["cheating", "wedding", "kissing", "mother"],
    variations: [
      { slug: "ex-boyfriend", name: "an ex-boyfriend", focus: "unfinished emotion, a pattern from that relationship echoing in your current life" },
      { slug: "ex-girlfriend", name: "an ex-girlfriend", focus: "nostalgia, comparison with the present, or an unresolved question from a past bond" },
      { slug: "ex-coming-back", name: "an ex coming back", focus: "a wish for closure or reunion, or an old pattern trying to re-enter your life" },
      { slug: "arguing-with-ex", name: "arguing with an ex", focus: "unexpressed anger, unfinished business, or an internal debate that never got resolved" },
      { slug: "ex-apologizing", name: "an ex apologizing", focus: "a longing for acknowledgment, self-repair, or giving yourself the closure they never offered" },
      { slug: "ex-with-someone-else", name: "an ex with someone else", focus: "jealousy, comparison, acceptance of an ending, or anxiety about being replaced" },
      { slug: "ex-family", name: "an ex's family", focus: "lingering attachments to a shared world, or grief for connections lost alongside the relationship", aliases: ["ex and his family in dreams", "dreaming of ex and family", "what does it mean when you ex and his family are in your dreams", "ex's family in a dream"] },
    ],
  },
  {
    slug: "cheating",
    name: "cheating",
    category: "people",
    icon: "🥀",
    accent: "#be123c",
    summary: "trust, insecurity, guilt, betrayal, and fears about loyalty within a close relationship",
    aliases: [
      "infidelity",
      "being cheated on",
      "dream about cheating",
      "cheating in a dream",
      "cheating dream meaning",
      "meaning of dreams cheating",
    ],
    relatedSymbols: ["ex", "wedding", "kissing"],
    variations: [
      { slug: "partner-cheating", name: "your partner cheating", focus: "insecurity, fear of abandonment, or unmet needs in the relationship — not evidence of real betrayal" },
      { slug: "cheating-on-partner", name: "cheating on your partner", focus: "guilt, an unmet desire, a divided commitment, or attention pulled away from the relationship" },
      { slug: "being-caught-cheating", name: "being caught cheating", focus: "fear of exposure, shame about a hidden choice, or anxiety about disappointing someone you love" },
      { slug: "confronting-a-cheater", name: "confronting a cheater", focus: "asserting your worth, demanding honesty, or rehearsing a difficult confrontation" },
      { slug: "forgiving-cheating", name: "forgiving cheating", focus: "processing hurt, weighing trust against attachment, or exploring what repair would require" },
      { slug: "recurring-cheating-dreams", name: "recurring cheating dreams", focus: "a persistent insecurity or trust question that keeps demanding attention" },
    ],
  },
  {
    slug: "wedding",
    name: "wedding",
    category: "life-events",
    icon: "💍",
    accent: "#e879f9",
    summary: "commitment, union, transition, public promises, and the joining of different parts of life",
    aliases: [
      "marriage",
      "getting married",
      "dream about wedding",
      "wedding in a dream",
      "what does dreaming a wedding mean",
      "what does a dream of a wedding mean",
      "what does a wedding dream mean",
      "wedding dream meaning",
    ],
    relatedSymbols: ["ex", "cheating", "kissing", "baby", "church", "death", "mother", "pregnancy", "blood"],
    variations: [
      { slug: "your-own-wedding", name: "your own wedding", focus: "a major commitment approaching, readiness for union, or anxiety about a binding choice" },
      { slug: "someone-elses-wedding", name: "someone else's wedding", focus: "witnessing change in others, comparison, or your own questions about commitment" },
      { slug: "wedding-going-wrong", name: "a wedding going wrong", focus: "doubts about a commitment, fear of public failure, or pressure around a major decision" },
      { slug: "wedding-dress", name: "a wedding dress", focus: "identity within commitment, purity of intention, or how you present a major life choice" },
      { slug: "marrying-a-stranger", name: "marrying a stranger", focus: "commitment to something unknown: a new role, path, or part of yourself not yet understood" },
      { slug: "runaway-bride-or-groom", name: "a runaway bride or groom", focus: "cold feet, avoidance of commitment, or doubts that have not been voiced" },
    ],
  },
  {
    slug: "kissing",
    name: "kissing",
    category: "people",
    icon: "💋",
    accent: "#fb7185",
    summary: "affection, desire, connection, acceptance, and intimacy offered or received",
    aliases: [
      "a kiss",
      "kiss",
      "dream about kissing",
      "kissing in a dream",
      "kiss dream meaning",
      "biblical meaning of a kiss in a dream",
      "biblical meaning of kiss in a dream",
      "kiss in a dream meaning",
    ],
    relatedSymbols: ["ex", "cheating", "wedding"],
    variations: [
      { slug: "kissing-a-stranger", name: "kissing a stranger", focus: "attraction to something unfamiliar, a new possibility, or an unacknowledged desire" },
      { slug: "kissing-an-ex", name: "kissing an ex", focus: "nostalgia, unresolved attraction, or reconnecting with who you were in that relationship" },
      { slug: "kissing-a-friend", name: "kissing a friend", focus: "affection deepening, blurred boundaries, or curiosity about a relationship's potential" },
      { slug: "being-kissed-unexpectedly", name: "being kissed unexpectedly", focus: "surprise affection, crossed boundaries, or attention you had not anticipated" },
      { slug: "refusing-a-kiss", name: "refusing a kiss", focus: "boundaries, self-respect, or declining an intimacy that does not feel right" },
      { slug: "kissing-a-celebrity", name: "kissing a celebrity", focus: "aspiration, a desire for recognition, or attraction to qualities the person represents" },
    ],
  },
  {
    slug: "mother",
    name: "mother",
    category: "people",
    icon: "🤱",
    accent: "#f59e0b",
    summary: "nurture, origin, protection, family patterns, and the earliest template of love and care",
    aliases: ["mom", "dream about mother", "mother in a dream", "dreaming of your mom"],
    relatedSymbols: ["baby", "death", "house", "wedding", "ex", "father", "brother", "sister", "grandparents"],
    variations: [
      { slug: "mother-dying", name: "your mother dying", focus: "fear of losing support, a changing relationship with her, or a shift in your own nurturing role" },
      { slug: "deceased-mother", name: "a deceased mother", focus: "grief, comfort, continued bond, or guidance associated with her memory" },
      { slug: "arguing-with-mother", name: "arguing with your mother", focus: "conflict over autonomy, old family patterns, or an internal clash with inherited values" },
      { slug: "mother-hugging-you", name: "your mother hugging you", focus: "a need for comfort, reconciliation, or reassurance during a demanding season" },
      { slug: "becoming-a-mother", name: "becoming a mother", focus: "a new caretaking role, creative responsibility, or identification with the nurturing part of yourself" },
      { slug: "angry-mother", name: "an angry mother", focus: "guilt, fear of disapproval, or an internalized critical voice connected with early authority" },
    ],
  },
  {
    slug: "father",
    name: "father",
    category: "people",
    icon: "👨‍👧",
    accent: "#0284c7",
    summary: "authority, guidance, protection, expectation, and the earliest template of structure and approval",
    aliases: ["dad", "dream about father", "father in a dream", "dreaming of your dad"],
    relatedSymbols: ["mother", "brother", "sister", "death", "house", "work", "grandparents"],
    variations: [
      { slug: "father-dying", name: "your father dying", focus: "fear of losing guidance, a changing relationship with authority, or a shift in your own protective role" },
      { slug: "deceased-father", name: "a deceased father", focus: "grief, continued bond, unfinished conversations, or guidance associated with his memory" },
      { slug: "arguing-with-father", name: "arguing with your father", focus: "conflict with authority, a struggle for approval, or an internal clash with inherited expectations" },
      { slug: "father-hugging-you", name: "your father hugging you", focus: "a need for approval, reconciliation, or reassurance from a source of structure and protection" },
      { slug: "absent-father", name: "an absent father", focus: "missing guidance, unmet needs for support, or self-reliance built where protection was expected" },
      { slug: "angry-father", name: "an angry father", focus: "fear of judgment, internalized criticism, or pressure connected with early authority" },
    ],
  },
  {
    slug: "brother",
    name: "brother",
    category: "people",
    icon: "👬",
    accent: "#2563eb",
    summary: "loyalty, rivalry, shared history, protection, and a mirror of your own traits in familiar form",
    aliases: ["brothers", "dream about brother", "brother in a dream"],
    relatedSymbols: ["sister", "mother", "father", "twins"],
    variations: [
      { slug: "brother-dying", name: "your brother dying", focus: "fear of losing a lifelong bond, a changing relationship, or worry about his path" },
      { slug: "arguing-with-brother", name: "arguing with your brother", focus: "rivalry, old family friction, or an inner conflict projected onto a familiar opponent" },
      { slug: "brother-in-danger", name: "your brother in danger", focus: "protectiveness, guilt about distance, or anxiety about a situation you cannot control for him" },
      { slug: "older-brother", name: "an older brother", focus: "guidance, comparison, protection, or authority experienced from within your own generation" },
      { slug: "younger-brother", name: "a younger brother", focus: "responsibility, nostalgia, or a younger part of yourself asking for attention" },
      { slug: "estranged-brother", name: "an estranged brother", focus: "unresolved family history, a wish for repair, or grief over a bond that has cooled" },
    ],
  },
  {
    slug: "sister",
    name: "sister",
    category: "people",
    icon: "👭",
    accent: "#db2777",
    summary: "closeness, comparison, empathy, shared history, and a familiar reflection of your own inner life",
    aliases: ["sisters", "dream about sister", "sister in a dream", "sister dream meaning"],
    relatedSymbols: ["brother", "mother", "father", "twins"],
    variations: [
      { slug: "sister-dying", name: "your sister dying", focus: "fear of losing closeness, a changing bond, or worry about her wellbeing" },
      { slug: "arguing-with-sister", name: "arguing with your sister", focus: "competition, old grievances, or a disagreement with a part of yourself she represents" },
      { slug: "sister-crying", name: "your sister crying", focus: "empathy for her struggle, guilt, or sadness within the family asking to be acknowledged" },
      { slug: "older-sister", name: "an older sister", focus: "guidance, comparison, care received, or standards you measure yourself against" },
      { slug: "younger-sister", name: "a younger sister", focus: "protectiveness, responsibility, or a tender younger part of yourself" },
      { slug: "protecting-your-sister", name: "protecting your sister", focus: "loyalty under threat, family duty, or defending a vulnerable part of your own life" },
    ],
  },
  {
    slug: "god",
    name: "god",
    category: "spiritual",
    icon: "🙏",
    accent: "#eab308",
    summary: "meaning, conscience, surrender, accountability, and the longing for guidance larger than the self",
    aliases: ["dream about god", "god in a dream", "seeing god in a dream"],
    relatedSymbols: ["angel", "demon", "church", "ghost"],
    variations: [
      { slug: "talking-to-god", name: "talking to god", focus: "a search for direction, an inner dialogue with conscience, or a question too large to carry alone" },
      { slug: "seeing-god", name: "seeing god", focus: "awe, a need for reassurance, or contact with the deepest source of meaning in your life" },
      { slug: "praying-to-god", name: "praying to god", focus: "surrendering a burden, sincere reflection, or asking for help you have not voiced aloud" },
      { slug: "gods-voice", name: "hearing god's voice", focus: "an insight demanding attention, conscience speaking clearly, or guidance you already sense" },
      { slug: "being-judged-by-god", name: "being judged by god", focus: "guilt, moral self-examination, or fear of falling short of your own deepest standards" },
      { slug: "receiving-a-blessing", name: "receiving a blessing", focus: "reassurance, gratitude, permission to move forward, or hope during uncertainty" },
    ],
  },
  {
    slug: "illness",
    name: "illness",
    category: "body",
    icon: "🤒",
    accent: "#16a34a",
    summary: "vulnerability, neglected needs, anxiety about health, and a part of life asking for care and rest",
    aliases: ["being sick", "sickness", "disease", "dream about being sick", "illness in a dream"],
    relatedSymbols: ["hospital", "blood", "death"],
    variations: [
      { slug: "being-sick", name: "being sick", focus: "depleted energy, a neglected need, or anxiety about your body and capacity" },
      { slug: "terminal-illness", name: "a terminal illness", focus: "fear of an ending, urgency about time, or a dramatic image of something that feels unfixable" },
      { slug: "sick-family-member", name: "a sick family member", focus: "concern for a loved one, anticipatory grief, or worry about the family's stability" },
      { slug: "recovering-from-illness", name: "recovering from illness", focus: "healing, restored strength, or emergence from a draining period" },
      { slug: "undiagnosed-illness", name: "an undiagnosed illness", focus: "an unnamed worry, a problem sensed but not yet understood, or health anxiety seeking definition" },
      { slug: "vomiting-in-a-dream", name: "vomiting", focus: "rejecting something toxic, releasing what cannot be kept down, or urgent emotional purging" },
    ],
  },
  {
    slug: "ghost",
    name: "ghost",
    category: "spiritual",
    icon: "👻",
    accent: "#94a3b8",
    summary: "unresolved past, memory, guilt, presence of what has ended, and feelings that refuse to stay buried",
    aliases: ["spirit", "haunting", "dream about ghost", "ghost in a dream", "ghost in dream meaning", "ghost dream meaning"],
    relatedSymbols: ["demon", "angel", "death", "house", "cemetery", "god"],
    variations: [
      { slug: "ghost-of-a-loved-one", name: "the ghost of a loved one", focus: "continuing bonds, unfinished grief, or comfort and messages associated with someone who has died" },
      { slug: "haunted-by-a-ghost", name: "being haunted", focus: "a past event, mistake, or memory that keeps intruding on present life" },
      { slug: "friendly-ghost", name: "a friendly ghost", focus: "a benign memory, gentle nostalgia, or peace being made with the past" },
      { slug: "ghost-attacking-you", name: "a ghost attacking you", focus: "the past actively interfering with the present, or guilt that feels punishing" },
      { slug: "ghost-in-your-house", name: "a ghost in your house", focus: "unresolved family history, or an old influence still occupying your inner space" },
      { slug: "becoming-a-ghost", name: "becoming a ghost", focus: "feeling unseen, disconnected, or fading from a situation where you once belonged" },
    ],
  },
  {
    slug: "demon",
    name: "demon",
    category: "spiritual",
    icon: "😈",
    accent: "#7f1d1d",
    summary: "inner conflict, temptation, fear, shame, and destructive forces given a face by the dreaming mind",
    aliases: ["devil", "evil spirit", "dream about demons", "demon in a dream"],
    relatedSymbols: ["ghost", "angel", "fire", "being-chased", "god", "nightmare"],
    variations: [
      { slug: "being-attacked-by-demon", name: "being attacked by a demon", focus: "an inner battle with fear, addiction, anger, or shame that feels stronger than you" },
      { slug: "demon-possession", name: "demonic possession", focus: "feeling controlled by an emotion, habit, or influence that overrides your intentions" },
      { slug: "fighting-a-demon", name: "fighting a demon", focus: "active resistance against a destructive pattern, and the effort of reclaiming control" },
      { slug: "demon-in-your-house", name: "a demon in your house", focus: "a destructive influence inside your private life, family, or inner world" },
      { slug: "demon-watching-you", name: "a demon watching you", focus: "dread, guilt, or a threatening influence felt but not yet confronted" },
      { slug: "casting-out-a-demon", name: "casting out a demon", focus: "liberation, boundary-setting, or expelling a harmful influence from your life" },
    ],
  },
  {
    slug: "angel",
    name: "angel",
    category: "spiritual",
    icon: "😇",
    accent: "#fcd34d",
    summary: "protection, guidance, hope, conscience, and reassurance arriving in a difficult season",
    aliases: [
      "angels",
      "guardian angel",
      "dream about angel",
      "angel in a dream",
      "angel dream meaning",
      "angels dream meaning",
    ],
    relatedSymbols: ["ghost", "demon", "church", "death", "bird", "god"],
    variations: [
      { slug: "angel-visiting-you", name: "an angel visiting you", focus: "a need for reassurance, a sense of being guided, or hope during uncertainty" },
      { slug: "guardian-angel", name: "a guardian angel", focus: "protection, support you may be underestimating, or a wish for someone to watch over you" },
      { slug: "angel-delivering-message", name: "an angel delivering a message", focus: "an insight your deeper mind wants consciously acknowledged" },
      { slug: "angel-wings", name: "angel wings", focus: "aspiration, spiritual freedom, or the desire to rise above a heavy situation" },
      { slug: "crying-angel", name: "a crying angel", focus: "compassion, grief witnessed, or sorrow about a situation that conscience cannot ignore" },
      { slug: "angel-and-demon-together", name: "an angel and demon together", focus: "a moral conflict, a decision between constructive and destructive paths" },
    ],
  },
  {
    slug: "rat",
    name: "rat",
    category: "animals",
    icon: "🐀",
    accent: "#57534e",
    summary: "distrust, guilt, survival, hidden problems, and anxieties gnawing quietly in the background",
    aliases: ["rats", "mouse", "mice", "dream about rats", "rat in a dream"],
    relatedSymbols: ["cat", "snake", "spider", "house"],
    variations: [
      { slug: "rats-in-the-house", name: "rats in the house", focus: "a hidden problem eroding your private life, or unease inside a place meant to feel safe" },
      { slug: "rat-biting-you", name: "a rat biting you", focus: "a small betrayal, nagging guilt, or a minor issue that has begun to cause real harm" },
      { slug: "many-rats", name: "many rats", focus: "accumulating worries, a situation infested with small problems, or social distrust" },
      { slug: "white-rat", name: "a white rat", focus: "an unexpected ally, a warning in a gentler form, or distrust that may be misplaced" },
      { slug: "dead-rat", name: "a dead rat", focus: "the end of a gnawing worry, or a hidden problem finally exposed and finished" },
      { slug: "rat-running-away", name: "a rat running away", focus: "a problem avoiding detection, or someone withdrawing rather than facing a conflict" },
    ],
  },
  {
    slug: "alligator",
    name: "alligator",
    category: "animals",
    icon: "🐊",
    accent: "#3f6212",
    summary: "hidden danger, primal instinct, deception, and threats lurking beneath a calm surface",
    aliases: [
      "crocodile",
      "dream about alligator",
      "alligator in a dream",
      "crocodile in a dream",
      "what does dreaming about an alligator mean",
      "alligator dream meaning",
    ],
    relatedSymbols: ["snake", "water", "shark"],
    variations: [
      { slug: "alligator-attack", name: "an alligator attack", focus: "a hidden threat striking suddenly, or betrayal from something that seemed dormant" },
      { slug: "alligator-in-water", name: "an alligator in water", focus: "danger concealed within an emotional situation, or instinct warning you to stay alert" },
      { slug: "alligator-in-house", name: "an alligator in the house", focus: "a serious threat inside your personal life, or a dangerous dynamic close to home" },
      { slug: "running-from-alligator", name: "running from an alligator", focus: "avoiding a primal fear or a threat you sense is patient and persistent" },
      { slug: "baby-alligator", name: "a baby alligator", focus: "a small danger that will grow if ignored, or an early warning worth taking seriously" },
      { slug: "dead-alligator", name: "a dead alligator", focus: "a survived threat, ended deception, or a primal fear that has lost its power" },
    ],
  },
  {
    slug: "elephant",
    name: "elephant",
    category: "animals",
    icon: "🐘",
    accent: "#78716c",
    summary: "memory, patience, loyalty, great responsibility, and an issue too large to keep ignoring",
    aliases: ["elephants", "dream about elephant", "elephant in a dream"],
    relatedSymbols: ["lion", "horse", "bear"],
    variations: [
      { slug: "friendly-elephant", name: "a friendly elephant", focus: "steady support, patient strength, or a large responsibility carried with grace" },
      { slug: "elephant-chasing-you", name: "an elephant chasing you", focus: "a major issue you have been avoiding that now demands attention" },
      { slug: "baby-elephant", name: "a baby elephant", focus: "a new responsibility with long-term weight, or gentle potential that will grow large" },
      { slug: "white-elephant", name: "a white elephant", focus: "a rare blessing or a burden disguised as a gift — something valuable but costly to keep" },
      { slug: "elephant-in-water", name: "an elephant in water", focus: "deep memory and emotion handled with patience, or heavy matters moving through feeling" },
      { slug: "dead-elephant", name: "a dead elephant", focus: "the end of a long era, lost wisdom, or grief over something of great weight" },
    ],
  },
  {
    slug: "being-naked",
    name: "being naked in public",
    category: "fear-nightmares",
    icon: "🫣",
    accent: "#f472b6",
    summary: "exposure, vulnerability, shame, authenticity, and the fear of being seen without defenses",
    aliases: [
      "naked dream",
      "being naked",
      "dream about being naked",
      "naked in public dream",
      "dream naked in public",
      "dreams about being naked in public",
      "dream interpretation naked in public",
    ],
    relatedSymbols: ["school", "falling", "being-chased", "nightmare", "mirror", "trapped"],
    variations: [
      { slug: "naked-at-school", name: "being naked at school", focus: "performance anxiety, fear of judgment, or old social insecurities resurfacing" },
      { slug: "naked-at-work", name: "being naked at work", focus: "professional vulnerability, imposter feelings, or fear of being exposed as unprepared" },
      { slug: "nobody-noticing-you-naked", name: "nobody noticing you are naked", focus: "fears of exposure that are larger in your mind than in reality" },
      { slug: "trying-to-cover-up", name: "trying to cover yourself", focus: "damage control, hiding a perceived flaw, or protecting an image under pressure" },
      { slug: "partially-naked", name: "being partially naked", focus: "one specific area of vulnerability, or feeling unprepared in a single aspect of life" },
      { slug: "comfortable-being-naked", name: "feeling comfortable naked", focus: "self-acceptance, authenticity, and ease with being fully seen" },
    ],
  },
  {
    slug: "work",
    name: "work",
    category: "life-events",
    icon: "💼",
    accent: "#0d9488",
    summary: "duty, identity, performance, security, and the balance between effort and the rest of life",
    aliases: [
      "job",
      "workplace",
      "dream about work",
      "work in a dream",
      "spiritual meaning of dreaming about work",
      "dreaming about work meaning",
      "dream of working",
      "dreaming of working",
      "working dream meaning",
    ],
    relatedSymbols: ["money", "school", "father", "lottery", "debt"],
    variations: [
      { slug: "being-fired", name: "being fired", focus: "insecurity about your position, fear of rejection, or readiness to leave a role that no longer fits" },
      { slug: "being-late-for-work", name: "being late for work", focus: "fear of falling short, overload, or anxiety about meeting relentless expectations" },
      { slug: "old-job", name: "an old job", focus: "unfinished lessons from a past role, comparison with the present, or nostalgia for a former identity" },
      { slug: "angry-boss", name: "an angry boss", focus: "pressure from authority, self-criticism, or fear of evaluation and disapproval" },
      { slug: "new-job", name: "a new job", focus: "a new identity or responsibility, ambition, or uncertainty about an unfamiliar role" },
      { slug: "overwhelmed-at-work", name: "being overwhelmed at work", focus: "real workload stress surfacing in sleep, or duty crowding out other parts of life" },
    ],
  },
  {
    slug: "phone",
    name: "phone",
    category: "objects",
    icon: "📱",
    accent: "#6366f1",
    summary: "connection, communication, urgency, dependence, and the channels that link you to others",
    aliases: ["mobile phone", "cell phone", "dream about phone", "phone in a dream"],
    relatedSymbols: ["money", "car"],
    variations: [
      { slug: "losing-your-phone", name: "losing your phone", focus: "fear of disconnection, lost access to others, or dependence on constant contact" },
      { slug: "broken-phone", name: "a broken phone", focus: "failed communication, a relationship channel damaged, or messages not getting through" },
      { slug: "phone-not-working", name: "a phone that will not work", focus: "urgency without means, being unable to reach help or say what needs to be said" },
      { slug: "unknown-caller", name: "an unknown caller", focus: "an unrecognized part of yourself or an unexpected message trying to reach awareness" },
      { slug: "missed-calls", name: "missed calls", focus: "neglected relationships, overlooked signals, or guilt about unavailability" },
      { slug: "phone-ringing", name: "a phone ringing", focus: "something demanding your attention now, or an opportunity requiring a response" },
    ],
  },
  {
    slug: "crawling",
    name: "crawling",
    category: "movement",
    icon: "🦵",
    accent: "#a78bfa",
    summary: "slow progress, vulnerability, regression, humility, and moving forward when standing feels impossible",
    aliases: [
      "dreams about crawling",
      "dream about crawling",
      "crawling in a dream",
      "crawling dream meaning",
      "dreaming of crawling",
      "dream of crawling on hands and knees",
    ],
    relatedSymbols: ["being-chased", "falling", "spider", "baby", "tunnel", "trapped"],
    updatedAt: "2026-07-23",
    variations: [
      { slug: "crawling-on-the-floor", name: "crawling on the floor", focus: "humility, starting over, or progress that feels undignified but necessary" },
      {
        slug: "crawling-like-a-baby",
        name: "crawling like a baby",
        focus: "regression to an earlier stage, dependence, or returning to foundations before you can stand again",
        aliases: ["crawling on hands and knees", "dream of crawling on hands and knees"],
      },
      { slug: "crawling-through-a-tunnel", name: "crawling through a tunnel", focus: "a narrow passage through difficulty, or progress that requires getting low and patient" },
      {
        slug: "crawling-through-small-spaces",
        name: "crawling through small spaces",
        focus: "claustrophobic progress, squeezing through constraint, or advancing only by making yourself smaller",
        aliases: [
          "dream about crawling through small spaces",
          "crawling through tight spaces dream",
          "dream of crawling in a confined space",
          "crawling through a small space dream meaning",
          "dreaming of crawling through a narrow space",
        ],
      },
      { slug: "unable-to-stand-crawling", name: "unable to stand and crawling instead", focus: "depleted strength, lost status, or a season where the only available movement is slow and close to the ground" },
      { slug: "crawling-away-from-danger", name: "crawling away from danger", focus: "escaping under constraint, survival without full power, or getting clear of a threat with whatever strength remains" },
      { slug: "someone-crawling-toward-you", name: "someone crawling toward you", focus: "a need, fear, or person approaching from a vulnerable or unsettling place" },
    ],
  },
  {
    slug: "tunnel",
    name: "tunnel",
    category: "places",
    icon: "🕳️",
    accent: "#64748b",
    summary: "passage, transition, the unknown ahead, and moving through a narrow phase toward light or deeper dark",
    aliases: [
      "biblical meaning of dreaming of a tunnel",
      "dream about a tunnel",
      "tunnel dream meaning",
      "dreaming of a tunnel",
      "dream of a tunnel",
      "what does a tunnel mean in a dream",
    ],
    relatedSymbols: ["crawling", "falling", "being-chased", "death", "water", "heights", "train", "stairs", "trapped"],
    updatedAt: "2026-07-19",
    variations: [
      { slug: "light-at-end-of-tunnel", name: "light at the end of a tunnel", focus: "hope after hardship, a visible exit from a hard season, or faith that the passage ends in relief" },
      { slug: "dark-tunnel", name: "a dark tunnel", focus: "uncertainty, fear of the next phase, or moving forward without a clear view of the outcome" },
      { slug: "endless-tunnel", name: "an endless tunnel", focus: "fatigue with a transition that feels without end, or waiting for relief that keeps receding" },
      { slug: "blocked-tunnel", name: "a blocked tunnel", focus: "a path forward that feels sealed, stalled progress, or resistance to entering the next chapter" },
      { slug: "train-in-a-tunnel", name: "a train in a tunnel", focus: "being carried through change without full control, or collective momentum through a dark stretch" },
      { slug: "exiting-a-tunnel", name: "exiting a tunnel", focus: "emergence, clarity after confinement, or the first breath of a new phase" },
    ],
  },
  {
    slug: "heights",
    name: "heights",
    category: "fear-nightmares",
    icon: "🏔️",
    accent: "#7c3aed",
    summary: "exposure, ambition, vertigo at a life edge, and the fear or thrill of standing above familiar ground",
    aliases: [
      "dreams about heights",
      "dream about heights",
      "heights dream meaning",
      "dreaming about heights",
      "dreaming about heights and being scared",
      "high places dream meaning",
    ],
    relatedSymbols: ["falling", "flying", "being-chased", "tunnel", "stairs"],
    updatedAt: "2026-07-21",
    variations: [
      { slug: "standing-at-great-height", name: "standing at a great height", focus: "a vantage point after progress, or exposure that comes with a new role or risk" },
      { slug: "looking-down-from-heights", name: "looking down from a height", focus: "assessing how far you could fall, comparison with others, or vertigo about a choice" },
      { slug: "climbing-to-heights", name: "climbing to a height", focus: "ambition, effort toward status, or the strain of rising without solid footing" },
      { slug: "high-ledge-no-railing", name: "a high ledge without a railing", focus: "precarious success, missing support, or a situation that feels exposed and unsafe" },
      { slug: "afraid-on-a-bridge", name: "afraid on a high bridge", focus: "transition anxiety, crossing between chapters, or fear of mid-passage failure" },
      { slug: "heights-without-falling", name: "heights without falling", focus: "the brink itself as the message — dread of exposure rather than the drop" },
    ],
  },
  {
    slug: "nightmare",
    name: "nightmare",
    category: "fear-nightmares",
    icon: "😱",
    accent: "#991b1b",
    summary: "distressing dreams, unresolved fear, overnight stress release, and images the mind uses to process threat",
    aliases: [
      "nightmares",
      "nightmare meaning",
      "nightmare meanings",
      "nightmare interpretation",
      "bad dream interpretation",
      "horrible dreams meaning",
      "meaning of your dreams and nightmares",
      "nightmares meanings",
    ],
    relatedSymbols: ["being-chased", "falling", "being-naked", "demon", "death"],
    updatedAt: "2026-07-21",
    variations: [
      { slug: "recurring-nightmare", name: "a recurring nightmare", focus: "an unresolved stressor or fear that keeps demanding attention until it is faced awake" },
      { slug: "horrible-dream", name: "a horrible dream", focus: "intense emotional residue from the day, or a threat simulation that felt too real on waking" },
      { slug: "waking-from-nightmare", name: "waking from a nightmare", focus: "the body interrupting overload, or relief after the mind finished a stressful rehearsal" },
      { slug: "childhood-nightmare", name: "a childhood nightmare", focus: "old fears resurfacing, developmental anxiety, or unfinished business from an earlier stage of life" },
      { slug: "nightmare-about-death", name: "a nightmare about death", focus: "fear of endings, change, or loss — usually symbolic rather than prophetic" },
      { slug: "sharing-a-nightmare", name: "telling someone about a nightmare", focus: "seeking comfort, reducing the dream's power, or needing the fear witnessed" },
    ],
  },
  {
    slug: "tsunami",
    name: "tsunami",
    category: "water",
    icon: "🌊",
    accent: "#0369a1",
    summary: "overwhelming emotion, anticipatory dread, and a force of feeling too large to stop or negotiate with",
    aliases: [
      "tidal wave",
      "dream about tsunami",
      "tsunami dream meaning",
      "tidal wave dream meaning",
      "dreaming of a tsunami",
    ],
    relatedSymbols: ["water", "storm", "beach", "fire", "tornado"],
    updatedAt: "2026-07-21",
    variations: [
      { slug: "tsunami-coming", name: "a tsunami coming toward you", focus: "a crisis you can see approaching but feel powerless to stop" },
      { slug: "running-from-tsunami", name: "running from a tsunami", focus: "escape from emotional overwhelm, or urgency to get clear of a rising demand" },
      { slug: "surviving-a-tsunami", name: "surviving a tsunami", focus: "endurance after emotional flood, and the rebuilding that follows shock" },
      { slug: "tsunami-and-family", name: "a tsunami with family nearby", focus: "protectiveness under overwhelm, or shared crisis within close relationships" },
      { slug: "watching-tsunami-from-afar", name: "watching a tsunami from afar", focus: "witnessing upheaval at a distance, or dread that has not yet become personal" },
      { slug: "underwater-after-tsunami", name: "being underwater after a tsunami", focus: "immersion in aftermath emotion, or stillness after the wave has passed" },
    ],
  },
  {
    slug: "swimming",
    name: "swimming",
    category: "water",
    icon: "🏊",
    accent: "#0891b2",
    summary: "moving through emotion with skill or struggle, confidence in feeling, and how you navigate depth",
    aliases: [
      "dream about swimming",
      "swimming dream meaning",
      "dreaming of swimming",
      "swimming in a dream",
    ],
    relatedSymbols: ["water", "beach", "shark", "fish", "boat"],
    updatedAt: "2026-07-21",
    variations: [
      { slug: "swimming-easily", name: "swimming easily", focus: "emotional fluency, confidence in a feeling-heavy situation, or flow through a difficult season" },
      { slug: "struggling-to-swim", name: "struggling to swim", focus: "effort without progress in an emotional situation, or fatigue from staying afloat" },
      { slug: "swimming-underwater", name: "swimming underwater", focus: "deep exploration of feeling, immersion in the unconscious, or holding your breath through intensity" },
      { slug: "swimming-in-dirty-water", name: "swimming in dirty water", focus: "navigating a murky emotional situation, mixed motives, or unclear boundaries" },
      { slug: "swimming-to-shore", name: "swimming to shore", focus: "seeking safety, grounding after depth, or effort toward emotional dry land" },
      { slug: "unable-to-swim", name: "unable to swim", focus: "feeling unprepared for emotional depth, or fear of a situation that requires feeling literacy" },
    ],
  },
  {
    slug: "mirror",
    name: "mirror",
    category: "objects",
    icon: "🪞",
    accent: "#a855f7",
    summary: "self-image, truth, confrontation with identity, and how you see — or refuse to see — yourself",
    aliases: [
      "dream about mirror",
      "mirror dream meaning",
      "looking in a mirror dream",
      "dreaming of a mirror",
    ],
    relatedSymbols: ["house", "hair", "being-naked", "teeth", "money"],
    updatedAt: "2026-07-21",
    variations: [
      { slug: "broken-mirror", name: "a broken mirror", focus: "shattered self-image, a painful truth, or identity that feels fragmented" },
      { slug: "not-recognizing-yourself", name: "not recognizing yourself in a mirror", focus: "identity shift, dissociation from who you have become, or a role that no longer fits" },
      { slug: "someone-else-in-mirror", name: "someone else in the mirror", focus: "qualities you project onto others, or a part of yourself you have not claimed" },
      { slug: "cracked-mirror", name: "a cracked mirror", focus: "distorted self-view, damaged confidence, or a truth seen only in pieces" },
      { slug: "mirror-in-dark-room", name: "a mirror in a dark room", focus: "self-reflection under uncertainty, or confronting identity without clear light" },
      { slug: "smashing-a-mirror", name: "smashing a mirror", focus: "rejecting a self-image, rage at how you are seen, or refusing a painful reflection" },
    ],
  },
  {
    slug: "train",
    name: "train",
    category: "movement",
    icon: "🚆",
    accent: "#334155",
    summary: "life direction on a fixed track, collective momentum, timing, and whether you chose the destination",
    aliases: [
      "dream about train",
      "train dream meaning",
      "dreaming of a train",
      "train in a dream",
    ],
    relatedSymbols: ["car", "tunnel", "airport", "plane", "being-lost"],
    updatedAt: "2026-07-21",
    variations: [
      { slug: "missing-a-train", name: "missing a train", focus: "fear of lost timing, a chance that left without you, or regret about hesitation" },
      { slug: "train-crash", name: "a train crash", focus: "a collective plan colliding with reality, or fear that a committed path ends badly" },
      { slug: "wrong-train", name: "being on the wrong train", focus: "a life path that no longer fits, or realizing you followed momentum instead of intention" },
      { slug: "empty-train", name: "an empty train", focus: "solitary progress, isolation on a journey, or a path others have abandoned" },
      { slug: "train-station", name: "a train station", focus: "waiting for the next chapter, transitions, or choosing among available directions" },
      { slug: "stopping-a-train", name: "stopping a train", focus: "forcing a halt to automatic momentum, or reclaiming agency from a fixed course" },
    ],
  },
  {
    slug: "plane",
    name: "plane",
    category: "movement",
    icon: "✈️",
    accent: "#1d4ed8",
    summary: "ambition, long-distance transition, trust in systems beyond your control, and elevated perspective",
    aliases: [
      "airplane",
      "dream about plane",
      "plane dream meaning",
      "airplane dream meaning",
      "dreaming of a plane",
    ],
    relatedSymbols: ["airport", "flying", "falling", "car", "train"],
    updatedAt: "2026-07-21",
    variations: [
      {
        slug: "plane-crash",
        name: "a plane crash",
        focus: "fear that a high-ambition plan fails catastrophically, or loss of trust in a path you cannot pilot alone",
        aliases: ["plane crash dream meaning", "airplane crash dream", "dreaming of a plane crash"],
      },
      { slug: "flying-in-a-plane", name: "flying in a plane", focus: "progress toward a distant goal, transition, or surrendering control to a larger process" },
      { slug: "turbulence-on-plane", name: "turbulence on a plane", focus: "instability mid-journey, anxiety during a transition you cannot exit early" },
      { slug: "missing-a-plane", name: "missing a plane", focus: "a major opportunity lost to timing, preparation, or hesitation" },
      { slug: "piloting-a-plane", name: "piloting a plane", focus: "unusual responsibility, high-stakes agency, or being asked to steer something larger than yourself" },
      { slug: "plane-landing", name: "a plane landing", focus: "arrival after ambition, grounding after elevation, or the end of a long transition" },
    ],
  },
  {
    slug: "grandparents",
    name: "grandparents",
    category: "people",
    icon: "👵",
    accent: "#b45309",
    summary: "ancestry, wisdom, inheritance, family memory, and the longer story your life sits inside",
    aliases: [
      "grandmother",
      "grandfather",
      "grandma",
      "grandpa",
      "dream about grandparents",
      "grandparents dream meaning",
      "dreaming of grandmother",
      "dreaming of grandfather",
    ],
    relatedSymbols: ["mother", "father", "death", "house"],
    updatedAt: "2026-07-21",
    variations: [
      { slug: "deceased-grandparent", name: "a deceased grandparent", focus: "comfort, unfinished words, inherited values, or grief finding a familiar face" },
      { slug: "grandmother-in-dream", name: "your grandmother", focus: "nurture across generations, family lore, or a softer form of maternal care" },
      { slug: "grandfather-in-dream", name: "your grandfather", focus: "guidance, legacy, standards, or masculine care across a longer timeline" },
      { slug: "visiting-grandparents", name: "visiting grandparents", focus: "returning to roots, seeking wisdom, or needing the safety of an earlier household" },
      { slug: "grandparents-house", name: "grandparents' house", focus: "ancestral foundation, childhood memory, or identity rooted in family history" },
      { slug: "arguing-with-grandparent", name: "arguing with a grandparent", focus: "clash with inherited values, or renegotiating loyalty to family tradition" },
    ],
  },
  {
    slug: "stairs",
    name: "stairs",
    category: "places",
    icon: "🪜",
    accent: "#78716c",
    summary: "ascent and descent, effort between levels of life, and the steps required to change status or perspective",
    aliases: [
      "staircase",
      "dream about stairs",
      "stairs dream meaning",
      "climbing stairs dream",
      "dreaming of stairs",
    ],
    relatedSymbols: ["house", "falling", "heights", "tunnel"],
    updatedAt: "2026-07-21",
    variations: [
      { slug: "climbing-stairs", name: "climbing stairs", focus: "effort toward a higher position, ambition, or progress that requires one step at a time" },
      { slug: "falling-down-stairs", name: "falling down stairs", focus: "a sudden setback after progress, lost footing in status, or fear of public failure mid-ascent" },
      { slug: "endless-stairs", name: "endless stairs", focus: "effort without arrival, burnout from climbing, or a goal that keeps moving upward" },
      { slug: "broken-stairs", name: "broken stairs", focus: "an unreliable path to the next level, missing support, or a plan that cannot hold your weight" },
      { slug: "descending-stairs", name: "going down stairs", focus: "returning to foundations, humility, or voluntary retreat from a high place" },
      { slug: "spiral-staircase", name: "a spiral staircase", focus: "progress that circles familiar themes, or rising while revisiting the same emotional ground" },
    ],
  },
  {
    slug: "trapped",
    name: "being trapped",
    category: "fear-nightmares",
    icon: "🪤",
    accent: "#b91c1c",
    summary: "no exit, stuck agency, pressure without escape, and a situation that feels sealed from every side",
    aliases: [
      "trapped dream",
      "dream about being trapped",
      "being trapped dream meaning",
      "stuck in a dream",
      "dreaming of being trapped",
    ],
    relatedSymbols: ["being-chased", "prison", "falling", "being-naked", "tunnel", "crawling"],
    updatedAt: "2026-07-21",
    variations: [
      { slug: "trapped-in-a-room", name: "trapped in a room", focus: "a closed chapter of life, private confinement, or options that have narrowed to four walls" },
      { slug: "trapped-underwater", name: "trapped underwater", focus: "emotional overwhelm with no surface in sight, or feeling sealed inside a feeling you cannot name" },
      { slug: "trapped-in-a-crowd", name: "trapped in a crowd", focus: "social pressure, lost individuality, or being carried by others' expectations" },
      { slug: "cant-open-door", name: "unable to open a door", focus: "a blocked exit, a choice that will not yield, or help that remains just out of reach" },
      { slug: "trapped-in-elevator", name: "trapped in an elevator", focus: "suspended between levels of life, stalled progress, or public helplessness" },
      { slug: "escaping-being-trapped", name: "escaping after being trapped", focus: "relief after constraint, reclaiming agency, or the first breath after a sealed season" },
    ],
  },
  {
    slug: "being-lost",
    name: "being lost",
    category: "fear-nightmares",
    icon: "🧭",
    accent: "#0f766e",
    summary: "disorientation, missing direction, searching without a map, and the anxiety of not knowing the next turn",
    aliases: [
      "lost dream",
      "dream about being lost",
      "being lost dream meaning",
      "getting lost in a dream",
      "dreaming of being lost",
    ],
    relatedSymbols: ["forest", "airport", "being-chased", "house", "train"],
    updatedAt: "2026-07-21",
    variations: [
      { slug: "lost-in-a-city", name: "lost in a city", focus: "overwhelm in complex systems, unfamiliar rules, or ambition without a clear route" },
      { slug: "lost-and-cant-find-home", name: "lost and unable to find home", focus: "identity drift, missing belonging, or fear that your private life no longer orients you" },
      { slug: "lost-with-no-phone", name: "lost without a phone", focus: "disconnection from help, dependence on tools, or solitude when guidance is needed" },
      { slug: "asking-directions-dream", name: "asking for directions", focus: "humility, seeking counsel, or admitting you cannot navigate alone" },
      { slug: "lost-child-in-dream", name: "a lost child", focus: "a vulnerable part of yourself missing care, or worry about someone dependent on you" },
      { slug: "finding-your-way", name: "finding your way after being lost", focus: "orientation returning, a landmark of meaning, or relief when purpose clarifies" },
    ],
  },
  {
    slug: "twins",
    name: "twins",
    category: "life-events",
    icon: "👯",
    accent: "#db2777",
    summary: "doubling, mirroring, divided attention, and two developments growing side by side",
    aliases: [
      "twin dream",
      "dream about twins",
      "twins dream meaning",
      "dreaming of twins",
      "seeing twins in a dream",
    ],
    relatedSymbols: ["baby", "pregnancy", "sister", "brother"],
    updatedAt: "2026-07-21",
    variations: [
      { slug: "having-twins", name: "having twins", focus: "double responsibility, two projects at once, or abundance that also divides your energy" },
      { slug: "identical-twins", name: "identical twins", focus: "mirroring, confusion of identity, or two paths that look the same but are not" },
      { slug: "twin-babies", name: "twin babies", focus: "fragile double beginnings, or care split between two needy developments" },
      { slug: "meeting-your-twin", name: "meeting your twin", focus: "encountering a neglected side of yourself, or a relationship that reflects you too closely" },
      { slug: "twins-fighting", name: "twins fighting", focus: "inner conflict between equal claims, rival priorities, or split loyalties" },
      { slug: "losing-one-twin", name: "losing one twin", focus: "grief for half of a doubled hope, or fear that one path will cost the other" },
    ],
  },
  {
    slug: "lottery",
    name: "lottery",
    category: "objects",
    icon: "🎟️",
    accent: "#ca8a04",
    summary: "sudden fortune, wishful thinking, chance, and the fantasy of a life changed without ordinary effort",
    aliases: [
      "winning the lottery",
      "lottery dream meaning",
      "dream about lottery",
      "dreaming of winning lottery",
      "lotto dream meaning",
    ],
    relatedSymbols: ["money", "debt", "work", "house"],
    updatedAt: "2026-07-21",
    variations: [
      { slug: "winning-the-lottery", name: "winning the lottery", focus: "hope for sudden relief, a wish to skip the hard middle, or belief that luck could rewrite your story" },
      { slug: "losing-lottery-ticket", name: "losing a lottery ticket", focus: "a missed chance, self-sabotage of opportunity, or fear that fortune slipped through your hands" },
      { slug: "sharing-lottery-win", name: "sharing a lottery win", focus: "questions of fairness, generosity under abundance, or who you imagine beside sudden wealth" },
      { slug: "fake-lottery-win", name: "a fake lottery win", focus: "disappointment after raised hopes, or suspicion that an easy solution is not real" },
      { slug: "buying-lottery-ticket", name: "buying a lottery ticket", focus: "investing hope in chance, small ritual of possibility, or outsourcing change to luck" },
      { slug: "lottery-numbers", name: "lottery numbers", focus: "searching for a code to change fate, or the mind's attempt to order randomness" },
    ],
  },
  {
    slug: "debt",
    name: "debt",
    category: "objects",
    icon: "📉",
    accent: "#dc2626",
    summary: "obligation, weight of what is owed, anxiety about repayment, and exchanges that have fallen out of balance",
    aliases: [
      "owing money",
      "debt dream meaning",
      "dream about debt",
      "dreaming of debt",
      "owing money in a dream",
    ],
    relatedSymbols: ["money", "lottery", "work", "house"],
    updatedAt: "2026-07-21",
    variations: [
      { slug: "unable-to-pay-debt", name: "unable to pay a debt", focus: "overwhelm about obligation, shame, or a bill — literal or emotional — that exceeds capacity" },
      { slug: "someone-owes-you", name: "someone owing you", focus: "unpaid recognition, unfinished reciprocity, or waiting for another person to make things even" },
      { slug: "debt-collectors", name: "debt collectors", focus: "pressure arriving from outside, accountability you cannot postpone, or fear of exposure around money" },
      { slug: "paying-off-debt", name: "paying off debt", focus: "relief, restored balance, or the hard work of settling what was owed" },
      { slug: "hidden-debt", name: "a hidden debt", focus: "a secret obligation, guilt kept private, or a cost you have not yet admitted" },
      { slug: "inheriting-debt", name: "inheriting debt", focus: "family burdens passed down, obligations you did not choose, or legacy costs" },
    ],
  },
  {
    slug: "rabbit",
    name: "rabbit",
    category: "animals",
    icon: "🐇",
    accent: "#a78bfa",
    summary: "fertility, timidity, quick instinct, abundance, and vulnerability that freezes or flees",
    aliases: [
      "bunny",
      "hare",
      "dream about rabbit",
      "rabbit dream meaning",
      "dreaming of a rabbit",
    ],
    relatedSymbols: ["dog", "forest", "cat", "baby"],
    updatedAt: "2026-07-21",
    variations: [
      { slug: "white-rabbit", name: "a white rabbit", focus: "innocence, a guide into the unexpected, or a gentle invitation to follow curiosity" },
      { slug: "rabbit-running-away", name: "a rabbit running away", focus: "avoidance, missed opportunity, or a timid part of you fleeing confrontation" },
      { slug: "many-rabbits", name: "many rabbits", focus: "abundance, fertility themes, or small worries multiplying faster than you can manage" },
      { slug: "dead-rabbit", name: "a dead rabbit", focus: "lost innocence, ended vulnerability, or grief for something gentle that could not survive" },
      { slug: "holding-a-rabbit", name: "holding a rabbit", focus: "care for a fragile instinct, tenderness, or responsibility for something easily startled" },
      { slug: "rabbit-in-house", name: "a rabbit in the house", focus: "timidity entering private life, or a soft need asking for safety at home" },
    ],
  },
  {
    slug: "boat",
    name: "boat",
    category: "water",
    icon: "⛵",
    accent: "#0284c7",
    summary: "navigating emotion with a vessel, crossing uncertain water, and how seaworthy your current life craft feels",
    aliases: [
      "ship",
      "dream about boat",
      "boat dream meaning",
      "dreaming of a boat",
      "ship dream meaning",
    ],
    relatedSymbols: ["water", "beach", "swimming", "storm"],
    updatedAt: "2026-07-21",
    variations: [
      { slug: "sinking-boat", name: "a sinking boat", focus: "a plan or relationship taking on water, or fear that your craft cannot hold the emotional load" },
      { slug: "rowing-a-boat", name: "rowing a boat", focus: "personal effort across emotion, slow progress by your own strength" },
      { slug: "boat-in-storm", name: "a boat in a storm", focus: "navigating turmoil, holding course under pressure, or leadership when waters turn hostile" },
      { slug: "empty-boat", name: "an empty boat", focus: "a vessel without purpose, abandoned plans, or solitude on the water" },
      { slug: "luxury-yacht", name: "a luxury boat or yacht", focus: "status on emotional seas, comfort insulating you from depth, or aspiration dressed as travel" },
      { slug: "docking-a-boat", name: "docking a boat", focus: "arrival after crossing, securing what you carried, or ending a journey across feeling" },
    ],
  },
];

const CATEGORY_LENSES: Record<DreamCategory, { psychological: string; spiritual: string; biblical: string }> = {
  animals: {
    psychological: "instinct, attachment, trust, threat detection, and reactions that happen before conscious reasoning",
    spiritual: "discernment, natural wisdom, protection, and respectful contact with the untamed parts of life",
    biblical: "wisdom, stewardship, appetite, protection, and the moral meaning created by an animal’s behavior",
  },
  body: {
    psychological: "self-image, communication, health awareness, vulnerability, and the wish to remain capable and in control",
    spiritual: "embodiment, integrity, humility, and care for the physical life through which meaning is expressed",
    biblical: "the body as lived responsibility, the power of speech, human frailty, and strength used with wisdom",
  },
  water: {
    psychological: "emotion, memory, regulation, uncertainty, and feelings that are easier to picture than to explain",
    spiritual: "cleansing, renewal, surrender, depth, and movement through a changing season",
    biblical: "creation, cleansing, living water, chaos, testing, refuge, and renewed life",
  },
  "life-events": {
    psychological: "identity development, attachment, responsibility, grief, hope, and the tension between an ending and a beginning",
    spiritual: "transition, surrender, renewal, purpose, and patient care for what is emerging or passing away",
    biblical: "promise, mortality, faithful responsibility, new life, grief, and hope shaped by discernment",
  },
  "fear-nightmares": {
    psychological: "stress, avoidance, loss of control, nervous-system arousal, and problems that feel larger when they remain unaddressed",
    spiritual: "courage, refuge, boundaries, honesty, and the difference between wise caution and fear-led action",
    biblical: "fear, refuge, courage, testing, perseverance, and trust that remains connected to practical wisdom",
  },
  places: {
    psychological: "memory, belonging, privacy, family patterns, identity, and the internal structures that create safety",
    spiritual: "foundation, hospitality, sanctuary, inherited patterns, and the inner space being prepared for growth",
    biblical: "household, foundation, refuge, stewardship, inheritance, and the quality of what a life is built upon",
  },
  movement: {
    psychological: "agency, ambition, direction, escape, competence, and confidence in navigating change",
    spiritual: "calling, perspective, freedom, grounded progress, and alignment between inspiration and action",
    biblical: "journey, guidance, renewed strength, humility, and the wisdom to choose a sound path",
  },
  objects: {
    psychological: "value, security, opportunity, self-worth, scarcity, and the meaning assigned to practical resources",
    spiritual: "stewardship, gratitude, attachment, generosity, and discernment about what is truly valuable",
    biblical: "stewardship, provision, treasure, justice, contentment, and the relationship between resources and character",
  },
  people: {
    psychological: "attachment, longing, unresolved history, projection, and the way relationships shape self-image",
    spiritual: "love, forgiveness, loyalty, release of old bonds, and honest attention to how connection is practiced",
    biblical: "covenant, faithfulness, honoring family, reconciliation, and love expressed through committed action",
  },
  nature: {
    psychological: "overwhelm, sudden change, forces beyond personal control, and the emotional weather of a life season",
    spiritual: "awe, surrender, purification, renewal after upheaval, and respect for what cannot be commanded",
    biblical: "creation, judgment and mercy, testing, shelter, and trust maintained through storms and upheaval",
  },
  spiritual: {
    psychological: "unprocessed memory, fear of the unknown, conscience, longing for protection, and inner conflict given a visible form",
    spiritual: "discernment between fear and guidance, protection, spiritual attention, and the search for meaning beyond the material",
    biblical: "spiritual discernment, protection, messengers, temptation, and testing every impression against wisdom and scripture",
  },
};

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function makeTitle(name: string) {
  return `${titleCase(name)} Dream Meaning`;
}

function makeAliases(name: string, aliases: string[] = []) {
  return Array.from(new Set([name, `dream about ${name}`, `${name} in a dream`, `${name} dream meaning`, ...aliases]));
}

function makeSections({
  title,
  name,
  category,
  summary,
  focus,
  parentName,
  variationSeeds,
}: {
  title: string;
  name: string;
  category: DreamCategory;
  summary: string;
  focus?: string;
  parentName?: string;
  variationSeeds?: VariationSeed[];
}): DreamSections {
  const lens = CATEGORY_LENSES[category];
  const subject = name.toLowerCase();
  const parentContext = parentName
    ? `It narrows the broader ${parentName} symbol to one particular image: ${focus}.`
    : `Its core themes include ${summary}.`;

  const introduction = [
    `${title} can be understood by starting with the scene, the emotion it created, and what was changing around it. ${parentContext} The most useful interpretation connects those details with your current life rather than treating the dream as a fixed prediction.`,
    `A dream about ${subject} may feel positive, frightening, or strangely neutral. That emotional tone changes the reading: curiosity can suggest readiness to understand the symbol, while panic can reveal pressure, avoidance, or a need for safety. Personal history and cultural or religious beliefs remain essential context for ${title}.`,
  ];

  const general = [
    `In general, ${title} points toward ${focus ?? summary}. The dream may be drawing attention to something already developing in waking life, especially where the same feeling of uncertainty, attraction, responsibility, or urgency appears.`,
    `Details refine the general meaning of ${title}. Notice where the ${subject} appeared, who else was present, what changed, and whether you acted or only watched. A calm ending often suggests integration; an unresolved ending may show that the underlying question still needs attention.`,
  ];

  const psychological = [
    `Psychologically, ${title} can give visible form to ${lens.psychological}. Dreams often turn a complex inner state into one memorable scene, allowing the mind to rehearse a response without claiming that the scene will literally happen.`,
    `For a personal psychological reading of ${title}, compare the strongest dream emotion with recent experiences. If the ${subject} was recurring, the repetition may reflect an unresolved decision, relationship pattern, stressor, or need that has not yet found a direct expression.`,
  ];

  const spiritual = [
    `Spiritually, ${title} may invite reflection on ${lens.spiritual}. The image can mark a season of attention or transition, but its value lies in the honesty and awareness it encourages rather than in certainty about future events.`,
    `A grounded spiritual response to ${title} is to ask what quality needs to be practiced now—patience, courage, release, protection, gratitude, or discernment. Useful interpretation should deepen responsibility and presence, not create fear or replace practical judgment.`,
  ];

  const islamic = [
    `In an Islamic context, ${title} should be approached with humility. Dream traditions distinguish comforting or meaningful dreams from ordinary mental activity and distressing dreams, so the image may be considered in relation to ${focus ?? summary} without being treated as certain knowledge of the unseen.`,
    `A disturbing ${title} is not evidence against another person and should not be used to predict harm. Seek refuge in Allah, make du’a, and share the dream only with someone trustworthy if guidance is needed. A reassuring dream can be received with gratitude while decisions remain grounded in faith, character, and real circumstances.`,
  ];

  const biblical = [
    `A biblical reflection on ${title} can begin with themes of ${lens.biblical}. Scripture does not provide a fixed code for every modern dream image, so the symbol is best weighed alongside its behavior in the dream, the dreamer’s circumstances, prayer, and the wider counsel of scripture.`,
    `Consider whether ${title} highlights wisdom, temptation, stewardship, fear, hope, or a needed change in conduct. A vivid dream may prompt sincere reflection, but it should not automatically be labeled a divine message or used to make a serious decision without discernment.`,
  ];

  const commonScenarios: DreamScenario[] = variationSeeds?.length
    ? variationSeeds.slice(0, 6).map((variation) => ({
        title: titleCase(variation.name),
        meaning: `Within ${title}, this variation emphasizes ${variation.focus}.`,
      }))
    : [
        { title: `Feeling calm around ${subject}`, meaning: `Calmness in ${title} may show growing acceptance, perspective, or confidence with the underlying theme.` },
        { title: `Feeling afraid of ${subject}`, meaning: `Fear in ${title} can intensify concerns about danger, change, judgment, vulnerability, or lost control.` },
        { title: `A recurring ${subject} dream`, meaning: `Repetition suggests that the question represented by ${title} remains active or emotionally unfinished.` },
        { title: `${titleCase(subject)} after a major change`, meaning: `When ${title} follows a transition, it may help the mind organize unfamiliar emotions and responsibilities.` },
        { title: `Watching ${subject} from a distance`, meaning: `Distance in ${title} can suggest observation, emotional caution, or a problem not yet approached directly.` },
      ];

  const faq: DreamFaq[] = [
    {
      question: `What does ${subject} mean in a dream?`,
      answer: `${title} commonly relates to ${focus ?? summary}. Your emotion, the setting, and what happened immediately before and after the symbol provide the most personal clues.`,
    },
    {
      question: `Is dreaming about ${subject} a bad sign?`,
      answer: `No. ${title} is not automatically positive or negative and does not reliably predict an event. A frightening version may reflect stress, while a calm version may suggest understanding, readiness, or growth.`,
    },
    {
      question: `What is the psychological meaning of ${subject}?`,
      answer: `The psychological meaning of ${title} often concerns ${lens.psychological}. Compare that theme with current relationships, decisions, pressures, and bodily feelings.`,
    },
    {
      question: `What is the spiritual meaning of ${subject}?`,
      answer: `The spiritual meaning of ${title} may involve ${lens.spiritual}. Treat that as an invitation to reflect and act wisely, not as proof of a supernatural prediction.`,
    },
    {
      question: `Why do I keep dreaming about ${subject}?`,
      answer: `A recurring ${title} may track an unresolved feeling, repeated stressor, changing identity, or important need. Record each version and look for repeated emotions, people, places, and outcomes.`,
    },
  ];

  return { introduction, general, psychological, spiritual, islamic, biblical, commonScenarios, faq };
}

/**
 * Hand-written content for the highest-traffic pages. Anything set here replaces
 * the corresponding template section from makeSections, so these pages stop
 * sharing boilerplate phrasing with the other generated entries.
 * Add a slug key + the sections you want to replace; leave the rest to the template.
 */
const SECTION_OVERRIDES: Record<string, Partial<DreamSections>> = {
  snake: {
    introduction: [
      "Few dream images divide people as sharply as the snake. One dreamer wakes fascinated, another in a cold sweat — and that split runs through the history of interpretation too. In ancient Greece snakes coiled around the staff of Asclepius as emblems of healing; in Genesis the serpent is the tempter; in many South Asian traditions a snake dream signals fortune or a spiritual visitation. Which of those readings fits you depends less on the snake than on what it was doing, and on what you were feeling while it did.",
      "Snakes earn their symbolic range from real biology: they shed their skin, they strike without warning, they move silently and low to the ground. Dreams borrow all three qualities. A shedding or slow-moving snake often accompanies periods of personal change; a striking snake tends to show up alongside a person or situation you half-consciously distrust; a hidden snake in grass or bedding frequently points to a worry you have sensed but not yet named.",
    ],
    general: [
      "Start the reading with the snake's behavior, because the snake itself is nearly neutral. A snake that watches you tests whether you can tolerate awareness of something; one that flees suggests the threat is smaller than the fear; one that pursues or strikes points to a live conflict; one that sheds or transforms marks change already underway. The setting then tells you which department of life the message belongs to — home, workplace, water, the body.",
      "Your reaction inside the dream is the other half of the meaning. Freezing, fascination, disgust, calm handling, or the urge to kill it all describe how you currently meet the instinctive and uncomfortable in your waking life. Two people can dream an identical snake and need opposite advice — one to trust more, one to trust less — which is why the details you remember matter more than any dictionary definition, this page included.",
    ],
    psychological: [
      "Snakes have a privileged route into the human brain: research on 'snake detection' shows people — including infants and people who have never seen a live snake — pick snake shapes out of visual clutter faster than almost anything else. Dreams exploit that hardware. When the mind needs a shape for something half-seen and possibly dangerous — a rivalry at work, an attraction that threatens a commitment, a symptom you're ignoring — the snake is the readiest costume in the wardrobe.",
      "Jung considered the snake the classic image of the instinctual psyche: too far from consciousness to negotiate with, impossible to ignore. In practice, snake dreams often accompany standoffs between what you've decided and what you actually feel — the career you chose versus the pull you suppress, the person you forgave versus the wariness that stayed. The snake tends to keep returning until the standoff is acknowledged, not necessarily resolved.",
    ],
    spiritual: [
      "The snake is one of very few symbols that major spiritual traditions cast as both sacred and dangerous. It coils around the healer's staff of Asclepius, sheds its skin as an emblem of rebirth, and rises as kundalini energy in yogic tradition — while also standing for temptation and deception elsewhere. A spiritual reading of a snake dream therefore begins with an honest question: did this presence feel like medicine or like a test?",
      "Practically, dreamers in many traditions treat a snake dream as a call to alertness during a season of transformation — old skin coming off, something ancient in you waking up. The discipline is to accept the change without romanticizing the danger: renewal and temptation can arrive in the same season, and the dream may be asking you to tell them apart.",
    ],
    islamic: [
      "In classical Islamic interpretation, most famously the tradition around Ibn Sirin, a snake commonly signifies an enemy, and the details grade the reading: a snake inside the house may point to hostility from within one's own circle, killing a snake to victory over an enemy, and a snake's venom to the harm an enemy's words or wealth can carry. A snake leaving one's home was often read as relief from a source of harm.",
      "Two cautions from the tradition apply directly. First, dream interpretation is considered a matter of knowledge and humility, not certainty — the same image can carry different meanings for different dreamers. Second, a frightening snake dream is not a license to suspect a specific person; the recommended response to a distressing dream is to seek refuge in Allah, avoid narrating it widely, and let waking conduct be governed by evidence and good opinion of others.",
    ],
    biblical: [
      "Scripture holds the serpent at both ends of its moral range. In Genesis it is 'more crafty than any of the wild animals' and the vehicle of temptation; yet in Numbers, Moses lifts a bronze serpent so that those who look at it live, and Jesus tells his disciples to be 'wise as serpents and innocent as doves.' The same creature stands for deception, judgment, healing, and shrewdness depending on the account.",
      "A biblical reflection on a snake dream can therefore run in either direction, and the dream's own texture — deceit or wisdom, threat or healing — usually indicates which. The pastoral questions are practical ones: is something subtle at work in your circumstances that calls for shrewdness? Is a temptation presenting itself as harmless? Weigh the dream in prayer and against scripture's counsel rather than treating it as a private oracle.",
    ],
    commonScenarios: [
      { title: "A Snake That Ignores You", meaning: "Perhaps the most underrated version. A snake minding its own business often reflects instinct, change, or desire that is present in your life but not actually threatening you — the fear is in the watching, not the snake." },
      { title: "A Snake in Your Bed or House", meaning: "The setting matters here more than the animal. Beds and houses stand for intimacy and private life, so this scenario usually points to mistrust, tension, or an unspoken issue close to home — a partner, family member, or your own suppressed feelings." },
      { title: "Being Bitten", meaning: "A bite concentrates the whole symbol into one moment of impact: a wake-up call, a betrayal, a painful truth. Note where the bite landed — hands often relate to work and agency, legs to progress, the chest or neck to emotion and communication." },
      { title: "Killing the Snake", meaning: "Usually experienced as relief, and often read as overcoming a threat or temptation. The one caution: if snake dreams recur after the killing, the dream may be showing suppression rather than resolution." },
      { title: "A Snake That Keeps Growing", meaning: "Something you have been minimizing is refusing to stay small — a debt, a resentment, a health worry, a growing attraction. The dream inflates it to force acknowledgment." },
      { title: "Snakes Everywhere", meaning: "Dreams of many snakes tend to arrive during periods of general overload or social mistrust: too many pressures, too many people whose motives you're unsure of, too many changes at once." },
    ],
    faq: [
      { question: "I dreamed about a snake — should I be worried?", answer: "Not by default. Snake dreams are among the most common dreams worldwide and most track ordinary stress, change, or wariness about someone. Treat the dream as a question about your waking life, not a prediction about it." },
      { question: "Does a snake dream mean someone is betraying me?", answer: "It can reflect mistrust you already feel, but it is not evidence about another person. If a specific face came with the snake, ask what your waking-life relationship with them actually feels like — the dream may be amplifying an existing doubt rather than revealing a hidden fact." },
      { question: "What does the snake's color change?", answer: "Color shifts the emotional register: black leans toward the unknown and repressed fear, green toward growth or jealousy, white toward healing or an unfamiliar truth, red toward anger and passion, yellow toward caution. These are tendencies, not codes — your own associations override any list." },
      { question: "Why do I dream about snakes when I'm pregnant?", answer: "Snake dreams spike during pregnancy, likely because pregnancy combines the snake's two core themes — bodily transformation and protective alertness. In several folk traditions a pregnancy snake dream is even read as a gender omen, though there is no evidence for that." },
      { question: "What does Islam say about snake dreams?", answer: "Classical interpreters such as Ibn Sirin often linked snakes to an enemy or worldly temptation, with details changing the reading — killing the snake suggesting victory, a snake leaving the house suggesting relief. A distressing dream is traditionally met by seeking refuge in Allah and not narrating the dream widely." },
    ],
  },
  "teeth-falling-out": {
    introduction: [
      "Teeth falling out is, by most surveys of dream content, one of the two or three most reported dreams on earth — studies suggest roughly two in five people experience it at least once. The scene barely varies: a tooth loosens, you probe it, and suddenly teeth are crumbling into your hand while you look for a mirror or try to keep anyone from noticing. That last detail is the interpretive key. Almost nobody dreams of losing teeth alone and unbothered; the dream is soaked in social exposure.",
      "The classic readings cluster around control and appearance: fear of losing standing, anxiety about how you come across, distress about a transition you cannot pause. Freud tied teeth dreams to repressed anxieties; Jung saw them as symbols of losing one's grip on a life stage. Modern research adds a mundane candidate — one study found teeth dreams correlated with actual dental irritation during sleep, like clenching and grinding. If you wake with a tight jaw, start there before reaching for symbolism.",
    ],
    general: [
      "The dream's mechanics carry most of its meaning. Whether the teeth crumble, loosen one by one, or fall in a sudden handful distinguishes slow erosion from a single blow; whether you're alone or in public separates private loss from social exposure; whether you try to hide the gaps or push the teeth back in describes your current strategy for holding a deteriorating situation together. Most dreamers can map at least one of these mechanics onto something happening awake.",
      "Timing is the other reliable clue. Teeth dreams cluster around events that threaten how you're seen or how much you control: job changes, public commitments, aging milestones, illness, the end of a relationship, or a period of saying things you regret — the mouth being, after all, where words come from. If nothing in your life fits, check the body: clenching, grinding, and dental work are all documented triggers.",
    ],
    psychological: [
      "The most rigorous study on the subject found something deflating and useful: teeth dreams correlated with dental irritation during sleep — tension in the jaw and teeth on waking — and not with general psychological distress, while other bad dreams did track distress. In other words, some portion of teeth dreams may be the sleeping brain narrating a physical sensation. This is worth ruling in or out before deeper analysis.",
      "When the dream is psychological, it usually concerns self-presentation. Teeth are the body part most tied to the face we prepare for others — smiling, speaking, appearing healthy and young — so losing them stages the fear of being seen diminished. Clinicians note the dream often visits people in transitions where an old competence no longer guarantees standing: new roles, new relationships, new decades. The dream exaggerates; the underlying concern is usually rational and specific.",
    ],
    spiritual: [
      "Traditions that read the body symbolically tend to link teeth to power exercised through the mouth: speech, prayer, truth-telling, appetite. Losing teeth in a dream then becomes a question about that power — whether your words have lost force, whether something is being consumed carelessly, whether you have been silenced or have silenced yourself. It is one of the more concrete spiritual inventories a dream can prompt.",
      "There is also a humbler spiritual reading: teeth fall as the body ages, and the dream touches mortality at the scale of everyday life rather than deathbed drama. Some dreamers find the dream loses its horror when received this way — as an invitation to hold appearance and permanence more lightly, and to invest in what doesn't fall out.",
    ],
    islamic: [
      "Classical Islamic interpretation gives teeth unusually detailed treatment: the teeth are often mapped to one's household and kin — upper and lower, right and left corresponding to different relatives — so a falling tooth could be read in relation to a family member's circumstances. Other transmitted readings connect falling teeth to the repayment of debts, or, when the teeth fall into one's hand or lap, to wealth or offspring rather than loss.",
      "The breadth of these readings is itself the lesson: the tradition does not treat teeth dreams as a fixed omen of death, despite the folk belief, and interpreters stress the dreamer's own condition in weighing any meaning. A distressing teeth dream is met like any other: seek refuge in Allah, do not let a dream seed fear about family members, and leave knowledge of the unseen to Allah.",
    ],
    biblical: [
      "In scripture, teeth appear chiefly as images of strength and of anguish: 'gnashing of teeth' marks grief and exclusion, broken teeth signify an enemy's power ended (as in the Psalms), and clean teeth in Amos describe famine. There is no biblical code for dreaming of tooth loss — but the imagery scripture does use points toward strength, provision, and the words of the mouth as the relevant themes.",
      "A biblical reflection on this dream might therefore examine speech and dependence: whether your words have been building or wounding (James's warnings about the tongue apply), and whether a loss of strength in some area is driving you toward self-protection or toward trust. As always, a vivid dream is an occasion for reflection and prayer, not a verdict.",
    ],
    commonScenarios: [
      { title: "Teeth Crumbling Into Your Hands", meaning: "The most common variant, and the one most tied to helplessness: the harder you try to hold things together, the faster they come apart. It often appears mid-crisis, when effort no longer seems to control outcomes." },
      { title: "Spitting Out Teeth in Public", meaning: "Here the emphasis is shame and audience. This version tends to follow situations where you said something you regret, fear being judged, or feel your competence is on display — presentations, new jobs, new relationships." },
      { title: "One Loose Tooth You Keep Touching", meaning: "A slower, more specific anxiety: one particular decision or attachment is wobbling and you keep testing it. The dream mirrors the compulsive checking we do with things we suspect are ending." },
      { title: "No One Noticing Your Missing Teeth", meaning: "An oddly reassuring variant. You feel exposed and diminished, but the dream's other characters carry on — which can reflect the gap between how harshly you judge yourself and how little others actually register." },
      { title: "Swallowing a Tooth", meaning: "Loss turned inward: something you couldn't say, a hurt you internalized, or a change you accepted without protest. Dreamers often report this version during periods of biting their tongue in a relationship or workplace." },
      { title: "Teeth Growing Back", meaning: "Recovery imagery — confidence, standing, or health being rebuilt. If the new teeth are wrong or monstrous, the dream may question whether the rebuilt version of things is really an improvement." },
    ],
    faq: [
      { question: "Does dreaming of teeth falling out mean someone will die?", answer: "This folk belief exists in many cultures — and in some Islamic and Chinese traditions specific teeth are even mapped to specific relatives — but there is no evidence dreams predict deaths. The belief likely persists because the dream is common enough that coincidences are inevitable." },
      { question: "Why is this dream so common?", answer: "Teeth sit at a junction of universal anxieties: appearance, aging, speech, and control. They are also one of the few body parts we can actually lose, so they make a natural stage prop for any fear of loss. Physical jaw tension during sleep may add a bodily trigger." },
      { question: "Is it about money?", answer: "Traditional dream books often linked teeth to wealth and loss of teeth to financial loss. The modern reading is broader — loss of any resource you rely on, including confidence, youth, status, or income — but if you're under financial strain, the dream may well be borrowing teeth to talk about money." },
      { question: "I have this dream every few months. Why does it repeat?", answer: "Recurring teeth dreams usually track a recurring situation — cyclical stress at work, an on-off relationship, chronic worry about aging or health. Log the days it appears; most people find a pattern within two or three occurrences." },
      { question: "Could it just be my teeth?", answer: "Yes. Bruxism (grinding), an ill-fitting night guard, or ongoing dental problems all raise the odds of teeth dreams. If the dream comes with jaw soreness, headaches, or tooth sensitivity in the morning, mention it to a dentist before treating it as psychology." },
    ],
  },
  "being-chased": {
    introduction: [
      "Chase dreams are the standard nightmare of the human species — the single most commonly reported dream theme across cultures and age groups, and usually the first nightmare children remember. Sleep researchers who favor 'threat simulation' theory argue this is no accident: the dreaming brain runs escape rehearsals because, for most of our evolutionary history, being pursued was a real problem worth practicing for. Your pursuer wears a modern costume, but the program is ancient.",
      "The interpretive tradition adds a sharper point: what chases you in a dream is very often something you are avoiding while awake. A confrontation you keep postponing, a deadline, a diagnosis you won't book the appointment for, a feeling you refuse to have. The dream's geometry says it plainly — the thing is behind you because you have turned your back on it, and it keeps gaining because avoidance never actually increases the distance.",
    ],
    general: [
      "Identify the pursuer's category before anything else. An animal points toward instinct and appetite — anger, desire, fear you consider beneath you. A human stranger points to interpersonal pressure or an unowned part of yourself. Someone you know points to that relationship. A monster or shadow points to a fear that has grown abstract through long avoidance. The distance between you tends to measure urgency: a pursuer gaining ground usually means the waking-life counterpart is too.",
      "Then look at the terrain and your strategy. Running through a childhood neighborhood, a workplace, or an endless building tags the theme's home territory. And whether you run, hide, fight, fly, or negotiate is a snapshot of your current coping style — often more honest than your waking self-assessment. Many people are startled to notice the dream has them hiding when they think of themselves as confronters.",
    ],
    psychological: [
      "Chase dreams have the strongest claim of any dream type to an evolutionary explanation. Threat-simulation theory, developed from large dream-content datasets, holds that dreaming evolved partly to rehearse escape and evasion in a consequence-free environment — which would explain why pursuit dreams are universal, start in early childhood, and intensify under stress. Your brain may simply be running its oldest training module with modern casting.",
      "On top of that ancient machinery sits a modern and well-supported association: chase dreams correlate with avoidance coping. People who habitually defer conflict, procrastinate on dreaded tasks, or suppress emotions report them at higher rates, and the dreams tend to remit when the avoided issue is engaged. Clinically they also spike in anxiety conditions and after trauma, where being pursued can replay the signature of a real event; recurrent post-traumatic versions respond to imagery rehearsal therapy.",
    ],
    spiritual: [
      "Contemplative traditions read the pursuer generously: what chases you may not be an enemy but a demand — a calling, a conscience, a truth that wants acknowledgment and will not be outrun. The Sufi and monastic literatures are full of the same insight the dream stages nightly: what you flee gains power from the fleeing, and turning around is the beginning of freedom.",
      "A spiritual practice for chase dreams is deceptively simple: before sleep, name what you believe is chasing you, and decide — awake, in daylight terms — what facing it would look like this week. Dreamers across traditions report the dream changing once that decision is made, sometimes before it is even acted on. Whether one credits grace or psychology, the sequence is the same.",
    ],
    islamic: [
      "Islamic tradition sorts dreams into the truthful, the self-generated, and the distressing whisperings of shaytan — and a nightmare of pursuit generally falls into the latter two. The transmitted response is practical: seek refuge in Allah from its evil, spit dryly to the left three times, change one's sleeping side, and do not narrate the dream to others or grant it power over the day.",
      "At the same time, the tradition allows that a recurring distress may reflect one's real condition — unresolved wrongdoing, neglected obligation, or fear needing repair through repentance and action. The balance is characteristic: refuse the dream any authority as an omen, while letting it prompt honest self-examination and turning to Allah for protection and resolve.",
    ],
    biblical: [
      "Proverbs supplies the sharpest biblical commentary a chase dream could ask for: 'The wicked flee though no one pursues, but the righteous are as bold as a lion.' Scripture repeatedly ties flight to unresolved guilt or unaccepted calling — Jonah fleeing Nineveh, Adam hiding in the garden, Elijah running from Jezebel — and in each account the resolution comes not through better escape but through encounter.",
      "The reflective questions follow naturally: is something pursuing you that is actually a summons? Is guilt manufacturing pursuers that a confession or an amends would dissolve? The Psalms offer the counter-image — refuge sought in God rather than in distance — and many believers find chase nightmares lose force when the avoided matter is brought deliberately into prayer and, where needed, into the open.",
    ],
    commonScenarios: [
      { title: "Legs That Won't Work", meaning: "Running through mud, in slow motion, or with failing legs is partly physiology — the body's muscles are paralyzed during REM sleep, and the dream registers the mismatch. Symbolically it lands as futility: effort that produces no progress, in a job, a relationship, or a recovery." },
      { title: "Never Seeing the Pursuer", meaning: "A faceless or unseen chaser is the signature of unnamed anxiety — dread without an object. These dreams often accompany generalized stress, where no single problem accounts for the pressure you feel." },
      { title: "Being Chased by Someone You Know", meaning: "Usually less literal than it feels. A known pursuer tends to represent the conflict with that person — the conversation not had, the boundary not set — or a trait of theirs you're running from in yourself." },
      { title: "Turning to Face It", meaning: "The most consequential variant. Dreamers who stop and turn around often report the pursuer transforming, shrinking, or dissolving — and dream therapists sometimes deliberately rehearse this move with nightmare sufferers. It tends to coincide with a waking decision to stop avoiding." },
      { title: "Hiding While It Searches", meaning: "A different strategy than running: concealment. This version often maps to secrecy in waking life — hiding a feeling, a mistake, or a part of your identity — with the dream's tension measuring the cost of staying hidden." },
      { title: "Being Caught", meaning: "Feared, but frequently a turning point. Getting caught forces the encounter the dream was built to avoid, and many people report the dream series ending after it. What the pursuer does when it catches you is often revealing — many do nothing at all." },
    ],
    faq: [
      { question: "Why do I keep having chase dreams?", answer: "Recurring chases almost always track ongoing avoidance or ongoing pressure. Ask what you are 'not dealing with' right now — most people can answer instantly. The dream typically stops recurring once the avoided thing is faced, which is unusually good evidence for what it was about." },
      { question: "What does it mean if I never get caught?", answer: "Escape can feel like victory, but a chase that resets every night suggests the underlying issue survives each escape. The dream is a treadmill: it measures avoidance, not safety." },
      { question: "Can I change how the dream goes?", answer: "Often, yes. Imagery rehearsal — writing the dream down and mentally practicing a new ending, such as stopping and turning around — is an evidence-based technique for recurrent nightmares. Some lucid dreamers do it inside the dream itself." },
      { question: "My child has chase nightmares. Is that normal?", answer: "Very. Chase dreams are the most common childhood nightmare and usually reflect ordinary developmental fears rather than anything wrong. They warrant attention mainly if they are frequent, follow a frightening real event, or cause fear of sleep." },
      { question: "Is being chased in a dream a spiritual attack?", answer: "Several traditions read persistent pursuit dreams as spiritual pressure, and Islamic tradition distinguishes distressing dreams from meaningful ones, recommending seeking refuge in Allah rather than dwelling on them. Even inside a spiritual framing, the practical counsel converges: identify what pursues you and face it with the resources of your faith." },
    ],
  },
  ex: {
    introduction: [
      "Dreaming about an ex is common enough to feel like a betrayal of your own progress: years pass, you're happy with someone new, and your sleeping brain still books your ex for a cameo. The first thing worth saying is that the frequency is normal — people we attached to deeply are consolidated deep in memory, and dreams draw heavily on emotionally charged material. The second thing worth saying is that the dream is usually not about wanting them back.",
      "More often, an ex in a dream is shorthand. Your brain uses the person as a symbol of what they were attached to: your younger self, a first experience of love or heartbreak, a pattern you fell into with them, or a quality your current life is missing. That's why exes surface at suspiciously meaningful moments — new relationships, engagements, breakups of other kinds, anniversaries — when the mind is comparing then and now. The productive question is rarely 'why them?' but 'why now?'",
    ],
    general: [
      "Read the dream by its emotional temperature rather than its plot. A tender reunion, a screaming fight, a polite coffee, an ex who ignores you — each is a different report on where your processing stands. The dream-ex who feels like a stranger often signals completed grief; the one who still stings marks residue. Note also which era of the relationship the dream draws from: early-days imagery usually points to what you miss, end-days imagery to what remains unresolved.",
      "Context multiplies meaning. The same reunion dream means different things three weeks after a breakup (raw processing), during a new relationship's commitment phase (comparison and review), and out of nowhere in a stable decade (usually a symbol of that life stage, or of a trait — recklessness, tenderness, being adored — the ex has come to stand for). Before interpreting the person, ask what your life was asking about on the day the dream arrived.",
    ],
    psychological: [
      "Attachment research offers the most concrete finding in this area: people with anxious attachment styles dream of ex-partners more often, with more distress, and for longer after the relationship ends. The dreams track the attachment system's slow deactivation — which is why they typically spike immediately post-breakup, wane over months, and flare at reminders like anniversaries or mutual friends' news.",
      "There's also a consolidation account: long, emotionally intense relationships are woven through years of autobiographical memory, and dreaming appears to replay and reorganize exactly this kind of material. On this view an ex is less a message than a landmark — your brain revisiting a heavily used neighborhood of memory while filing something current. Both accounts agree on the practical point: the dream reflects your inner state, not the ex's relevance to your future.",
    ],
    spiritual: [
      "Spiritual traditions tend to frame significant past relationships as teachers whose lessons outlive the bond — and recurring ex dreams as a sign the lesson has not been fully collected. The reflective exercise is to name, precisely, what that relationship taught you about your needs, your patterns, and your worth; dreamers often report the dreams settling once the lesson is articulated rather than merely felt.",
      "Some traditions speak of energetic ties to former partners and prescribe deliberate release — ritual, written farewell, forgiveness practiced in prayer or meditation. One need not adopt the metaphysics to use the method: a conscious act of closure, performed with intention, is among the most consistently reported ways these dreams end. Release, notably, is not reconciliation; it can be done entirely alone.",
    ],
    islamic: [
      "Islamic dream tradition would class most ex dreams as hadith an-nafs — the self's own talk, generated by memory and preoccupation — rather than meaningful vision. They carry no message about the ex, no sign that reunion is written, and no permission: a dream is never a basis for reopening contact that would harm one's current marriage or lead toward what is impermissible.",
      "The tradition's practical counsel fits the situation well: occupy the heart with what is present and lawful, guard against dwelling on nostalgia that shaytan can inflame into discontent with one's spouse or portion, and meet persistent intrusive dreams with dhikr before sleep. If the dream exposes a real wound — injustice done or suffered in that relationship — the remedy is repentance, forgiveness, and du'a, not the dream's rehearsal.",
    ],
    biblical: [
      "Scripture's most pointed image for the backward look is Lot's wife — turned to salt not for leaving, but for looking back with longing at what she was delivered from. Alongside it stands Ecclesiastes' warning not to ask why the former days were better, and Paul's 'forgetting what is behind and straining toward what is ahead.' The biblical current runs firmly toward release of the past.",
      "Yet the Bible also honors honest grief and unfinished reconciliation: some ex dreams surface a wrong never confessed or a forgiveness never granted, and those are matters scripture takes seriously. The discernment question is which kind of backward look the dream represents — nostalgia to be released, or business to be completed through forgiveness (in person only where wise and safe, otherwise before God alone).",
    ],
    commonScenarios: [
      { title: "A Warm, Happy Reunion", meaning: "Usually the most unsettling version for people in new relationships. It rarely signals a wish to return; more often it points to a specific feeling from that era — being pursued, feeling young, early-relationship intensity — that you miss, independent of the person." },
      { title: "Arguing or Fighting With Them", meaning: "Unfinished emotional business staging itself. Dreams give you the argument you never got to have, or never won. Recurring versions often fade once you write down, or say aloud, what you actually needed them to hear." },
      { title: "Your Ex With a New Partner", meaning: "Less about them and more about your standing: fear of being replaced, comparison, or a nudge that some part of you hasn't accepted the ending as final even if your conscious mind has." },
      { title: "Your Ex Apologizing", meaning: "One of the most poignant variants — the dream manufacturing the closure reality declined to provide. Many people find these dreams increase as they heal, not before, as if the mind grants the apology once it no longer depends on it." },
      { title: "Dreaming of an Ex While Happily Partnered", meaning: "The variant that generates the most guilt and needs it least. Long-term studies of dream content show past partners persist in dreams for decades. It becomes worth examining only if the dreams come with waking dissatisfaction in the current relationship." },
      { title: "An Ex From Long Ago, Out of Nowhere", meaning: "A first love appearing decades later usually symbolizes a life stage, not a person — a time of possibility, risk, or self-definition. These dreams cluster around midlife transitions and major decisions." },
    ],
    faq: [
      { question: "Does dreaming about my ex mean I still love them?", answer: "Not by itself. Dream researchers find past partners remain frequent dream characters long after all longing is gone, simply because of how emotional memory works. Check your waking feelings: if the dream stirs nothing during the day, it was memory housekeeping, not a message." },
      { question: "Is it wrong to dream about an ex while I'm with someone else?", answer: "No — and it is nearly universal. You don't control dream casting. It only merits attention if the dreams are accompanied by daytime longing or persistent comparison, in which case the relationship, not the dream, is the thing to look at." },
      { question: "Does my ex dreaming about me mean anything?", answer: "There's no evidence dreams connect two people. If an ex tells you they dream about you, it tells you something about their memory and attention — nothing about fate, and nothing you're obligated to act on." },
      { question: "Why did these dreams start when my new relationship got serious?", answer: "Because your mind is comparing. Commitment triggers review of past attachments — what worked, what hurt, what you promised yourself you'd never repeat. Many people dream of exes most intensely around engagements and moving in together. It typically signals processing, not doubt." },
      { question: "How do I make the dreams stop?", answer: "Address the residue rather than the dream. Unsent letters, honest conversations with a friend or therapist, and consciously naming what that relationship taught you all tend to reduce recurrence. Suppression tends to do the opposite." },
    ],
  },
  cheating: {
    introduction: [
      "Cheating dreams have a cruel design flaw: they feel like evidence. You wake next to your partner furious at them for something they did in your head, or guilty for something you did in yours — and the emotion can hang over the whole morning. So the essential fact comes first: dreams of infidelity are among the most common relationship dreams, they occur constantly in secure and happy couples, and no study has ever shown they predict or detect real betrayal.",
      "What they do reliably track is the state of your own attachment system. Dreams of being cheated on correlate with insecurity, fear of abandonment, and feeling deprioritized — your partner's job, phone, friends, or new baby getting the attention you want. Dreams of doing the cheating usually process guilt or divided attention of any kind, sexual or not: a flirtation you minimized, but also a job offer, a friendship, or a version of yourself that doesn't fit inside the relationship. The dream borrows infidelity as the strongest available metaphor for loyalty questions.",
    ],
    general: [
      "Separate the two directions first, because they interpret differently. Dreams of being betrayed are about security: they ask whether you feel chosen, prioritized, and safe — and they can be triggered by things as unromantic as a partner's demanding season at work, a new baby, or your own history of being left. Dreams of betraying are about division: some loyalty of yours — to a person, a plan, a version of yourself — is being pulled in two directions, and the dream renders the split as an affair.",
      "Then check the trigger radius. These dreams reliably follow: relationship anniversaries of past betrayals, a partner's new friendship or colleague, watching infidelity storylines, feeling less desired after a change in body or circumstance, and — most overlooked — your own unconfessed distractions, romantic or not. A cheating dream that lands within days of one of these usually needs no deeper archaeology.",
    ],
    psychological: [
      "The research here is unusually direct. Studies of couples' dream diaries found infidelity dreams among the most common relationship dreams reported, that they occur independent of actual relationship quality — and that they nonetheless predicted measurably worse interactions with the partner the following day. The dream is fiction; the residue is real. Knowing this one fact defuses most of the damage these dreams do.",
      "Underneath, the strongest predictor of betrayal dreams is attachment insecurity rather than partner behavior: people with anxious attachment dream of being cheated on more often, regardless of how faithful their partners are. Dreams of committing infidelity, meanwhile, correlate with guilt-proneness and with any concealed divided investment — researchers note the 'affair' in such dreams is as often a job, a secret plan, or an old flame's memory as an actual person." ,
    ],
    spiritual: [
      "Spiritually, cheating dreams tend to be read as dreams about fidelity in the widest sense — whether you are being true. The affair imagery can dramatize self-betrayal: values traded for comfort, a vocation abandoned, promises to yourself broken quietly. Dreamers who can't connect the dream to their relationship often find it connects immediately to something they've been unfaithful to in themselves.",
      "Where the dream does concern the relationship, most traditions counsel the same movement: from suspicion toward examination of one's own heart, and from accusation toward repair. Jealousy entertained in the imagination corrodes; trust is a practice. A dream that provokes possessiveness can be received instead as a prompt to invest — attention, honesty, presence — in the bond it frightened you about losing.",
    ],
    islamic: [
      "Islamic tradition is unambiguous on the central point: a dream is not evidence, and suspicion is itself regulated. The Qur'an commands avoiding much suspicion, 'for some suspicion is sin,' and accusations of unchastity without witnesses are treated with utmost gravity. A dream of a partner's infidelity therefore creates no rights, justifies no interrogation, and should not be narrated in a way that plants doubt in either heart.",
      "Such dreams are generally classed as distressing whisperings or the self's own anxieties, met with seeking refuge in Allah and not retelling. If the dream reflects one's own temptation — an inclination toward what is forbidden — it serves as a private warning to strengthen the marriage, lower the gaze, and close the doors through which fitnah enters, with repentance for whatever has already been entertained.",
    ],
    biblical: [
      "Scripture treats marriage as covenant and adultery as covenant-breaking — but it locates the battle earlier than the act: 'everyone who looks with lust has already committed adultery in his heart,' and Proverbs' long warnings target the drift toward betrayal, not just its completion. A dream of cheating, in this frame, is an audit of the heart's direction rather than a report of anyone's deeds.",
      "For the dreamer betrayed in the dream, the biblical material on jealousy cuts both ways: God's jealousy for His people is protective love, but human jealousy fed on imagination is Proverbs' 'rottenness of the bones.' The constructive response mirrors the covenant itself — bring fears into the open honestly rather than nursing them, guard your own heart, and build the marriage with the diligence scripture assumes it needs.",
    ],
    commonScenarios: [
      { title: "Your Partner Cheating With Someone You Know", meaning: "The known face usually marks a real point of comparison or insecurity — someone whose looks, success, or ease with your partner you've quietly measured yourself against. The dream names the comparison, not an affair." },
      { title: "Your Partner Cheating With a Stranger", meaning: "With no rival to analyze, the dream is purer: it's about the fear itself. These versions tend to spike when you feel generally deprioritized or when trust has been damaged before — sometimes in a previous relationship, not this one." },
      { title: "You Cheating, and Enjoying It", meaning: "Often the most disturbing to wake from. Desire in dreams is a poor guide to desire in life; this version more often reflects a hunger for novelty, attention, or a lost part of yourself than a wish for that specific person or act." },
      { title: "Being Caught", meaning: "The emphasis on exposure suggests the theme is shame rather than desire — something you're concealing that may not be romantic at all: spending, doubts, a secret plan, an old message you never mentioned." },
      { title: "Confronting Them and Getting No Answer", meaning: "Dreams where the confrontation goes nowhere — they deny it, laugh, or the scene dissolves — often mirror waking conversations where you feel unheard on some other subject entirely." },
      { title: "Dreaming It Again and Again", meaning: "Recurrence means the underlying question is live: a trust wound that hasn't healed, reassurance you need but haven't asked for, or attention that genuinely has drifted. The dream repeats because the conversation hasn't happened." },
    ],
    faq: [
      { question: "I dreamed my partner cheated and I'm still angry. Is that normal?", answer: "So normal it has a name in the research — 'dream residue.' Studies of couples find infidelity dreams measurably affect next-day interactions. Give the feeling an hour and an honest label ('I dreamed it; it didn't happen') before letting it steer any real conversation." },
      { question: "Could the dream be picking up on real signs?", answer: "Dreams occasionally dramatize things you've noticed but not admitted to yourself — distance, secrecy, changed patterns. The test is your waking evidence: if nothing concrete supports the worry, the dream reflects your fear, not their behavior. Repeated accusations based on dreams damage trust in exactly the way you're afraid of losing it." },
      { question: "I dreamed I cheated. Do I secretly want to?", answer: "Rarely in the literal sense. Ask what the dream-affair gave you — excitement, being seen, escape, autonomy — and where that's missing. People often find the answer has nothing to do with sex and a lot to do with feeling reduced to a role." },
      { question: "Should I tell my partner about the dream?", answer: "There's no rule, but tone matters more than disclosure. 'I had an awful dream and I woke up needing a hug' invites connection; 'I dreamed you cheated — would you ever?' turns your dream into their interrogation. If the dream exposed a real need, raise the need, not the dream." },
      { question: "What does a cheating dream mean religiously?", answer: "Islamic tradition classes distressing dreams of this kind as unreliable and counsels against acting on them or accusing anyone based on a dream — suspicion without evidence is itself discouraged. Biblical reflection tends to route the dream toward self-examination: guarding one's own heart and investing in the covenant, rather than divining another's sin." },
    ],
  },
  pregnancy: {
    introduction: [
      "Pregnancy dreams have a double audience. For people who are actually pregnant, they are a documented phenomenon — vivid, frequent, and strange, driven by hormonal shifts, fragmented sleep that boosts dream recall, and the sheer psychological scale of what's coming. For everyone else — including people who cannot be or have never been pregnant, and including men — the dream is almost always metaphor, and one of the most consistent metaphors in all of dream interpretation: something is growing that isn't ready yet.",
      "The 'something' takes predictable forms: a project in its early stages, a plan you haven't announced, a skill or identity developing out of sight, a relationship not yet public, a decision still gestating. The dream's details often map the process with surprising precision — how far along you are, whether the pregnancy feels wanted, whether you're hiding it, whether something feels wrong. Interpreters from Jung onward have read these dreams as the psyche tracking its own creative timeline.",
    ],
    general: [
      "For the non-pregnant dreamer, work the metaphor systematically: what stage was the pregnancy at, and what in your life matches that timeline? A barely-showing pregnancy suggests something newly begun and still private; a heavy third trimester suggests a project near its demanding arrival; labor pains suggest the transition is already underway whether you consent or not. Whose reaction you feared, and who you told first, usually map onto real people with striking accuracy.",
      "For the pregnant dreamer, calibrate expectations: dreams during pregnancy are more vivid, more frequent, and considerably stranger than baseline, and anxiety dreams — about labor, the baby's wellbeing, one's adequacy as a parent — are documented in healthy, normal pregnancies at every stage. Read them as the psyche doing preparatory work at scale, not as commentary on how things will go.",
    ],
    psychological: [
      "Sleep studies of pregnant women find exactly what the folklore claims: dream recall rises (partly because fragmented sleep catches more REM awakenings), dream content grows more vivid and body-focused, and themes progress across trimesters — early dreams of water and small animals giving way to explicit baby, birth, and mothering dreams near term. Researchers read this as anticipatory rehearsal: the mind practicing an identity before it's needed. Notably, some work suggests women who dream anxiously about labor may cope better during it — rehearsal, again.",
      "Outside pregnancy, the psychological reading runs through the creative-gestation metaphor, which psychologists take more literally than it sounds: ideas, identities, and decisions demonstrably develop through stages of private growth before public existence, and dreams appear to track such processes. A pregnancy dream mid-project is the mind timestamping development. The anxious variants — something wrong, labor too soon, no hospital — map onto specific creative fears: flaws, premature exposure, lack of support.",
    ],
    spiritual: [
      "Nearly every spiritual tradition uses birth as its central image for inner transformation — being born again, the birth of the higher self, the bodhisattva gestating in the world. A pregnancy dream sits inside that lineage: something sacred or significant is forming in you and requires what all gestation requires — time, protection, nourishment, and tolerance of not being able to see it yet.",
      "The traditions also insist on the discipline of hiddenness: what is forming is vulnerable precisely because it is unfinished, and premature exposure — announcing, explaining, defending — can end it. A spiritual response to a pregnancy dream is often simply to keep faith with the unseen process: continue the practices that feed it and decline the urge to show it before its time.",
    ],
    islamic: [
      "In classical Islamic interpretation, pregnancy in a dream is frequently a positive sign — often read as increase: in provision, in blessing, in worldly goods — for men and women alike, though interpreters vary the meaning with the dreamer's circumstances. For a woman hoping to conceive, such dreams are more often her own hopes speaking (hadith an-nafs) than a promise, and the tradition cautions against reading certainty into them.",
      "The broader etiquette applies comfortably here: a beautiful dream of pregnancy or birth may be received with gratitude and shared with those who love you; a distressing one — miscarriage, something wrong — is not narrated and not treated as an omen about a real pregnancy, since knowledge of what wombs carry belongs to Allah. Decisions about health remain with physicians; the dream's proper fruit is hope held with humility.",
    ],
    biblical: [
      "The Bible's great pregnancy narratives are about promise under impossible conditions — Sarah laughing at her announcement, Hannah weeping in the temple, Elizabeth in old age, Mary's 'let it be to me.' The consistent thread is that what God begins gestates in hiddenness and arrives on its own calendar, not the dreamer's. Paul extends the image to all creation, 'groaning as in the pains of childbirth' toward what is coming.",
      "A biblical reflection on a pregnancy dream might therefore ask: what promise or calling is in development in your life, and are you keeping faith with it through the long unseen middle? The anxious versions of the dream find their counterpart in these same stories — every biblical pregnancy carries fear — and their answer too: the outcome rests with God, while the dreamer's part is faithfulness in the waiting.",
    ],
    commonScenarios: [
      { title: "Being Pregnant When You Can't Be", meaning: "Men, postmenopausal women, and people with no possibility of pregnancy have this dream regularly — which is itself the strongest argument for the metaphorical reading. Something in your life is in development: name what you're 'carrying' and the dream usually becomes transparent." },
      { title: "Hiding the Pregnancy", meaning: "You're protecting something unannounced — a plan, a hope, a change of heart — from premature judgment. The dream often includes a specific person you hide it from; that's usually the person whose reaction you're managing in waking life." },
      { title: "Being Further Along Than You Realized", meaning: "A classic timing dream: something has progressed more than you've acknowledged, and readiness is arriving whether you feel prepared or not. Common before launches, moves, proposals, and other point-of-no-return decisions." },
      { title: "Something Wrong With the Pregnancy", meaning: "For pregnant dreamers, this is overwhelmingly an anxiety dream, not an omen — worry rehearsing itself, and studies find such dreams common in normal, healthy pregnancies. Metaphorically, it can voice fear that a project or plan is quietly failing." },
      { title: "Giving Birth", meaning: "Arrival: the developing thing goes public and starts making demands. Dreamers often note what is born — a healthy baby, an animal, an object, something uncanny — and that detail tends to carry the dream's verdict on the project." },
      { title: "Someone Else Pregnant", meaning: "Growth you're witnessing rather than carrying — a friend's visible change, envy of someone else's momentum, or potential you sense in a person before they've announced anything. Occasionally it's your own development, displaced onto a safer character." },
    ],
    faq: [
      { question: "I'm not pregnant and not trying. Why did I dream I was?", answer: "Because the dream is rarely about literal pregnancy. It's the mind's stock image for anything in gestation — a project, a decision, a version of you that's forming. Ask what in your life is 'growing but not ready to show,' and the dream usually identifies itself." },
      { question: "Can a dream tell me I'm pregnant before a test can?", answer: "There are many anecdotes and no reliable evidence. Early pregnancy does change hormones and sleep, so it isn't absurd that some people dream differently before testing — but a dream is not a diagnostic. If it matters, take the test." },
      { question: "Why are my dreams so vivid and bizarre now that I'm pregnant?", answer: "Sleep research consistently finds pregnant women report more vivid and more disturbing dreams, especially in the third trimester. Hormones alter REM sleep, and frequent night waking means you catch dreams you'd normally sleep through. Anxiety dreams about labor and the baby are common and normal." },
      { question: "I dreamed about the baby's gender. How accurate is that?", answer: "At chance level — studies that checked found gender dreams right about half the time, exactly as guessing would be. Enjoy the dream; don't paint the nursery on its authority." },
      { question: "I dreamed of a miscarriage. Should I be alarmed?", answer: "It is one of the most common anxiety dreams of pregnancy and does not predict outcomes. If you've experienced a real loss, such dreams are part of grief and can resurface with new pregnancies. If the dream sharpens ongoing fear, bring the fear — not the dream — to your midwife or doctor. This is a sensitive area; be gentle with yourself about it." },
    ],
  },
  death: {
    introduction: [
      "The first thing every serious tradition of dream interpretation says about death dreams is the thing dreamers most need to hear: they are not predictions. From classical Islamic interpreters to modern clinicians, the consensus is unusually complete — dreaming of death, your own or someone else's, does not foretell it. What death does in dreams is what it does in language: it marks an ending. We say a chapter died, a relationship died, the old me died. Dreams simply take the figure of speech literally.",
      "That's why death dreams cluster around transitions rather than tragedies: graduations, weddings, divorces, retirements, recoveries, children leaving home. The person who dies in the dream is often the person changing — including you. Grief is the major exception: after a real loss, dreams of the dead person are part of mourning itself, and research on such dreams finds most bereaved people experience them as consoling rather than frightening, often more so as time passes.",
    ],
    general: [
      "Ask what, in your life, is currently ending — and if the answer doesn't come instantly, ask what should be. Death dreams frequently arrive slightly ahead of conscious acknowledgment: the job you haven't admitted you've outgrown, the friendship running on memory, the identity — athlete, caretaker, young person — quietly expiring. Who dies in the dream usually encodes which ending: your own death for identity shifts, another's death for changes in that relationship or in what that person represents to you.",
      "Distinguish grief dreams from symbol dreams. If the dream concerns someone who has actually died, it belongs to mourning and follows mourning's logic — often evolving over months and years, and best received as part of the relationship's continuation in memory. If it concerns the living, resist the superstitious reading entirely; check instead what is changing between you, or what stage of your own life that person anchors.",
    ],
    psychological: [
      "Bereavement research treats dreams of the dead as a normal and often therapeutic part of grief. Studies of mourners find such dreams are common, that their tone tends to shift from distressing toward comforting as grief matures, and that many bereaved people count them among their most meaningful experiences of the entire mourning process. Clinicians influenced by 'continuing bonds' theory read them as the relationship being renegotiated rather than erased.",
      "Symbolic death dreams — your own death, or a living person's — cluster around transition, and psychologists note their emotional signature is often surprisingly mild: dreamers report detachment or curiosity more than terror. The mind appears to use death as its strongest available marker for irreversibility: this phase will not return. When such dreams do come with dread, the dread usually attaches to a real, resisted change rather than to death itself.",
    ],
    spiritual: [
      "Every contemplative tradition places death at the center of its curriculum — memento mori in the Christian West, maranasati in Buddhism, the Sufi instruction to 'die before you die.' In all of them, deliberate awareness of mortality is a tool for living rightly, not a morbidity. A death dream can function as an unscheduled session of that practice: a reminder, from inside, of what is temporary and what you are doing with it.",
      "Dreams of the dead carry their own spiritual weight. Across cultures they are received as visitation, consolation, or continued bond, and whatever one's metaphysics, their observed effect on most dreamers is peace rather than fear. A grounded response honors the experience without over-claiming: receive the comfort, act on any love or reconciliation the dream stirs toward the living, and hold the question of its source with humility.",
    ],
    islamic: [
      "Classical Islamic interpretation often reads dream-death as something other than death: a long journey, marriage in some transmitted readings, repentance, or the transformation of the dreamer's state — with the surrounding details deciding. Weeping without wailing at a death, for instance, was read differently from screaming grief. The tradition consistently declines to treat such dreams as foreknowledge of anyone's appointed time, which belongs to Allah alone.",
      "Dreams of the deceased hold a special place: a dream of a dead person in a good state may be received as glad tidings and an occasion for gratitude and du'a on their behalf, and the tradition encourages charity and prayer for the dead whom one dreams of. A distressing dream about the dead or the living is met with the standard etiquette — seek refuge in Allah, do not narrate it, and let it prompt nothing but good deeds.",
    ],
    biblical: [
      "Scripture's richest death imagery is agricultural and transformational: 'unless a grain of wheat falls to the ground and dies, it remains only a single seed'; the old self crucified so the new can live; 'to die is gain.' Death in the biblical imagination is repeatedly the passage through which life comes — which makes it a natural biblical reading of a death dream to ask what is being planted, not just what is being lost.",
      "The Bible also refuses death-dreams any predictive authority: times and seasons are God's, and scripture's few death-related dreams (Pharaoh's, Nebuchadnezzar's) required inspired interpretation precisely because they were not literal. A believer waking from such a dream is on solid ground treating it as a call to examine what must be surrendered, to reconcile quickly while it is called today, and to hold mortality in the light of resurrection hope.",
    ],
    commonScenarios: [
      { title: "Your Own Death", meaning: "Rarely frightening in the dream itself, which surprises people — many dreamers report calm or detachment. It typically marks the closing of an identity: a job you're leaving, a self you're outgrowing. What happens after the death in the dream is often more informative than the death." },
      { title: "A Parent or Loved One Dying", meaning: "Usually rehearsal, not prophecy. The mind pre-processes its most feared loss, especially as parents age or fall ill. It can also register a changing relationship — a parent becoming dependent, a child becoming adult — where the old version of the bond really is ending." },
      { title: "Someone Already Dead, Alive Again", meaning: "Among the most emotionally significant dreams people report. In grief research these 'visitation'-type dreams — where the dead person seems well and often communicates reassurance — are associated with comfort and healing for most dreamers, whatever one believes about their source." },
      { title: "Receiving News of a Death", meaning: "The distance matters: you don't see the death, you're told of it. This often reflects endings you learn about rather than participate in — a friendship that quietly lapsed, a possibility that closed while you were looking elsewhere." },
      { title: "Dying and Continuing", meaning: "Dreams where you die and then keep observing, or attend your own funeral, tend to be about perspective: seeing your life from outside, checking who mourns, measuring what your absence would mean. They often accompany questions about recognition and belonging." },
      { title: "A Child Dying", meaning: "Distressing to dream and almost always symbolic — commonly the 'child' is something young you're afraid of losing: a new project, a fresh start, an innocence, or your relationship with your actual child as they grow into someone new. For parents it is also raw anxiety rehearsing, which needs no deeper reading." },
    ],
    faq: [
      { question: "I dreamed someone died. Should I warn them?", answer: "No tradition — religious or clinical — supports treating such dreams as forecasts, and the anxiety a warning creates is real harm from unreal evidence. If the dream leaves you tender toward that person, the useful translation is contact: call them because you love them, not because you fear for them." },
      { question: "Why do I keep dreaming about my dead parent?", answer: "Because grief doesn't file people away; it keeps renegotiating the relationship, and dreams are where much of that work happens. Studies of bereavement dreams find they commonly evolve over the years — from distressing toward comforting — and many mourners come to welcome them." },
      { question: "Does dreaming of my own death mean something is wrong with me?", answer: "It's usually the opposite of morbid: a marker of transformation. These dreams concentrate around life transitions and often carry surprisingly little fear inside the dream. If waking thoughts of death accompany them — that is different from dreaming, and worth talking to someone about. If that's where you are, this is a sensitive topic, and finding support is worth doing." },
      { question: "What does a death dream mean in Islam?", answer: "Classical interpretation often treats death in a dream as signifying something other than death — a long journey, repentance, a change of state, or marriage in some readings — with the context deciding. Distressing dreams are not to be spread or treated as knowledge of the unseen; a beautiful dream of a deceased righteous person may be received with gratitude." },
      { question: "What about biblically?", answer: "Scripture uses death heavily as transformation imagery — dying to an old self, a seed dying to bear fruit — and biblical reflection on such a dream usually asks what is being put to death: a habit, a fear, an old way of living. It resists using dreams as private prophecy about anyone's lifespan." },
    ],
  },
  falling: {
    introduction: [
      "Falling dreams sit at the intersection of psychology and plain physiology, and any honest interpretation starts with the body. The 'hypnic jerk' — that whole-body twitch as you drift off, often paired with a split-second dream of stepping off a curb or dropping through the bed — happens to as many as 70% of people and means nothing beyond a nervous system settling into sleep, sometimes encouraged by caffeine, exhaustion, or stress. If your falling dreams live in that first drowsy stretch of the night, you may need no symbolism at all.",
      "The falls that come with plot are another matter. A dream where you lose your grip, feel the floor give way, or drop from a height you'd been climbing tends to arrive when waking life has the same shape: support you counted on is wobbling, a success feels unearned or unsustainable, control is slipping in a matter you can name if you're honest. Falling is the body's native metaphor for losing what held you up — dreams just render it literally.",
    ],
    general: [
      "Two diagnostic questions sort most falling dreams. First: when in the night? A jolt at sleep onset is likely physiology (the hypnic jerk) and needs sleep hygiene, not analysis. Second: what failed? Falling because you were pushed, because your grip gave out, because the structure collapsed, or because you let go are four different dreams — external threat, personal exhaustion, failed foundations, and chosen surrender respectively — and dreamers almost always remember which it was.",
      "Then match the failure to the week. Falling dreams are unusually well-behaved about timing: they follow financial shocks, relationship wobbles, health scares, public risks, and any situation where you've extended beyond your support. The height itself often scales with the stakes — a curb-stumble for small insecurities, a skyscraper for the career, a cliff edge for the marriage. If the dream recurs at the same dream-location, that location is worth decoding first.",
    ],
    psychological: [
      "Falling appears on every list of universal dream themes — typical-dreams research finds a majority of people everywhere report it, making it arguably the most common dream motif on record. The major psychological accounts converge on support and control: Freud read falling as anxiety about surrender; Adler tied it to fear of losing status and superiority; contemporary stress research simply documents that falling dreams increase during periods of instability and insecurity.",
      "The body deserves its share of the explanation. Beyond the hypnic jerk, the vestibular system — your balance sense — remains partially active in sleep, and researchers believe some falling and floating dreams are the brain narrating ambiguous balance signals. This is why falling dreams can spike with inner-ear issues, blood-pressure changes, or even sleeping position. A falling dream is one of the few dream types where 'it might just be your body' is a fully respectable interpretation.",
    ],
    spiritual: [
      "Spiritual writers consistently find in falling the question of trust: what do you believe holds you? The dream strips away every support and watches what you do — panic, bargain, or release. Traditions from Christian mysticism to Zen use exactly this image for the surrender they teach: the fall that becomes free when resistance stops. Some dreamers experience this conversion inside the dream itself, fear turning to float.",
      "There is also the older moral reading — falling as descent from an inflated position — which survives in our idioms about pride and falls. A falling dream after a season of self-sufficiency can be received as a correction dressed as a catastrophe: an invitation to come down voluntarily from whatever height was costing too much to maintain, before circumstances handle the descent for you.",
    ],
    islamic: [
      "In transmitted Islamic interpretations, falling in a dream is often read through change of state: falling from a height may signify a decline in position or a transition from one condition to another, while what one falls onto matters — falling into a green field or safe place could soften the meaning toward relief or lawful gain, falling into a pit or fire toward trial. As ever, the dreamer's circumstances govern the reading.",
      "The tradition would also class the common startle-fall at sleep's edge among the meaningless stirrings of sleep rather than true dreams — no interpretation owed. For the anxious version that recurs, the counsel is familiar and calming: sleep in a state of remembrance, seek refuge in Allah from distress, and treat the dream as at most a nudge toward securing one's real affairs — debts, duties, reconciliations — rather than a forecast of ruin.",
    ],
    biblical: [
      "Scripture pairs falling with pride so often it became proverbial: 'Pride goes before destruction, a haughty spirit before a fall.' But it pairs falling with rescue just as insistently — 'though he fall, he shall not be cast headlong, for the Lord upholds his hand'; 'underneath are the everlasting arms.' A biblical reading of a falling dream holds both: an audit of what you've built your footing on, and a reminder of what remains beneath you when footing fails.",
      "The reflective questions are concrete. Is some position — reputation, self-image, financial confidence — being maintained at a height honesty wouldn't support? And where support has actually collapsed in your life, the dream may simply be grief doing its work; the biblical response there is not self-examination but the psalmist's move: naming the fall aloud to the One credited with catching.",
    ],
    commonScenarios: [
      { title: "The Ground Giving Way", meaning: "Different from a fall off a height: here the support itself fails. This version tracks betrayed foundations — a stable job that suddenly isn't, a marriage or health assumption that cracked. The surprise is the point; you trusted the floor." },
      { title: "Falling From Somewhere You Climbed", meaning: "The height you fall from is usually height you gained — status, achievement, a visible position. Common in people with impostor feelings, new promotions, or public roles, where the fear isn't of falling in general but of falling from here." },
      { title: "Falling and Never Landing", meaning: "The endless fall is about unresolved suspension: a situation with no floor in sight — open-ended job uncertainty, a diagnosis awaiting results, a relationship in limbo. The dream can't land because waking life hasn't." },
      { title: "Letting Go Deliberately", meaning: "A minority of falling dreams begin with a choice — releasing a ledge, stepping off. These often accompany decisions to stop holding a position that costs too much: leaving, surrendering control, ending a fight. The emotion during the fall tells you how the decision sits." },
      { title: "Falling and Waking With a Jolt", meaning: "Usually the hypnic jerk wearing a costume — physiology first, meaning second. If it happens as you're falling asleep, treat it as a startle reflex; if it recurs deep in the night with vivid story around it, read it like any other falling dream." },
      { title: "Watching Someone Else Fall", meaning: "Fear on another's behalf — a person you can't protect, a colleague in trouble, a child taking risks — or your own precariousness displaced onto someone safer to worry about. Whether you try to catch them is often the dream's real question." },
    ],
    faq: [
      { question: "If I hit the ground in the dream, will I die?", answer: "This is folklore — and demonstrably false, since plenty of people have hit the ground in falling dreams and woken up to report it. Some describe the landing as the most interesting part: the dream continuing afterward, sometimes with unexpected calm." },
      { question: "Why do I jerk awake as if falling right when I doze off?", answer: "That's a hypnic jerk, a normal reflex of the transition into sleep, experienced at least occasionally by most people. Caffeine, intense evening exercise, sleep deprivation, and stress all make it more frequent. It's not a nightmare and not a health warning, though relentless ones justify better sleep habits." },
      { question: "What does falling mean psychologically?", answer: "The most consistent reading across schools: loss of support or control. Freud saw anxiety about giving in; Adler saw fear of losing status; modern approaches map the dream to whatever real support currently feels unstable. The productive question is 'what am I afraid of losing my grip on right now?'" },
      { question: "Are falling dreams more common under stress?", answer: "Yes — falling ranks among the most common dream themes worldwide, and studies of dream content find it increases during periods of insecurity, work stress, and major transitions. A run of falling dreams is a decent barometer that something feels unsupported." },
      { question: "How do I stop recurring falling dreams?", answer: "Two fronts. Physiological: reduce late caffeine, get consistent sleep. Psychological: identify the unstable thing and act on it, even minimally — falling dreams respond well to regained agency. Some people also learn, in the dream, to turn falling into flying; lucid dreamers report this as one of the easiest transformations." },
    ],
  },
  flying: {
    introduction: [
      "Flying is the rare headline dream that people want to have. In surveys of dream content it consistently ranks among the most common themes, and among the most positively experienced — for many people it's their first lucid dream, the moment 'this is a dream' turns into 'then I can fly.' That pleasure is data. Where falling dreams register lost support, flying dreams tend to register the opposite: agency, escape from constraint, competence suddenly exceeding the problem.",
      "But the tradition is more divided on flying than dreamers expect. Alfred Adler read flying dreams as ambition — sometimes healthy striving, sometimes a compensatory wish to be above others. Freud, characteristically, saw desire. Spiritual traditions have read flight as the soul's freedom or as astral travel. And the dreams themselves push back on pure euphoria more often than remembered: power lines appear, altitude fails, someone on the ground objects. How the flight goes is usually the message.",
    ],
    general: [
      "Grade the flight on three axes: altitude, effort, and audience. Altitude tracks scope — skimming rooftops reads differently from touching cloud; effort tracks how your current striving feels — soaring versus desperate flapping; and audience tracks the social dimension — flying alone in an empty sky, showing someone you can fly, or being shot at, grabbed at, or disbelieved from below. Most flying dreams yield their meaning to those three questions without any dictionary at all.",
      "Then note what the flight is for. Flying away from something continues a chase dream by other means — escape, with the same avoidance questions attached. Flying toward something is ambition or longing with a bearing on it. Flying for its own sake, the purest and most common version, tends to arrive when agency returns after a period of constraint: recovery, breakup, graduation, debt cleared. It is one of the few dream types worth simply enjoying.",
    ],
    psychological: [
      "Flying holds a unique position in dream research as the theme most strongly associated with lucidity: flying dreams disproportionately trigger the realization 'this is a dream,' and once lucid, flying is the single most popular deliberate dream action. Content analyses also find flying dreams skew positive in emotion — a rarity among intense dream types — and correlate with waking feelings of mastery and improved mood on waking.",
      "The classical schools read the theme through ambition and desire. Adler saw flying dreams as the striving for superiority made visible — diagnostic, in his view, of whether ambition was healthy aspiration or compensation for felt inferiority; the dream's texture (joyful ease versus anxious performance for onlookers) told him which. Modern takes are less doctrinal but keep the core: flying dreams track the state of your sense of agency, and their failures — sinking, obstacles, inability to launch — track its specific frustrations.",
    ],
    spiritual: [
      "Flight is the oldest image for the soul's freedom — winged souls in Plato, the ascension motifs of every scripture, shamanic sky-journeys, the Sufi bird returning to its home. A flying dream participates in that lineage whether or not the dreamer holds the beliefs: something in you experienced weightlessness, perspective, and release from the ordinary terms of your life, and remembered it on waking.",
      "The traditions add one discipline to the delight: heights in the spirit are for seeing, not for standing above. A flight that becomes contempt for the ground — for the people, obligations, and ordinariness below — has curdled into the inflation mystics warn about. The test of a genuine ascent, they'd say, is what you do after landing: perspective brought back down is wisdom; altitude hoarded is pride.",
    ],
    islamic: [
      "Classical Islamic interpreters read flying with characteristic precision about details: flying with wings could signify travel, flying from one land to another a change of circumstance or rank, and flying too high without direction, vanity or danger in one's aspirations. Some transmitted readings connect a believer's serene flight with good standing or elevation; anxious, uncontrolled flight leans toward confusion in one's affairs.",
      "The etiquette of glad dreams applies to the joyful version: receive it as encouragement, thank Allah, and share it only with those who wish you well. And the tradition's realism applies to the rest: a dream of flight confers no station — elevation in the real hierarchy it recognizes comes through knowledge, character, and worship, so let a beautiful flying dream point its energy there.",
    ],
    biblical: [
      "The Bible's flight imagery is borrowed strength: 'those who hope in the Lord will renew their strength; they will soar on wings like eagles' — wings given, not grown. Deliverance is carried 'on eagles' wings' out of Egypt; the psalmist wishes for 'wings like a dove' to fly from distress. Scripture's flying is grace and rescue, never self-launch — a useful lens on whether your dream's flight felt like gift or like performance.",
      "The counter-theme is self-exaltation: Isaiah's taunt against the one who said 'I will ascend,' Obadiah's 'though you soar like the eagle... from there I will bring you down.' A biblical reflection on a flying dream might simply ask which story it belongs to — strength renewed for the weary, or altitude claimed for its own sake — and let the dream's own emotional honesty answer.",
    ],
    commonScenarios: [
      { title: "Effortless, Joyful Flight", meaning: "The benchmark version — confidence, release, life above the obstacles. These dreams cluster after real wins: escaping a bad situation, finishing something hard, recovering health. Sometimes they're simply pleasure, and demand no analysis." },
      { title: "Struggling to Stay in the Air", meaning: "The most interpretively rich variant. Flapping hard, gaining a few feet, sinking again — this maps almost one-to-one onto waking effort that isn't producing lift: a business, a job search, a recovery that won't hold altitude. Note what makes you sink in the dream." },
      { title: "Flying Too Low, Dodging Wires", meaning: "Freedom hemmed in by infrastructure. Power lines, ceilings, trees, and rooftops usually stand for practical constraints and other people's rules — you have the capability, but the environment keeps it low. Common in competent people in restrictive jobs." },
      { title: "Being Unable to Take Off While Chased", meaning: "The hybrid nightmare: escape exists but won't activate. It tends to appear when your usual strengths — talent, charm, competence — aren't working on a current threat, and it measures the panic of that discovery." },
      { title: "Flying With Someone", meaning: "Shared altitude — a relationship experienced as freeing rather than heavy. Losing them mid-flight, or being unable to lift them with you, tends to voice a growth gap: you're rising in a way they can't or won't follow." },
      { title: "Realizing Mid-Dream You Can Fly", meaning: "Often the doorway to lucidity, and worth cultivating if you enjoy it. Symbolically it's the moment of remembered capability — recalling in a difficult period that you have powers you'd forgotten. Dreamers often wake from these with a distinct, carried-over confidence." },
    ],
    faq: [
      { question: "Why are flying dreams so enjoyable?", answer: "They combine three pleasures the brain rates highly: motion, mastery, and freedom from threat. Researchers also note flying dreams are disproportionately associated with lucidity — you're more likely to know you're dreaming, which adds control to the pleasure." },
      { question: "What does it mean if I can't fly high, or keep sinking?", answer: "The gap between capability and altitude is usually the point: effort in some waking pursuit isn't converting into progress. Look for the specific drag in the dream — fear of heights, watchers, heaviness — as a candidate for what's limiting you awake." },
      { question: "Can I make flying dreams happen?", answer: "You can raise the odds. Flying is one of the most commonly chosen actions in lucid dreams, so lucidity practices help: reality checks during the day, dream journaling, and the MILD technique (rehearsing 'next time I'm dreaming, I'll know it'). Falling or floating sensations as you drift off can also convert into flight with practice." },
      { question: "Is dreaming of flying spiritual?", answer: "Many traditions say yes — flight as the soul's liberty, ascent toward the divine, or in some frameworks astral projection. A grounded approach works within any belief system: ask what the flight freed you from and what it let you see, and treat that as the dream's contribution, whatever its source." },
      { question: "I used to fly in dreams and stopped. Why?", answer: "Dream content shifts with life phases; flying dreams often thin out under prolonged routine, responsibility, or low mood — and return with novelty, freedom, and confidence. Some people re-seed them deliberately by revisiting the memory of past flying dreams before sleep." },
    ],
  },
  water: {
    introduction: [
      "Water may be the most universal symbol dreams have. Every interpretive tradition — Jungian, Islamic, biblical, Chinese, folk — reserves a central place for it, and they agree to an unusual degree on the core: water stands for emotion and the inner life, and its condition in the dream describes the condition of yours. Clear or murky, calm or storm-driven, rising or receding, contained in a glass or vast as an ocean — dreamers usually find the state of the water easier to read than almost any other dream detail, once they think to check it.",
      "The second thing to check is your position relative to it. Watching water from shore, wading in by choice, being caught in a current, breathing underwater without fear, drowning — each describes a different relationship with the same feelings. Many water dreams turn out to be less about which emotion (grief, love, anxiety, longing) than about your stance: avoiding, testing, immersed, carried, or overwhelmed. That stance is often the one piece of information the dream adds to what you already knew.",
    ],
    general: [
      "Inventory the water's properties like a report: clarity (how well you can see into the situation), temperature (the warmth or coldness of the feeling involved), movement (whether things are progressing, stagnant, or churning), depth (how far beneath the surface the matter runs), and containment (a glass, a pool, a river, the open sea — how bounded the emotion is). Dreamers who run this checklist usually identify the waking-life referent before finishing it.",
      "Container matters as much as condition. Bathtubs and pools are emotion in managed doses — chosen, bounded, private. Rivers add direction and current: life moving, with or without your paddling. Lakes hold still depth; oceans remove the far shore entirely and speak of what exceeds you. And water where it shouldn't be — seeping through ceilings, pooling in basements — is feeling leaking into structures meant to keep it out: work, family roles, composure.",
    ],
    psychological: [
      "Psychology's water-reading rests on a real correspondence: emotion, like water, is something we speak of in levels, waves, floods, and depths — the metaphor is so entrenched in language that the dreaming mind can rely on it as shared vocabulary. Depth psychology goes further: Jung treated bodies of water as the standing image of the unconscious itself, with the shoreline as the negotiated border between what you know about yourself and what lives below.",
      "Empirically, water-threat dreams behave like emotional barometers: tidal waves and floods are documented to increase after trauma and during anticipatory stress, and drowning dreams cluster in people carrying unshared burdens. There is also a bodily footnote worth knowing — thirst, a full bladder, and even sounds of rain can seed water imagery, and sleep-apnea patients report choking and drowning dreams at elevated rates. Rule out the plumbing before analyzing the sea.",
    ],
    spiritual: [
      "Water is the most heavily consecrated substance in human religion: baptism, ritual bathing, ablution before prayer, holy rivers, libations. Its spiritual grammar is remarkably stable across traditions — washing away the old, dissolving what was rigid, carrying life to what was dry. A water dream borrows this grammar, and often reads as a status report on cleansing and renewal: what needs washing, what is mid-dissolve, what parched part of your life the water is trying to reach.",
      "The traditions also respect water's dangerous face: the flood, the deep, the sea as chaos. Spiritually, overwhelming water in a dream is frequently read not as punishment but as the necessary dissolution before re-formation — the point in transformation where the old shape must come apart. The counsel across traditions converges: stop fighting the current you cannot beat, and attend to what is being carried away versus what, in you, actually floats.",
    ],
    islamic: [
      "Water carries strong and mostly favorable weight in Islamic interpretation: clear water is read toward lawful provision, knowledge, and life — the Qur'an declares that every living thing was made from water — while murky, hot, or foul water leans toward trial, doubtful earnings, or illness. Rain is often mercy, though a destructive flood can signify tribulation for a place. Drinking pure water may be read as goodness attained; drinking from the sea, as acquiring knowledge or wealth in some transmissions.",
      "The physical purity system deepens the resonance: wudu and ghusl make water the daily instrument of readiness for prayer, so dream-water easily speaks to one's spiritual cleanliness and preparation. A believer might receive a dream of clean, abundant water with gratitude, and let a dream of filthy or blocked water prompt the obvious inventory — earnings, habits, prayers — with the usual rule intact: dreams counsel, they do not convict.",
    ],
    biblical: [
      "The Bible opens with the Spirit hovering over the waters and closes with the river of life; in between, water marks nearly every decisive moment — the flood, the Red Sea, the Jordan, Jonah's deep, the baptism, the stilled storm, 'living water' offered at a well. Scripture's water is double throughout: the chaos God subdues and the life God gives. A water dream sits comfortably in either column, and its condition — threatening or life-giving — usually declares which.",
      "Two biblical images serve dreamers especially well. For overwhelming water: the storm on Galilee, where the question 'do you still have no faith?' is asked inside the boat, not after rescue. For thirst and dryness: the invitation 'let anyone who is thirsty come to me and drink.' A believer's reflection on a water dream can be as simple as locating themselves in one of those two scenes — swamped or thirsty — and responding accordingly.",
    ],
    commonScenarios: [
      { title: "Calm, Clear Water", meaning: "The rare unambiguous good sign in dream interpretation: emotional clarity, honesty with yourself, peace after turbulence. If it appears mid-crisis, dreamers often read it as the deeper layer — the part of you that already knows things will settle." },
      { title: "Murky or Dirty Water", meaning: "Contaminated clarity: a situation or relationship you cannot see into, mixed motives (yours or someone else's), or emotional residue from something unfinished. The instinct not to enter dirty dream-water is usually worth translating literally." },
      { title: "Rising Water or Flood", meaning: "Emotion or circumstance exceeding capacity — the workload, the grief, the news cycle, the family situation rising faster than you can adapt. Where the water rises matters: a flooding house points the theme at private and family life." },
      { title: "Drowning", meaning: "Overwhelm at its most explicit, and often a dream about help: whether anyone notices, whether you call out, whether you stop struggling. People carrying too much silently report this dream with striking frequency — it tends to precede, and sometimes prompts, finally asking." },
      { title: "Breathing Underwater", meaning: "The overwhelm scenario transformed: submerged in deep emotion and discovering you can survive there. Often appears partway through grief or therapy — the feelings haven't shrunk, but your capacity has grown. Widely reported as one of the most reassuring dream experiences." },
      { title: "Tidal Wave on the Horizon", meaning: "Anticipated overwhelm — the seen-but-not-yet-arrived crisis. Tsunami dreams cluster before known challenges (a diagnosis pending, a merger announced, a wedding, a birth) and during periods of ambient dread. What you do as it approaches — run, freeze, watch, dive in — is the dream's live question." },
    ],
    faq: [
      { question: "What does water represent in dreams?", answer: "Across nearly every tradition: emotion and the inner life, with the water's condition mirroring yours. Depth tends to correspond to how conscious the feeling is — surfaces and shallows for what you know you feel, deep water for what moves underneath." },
      { question: "Is dreaming of a flood a warning?", answer: "Not of literal disaster. Flood dreams track the feeling of being exceeded — emotionally, practically, or both — and they often precede the conscious admission of it. The useful response is triage awake: what is actually rising, and what can be handed off or let go?" },
      { question: "I dream of tsunamis repeatedly. Why?", answer: "Tsunami dreams are strongly associated with anticipatory anxiety — a large thing approaching that you feel unable to stop — and with past overwhelm, including trauma, replaying its signature. If they're frequent and distressing, they respond well to the same techniques used for recurrent nightmares, including imagery rehearsal." },
      { question: "What does drowning in a dream mean if I can actually swim?", answer: "Swimming skill is irrelevant — dream drowning is about emotional capacity, not technique. It usually voices overload plus silence: too much carried, too little said. Many people find the dream stops after they tell someone how deep the water actually got." },
      { question: "What do water dreams mean in Islam and the Bible?", answer: "Islamic interpretation often reads clear water as blessing, knowledge, or lawful provision, and murky or turbulent water as trial or doubtful gain — condition governs meaning. Biblical imagery runs the same span: living water as renewal and the Spirit, floods as judgment and chaos overcome. Both traditions, notably, read the water's clarity the way modern psychology does." },
    ],
  },
  spider: {
    introduction: [
      "Spider dreams get filed under 'nightmare' too quickly. Arachnophobia is common enough that for many dreamers the spider is pure fear-costume — but the symbol itself is one of the most double-sided in the dictionary. The same creature that ambushes prey also produces the web: one of nature's most patient, precise pieces of engineering. Which spider visited you — the lurker or the weaver — is the first and most important question.",
      "The web is usually where the meaning lives. Spiders in dreams tend to appear when something in your life is being constructed slowly and mostly out of sight: a plan, an influence, a debt, a relationship dynamic, a body of work. If the web felt like craftsmanship, the dream leans toward your own patient building. If it felt like a trap — sticky, encircling, hard to leave — the dream is asking who or what has been quietly wrapping threads around your options.",
    ],
    general: [
      "Position determines reading. A spider overhead suggests an influence hanging over you that hasn't landed yet; one on your body, an entanglement that has already gotten personal; one in a corner doing its work, a background process — often neutral or even productive — that you've only just noticed. Size tends to scale with how much of your attention the underlying issue is demanding, which is why 'small worry' dreams feature small spiders until the worry is ignored long enough.",
      "Your action matters more here than in most dreams, because every option is symbolically loaded: killing the spider ends something patient (a threat, but sometimes a project); freeing it outside negotiates coexistence; watching it weave is often the dream endorsing observation over intervention; being unable to find it after it disappears is the signature of anxieties that operate best unlocated. Note also whether the web caught anything — including you.",
    ],
    psychological: [
      "Spider fear runs deep and early: like snakes, spiders are detected faster than neutral objects in visual-attention studies, and spider phobia is among the most prevalent specific phobias. For phobic dreamers, spider nightmares often simply track anxiety load and need no symbolic decoding. For everyone else, psychologists note the spider's distinctive dream-role: it stands for indirect threat — manipulation, entanglement, schemes — rather than open attack, which is the snake's department.",
      "The classic depth-psychology reading adds the weaver: the spider as image of the part of the psyche that constructs — plots, plans, creative work, and also the webs of obligation and narrative we spin around ourselves. Some analysts, following themes in Jungian literature, link spider dreams to enmeshed relationships, especially with a controlling caregiver or partner — the web as love that binds too well. If a specific person came to mind while reading that sentence, the dream may already be interpreted.",
    ],
    spiritual: [
      "Spider takes an honored place in many traditions: Grandmother Spider weaves the world in several Native American cosmologies; in West African tradition Anansi the spider owns all stories; the Sanskrit image of Indra's net pictures reality itself as an infinite web of mutual reflection. In these frames a spider dream is an invitation to notice the web you inhabit — the connections, dependencies, and consequences radiating from every choice you make.",
      "The spiritual practice a spider dream suggests is the weaver's discipline: patient, deliberate creation, thread by thread, and honest inspection of what your web is actually catching. It also carries the weaver's warning — webs built to catch others eventually define the builder's own position. Ask what you are spinning, for whom, and whether you would be content to live at its center.",
    ],
    islamic: [
      "The spider gives Islamic tradition one of its most quoted images: 'the frailest of houses is the spider's house' (Surah Al-Ankabut — 'The Spider'), a parable for lives built on other than Allah. A dream-spider read through that verse becomes a question about foundations: what fragile construction are you treating as shelter? Some transmitted interpretations also read the spider as a weak but spiteful person, or connect it to a devious woman or a heedless weaver of schemes — context deciding.",
      "Yet the spider also appears in the sirah on the side of protection: the web spun across the cave of Thawr, by Allah's design, turned pursuers away from the Prophet ﷺ and Abu Bakr. The tradition thus holds both readings a dreamer needs — the web as false refuge and the web as unexpected divine shielding — and the dream's own feeling of menace or protection usually indicates which applies.",
    ],
    biblical: [
      "Scripture uses the spider's web precisely and always the same way: as the image of what cannot bear weight. Job says the godless man 'leans on his web and it does not hold'; Isaiah describes evildoers who 'weave the spider's web,' whose 'webs will not become garments.' The biblical spider-question is structural: what in your life looks like fabric but is actually web — impressive, intricate, and unable to clothe or hold you?",
      "A biblical reflection on a spider dream therefore audits constructions: schemes, self-justifications, financial structures, relationships of convenience. It may also examine your own weaving — whether anything you're building is designed, like a web, to catch someone. The alternative scripture offers to web-building is house-building on rock: slower, less clever, and weight-bearing.",
    ],
    commonScenarios: [
      { title: "A Spider Descending Toward You", meaning: "Something impending — a decision, confrontation, or consequence — lowering itself into range on a thread you can see but haven't cut. The dream measures the dread of approach rather than the event itself." },
      { title: "Walking Into a Web", meaning: "The signature dream of discovering entanglement after the fact: obligations, office politics, or a relationship's fine print you've only just felt on your skin. How thoroughly you're stuck is the dream's estimate of the cost of exit." },
      { title: "A Giant Spider", meaning: "Scale is the message: an influence, fear, or controlling presence has outgrown ignorable size. In many dreamers' reports, the giant spider stands for a person — often one whose care and control are hard to tell apart." },
      { title: "Spiders in Your Bed or Hair", meaning: "Entanglement at maximum intimacy — worries invading rest, or manipulation operating inside your closest relationships. These versions tend to coincide with sleep-disturbing anxiety about someone specific." },
      { title: "Killing a Spider", meaning: "Decisive ending of something patient and quiet — a fear confronted, a manipulation exposed, or a scheme (sometimes your own) abandoned. If relief follows, the dream approves; if unease follows, ask what constructive thing died with it." },
      { title: "A Spider Calmly Weaving", meaning: "Often the best spider dream to have: patient work proceeding as designed. Dreamers in long projects — writing, building a practice, recovering — frequently meet this spider, and it usually reads as an endorsement of the slow method." },
    ],
    faq: [
      { question: "I'm terrified of spiders. Does my spider dream still mean something?", answer: "Possibly less than it would for others: in phobic dreamers, spider nightmares mostly track general stress, since the brain reaches for its most reliable fear-image whenever anxiety needs a face. Frequency, not content, is your signal — a spike in spider dreams is a spike in load." },
      { question: "Do spider dreams mean someone is manipulating me?", answer: "They can reflect a felt entanglement — being caught in someone's plans, debts, or emotional web — but the dream registers your feeling, not their guilt. Use it as a prompt to examine the relationship's mechanics awake: who benefits from the current arrangement, and how freely can you leave it?" },
      { question: "What does a spider bite in a dream mean?", answer: "Spider venom works slowly, and dreamers seem to know it: the bite usually stands for a small injury with delayed consequences — a remark, a clause, a betrayal whose effects arrive later. Where you were bitten, and whether you noticed at the time, refine the reading." },
      { question: "Is a spider dream good luck for money?", answer: "Several folk traditions do link spiders to money and weaving to accumulating wealth — the English 'money spider' survives from this. Dream interpretation can honor the association where the dream's web felt like productive building; it's folklore, though, not forecast." },
      { question: "Why do I dream of spiders during stressful projects?", answer: "Because the spider is the psyche's project manager: patient construction, thread by thread, with the constant question of whether the structure will hold and what it will catch. Many people find spider dreams cluster mid-project and read best as progress reports — check the state of the dream-web against the state of the work." },
    ],
  },
  dog: {
    introduction: [
      "We dream about dogs more than any other animal, and researchers think the reason is unglamorous: dreams draw on daily emotional life, and dogs are simply in it — a third of households, ten thousand years of co-evolution, the only animal that reads human faces natively. So the first interpretive question is disarmingly literal: is this about an actual dog? Dreams of living, deceased, or childhood dogs are usually about exactly those dogs and the love or grief attached.",
      "When the dog is symbolic, it almost always speaks the language of loyalty. Dogs in dreams stand for the trusting bonds in your life — friendship, partnership, faithfulness given or owed — and the dream-dog's condition reports on theirs. A thriving, joyful dog and a neglected, starving one are opposite verdicts on how the relationships you rely on are being tended. The aggressive dog is its own case: trust's dark twin, betrayal — or loyalty defending something you'd rather not have guarded.",
    ],
    general: [
      "Read the dog's state before its actions: healthy or sick, groomed or matted, fed or starving — dreamers consistently find this maps onto a specific relationship's condition, sometimes embarrassingly precisely. A forgotten dog you suddenly remember you own (a surprisingly common dream) is the genre's masterpiece: a friendship or commitment you've failed to feed, discovered with a jolt of guilt that usually survives into the morning.",
      "Then read the bond. Whose dog was it? A childhood dog imports that era's loyalties and losses; your current dog usually plays itself; an unknown dog that adopts you often marks new loyalty entering your life — a person or opportunity offering attachment. Aggression complicates rather than reverses this: a threatening dog is still a trust-symbol, now asking where a trusted bond has turned, or what your own protective instincts are snarling about.",
    ],
    psychological: [
      "Content analyses of dream reports confirm dogs as the most frequent animal in adult dreams, and the emotional range they carry is wider than any other dream animal — from pure comfort to outright terror. Psychologists studying pet-owner dreams note they engage the attachment system directly: dreams of one's own dog activate the same caregiving and bonding themes as dreams of children, and grief dreams after a pet's death follow the structure of human bereavement dreams, visitations included.",
      "The symbolic dog earns its meaning from domestication itself: the dog is instinct that accepted relationship — the wild thing that chose loyalty. Dreams use it accordingly, to represent the socialized parts of your own nature: aggression trained into protection, appetite trained into companionship. A dream-dog turning on you can therefore mark the return of what was tamed — your own anger or need surfacing inside a relationship that was supposed to have domesticated it.",
    ],
    spiritual: [
      "Dogs guard thresholds across mythology — Anubis weighing hearts in Egypt, Cerberus at the Greek underworld, the dog who refuses heaven without his master at the end of the Mahabharata, where the loyal dog turns out to be Dharma itself. The spiritual dog is the companion at crossings: guide, guard, and witness. A dog appearing at a transition point in your life keeps very old company.",
      "The tradition's consistent teaching through the dog is fidelity as a spiritual quality — the Mahabharata's closing lesson is that the man who would not abandon his dog had passed the final test. A dog dream can be received as an examination of your fidelities: what have you remained faithful to, what faithful thing have you abandoned, and what has remained faithful to you regardless?",
    ],
    islamic: [
      "Islamic interpretive tradition often reads the dream-dog toward persons: a barking or attacking dog as an insolent or hostile man, a friendly dog toward companionship of limited reliability, and a guard dog toward protection of household and property. The Qur'an itself gives the tradition its most honored dog — the companion of the People of the Cave, stretched at the threshold, guarding the sleepers — a scriptural anchor for the dog as faithful guardian.",
      "Rulings about dogs in waking life (on purity and keeping them indoors) belong to fiqh and do not automatically make a dog dream inauspicious; interpreters treat the dream on its own terms. A distressing dog-attack dream falls under the usual etiquette — seek refuge in Allah, don't narrate it widely — while a dream of a loyal dog guarding you may be received as what it feels like: a sign of protection in your affairs.",
    ],
    biblical: [
      "Honesty requires saying it: dogs fare poorly in scripture, where they appear mostly as scavengers and as bywords for what is unclean or contemptible — 'do not give dogs what is sacred.' The Bible predates the household dog of modern love, and its dog-imagery reflects the semi-feral street dogs of the ancient Near East. A biblical reading of a dog dream should therefore lean on scripture's themes rather than its literal dog-references.",
      "The relevant themes are covenant loyalty and watchfulness. Scripture's word for steadfast faithful love — hesed — describes exactly what modern dreamers see in the dog, and Isaiah's image of watchmen as silent dogs who fail to bark gives the guard-dog its biblical office: the conscience or community that must sound warning. Ask what your dream-dog was guarding, and whether it barked — and whether anyone listened.",
    ],
    commonScenarios: [
      { title: "Your Own Dog, Living or Dead", meaning: "Usually literal: attachment, care, or grief for that animal. Dreams of deceased pets returning healthy are among the most commonly reported comfort dreams, and most dreamers experience them as consoling visits rather than symbols needing decoding." },
      { title: "A Dog Attacking You", meaning: "Trust's alarm system: betrayal by someone close, a loyal relationship turning hostile, or your own defensive anger breaking its training. Whether the dog was yours, someone else's, or unknown assigns the conflict its owner." },
      { title: "A Stray That Follows You Home", meaning: "New loyalty auditioning for a place in your life — a person, opportunity, or responsibility offering attachment. Your dream-response (welcoming, wary, unable to shake it off) is usually your honest answer to the real thing." },
      { title: "A Neglected or Starving Dog", meaning: "The guilt dream of the genre: a faithful bond — friendship, partnership, even your own body or health — that has kept waiting while you were busy. Dreamers typically know within seconds of waking exactly which bond it is." },
      { title: "A Dog Barking a Warning", meaning: "Instinct raising an alarm your conscious mind has overruled — about a person, a plan, a deal. The guard dog barks at what it perceives before you do; the dream asks whether you'll check what it sees or silence it." },
      { title: "A Puppy", meaning: "New attachment in its demanding phase: a friendship, relationship, or commitment that is delightful and not yet trained — needing consistency you may or may not have budgeted for. Sometimes simply a wish: puppies are the dream's purest image of uncomplicated love." },
    ],
    faq: [
      { question: "I keep dreaming about my dog who died. Is that normal?", answer: "Very — pet-loss dreams follow the same pattern as dreams of deceased people, evolving from distressing toward comforting, and many owners report 'visit' dreams where the animal appears healthy and content. Grief for an animal is real grief; the dreams are part of how it completes itself." },
      { question: "What does a dog attack mean if I love dogs?", answer: "The attack borrows the dog's meaning, not your feelings about dogs: something in the loyalty department has turned — a trusted person's hostility, a betrayal, or your own protective anger surprising you with its force. Dog-lovers often have the more intense versions precisely because the symbol carries more trust to violate." },
      { question: "Does a black dog in a dream mean depression?", answer: "The 'black dog' has been an English idiom for depression since Samuel Johnson, popularized by Churchill, and some dreamers' black dogs do carry that weight — a dark, persistent follower. But black dogs are also just common dogs; check whether yours behaved like a mood (following, waiting, heavy) or like an animal." },
      { question: "What does it mean to dream of many dogs?", answer: "A pack usually points to a social world — friend group, team, family — and pack behavior is the reading: were you welcomed, ignored, herded, or hunted? Pack-hunted dreams tend to accompany feeling ganged up on; running with the pack, belonging or conformity, depending on how it felt." },
      { question: "Is a dog dream good or bad in Islam?", answer: "It depends on the dog's conduct in the dream: transmitted readings run from hostile men (barking, biting) to faithful guardianship — the Qur'an honors the dog of the Cave companions as a guardian of the faithful. The dream's own tenor of threat or protection generally decides which transmitted meaning applies." },
    ],
  },
  cat: {
    introduction: [
      "Cat dreams have a built-in interpretive joke: the animal that stands for independence refuses to hold still for interpretation too. Across traditions the cat carries the widest spread of meanings of any common dream animal — divine protector in Egypt, witch's familiar in medieval Europe, symbol of feminine power, emblem of deceit, ordinary beloved pet. Your own relationship to cats calibrates the dream more than any dictionary: a cat person's cat and a cat-avoider's cat are different symbols wearing the same fur.",
      "What the traditions do agree on is the cat's territory: the self-possessed, the intuitive, the unforced. Dogs in dreams are about bonds; cats are about boundaries — affection on its own terms, presence without submission, watching without being watched back. Cat dreams tend to arrive when questions of independence are live: yours being negotiated in a relationship, someone else's frustrating your wish for closeness, or a part of you that answers to no one asking for acknowledgment.",
    ],
    general: [
      "The cat's response to you is the meaning's hinge. A cat that comes to you freely marks trust arriving on proper terms — unforced, and therefore reliable. A cat that ignores you often stands for a person or feeling that won't perform on demand, and the dream measures your tolerance for that. A cat that scratches when grabbed is the symbol at its most legible: something in your life responds badly to control, and the wounds are coming from the grabbing, not the cat.",
      "Ownership and setting refine it. Your actual cat usually plays itself, carrying real affection or worry. An unknown cat in your house suggests an independent presence newly inside your private life — a person, an attitude, a desire — comfortable there whether or not it was invited. Many cats at once tends toward an environment of unreadable agendas: a workplace or family where everyone is self-contained and nobody's motives are on display.",
    ],
    psychological: [
      "Psychologically the cat is the counter-symbol to the dog: attachment without dependence. Analysts read dream-cats as the self-sufficient stratum of the personality — the part that observes, withholds, and does not need — and note that cat dreams often visit people who are either recovering their independence (after a controlling relationship, a demanding role) or bumping against someone else's. The cat's comfort in your dream is a fair readout of your comfort with unowned parts of yourself.",
      "The Jungian tradition links the cat to the feminine principle and to intuition — knowledge that arrives without argument, on soft feet. A dream-cat staring at something you can't see is this made literal: some perception of yours is operating below the threshold of admission. The aggressive cat, in this frame, is intuition or independence that has been suppressed long enough to turn feral — needs dismissed as 'needy' returning with claws.",
    ],
    spiritual: [
      "The cat's spiritual résumé is extreme at both ends: Bastet's temple cats were mummified with honors in Egypt, while medieval Europe burned cats alongside accused witches — the same animal, holy and damned, for the same qualities: night sight, self-possession, uncanny watching. A cat dream inherits this charge. Whatever in you or your life the cat represents, it is something that draws both reverence and suspicion for refusing to be governed.",
      "Traditions that honor the cat read it as guardian of thresholds — between seen and unseen, day and night, conscious and not. A cat appearing in a dream at a decision point may be read as an invitation to trust night-knowledge: perception, timing, and patience over force. The cat's method is the teaching — wait, watch, and land on your feet.",
    ],
    islamic: [
      "The cat holds gentle standing in Islamic tradition: it is a clean animal (the Prophet ﷺ is reported to have permitted ablution from water a cat drank from), the companion Abu Hurairah — 'father of the kitten' — carries one in his very name, and the hadith about the woman punished for imprisoning a cat until it starved made the animal a lasting lesson in mercy. Cruelty to a dream-cat therefore reads badly against the dreamer, not the cat.",
      "Transmitted dream-readings vary: some interpreters incline toward the cat as a household servant or guard, others toward a thief of the household when it snatches or slinks — the dream's action deciding. As always the tradition counsels moderation in reading: a dream of a comfortable cat in the home carries no alarm, and a distressing cat-dream, like any other, is met with refuge in Allah rather than suspicion of anyone.",
    ],
    biblical: [
      "Domestic cats are absent from the biblical text — the one scriptural mention is in the deuterocanonical Letter of Jeremiah, where cats sit on idols — so a biblical reading works honestly through the cat's qualities rather than proof-texts. The qualities scripture would engage: watchfulness in the night ('keep watch'), self-containment, and the unsettling gaze of what sees without being seen.",
      "Two biblical themes serve cat dreams well. The lion — scripture's great cat — spans the same poles as the house cat's folklore: the devil prowling 'like a roaring lion' and the Lion of Judah, threat and majesty in one form. And scripture's persistent theme of the hidden heart — known fully only to God — matches the cat's dream-office: the presence in your life, or in you, whose inner workings are simply not on offer. The reflective question is whether you can love what you cannot audit.",
    ],
    commonScenarios: [
      { title: "A Cat That Won't Come to You", meaning: "The dream's study in unforced relationship: a person, feeling, or opportunity that will not respond to demand. Frustration in the dream usually mirrors a waking relationship where closeness is being pursued at the wrong speed." },
      { title: "Being Scratched or Bitten", meaning: "A boundary enforced — often one you crossed. Cat aggression in dreams is rarely random; it typically follows dream-grabbing, and maps onto waking situations where control provoked exactly the resistance it feared." },
      { title: "A Cat Staring at Something Unseen", meaning: "Intuition personified: part of you has noticed something — about a person, a plan, a room's atmosphere — that hasn't reached conscious admission. Dreamers often report identifying the real-life referent within a day or two." },
      { title: "Kittens", meaning: "New independence in its fragile phase: a budding autonomy (yours or someone else's, often a child's or partner's) that needs protection without possession. Also, frequently, simple new-responsibility dreams for people acquiring actual charges." },
      { title: "A Cat in Your House You Don't Own", meaning: "An independent presence established inside your private world — a person's influence, a habit, a desire — at ease whether or not it was invited. Your dream-reaction (charmed, uneasy, evicting it) is your position on the real thing." },
      { title: "A Sick, Stray, or Dead Cat", meaning: "Independence in poor condition: your autonomy eroded by circumstance or relationship, intuition ignored until it weakened, or grief for a self-possessed phase of life. If you have an actual ailing cat, the dream is likely just worry, faithfully transcribed." },
    ],
    faq: [
      { question: "What do cat dreams mean if I don't own a cat?", answer: "Then the cat is working purely as symbol — usually independence, intuition, or a self-contained person in your orbit. Ask who or what in your life gives affection strictly on its own terms; most dreamers land on a referent quickly, and it is sometimes themselves." },
      { question: "Is a black cat in a dream bad luck?", answer: "Only folklore says so, and folklore can't even agree — black cats are unlucky in some countries and lucky in others (a black cat crossing your path is good fortune in Britain and Japan). In dreams, black tends to add 'unknown' rather than 'evil': an independence or intuition you can't yet read." },
      { question: "Why do I dream my cat is lost or dying?", answer: "If the cat is real, it's attachment anxiety doing its rounds — such dreams spike when a pet is old, ill, or newly adopted, and they're rehearsals, not omens. If the cat is symbolic, losing it points to independence or intuition slipping — often during a relationship or job that requires more compliance than suits you." },
      { question: "What does it mean when a cat attacks me in a dream?", answer: "Check what the dream-you did just before: cat attacks usually enforce a boundary against holding, grabbing, or cornering. In waking terms — someone (or some part of you) is reacting sharply to control. The scratch is information about the grip." },
      { question: "Do cats in dreams represent women?", answer: "That's the traditional association in several cultures and in Jungian writing — the cat as feminine energy, intuition, sensuality. It fits some dreams and misleads in others; treat it as one hypothesis, tested against who the cat actually behaved like in your dream." },
    ],
  },
  house: {
    introduction: [
      "The house is dream interpretation's most agreed-upon symbol: the house is you. Jung dreamed of a house whose floors descended through the centuries and built half his psychology on it; therapists still ask 'what's in the basement?' because the mapping is so reliable. Facade as public self, living room as social life, bedroom as intimacy, basement as the stored and suppressed, attic as memory and the mental — dreamers navigate this architecture nightly without being taught it.",
      "That's why the most common house dream is discovery: a door you never noticed, rooms beyond it, sometimes whole wings. People wake from these dreams strangely moved, and the standard reading earns its keep — the psyche reporting capacities, memories, or possible lives you own without inhabiting. The house's condition works the same way: what's flooded, burning, crumbling, or newly renovated in the dream usually has a counterpart in the self that a moment's honesty can name.",
    ],
    general: [
      "Which house matters first. Your childhood home imports the family patterns formed there — dreams set in it often work on issues that began there, whatever costume they now wear. Your current home usually addresses present life at its most literal. An unknown house that feels like yours is the self in general; a grand unfamiliar house often coincides with expanding possibility, a cramped or decaying one with a life that's grown too small for you.",
      "Then run the surveyor's checklist. Foundation problems point to fundamentals: health, marriage, income, faith. Intruders test boundaries — who or what has gotten in. Water where it shouldn't be is emotion breaching containment; fire is transformation or consuming feeling; missing walls or doors that won't lock, exposure and privacy failing. And repairs matter: dreamers renovating, painting, or fixing a dream-house are usually mid-repair on themselves, and the dream tends to be encouraging about it.",
    ],
    psychological: [
      "The house-as-self reading has unusual empirical company: dreams of childhood homes persist for decades after moving out, and content analyses find the home among the most frequent dream settings at every age — the mind's default stage. Psychologists note that house dreams intensify around identity transitions (moving, divorce, retirement, empty nest), exactly when the self's floor plan is being redrawn.",
      "The rooms carry clinical folklore that often proves apt: basements for what's stored out of sight (dreams of basement discoveries frequently accompany therapy or memoir-writing), attics for the mental and the archived, locked rooms for the avoided. Jung's descending-house dream — each floor an older layer of the psyche — remains the template: depth in a house dream tends to mean depth in time, and what you find down there is usually yours, however unfamiliar.",
    ],
    spiritual: [
      "Spiritual traditions build with the same metaphor: Teresa of Ávila's Interior Castle maps the soul as a house of many mansions with God at the center; Jesus speaks of the Father's house of many rooms; Sufi poetry sweeps the heart's house clear for the Beloved. Rumi's 'Guest House' makes the practice explicit — every emotion a visitor to be welcomed at the door. A house dream, in these frames, is a tour of the soul's current hospitality.",
      "The recurring spiritual questions match the dream's architecture: what is enshrined at the center of your house, who is welcomed and who turned away, and which rooms are kept locked even from yourself? Discovering new rooms carries special weight here — nearly every tradition insists the interior is larger than the inhabitant suspects, and treats the discovery not as anomaly but as invitation.",
    ],
    islamic: [
      "Classical Islamic interpretation reads the house largely as the tradition's psychology would predict: the dreamer's self, life circumstances, wife or household, and religion. A spacious, well-lit house inclines toward relief and expansion in one's condition; a cramped or ruined one toward constriction; entering an unknown beautiful house has been read toward reward, and repairing a house toward mending one's affairs or faith. The door often stands for the woman of the house or the dreamer's security — its condition mattering accordingly.",
      "The Qur'anic resonances are close at hand: the spider's fragile house as the image of misplaced reliance, and the du'a of Pharaoh's wife — 'My Lord, build for me a house with You in Paradise' — as the believer's true architecture. A house dream can thus be received as an audit of both dwellings: the worldly affairs the house depicts, and the eternal house one's deeds are building.",
    ],
    biblical: [
      "Scripture is a builder's book: the house on rock versus sand, the temple as God's house and then the body as temple, 'unless the Lord builds the house, the builders labor in vain,' the Father's house of many rooms. Biblical house-language is always about foundations and occupancy — what the structure rests on, and who lives inside. A house dream translates into these questions without strain.",
      "Two texts do special work for dreamers. For crumbling or storm-struck houses: the parable of the two builders, where identical storms reveal only the foundations' difference — the dream asking what yours is actually on. For discovered rooms: 'in my Father's house are many rooms' — the promise that the dwelling is larger than the known portion. And for intruder dreams, scripture's realism: the householder who watches, because what fills a swept house matters as much as what was driven out.",
    ],
    commonScenarios: [
      { title: "Discovering New Rooms", meaning: "The classic and most beloved house dream: capacities, histories, or possible lives you own without occupying. It clusters around midlife, new ventures, and therapy — moments when the self's floor plan turns out bigger than assumed. Almost always worth taking as encouragement." },
      { title: "An Intruder in the House", meaning: "Boundary breach at the level of self: a person's influence, a fear, or a demand that has gotten inside. Who the intruder is (known, unknown, unseen) and where they got in — door left open, window forced — usually maps the real-life entry point." },
      { title: "Your Childhood Home", meaning: "The family patterns formed there, revisited — often because a current situation is rhyming with an old one. Which room the dream uses, and who is present or conspicuously absent, points to the pattern in question." },
      { title: "A Flooding or Leaking House", meaning: "Emotion exceeding the self's containment: grief, stress, or a family situation seeping into structures meant to hold it out. Which floor floods matters — basements suggest old feeling rising; ceilings, trouble arriving from above your control." },
      { title: "A Crumbling or Collapsing House", meaning: "Foundations in question — health, marriage, finances, faith — usually already sensed awake. Note what the dream shows failing first and whether the dream-you inspects, flees, or repairs; that's typically your current real strategy, appraised." },
      { title: "Being Locked Out (or In)", meaning: "Access to yourself, obstructed: locked out suggests estrangement from your own life — home, role, or identity you can see but can't enter; locked in, a self or situation grown confining. The key's location, if the dream provides one, is usually the useful detail." },
    ],
    faq: [
      { question: "What does discovering new rooms in a house mean?", answer: "It's among the most consistently positive dreams reported: unrecognized capacity, unexplored history, or a life-possibility standing open. It often arrives at transitions — and dreamers who act on it (starting the project, opening the old question) tend to report the dream evolving rather than repeating." },
      { question: "Why do I still dream about my childhood home decades later?", answer: "Because dreams stage current dramas in formative sets: the childhood home is where the patterns were installed, so the mind returns there whenever a present situation runs on old code. The dream's business is usually the pattern, not the property." },
      { question: "What does an intruder dream mean, and why is it so frightening?", answer: "The house is the self, so an intruder is violation at maximum symbolic depth — which is why these dreams outrank their content in terror. They track boundary stress: a controlling person, an invasive demand, a fear that's gotten inside. Frequent versions merit a waking audit of who currently has access to you, and how they got it." },
      { question: "I dream of houses in disrepair. Is that bad?", answer: "It's diagnostic rather than bad: the dream is filing a surveyor's report on self-maintenance — energy, health, relationships, faith. Dreamers who make one concrete repair in waking life (the checkup, the conversation, the practice resumed) very often find the dream-house improving in step." },
      { question: "What does buying or moving into a new house in a dream mean?", answer: "New identity or circumstances being tried on: a role, relationship, or life-stage you're moving into psychologically before (or while) doing so literally. The dream-house's fit — too big, too small, unexpectedly right — is usually your honest appraisal of the change." },
    ],
  },
  money: {
    introduction: [
      "Money dreams are rarely about money. The dreaming brain treats currency the way waking language does — as the universal stand-in for value — so dream-money usually denominates something else: energy, time, love, self-worth, opportunity, power. The dreams cluster not around paydays but around valuations: job changes, relationships tilting out of balance, seasons of giving more than you receive, or the quiet arithmetic of what your effort is worth to the people spending it.",
      "The genre's signature dream proves the point: finding money — coins in the grass, bills in an old coat, a windfall on the pavement. Actual windfalls being rare, the dream's realism lies elsewhere: something of value in your life is lying unclaimed. A talent shelved, an offer unanswered, affection unnoticed. The recurring dream-frustrations run the same way — money that won't count correctly, wallets gone missing, bills turning to paper scraps — each one a precise little parable about value slipping through some specific set of fingers.",
    ],
    general: [
      "Direction of flow is the first reading: finding, earning, losing, giving, being robbed, paying debts. Each maps a value-transaction in waking life — recognition arriving or being taken, energy invested or drained, obligations coming due. Dreamers usually locate the referent by asking where, awake, the same verb applies: what am I losing, who is robbing me, what debt (financial or not) is being called in?",
      "Then note the money's form and behavior. Cash in hand is value realized; a locked account or uncashable check, worth that exists but can't be accessed — a common dream in undervalued jobs and unreciprocated relationships. Counterfeit money points to false value somewhere: flattery, an inflated promise, a self-presentation you don't believe. And the famous counting-that-never-adds-up dream tends to track real-life audits of fairness — the mental ledger of a relationship or workplace refusing to balance.",
    ],
    psychological: [
      "Psychology's core observation about money — that it functions symbolically far beyond its use, absorbing anxieties about security, love, and self-worth — applies doubly in dreams, where the literal use disappears entirely. Money dreams reliably track financial stress (debt worries produce debt dreams with unglamorous directness), but in the absence of money problems they track worth: studies of dream content find money themes rising around job insecurity, divorce settlements of every emotional kind, and transitions where one's value is being re-priced.",
      "Freud notoriously linked money in dreams to withholding and control; the more durable insight is the exchange-reading: money dreams as statements about what you're trading. Being underpaid in a dream, robbed by a familiar figure, or unable to afford something everyone else buys easily — dreamers map these onto emotional economies quickly and usually accurately. The dream's question is seldom 'how much money?' and almost always 'is this exchange fair, and why am I still in it?'",
    ],
    spiritual: [
      "Every wisdom tradition talks about money constantly, and almost always as a question of ordering: what is treasure, and where is yours? Dream-money inherits the question. A dream of hoarding that leaves you anxious, of giving that leaves you light, of wealth that turns to leaves or ash — these follow the traditions' script so closely that the dream often reads as a direct examination of what you're storing up, and in which currency.",
      "The spiritual disciplines around money — generosity, tithing, detachment, gratitude — all counter the same fear the dreams dramatize: that there won't be enough, that worth must be seized and defended. A money dream received spiritually asks two questions: what do I actually treat as treasure (the dream usually shows this without flattery), and does my security rest on what can be lost? The dreams where money is given away and joy follows are, across traditions, taken at face value.",
    ],
    islamic: [
      "Classical interpreters read dream-money with fine distinctions: silver dirhams often incline toward good — honest earnings, or connected to prayer and remembrance — while gold dinars carry mixed readings, sometimes trials or obligations arriving with the glitter; counting money can point to accounting one will face, and finding money to provision or, in some transmissions, to worry proportional to the amount. Debts repaid in dreams were often read warmly: obligations discharged, trusts fulfilled.",
      "The tradition's framing steadies any money dream: wealth is provision (rizq), apportioned by Allah, held in trust, and audited — zakat purifies it, and the Qur'an's warnings against hoarding stand behind every dream of clutched or corroding coins. A believer might let a money dream prompt the practical inventory the tradition loves: are the earnings lawful, the obligations paid, the trust discharged — and is the heart's reliance on the Provider or the provision?",
    ],
    biblical: [
      "Scripture out-talks nearly every other subject with money — the parables alone run on talents, lost coins, unforgiven debts, rich fools building bigger barns — and its consistent move is the one dreams make: money as the visible measure of invisible loyalties. 'Where your treasure is, there your heart will be also' is practically an instruction for interpreting money dreams: find what the dream-money stood for, and you've found the heart's current address.",
      "The parables map remarkably onto the common scenarios: buried treasure and the talent buried in fear (unclaimed value; the servant punished not for losing money but for burying it), the woman sweeping for her lost coin (worth searched for until found), the rich fool's barns (security stockpiled the night before it's irrelevant). A biblical reflection on a money dream can simply ask which parable it was — and act accordingly." ,
    ],
    commonScenarios: [
      { title: "Finding Money", meaning: "Unclaimed value in your life: a talent unused, an opportunity unanswered, affection or credit unnoticed. The dream's location often hints where — old coats and childhood streets point backward to something you had and shelved; workplaces and new cities, forward." },
      { title: "Losing Your Wallet", meaning: "More identity than income: the wallet carries your cards, your name, your proof of standing. These dreams cluster around role-loss — job changes, retirement, breakups — and around seasons of feeling unrecognized. What you do next in the dream (retrace, panic, shrug) is your current coping, sketched." },
      { title: "Being Robbed", meaning: "Value taken without consent: credit for your work, energy in a one-sided relationship, time, trust. If the dream shows the robber's face, take the casting seriously — dreamers are usually right about who's been making withdrawals." },
      { title: "Money That Won't Count Right", meaning: "The fairness audit: some ledger in your waking life — effort against reward, giving against receiving — refuses to balance, and the dream stages the refusal. Often accompanies pay disputes, caregiving imbalances, and relationships where one party keeps the books alone." },
      { title: "Counterfeit or Disintegrating Money", meaning: "False value detected: a promise, flattery, an investment (financial or emotional) that won't hold its face value. When it's your own money turning fake, the dream may be questioning a currency you trade in — charm, credentials, busyness — that no longer converts." },
      { title: "Giving Money Away", meaning: "Usually the genre's healthiest dream: value flowing on your own terms — generosity, investment in someone, release of the hoarding instinct. If the giving felt forced or draining, though, read it as the ledger dream in disguise: an exchange running one way too long." },
    ],
    faq: [
      { question: "Does dreaming of finding money mean money is coming?", answer: "No tradition of evidence supports dream-windfalls as forecasts. The reliable reading is internal: something valuable of yours is lying unclaimed — an ability, an offer, a relationship's potential. Dreamers who ask 'what am I not cashing in?' usually find the answer faster than they'd like." },
      { question: "Why do I dream about losing money or my wallet when my finances are fine?", answer: "Because dream-money denominates worth, not cash. Wallet-loss dreams track identity and recognition — they spike around job changes, breakups, and seasons of feeling invisible. If finances truly are fine, ask what else has been devalued lately; something has." },
      { question: "What does it mean to dream about being rich?", answer: "Context decides: wealth enjoyed with ease can mark confidence and expansiveness arriving; wealth anxiously guarded usually dramatizes fear of loss more than abundance. Note who you were in the rich dream — many dreamers find the interesting datum is how differently people treated them, which names the recognition they're actually missing." },
      { question: "I dream about old debts. Why?", answer: "Debt dreams are the psyche's unfinished-business file: literal debts if you have them, otherwise obligations — apologies owed, favors unreturned, promises to yourself in arrears. The dream tends to repeat until something is actually paid; dreamers report the genre going quiet after real-life settlements of surprisingly small size." },
      { question: "What do money dreams mean in Islam?", answer: "Classical readings distinguish the coin: silver generally toward honest good, gold more mixed — sometimes trial dressed as gain — with counting linked to accounting and found money to provision or worry by amount. The tradition folds every version into one frame: wealth as rizq held in trust, best met by checking that earnings are lawful, zakat is paid, and reliance rests on the Provider." },
    ],
  },
  car: {
    introduction: [
      "The car is the modern dream's favorite machine, and its meaning is built into the driving test: who controls the vehicle, where is it going, and can it stop? Dreams use cars as the standing image for how your life is being piloted — career, plans, momentum, direction — which is why the genre's recurring nightmares are all control failures: brakes that don't respond, steering that won't answer, driving from the back seat, a driver you didn't choose.",
      "That last variant deserves its own sentence, because it's the one dreamers most often recognize with a jolt: you're in the passenger seat — or the back — while someone else drives your car. A parent, a boss, a spouse, sometimes a stranger. The dream has essentially finished interpreting itself; the remaining work is admitting who has the wheel in waking life, how they got it, and what it would cost to take it back.",
    ],
    general: [
      "Read the seat first, then the road. Driving confidently is agency working; the passenger seat is delegated control (comfortable or not — the dream's mood tells you); the back seat is influence at two removes, common in dreams of people whose lives are steered by family expectation. The road then sets the situation: fog for decisions without information, a missed exit for regret about a path not taken, a road that ends for plans running out of plan.",
      "The car's own condition frequently maps onto the body and resources — dreamers with health worries report failing engines and empty fuel tanks with almost embarrassing regularity — while the destination question ('where was I even going?') is often the dream's real point. A surprising number of car dreams feature urgent driving toward a destination the dreamer can't name; waking life usually contains the same motion.",
    ],
    psychological: [
      "Control is among the most studied themes in dream content, and vehicle dreams are its natural laboratory: typical-dreams surveys place losing control of a vehicle high on the list of near-universal dream experiences. The dreams correlate with exactly what you'd guess — periods of low perceived control, high demand, and decisions made under other people's hands — and clinicians note brake-failure dreams clustering in people who describe their waking schedules with the same metaphor: can't slow down.",
      "The developmental readings add texture: learning-to-drive dreams during new responsibilities, crash dreams around feared consequences of speed (professional, romantic, financial), and the back-seat childhood position resurfacing in adults renegotiating autonomy with parents or partners. The car also inherits identity freight — in waking life it signals status and self-presentation, so dream-cars that are borrowed, stolen, downgraded, or suddenly unrecognizable often track self-image through transitions.",
    ],
    spiritual: [
      "The journey is the oldest spiritual metaphor there is; the car is merely its current body. Traditions that speak of the path, the way, the tao, the pilgrimage all pose the questions a car dream stages mechanically: are you on your road or someone else's, are you moving because you chose to or because traffic is, and — the contemplative's favorite — who is the driver? More than one tradition answers that the ego only thinks it's driving.",
      "A car dream received spiritually often lands on the surrender question from the practical side: what would it mean, this month, to stop gripping the wheel of things that were never steerable — other people's choices, outcomes, timing — while taking honest hold of the one thing that is? The dreams where handing over the wheel brings peace rather than panic tend to mark real progress on exactly this.",
    ],
    islamic: [
      "Classical interpreters worked with the vehicles of their age — mounts, ships, litters — and read them toward rank, journey, and the means Allah provides for moving through life; a sound mount ridden well inclined toward honor and progress in one's affairs, an unruly or failing one toward difficulty in them. The modern car sits naturally in this frame: its condition as one's worldly means, its journey as the course of one's affairs, its control as one's stewardship of them.",
      "The tradition adds its travel etiquette to the reading: journeys begin with du'a — the traveler's supplication praising the One who subjected the vehicle to us — and end at destinations appointed by decree. A dream of a car out of control can thus prompt both practical review (which affairs are being driven carelessly?) and the believer's steadying reframe: effort belongs to the servant, outcomes to Allah — grip the wheel of duty, release the wheel of decree.",
    ],
    biblical: [
      "Scripture's vehicles are chariots — and they run both ways: Pharaoh's chariots drowned as the emblem of proud power failing, Elijah's chariot of fire as transport into glory, and the psalmist's verdict standing over both: 'some trust in chariots and some in horses, but we trust in the name of the Lord.' The biblical question for a car dream is the psalm's: what are you trusting to carry you — and is it carrying you, or are you now carrying it?",
      "The road itself does the rest of the biblical work: 'make straight paths for your feet,' the narrow way versus the broad, Emmaus and Damascus as roads where direction changed mid-journey. A car dream about being lost, misdirected, or driven by another can be read against these — with the Damascus note especially: sometimes the interrupted journey, the breakdown at the roadside, is the point at which the actual destination is finally disclosed.",
    ],
    commonScenarios: [
      { title: "Brakes That Don't Work", meaning: "The signature control nightmare: momentum without the power to stop — a schedule, spending pattern, conflict, or relationship accelerating past your ability to slow it. Dreamers usually know exactly which pedal is failing awake; the dream's contribution is the urgency." },
      { title: "Someone Else Driving Your Car", meaning: "Delegated or seized control of your direction: who sits in the driver's seat is the dream's answer to 'who is steering my life right now?' The passenger's mood — relaxed, resigned, frantic — is your actual position on the arrangement, stated more honestly than you state it." },
      { title: "A Car Crash", meaning: "Feared consequence of current speed or course: plans colliding, a warned-about outcome arriving. Pre-crash dreams (the skid, the unavoidable impact ahead) are more common than the impact itself — the dream is usually about the moment correction is still possible, which is its own message." },
      { title: "Being Lost or Missing Your Exit", meaning: "Direction doubt in its literal costume: a path chosen without conviction, a decision point passed at speed, or the growing suspicion that the route was set by someone else's map. Recurring versions reward one waking question: if I could re-route today, toward what?" },
      { title: "A Stolen or Missing Car", meaning: "Agency or identity taken: a role, independence, or means of progress removed — layoffs, breakups, and caretaking seasons produce this dream reliably. Searching a parking lot for a car you can't find is the everyday version: your drive is somewhere in the structure; you've lost track of where." },
      { title: "Driving From the Back Seat", meaning: "Trying to steer from a position that can't: influence without authority — managing up, parenting adult children, loving someone self-destructive. The dream's physics are the lesson: either get to the front seat or stop reaching for the wheel." },
    ],
    faq: [
      { question: "What does it mean to dream my brakes fail?", answer: "It's one of the most common control dreams, and it tracks waking momentum you can't slow — workload, spending, a conflict, a relationship's pace. It can also have a physical trigger (stress, stimulants before bed). The productive translation: identify what, this week, you literally cannot stop doing — that's usually the brake in question." },
      { question: "Why am I never the driver in my dreams?", answer: "Habitual passenger-seat dreams tend to mirror habitual delegation: a life steered by a strong partner, parent, employer, or by default. If the arrangement suits you, the dreams are just accurate; if they come with dream-frustration, they're a running vote against it from inside." },
      { question: "Is a car-crash dream a warning not to drive?", answer: "There's no evidence dreams forecast accidents — crash dreams track feared consequences generally, not traffic specifically. That said, anxiety and exhaustion impair both sleep and driving, so a run of crash dreams during a frazzled season is a fair prompt to rest — which helps the driving and the dreams alike." },
      { question: "What does losing my car in a parking lot mean?", answer: "It's the mild everyday cousin of the stolen-car dream: momentum or purpose temporarily mislaid inside a large structure — a company, institution, or stage of life. The dream usually includes wandering rows of identical options; so does the waking situation, typically." },
      { question: "What do vehicle dreams mean in Islam?", answer: "Classical readings treat mounts and vehicles as one's means and standing in worldly affairs — sound and obedient toward progress and honor, failing or unruly toward difficulty. The tradition frames all travel under Allah's subjection of the means and His decree of destinations: tend your affairs diligently, and entrust the road." },
    ],
  },
  baby: {
    introduction: [
      "Baby dreams run on one rule that sorts nearly all of them: the baby is rarely a baby. For dreamers who are new parents, expecting, or trying to conceive, dreams of infants are usually literal — rehearsal, worry, and love doing night work, including the near-universal new-parent nightmare of the baby lost, dropped, or forgotten, which studies find in most new mothers and which reflects vigilance, not prophecy. For everyone else, the baby is the dream's image for anything new, alive, and dependent on you.",
      "That covers more of life than it first sounds: the new business, the manuscript, the recovery, the fragile reconciliation, the version of yourself a month into better habits. All are young, promising, and helpless without care — and dreams cast them all as infants. The dream's plot is then a status report on your caretaking: whether the baby thrives, cries unattended, gets handed to someone else, or turns up forgotten in another room tells you precisely how the new thing in your life is being tended.",
    ],
    general: [
      "Identify the baby first: literal (yours, expected, hoped-for, feared) or symbolic (what in your life is under a year old — a project, role, relationship, habit, healing?). The dream's date usually settles it. Then read the baby's condition as the status report it is: thriving means the new thing is getting what it needs; crying means a need you're hearing but not answering; sick or shrinking usually marks neglect already sensed; a baby that talks like an adult or walks off is a venture growing faster than your plans for it.",
      "Your role in the dream completes the reading. Holding the baby competently, panicking, handing it off, searching for it, discovering it was left somewhere — dreamers map these onto their real stewardship almost instantly, and the emotional signature (tenderness, terror, resentment, guilt) is data too: resentment in a baby dream often surfaces the unspeakable weight of a responsibility one also loves, which waking life rarely lets you say.",
    ],
    psychological: [
      "The literal cases are well documented: dream studies of pregnant women and new parents find infant dreams frequent, vivid, and skewed anxious — babies lost, endangered, or forgotten — and researchers read them as the caregiving system calibrating itself, with some evidence that anxious rehearsal accompanies attentive parenting rather than predicting problems. Postpartum, such nightmares can be intense enough to wake parents checking the crib; they are common, and they fade as vigilance relaxes.",
      "Symbolically, psychology takes the baby as the self's newest growth: Jung read the child-image as the emerging future personality — potential still unformed, therefore both precious and endangered. Clinicians note baby dreams clustering at beginnings (ventures, sobriety, relationships, therapy itself) and treat the dream-baby's welfare as the client's own progress report. The forgotten-baby dream in a non-parent is the classic: some development of yours, once tended daily, has been left in a back room of the schedule — and part of you is counting the days." ,
    ],
    spiritual: [
      "Traditions converge on the infant as the image of what matters most in its most defenseless form: gods arrive as babies — Krishna in the cowshed, Christ in the manger — and the message is consistent: the sacred enters small, vulnerable, and dependent on human care to survive. A baby dream in this register asks what has been entrusted to you at that stage — and notes that in the stories, the world's response to holy infants divides between those who protect and those who see a threat.",
      "The other spiritual thread is the child as the state to be recovered, not just protected: 'unless you become like little children'; the Taoist return to the uncarved block; Zen's beginner's mind. A dream of an infant — especially one that meets your eyes with unnerving presence, as dream-babies do — can be an encounter with your own beginner's nature: the part that hasn't yet learned what's impossible. The dream's question is whether you received it as a burden or a gift.",
    ],
    islamic: [
      "Classical interpretation reads infants variously by the dream's texture: glad tidings and blessing in some transmissions — a beautiful infant as good news, provision, or relief approaching — while a burden-reading also exists, the baby as new care and responsibility arriving; a crying infant could point toward distress in one's affairs needing attention. For the expecting, such dreams are mostly the self's rehearsal, and knowledge of what is decreed for wombs rests with Allah.",
      "The tradition's framing of children steadies the symbolic readings too: offspring are described in the Qur'an as both adornment of this life and a trial (fitna) — beloved, and a test of stewardship — and every child is born upon the fitra, the sound original nature. A dream-baby entrusted to your care can thus be received as any amana is: with gratitude for the blessing, sobriety about the test, and du'a for what one has been given to raise — literal or not.",
    ],
    biblical: [
      "The Bible keeps arriving at infants at its hinge points: Moses in the basket, Samuel asked of God, John leaping in the womb, the manger. In each, the baby is promise in its endangered phase — and the narrative attention goes to the protectors: midwives who defy Pharaoh, a mother weaving a basket, Joseph warned in a dream to flee with the child. Scripture's baby-stories are stewardship stories, which is exactly the register in which baby dreams operate.",
      "For the anxious versions, scripture's honesty helps: the infants of the promise were genuinely endangered — the stories don't pretend otherwise — and the response modeled is neither denial nor despair but resourceful guarding. A biblical reflection on a baby dream asks: what small living promise is in my keeping, who or what threatens it, and what would the basket-weaving, Egypt-fleeing form of protection look like this month? And beneath that, the note of grace: the child in these stories is ultimately kept by God, with human care as the means — a division of labor anxious caretakers are invited to remember.",
    ],
    commonScenarios: [
      { title: "Forgetting the Baby", meaning: "The genre's most jolting dream and, in new parents, near-universal: vigilance rehearsing, not negligence revealed. In non-parents it's precision-guided: some young commitment — the project, the practice, the friendship — has been left unattended, and the dream supplies the guilt your calendar suppressed." },
      { title: "A Crying Baby You Can't Soothe", meaning: "A need announcing itself past your current remedies: in parents, often plain worry-processing; symbolically, a new venture or emotional need whose demands outstrip the attention allotted. What finally soothes the dream-baby, if anything does, is worth noting — it's sometimes a workable suggestion." },
      { title: "Holding a Baby That Feels Like Yours (When None Exists)", meaning: "The classic new-potential dream: a role, creation, or self in its infancy, experienced with startling tenderness. These dreams often mark the emotional beginning of ventures weeks before the practical one — dreamers frequently date the real decision from the dream." },
      { title: "A Baby That Talks or Walks Absurdly Early", meaning: "Something new is developing faster than your framework for it: a project outgrowing the plan, a child (real) outpacing your image of them, a change arriving ahead of schedule. Usually more comic than ominous — the dream's surrealism measuring your surprise." },
      { title: "A Sick, Injured, or Shrinking Baby", meaning: "The welfare report at its most urgent: a young thing in your care — venture, recovery, relationship — is not getting what it needs, and part of you has already noticed. In expecting parents this is almost always anxiety's rehearsal, documented in healthy pregnancies at every stage." },
      { title: "Someone Handing You a Baby", meaning: "Responsibility transferring: a duty, project, or dependent arriving via someone else's decision — the dream's question is whether you accept the handoff, and the dream usually shows your answer before you've admitted it awake. Who does the handing tends to be exactly who it is in life." },
    ],
    faq: [
      { question: "What is the psychological meaning of dreaming about a baby?", answer: "Psychologically, a baby often stands for new potential under your care — a project, recovery, relationship, or emerging self — or, for parents and expectant parents, caregiving vigilance. The baby's condition is usually a status report on how that new thing is being tended." },
      { question: "I'm not a parent and don't want kids. Why do I dream about babies?", answer: "Because the dream-baby is the mind's icon for anything new and dependent: ventures, creative work, healing, a changing identity. Ask what in your life is under a year old and needs regular feeding — most dreamers can answer immediately, and the dream's plot is usually a fair review of how the feeding is going." },
      { question: "I keep dreaming I lost or forgot my baby. Am I a bad parent?", answer: "The opposite inference is better supported: studies of new parents find infant-peril dreams in the substantial majority, and they track vigilance — the caregiving system running drills. They fade as the baby grows. Distressing frequency plus daytime intrusive fear is worth mentioning to a doctor, as postpartum anxiety is treatable." },
      { question: "Does dreaming of a baby mean pregnancy is coming?", answer: "No — dream-babies forecast nothing. In those trying to conceive, baby dreams are hope and worry rehearsing; in others, they're symbolic of new undertakings. The one predictive-sounding pattern is mundane: people often dream of babies after deciding, consciously or not, to begin something." },
      { question: "What does a baby dream mean in Islam?", answer: "Transmitted readings vary with the dream's feel: a beautiful infant toward glad tidings and provision, a burdensome one toward new responsibility, a crying one toward affairs needing attention. The Qur'anic frame holds children as both adornment and trial — so the dream reads well as a stewardship question, met with gratitude and du'a." },
      { question: "Why was the baby in my dream so strangely alert, like it understood everything?", answer: "The uncanny-wise infant is one of the most reported dream figures, and depth psychology reads it as the emerging self looking back at you — potential that already knows what it intends to become. Most dreamers experience these dreams as significant rather than creepy, and they cluster at genuine turning points." },
    ],
  },
  wedding: {
    introduction: [
      "Wedding dreams have a reputation problem: engaged dreamers expect happy previews and instead get disasters — missing dresses, absent grooms, collapsing venues, guests who object. Relax: studies of pre-wedding dreamers find anxiety scenarios are the norm, not the omen. A wedding is the rare life event that is simultaneously a love story, a public performance, a legal contract, and an identity change, and dreams rehearse the parts that can fail — which is to say, the parts you're responsible for.",
      "For everyone not planning a wedding, the dream is about commitment in the abstract: the psyche uses marriage as its strongest image for binding choice. Dream-weddings attend job offers, house purchases, business partnerships, religious conversions, even diagnoses — anything that reorganizes life around a vow. The dream's cast list is the tell: who you marry (a stranger, an ex, your actual partner, someone baffling), who attends, and who objects usually translates the commitment in question with very little effort.",
    ],
    general: [
      "Establish which wedding it is. Actually engaged? The dream is processing your wedding — anxiety versions included and expected. Not engaged? Find the vow: what in your life is asking for binding commitment — a person, job, city, path? The spouse-figure personifies it, which is why marrying a stranger is common and not alarming: the stranger is the not-yet-known life you're contracting with. Marrying an ex reruns old commitment questions; marrying your actual partner while unmarried is often a trial fitting.",
      "Then read the ceremony's mechanics, because each failure mode is a distinct worry: the missing dress or suit is readiness (do I have what this role requires?); the absent partner, doubt about the other party's commitment; your own flight from the altar, your doubt, voiced by your legs; objections from the pews, disapproval you're bracing for — note whose voice; and the ceremony that keeps being postponed by absurd obstacles usually mirrors a real decision similarly stuck in preliminaries.",
    ],
    psychological: [
      "The research on engaged dreamers is unusually consistent: pre-wedding dreams skew heavily toward mishap and anxiety — wardrobe failures, wrong venues, missing partners — and interpreters read them as performance rehearsal plus commitment processing, with no correlation to marital outcomes. Clinicians note the dreams often do useful work: they surface specific worries (about in-laws, control of the event, being seen) concretely enough to address awake.",
      "Symbolically, psychology follows Jung here with unusual unanimity: marriage in dreams as integration — the joining of parts of the self, the conscious personality contracting with something previously other. Dream-weddings at life transitions (new careers, recoveries, late-life reinventions) read naturally this way: something is being vowed internally. The disaster variants then become integration anxieties — the fear that the new identity won't fit, won't be accepted, or requires abandoning something at the altar." ,
    ],
    spiritual: [
      "It's hard to name a tradition that doesn't reach for marriage as its image of the soul's deepest commitments: Israel as God's covenanted bride, the Church as the bride of Christ, the Song of Songs read for centuries as divine love poetry, Sufi poetry's union with the Beloved, the 'urs — literally 'wedding' — celebrated at Sufi saints' deaths as the soul's marriage to God. A dream-wedding sits in this lineage: something in you is being joined, vowed, given.",
      "The spiritual reading of the anxious versions is gentler than dreamers expect: traditions treat the approach to union as properly fearful — veils, thresholds, and trembling are part of the iconography, and the vows are demanding by design. A wedding dream received spiritually asks: what is being asked of me at the level of a vow — not preference, but binding orientation — and is my hesitation at the threshold prudence, unreadiness, or just awe? All three are honorable answers; they call for different next steps.",
    ],
    islamic: [
      "Classical interpreters read dream-marriage with attention to context: marriage in a dream can signify what marriage is in life — commitment, provision, and entering a new state — and transmitted readings range from honor and religious completion to, in some circumstances, new responsibilities or trials approaching; marrying an unknown woman or man was sometimes read toward major life change, with details deciding. The tradition treats the dream-nikah, like the real one, as a weighty matter rather than a romance scene.",
      "The frame steadies the anxious versions: marriage in Islam is described as half the deen — a serious mutual covenant (mithaq ghaliz, 'a solemn bond') — so dream-anxiety around a wedding reads naturally as the self weighing a commitment's gravity, which is the appropriate response to gravity. For the actually engaged, the counsel is practical: the dream is rehearsal; istikhara, honest conversation, and preparation address what it rehearses.",
    ],
    biblical: [
      "Scripture ends at a wedding — the marriage supper of the Lamb — and spends much of its length inside marital imagery: covenant as marriage, idolatry as adultery, Hosea's whole prophetic life staged as a wedding gone wrong and remade. The Bible's wedding-language is covenant-language: binding promise, witnessed publicly, defining identity thereafter. A wedding dream translates into biblical terms as a covenant question: what am I binding myself to, and before whom?",
      "The Bible even supplies the anxiety dream: the parable of the ten virgins is a wedding-preparedness nightmare in canonical form — lamps, oil, a delayed bridegroom, a shut door — and its point is the dream-genre's point: readiness for the committed moment cannot be borrowed or improvised. A biblical reflection on a wedding dream asks the parable's questions: what does readiness consist of here, and is my oil bought — while noting scripture's tenderness toward wedding joy itself: the first miracle was keeping one going.",
    ],
    commonScenarios: [
      { title: "Everything Going Wrong on the Day", meaning: "The standard pre-wedding dream and statistically the expected one: performance anxiety plus commitment gravity, rehearsed in costume. The specific failure is the useful part — dress (readiness), venue (the setting of your new life), officiant (legitimacy), catering (provision) — each names a real checklist item, practical or emotional." },
      { title: "Marrying a Stranger", meaning: "Commitment to the not-yet-known: a new life, role, or path personified. The stranger's demeanor is the dream's forecast of your relationship with the unknown thing — kind, cold, faceless, oddly familiar. Frequently reported before relocations, career changes, and conversions; rarely about an actual future spouse." },
      { title: "Your Partner Missing From the Ceremony", meaning: "Doubt about the other party's commitment — to the wedding if you're engaged, to the shared future in general if not. Sometimes the absent figure isn't the partner but what they represent: a co-founder, a collaborator, a promise-maker whose follow-through you're quietly auditing." },
      { title: "Running From the Altar", meaning: "Your own doubt, given legs: some binding choice is approaching faster than your consent. Worth respecting rather than suppressing — not as a verdict against the commitment, but as a request for the conversation or condition that would make the vow honest." },
      { title: "Attending an Ex's Wedding (or Marrying Your Ex)", meaning: "Old commitment questions reopened for review: attending marks acceptance work (watching that chapter close in formal dress); marrying the ex reruns the original question — usually because a current choice rhymes with it. Both cluster around new relationships reaching decision points." },
      { title: "A Wedding Where You Can't Find Your Place", meaning: "Belonging anxiety in ceremonial dress: a family, community, or couple's world reorganizing around a commitment, with your seat unassigned. Common in parents of marrying children, close friends of the newly engaged, and anyone whose role shrinks when someone else's vow expands." },
    ],
    faq: [
      { question: "I'm engaged and keep dreaming the wedding is a disaster. Is it a sign?", answer: "It's a norm, not a sign: studies of engaged dreamers find mishap dreams the standard fare, with no relation to how marriages turn out. The dreams rehearse performance and permanence — the two genuinely big things about the day. Mine them for the checklist items they name, then let them be rehearsal." },
      { question: "What does marrying a stranger mean? It felt so real.", answer: "It's one of the most common wedding dreams and among the least literal: the stranger personifies a commitment whose full nature you can't yet know — a path, place, role, or future self. The felt realness reflects the commitment's genuine weight. How the stranger treated you is your current relationship with the unknown." },
      { question: "I dreamed of my own wedding but I'm single. Does it predict marriage?", answer: "No — wedding dreams track commitment, not courtship. Singles typically have them around binding non-romantic choices: signing for the house, the job with the relocation clause, the decision to stay or leave. If a proposal-shaped choice does exist in your life, the dream is about whether, not when." },
      { question: "Why did I cry at the wedding in my dream?", answer: "Dream-tears at weddings run the full range — grief for the identity being retired, joy at union, mourning at someone else's vow reorganizing your world. Locate whose wedding and what was ending: weddings are endings wearing white, and the tears usually belong to the ending." },
      { question: "What does a wedding dream mean in Islam?", answer: "Transmitted readings treat dream-marriage seriously and contextually — from honor and the completion of half one's deen to new responsibilities approaching, details deciding. For the engaged, it's rehearsal of a solemn covenant; the tradition's tools — istikhara, preparation, good counsel — address exactly what the dream rehearses." },
    ],
  },
  fire: {
    introduction: [
      "Fire is the dream symbol that refuses to pick a side. It is warmth and destruction, passion and rage, purification and loss, the hearth and the wildfire — often within a single dream. Every interpretive tradition grants it this doubleness, and the dreamer's first task is always the same triage: was this fire contained or loose? A fire in its place — hearth, candle, stove — reads toward the life-giving meanings: love, vitality, creative heat. Fire out of its place is the other family entirely: anger loose in a relationship, crisis consuming a structure, change arriving as catastrophe.",
      "The second question is what's burning, because dreams choose fuel with intent. A burning house is the self or family under transformative pressure; burning papers, plans or obligations combusting; a burning bed, intimacy in crisis; a forest fire, something spreading beyond any personal container. And note your distance — tending, fleeing, watching from across the street, or standing unburned inside it. Dreamers are rarely neutral bystanders to fire; where the dream places you is usually where you actually stand.",
    ],
    general: [
      "Contained fire generally reports on your vital heat: a strong hearth-fire during a good season, guttering candles during depletion — dreamers in burnout report dying fires and unlit stoves with textbook regularity, the metaphor ('burned out') dreaming itself literally. Feeding a fire, keeping one alive in wind or rain, tends to track effort spent maintaining passion, faith, or a relationship through unfavorable weather.",
      "Uncontained fire asks harder questions: what ignited it (a spark of anger, a slow electrical fault in the walls — dreams distinguish sudden rage from long-hidden problems), what does it consume first, what do you try to save? The saving choice is the dream's famous revelation — dreamers carrying one object from a burning building usually learn something true about their priorities. And fire that doesn't burn you, the bush that burns unconsumed, belongs to a different genre altogether: intensity survived, presence encountered — the rare fire dream people wake from changed rather than shaken.",
    ],
    psychological: [
      "Psychology reads dream-fire chiefly through affect: fire is the standing image for the emotions that consume — anger first, then desire, then the whole family of feelings we describe in combustion language (flare, smolder, explode, burn out). Clinicians note fire dreams clustering where anger is denied daytime expression: the accommodating patient dreams of house fires. Trauma work adds a literal layer — fire survivors and those who've lost homes replay fire directly — and burnout research supplies the extinguished version: depleted dreamers report dead fires, cold hearths, ash.",
      "The transformation reading has equal standing: fire as the psyche's agent of change-by-destruction, clearing what renewal requires. Analysts note that fire dreams often attend major identity transitions — divorces, deconversions, career endings — where something must be actually destroyed, not merely revised, and dreamers frequently report a shocking undertone of relief watching dream-structures burn. That relief is data: some part of you has already priced the loss and voted for the clearing.",
    ],
    spiritual: [
      "Fire may be religion's busiest symbol: the burning bush, Pentecost's tongues of flame, the refiner's fire, Zoroastrian temple fires kept burning for centuries, the yajna fire carrying offerings, Buddhism's fire sermon on the burning of all things by craving. Two great meanings run through all of it — presence and purification: fire as the form the sacred takes when it comes near, and fire as what removes everything from the gold except the gold.",
      "A fire dream received spiritually sorts itself by those meanings. Fire that purifies asks what is being burned away — and traditions insist this hurts precisely in proportion to attachment. Fire that is presence asks the Moses questions: what in your life is burning without being consumed, and are you willing to turn aside and look at it? And unholy fire — rage, consuming craving — is named honestly in every tradition: the Buddha's remedy for the world on fire was not more fuel.",
    ],
    islamic: [
      "Classical interpreters read fire with sharp attention to its conduct: fire with light and warmth could incline toward guidance, benefit, or authority — the Qur'an's fire of Musa was sought as guidance and became revelation — while smoky, scorching, or spreading fire leaned toward fitna, war, or a ruler's harshness; eating fire evokes the Qur'anic image of consuming orphans' wealth. The tradition also reads extinguished fire as calmed strife or, sometimes, weakened faith or authority — context deciding.",
      "The believer's frame holds fire's full range: hellfire as warning, the Friend of Allah cast into flames commanded to be 'coolness and peace' upon him, and shaytan's boast of being created from fire as the emblem of arrogance. A distressing fire dream is met with the standard refuge-seeking; a dream of fire mastered, cooled, or giving light without harm may be received with hope — while any dream-invitation toward one's own burning anger is a summons to the tradition's remedy: wudu, silence, and sitting down.",
    ],
    biblical: [
      "Fire is scripture's signature for God's nearness and its severity at once: the bush that burns unconsumed, the pillar of fire by night, Sinai wrapped in smoke, Elijah's answered altar, Pentecost — and equally the refiner's fire, the chaff burned, works tested 'as through fire.' Biblical fire almost never destroys arbitrarily; it tests, reveals, purifies, and accompanies. The dreamer's question, biblically, is which office the fire held: presence, judgment, or refining.",
      "Paul's image in 1 Corinthians serves fire dreams uncannily well: each person's work tested by fire, what's built of gold surviving, what's built of straw burning — 'the builder will be saved, but only as one escaping through the flames.' A dream of watching structures burn while you survive is nearly this verse staged. The reflection it invites: what in your life is gold, what is straw, and is the current burning perhaps distinguishing them — painfully, but accurately?",
    ],
    commonScenarios: [
      { title: "Your House on Fire", meaning: "The self or family under transformative pressure: crisis, rage, or change consuming the structure of private life. What the dream has you save, and whether you feel terror or unsettling relief, are the two details that interpret it — relief usually means part of you has already chosen the clearing." },
      { title: "A Fire You Can't Put Out", meaning: "An emotion or situation past containment: anger that keeps reigniting, a conflict spreading to new rooms, a crisis outpacing your extinguishers. The dream's futile firefighting often mirrors real coping that manages symptoms while the fuel remains — the useful question is what's feeding it." },
      { title: "Watching a Fire From a Distance", meaning: "Someone else's crisis or transformation, witnessed: a family member's blowup, a workplace burning down organizationally, a world event. Your dream-position — helping, filming, walking away — is your actual stance, and sometimes the dream's gentle indictment of it." },
      { title: "A Controlled, Warm Fire", meaning: "Vitality in good order: passion, love, faith, or creative energy contained and giving warmth. Tending dreams — feeding logs, shielding flame from wind — track the real maintenance such heat requires, and guttering or dying fires are the burnout report they appear to be." },
      { title: "Being Burned", meaning: "Contact with the hot thing at personal cost: an anger (yours or another's) that left a mark, a passion pursued past safety, a 'played with fire' situation arriving at its idiom. Where the burn lands carries the usual body-map: hands for what you handled, face for how you're seen." },
      { title: "Fire That Doesn't Burn You", meaning: "The genre's numinous exception: standing in intensity unharmed — surviving what should have consumed you, or encountering something sacred in the blaze. Dreamers report these after passing through crises intact, and traditions from Sinai to the fiery furnace treat the unconsumed fire as presence, not threat." },
    ],
    faq: [
      { question: "I dreamed my house burned down. Should I check my wiring?", answer: "Check it anyway — smoke alarms are cheap and the peace of mind improves sleep — but the dream isn't a premonition. House-fire dreams track transformative pressure on self and family: crisis, anger, or change consuming familiar structure. The dream's most reliable detail is what you saved and how you felt watching it burn." },
      { question: "Why did I feel relief watching things burn in my dream?", answer: "Because part of you has already voted for the clearing. Relief in fire dreams is common and honest: something — an obligation, identity, accumulation — has become fuel, and its destruction reads as freedom. The waking question is what you'd rebuild, and whether you could get there without the fire." },
      { question: "What does fire mean spiritually in a dream?", answer: "Across traditions, two things: purification (the refiner's fire burning away everything that isn't gold) and presence (the burning bush, Pentecost — the sacred arriving as flame). Fire that harms reads toward the first; fire that illuminates without consuming toward the second. Both ask what the fire was doing to you, not just near you." },
      { question: "Do fire dreams mean repressed anger?", answer: "Often, yes — it's the best-supported psychological reading. Fire dreams cluster in people whose anger lacks daytime channels, and the fire's behavior maps the anger's: smoldering in walls (long-hidden resentment), flash igniting (triggered rage), spreading room to room (conflict contaminating adjacent life). If the description fits, the anger needs a safer outlet than your sleep." },
      { question: "What does fire mean in Islamic dream interpretation?", answer: "By its conduct: fire giving light and warmth can incline toward guidance or benefit — Musa sought the fire and found revelation — while smoky, scorching, spreading fire leans toward fitna and strife; eating fire echoes the Qur'an's image of devouring orphans' wealth. Distressing versions are met with seeking refuge; fire mastered or cooled, with hope." },
    ],
  },
  drowning: {
    introduction: [
      "Drowning dreams are the emotional overload report, filed in the strongest language sleep has. Where ordinary water dreams describe your feelings' condition, drowning describes your position in them: fully submerged, out of air, and — the detail that gives the dream its particular ache — usually silent. Real drowning is famously quiet, and the dreams are faithful to it: dreamers report being unable to call out, or calling out to swimmers who don't turn around. The dream is rarely about water. It is about capacity, and about asking.",
      "The reliable interpretive move is to name the water. Grief, workload, debt, caregiving, a depression, a family situation — dreamers asked 'what are you drowning in?' answer accurately and fast, because the metaphor is already how we speak. The dream's plot then reports your status with unsentimental precision: how long you keep your head up, what pulls you down, whether anything floats, who is on the shore, and whether they see you. Every one of those details tends to have an exact waking address.",
    ],
    general: [
      "Track the mechanics of the sinking. Drowning from exhaustion after long swimming is depletion — capacity honestly exceeded over time. Being pulled down by something (weeds, weight, hands) points to a specific drag: name what gripped you, and note that dream-weights are often things you're carrying by choice. Sudden deep water where footing was expected marks a situation that changed depth without warning — a role, relationship, or commitment that turned out to be over your head. And drowning in shallow water, the genre's cruelest variant, usually accompanies shame: overwhelmed by what 'should' be manageable.",
      "Then audit the rescue layer, because this dream is unusually social. Shorelines with people who don't notice, lifeguards looking elsewhere, swimmers nearby with their backs turned — these figures map onto your actual support system and your actual signaling. Many dreamers realize the dream-self never calls out at all, which is generally the point. Rescues that do come, hands grasped, the discovery that your feet reach bottom after all — these matter too, and often track real support recently accepted, or capacities remembered.",
    ],
    psychological: [
      "Psychologically, drowning dreams are the signature of overwhelm plus silence: they cluster in people carrying loads they haven't disclosed — caregivers, the newly bereaved, the quietly depressed, students and workers past capacity — and clinicians treat them as a fair proxy for unexpressed distress. The asking-for-help failure inside the dream mirrors a documented waking pattern: overload's sufferers systematically underestimate others' willingness to help, and the dream stages exactly that miscalculation, nightly.",
      "Two literal layers deserve ruling out. Sleep physiology first: obstructive sleep apnea produces choking, suffocating, and drowning dreams at elevated rates — a snoring partner's report or morning headaches make that worth a screening, since treating apnea often ends the dreams outright. Trauma second: near-drowning survivors and flood victims replay the event directly, and such dreams belong to post-traumatic processing, where imagery rehearsal therapy has good evidence. Absent both, the dream is metaphor — reliable, personal, and usually current.",
    ],
    spiritual: [
      "The spiritual traditions know these waters: 'Save me, O God, for the waters have come up to my neck' — Psalm 69 is a drowning dream in prayer form, and Jonah prays from inside the fish that 'the deep surrounded me; weeds were wrapped about my head.' The deep, in scripture and beyond, is where rescue is learned: the drowning psalmists are not swimmers who improved but sinkers who were grasped. The dream's spiritual question is rarely 'how do I swim better?' and usually 'whom do I call, and why haven't I?'",
      "Contemplative traditions add the surrender reading, carefully: there is a drowning that is resistance exhausting itself, and mystics East and West describe the ego's dissolution in ocean imagery — the drop returning to the sea. Some drowning dreams, especially those that end in strange peace once struggling stops, may belong to this genre: not destruction but the end of a self-carrying project that was never sustainable. Discernment between drowning-as-crisis and drowning-as-surrender is exactly the kind of question worth bringing to a wise elder, director, or friend.",
    ],
    islamic: [
      "Classical interpretation reads drowning gravely but contextually: sinking in water could point toward being overwhelmed by worldly affairs, trial (fitna), or entanglement in what corrupts — while emerging alive from the water was read toward relief and rescue after difficulty, and some transmissions distinguish drowning in clear versus murky water as trials differing in nature. The sea itself often stands for the dunya or a ruler's power: vast, useful, and dangerous to those who venture unprepared.",
      "The Qur'an's drownings frame the readings: Pharaoh drowned at the moment of pursuing arrogance — the deep as where oppression ends — while Yunus, in the depths by his own turning away, called out from the darknesses ('There is no god but You; glory be to You; I was among the wrongdoers') and was answered. A believer's drowning dream thus carries a built-in response: the call from the depths is itself the rescue's beginning, and despair of Allah's relief is the one thing the tradition forbids the overwhelmed.",
    ],
    biblical: [
      "The Bible's drowning texts are rescue texts: Psalm 69's waters at the neck, Psalm 18's 'He drew me out of deep waters,' Jonah's prayer from the deep, and Peter — the dream's perfect biblical twin — walking on water until fear sinks him, crying 'Lord, save me,' and being caught 'immediately.' Scripture's consistent physics: the sinking is real, the cry is short, and the grasp is quick. Notably, Peter's rescue precedes the lecture; the catching comes first.",
      "A biblical reflection on a drowning dream goes where the dream's silence is: Peter's three words are the model the dream-self typically fails to say. What is your equivalent cry, and to whom — God, spouse, doctor, friend — has it gone unsaid? The dream that has you drowning unseen among people on the shore is, in this light, less a report on their blindness than on your signaling — and scripture's answer to 'the waters have come up to my neck' was never 'swim harder.'",
    ],
    commonScenarios: [
      { title: "Drowning While Others Don't Notice", meaning: "The genre's most reported and most precise variant: overload invisible to your surroundings — often because it's been carefully hidden. The dream indicts the concealment, not the crowd; dreamers who disclose their real load to one person frequently report this dream changing or stopping." },
      { title: "Being Pulled Under", meaning: "A specific drag on a struggling swimmer: name the weight — a debt, a person, a role, an addiction, a grief. Dream-weights are often gripped as much as gripping: note whether the dream-you could let go of what was pulling, and didn't." },
      { title: "Watching Someone Else Drown", meaning: "Fear for a person beyond your reach — the depressed friend, the addicted sibling, the struggling child — and the helplessness of shorelines. Whether you dive in, and what happens if you do, often rehearses the real question: what rescue is actually yours to attempt, and what isn't." },
      { title: "Drowning in a Vehicle", meaning: "The car's meanings flooded: life-direction and momentum overwhelmed by emotion or circumstance — a career path filling with water, an escape route submerged. The window that won't open is usually a decision that feels sealed but, dreamers often find on waking reflection, isn't." },
      { title: "Suddenly Finding Your Footing", meaning: "The dream's mercy ending: the water was deep, and then your feet touch bottom — capacity rediscovered, support accepted, or the honest realization that the situation, while over your head, has a floor. Often follows real-life turning points by a few nights, as if confirming them." },
      { title: "Breathing Underwater After All", meaning: "The transformation ending: submersion without suffocation — overwhelm survived and revealed as habitable. Common partway through grief or therapy, and widely reported as one of dreaming's most reassuring experiences: the feelings didn't shrink; you grew." },
    ],
    faq: [
      { question: "Why do I keep dreaming about drowning?", answer: "Recurring drowning tracks ongoing overwhelm plus, usually, silence about it — the dream's signature is the uncalled cry. Two literal checks first: loud snoring or gasping (sleep apnea produces drowning dreams and is treatable) and any real water trauma (which processes differently). Absent those, ask the direct question — 'what am I drowning in, and who actually knows?'" },
      { question: "What does it mean that no one saves me in the dream?", answer: "Usually not that your people would fail you — but that they haven't been signaled. Dream-selves in drowning dreams characteristically never call out, mirroring waking concealment of the load. The dream reads better as an audit of your asking than of their answering; most dreamers, pressed, admit the shore doesn't know." },
      { question: "Can sleep apnea really cause drowning dreams?", answer: "Yes — it's one of the better-documented dream-body links: airway obstruction during REM gets narrated as drowning, choking, or suffocating, and treating the apnea often ends the dreams. Morning headaches, a partner's report of gasping, or daytime exhaustion make a sleep study worth requesting before any symbolic work." },
      { question: "I stopped struggling in the dream and felt peace. What does that mean?", answer: "It's a known and striking variant: sometimes it's surrender in the healthy sense — the end of an unsustainable self-carrying project, resistance exhausting itself into acceptance. But peace-at-giving-up imagery alongside waking hopelessness deserves care: if life currently feels like something to stop fighting, that's a conversation to have with someone — this is a sensitive area, and support is worth reaching for." },
      { question: "What does drowning mean in Islamic interpretation?", answer: "Gravely but contextually: being overwhelmed by worldly affairs or trial, with the sea often standing for the dunya's dangerous vastness — while surfacing alive reads toward rescue after difficulty. The Qur'an supplies the response: Yunus's cry from the depths was answered, and despair of relief is the one thing forbidden to the overwhelmed." },
    ],
  },
  crawling: {
    introduction: [
      "Dreams about crawling are oddly specific: you are moving, but not the way adults move. Hands and knees, a floor that feels endless, sometimes a tunnel so low you cannot stand. Searchers looking up this image often wake with a mix of shame and urgency — progress is happening, but it feels undignified, infantile, or painfully slow.",
      "That dual feeling is the interpretive key. Crawling is still forward motion. The dream rarely says you are stuck; it says the only available gear right now is close to the ground. Whether that reads as humility, exhaustion, regression, or survival depends on whether you were fleeing, exploring, or simply unable to stand.",
    ],
    general: [
      "Start with why you were crawling. Escaping danger on hands and knees points to survival under constraint — you are getting clear with less power than you want. Crawling like a baby often revisits dependence, early needs, or a life stage where standing on your own still feels premature. A tunnel forces patience: the passage is real, but the posture required is low and careful. Crawling through small spaces sharpens the squeeze — progress only by making yourself smaller.",
      "Notice the floor and the audience. Being watched while crawling intensifies shame about status or competence. An empty room makes the dream more about private capacity. If you could almost stand but kept dropping back down, the dream may be measuring depleted strength rather than a permanent loss of agency.",
    ],
    psychological: [
      "Psychologically, crawling dreams often appear during transitions that strip familiar competence — new jobs, illness, divorce, starting over after a failure. The adult body remembers infancy's only locomotion and borrows it when standing feels unsafe or premature. Clinicians also see these dreams alongside burnout: the psyche stages progress without dignity when pride can no longer fuel speed.",
      "Regression is not automatically pathology here. Returning to a crawl can mean rebuilding from foundations — skills, relationships, or self-trust that need to be relearned before upright life resumes. Ask what in waking life currently requires you to move slowly, ask for help, or accept a less polished version of yourself.",
    ],
    spiritual: [
      "Spiritually, crawling can be read as humility without humiliation: getting low enough to pass through a narrow gate. Many traditions treat the low path as purifying — ego cannot fit through certain doors standing tall. The dream may invite honest inventory of pride, impatience, or a rush to appear recovered before you actually are.",
      "A grounded response is practical: name the tunnel you are in, shorten the daily distance you expect of yourself, and treat slow progress as sacred rather than shameful. Crawling becomes a problem only when the dreamer refuses to crawl at all and waits indefinitely for the day standing feels effortless.",
    ],
    islamic: [
      "In an Islamic framing, dreams of constrained movement are often weighed against the dreamer's current trial (ibtila') rather than as fixed omens. Difficulty walking or advancing can reflect worldly hardship, humility before Allah, or a season where reliance on one's own strength is being gently corrected — without claiming certain knowledge of the unseen.",
      "A distressing crawling dream is met like other unsettling dreams: seek refuge in Allah, avoid spreading fear through speculation, and let waking conduct remain guided by faith, patience (sabr), and evidence. If the dream ends in safety or reaching a destination, it may be received with gratitude as encouragement through a hard passage.",
    ],
    faq: [
      { question: "What do dreams about crawling mean?", answer: "They commonly point to slow but real progress, vulnerability, or a season where standing — status, strength, independence — feels unavailable. Emotion and setting decide whether the tone is shame, survival, or humble rebuilding." },
      { question: "Is dreaming of crawling a bad sign?", answer: "Not automatically. Crawling is still movement. A fearful crawl away from danger differs from a calm crawl through a tunnel toward light. Treat the dream as a status report on capacity, not a prediction." },
      { question: "Why do I dream I can only crawl like a baby?", answer: "Baby-crawling imagery often tracks dependence, early needs resurfacing, or starting a chapter where adult competence has not caught up yet — a new role, recovery, or identity rebuild." },
      { question: "What if someone is crawling toward me?", answer: "That figure may represent a need, fear, or person approaching from a vulnerable or unsettling place. Note whether you help, flee, or freeze — that reaction maps onto how you meet neediness or threat when awake." },
    ],
  },
  "crawling-through-small-spaces": {
    introduction: [
      "A dream about crawling through small spaces — vents, crawlspaces, gaps under furniture, a corridor too low to stand — combines two pressures: you are moving, and the world will not let you move upright. Searchers often wake still feeling the squeeze in their shoulders: progress was possible only by making themselves smaller.",
      "That is different from a tunnel with light ahead, and different from open-floor crawling. The small space is the point. The dream stages constraint you must enter on purpose — or already found yourself inside — where dignity, speed, and options shrink to fit the gap.",
    ],
    general: [
      "Read the space by how tight it was and whether an exit existed. A crawlspace you chose to enter leans toward a hard passage you accept; being forced into a gap leans toward coercion or a life that shrank around you. Getting stuck mid-crawl focuses panic about a commitment you cannot reverse. Emerging into open air is clinically and symbolically important — agency returning after constraint.",
      "Notice what you were crawling toward or away from. Escape through a small space is survival under humiliation of posture. Crawling toward someone or something through a tight gap can mean love, duty, or curiosity that costs comfort. Dirt, dust, and darkness grade shame and unknowns; a clean, lit passage grades deliberate humility.",
    ],
    psychological: [
      "Psychologically, crawling through confined spaces often maps onto claustrophobic life structures: a job with no lateral move, a family role that leaves no room to stand, recovery that forces you to go slow and low. The body borrows crawlspace imagery when waking options feel physically and socially narrowed.",
      "Waking claustrophobia, panic, or recent experiences of actual tight spaces (medical procedures, crowded transit, hiding) can feed the image directly — include that layer before reaching only for career metaphors. If the dream repeats with rising panic, treat sleep and anxiety care as part of the response.",
    ],
    spiritual: [
      "Spiritually, the narrow way is an old image: a gate that ego cannot pass standing tall. Crawling through a small space can invite honest inventory of what must be shed — pride, haste, a self-image that no longer fits — so a necessary passage becomes possible.",
      "A grounded response is practical: name the waking constraint, ask what one dignity-preserving step still fits inside it, and refuse to stay in a gap that has no exit. Humility is sacred; captivity dressed as humility is not.",
    ],
    islamic: [
      "In an Islamic framing, dreams of tight, constrained passage are often weighed against present hardship (ibtila') and the dreamer's patience rather than as fixed omens of enclosure. Difficulty moving freely can reflect a worldly trial that requires reliance on Allah and careful, lawful next steps — without claiming certain knowledge of the unseen.",
      "A frightening confined-crawl dream is met like other distressing dreams: seek refuge in Allah, avoid spreading fear through speculation, and keep waking decisions tied to faith, evidence, and character. If you reached open space or safety, receive that with gratitude as encouragement through a hard stretch.",
    ],
    biblical: [
      "Scripture repeatedly honors the narrow path: the small gate, the hard road, spaces where the proud cannot swagger through. A dream of crawling through a small space can echo that architecture — not as coded prophecy, but as a question about whether the hard, low path is the faithful one for this season.",
      "Pair that with deliverance imagery: valleys walked with the Shepherd, sealed places that do not stay sealed forever. Biblical reflection asks what confinement you are in, what must be laid down to pass, and what next faithful step looks like before the exit is fully visible.",
    ],
    commonScenarios: [
      { title: "Crawling Through a Vent or Duct", meaning: "Invisible or unofficial routes through a problem — progress that cannot be public yet, or a path that feels undignified but effective." },
      { title: "Stuck Halfway in a Gap", meaning: "A commitment or role you have entered but cannot reverse; panic about options that narrowed after you moved." },
      { title: "Crawling Under Something to Escape", meaning: "Survival under constraint — getting clear with less power and less dignity than you want." },
      { title: "Emerging from a Tight Space into Open Air", meaning: "Relief after a sealed season; agency and breath returning after forced humility." },
      { title: "Guiding Someone Else Through a Small Space", meaning: "Caretaking through a hard passage — helping another (or a part of yourself) accept a low, slow route." },
    ],
    faq: [
      {
        question: "What does a dream about crawling through small spaces mean?",
        answer:
          "It commonly points to progress under severe constraint — advancing only by making yourself smaller. Emotion and whether you escape decide whether the tone is survival, humility, or stuck panic.",
      },
      {
        question: "Is crawling through tight spaces a bad omen?",
        answer:
          "Not automatically. Crawling is still movement. Stuck-and-panicking scenes lean toward a waking bind that needs an exit plan; emerging into open space leans toward a hard passage you are already completing.",
      },
      {
        question: "How is this different from a tunnel dream?",
        answer:
          "Tunnels emphasize passage and light ahead. Small spaces emphasize squeeze, claustrophobia, and the cost of fitting. Both can be transitions; the tight crawl asks what you must shed or endure to continue.",
      },
      {
        question: "Could this just be claustrophobia?",
        answer:
          "Yes — waking claustrophobia or recent confinement can feed the image. Still ask which life area currently feels too narrow to stand in; the metaphor and the phobia often travel together.",
      },
    ],
  },
  "car-accident": {
    introduction: [
      "A car accident dream usually feels like a jolt: metal, glass, the split-second before impact. People searching for car accident dream meaning — including Islamic readings — are often less worried about literal crashes than about a collision already forming in waking life: two plans, two people, or two versions of the self heading for the same intersection.",
      "Cars in dreams stand for direction and agency. An accident interrupts that story. The useful question is not 'Will I crash?' but 'Where am I going too fast, with too little control, or toward a conflict I have not named?'",
    ],
    general: [
      "Details carry the reading. Were you driving, a passenger, or a witness? Drivers often map the dream onto personal responsibility; passengers onto someone else's choices steering your life; witnesses onto fear of collateral damage. Whether brakes failed, another car swerved, or you hit something stationary separates inner recklessness from outer disruption.",
      "Aftermath matters as much as impact. Walking away unhurt can mean a wake-up call survived; injuries focus the cost; searching for someone after the crash points to relationships tangled in the collision of plans.",
    ],
    islamic: [
      "In classical Islamic dream interpretation, vehicles and journeys are frequently read in relation to one's worldly path, livelihood, and the consequences of haste. An accident motif may be taken as a caution about recklessness, disputed affairs, or a sudden trial — always with humility, never as certain prediction of harm to a specific person.",
      "A frightening car-accident dream is not evidence against others and should not seed suspicion. The recommended response to a distressing dream is to seek refuge in Allah, make du'a, avoid narrating it widely in a way that spreads fear, and ground decisions in faith, character, and real circumstances rather than omen-hunting.",
    ],
    faq: [
      { question: "What does a car accident dream mean?", answer: "It commonly reflects a collision of plans, fear of consequences, sudden disruption, or worry about life's direction — not a reliable prediction of a real crash." },
      { question: "What is the Islamic meaning of a car accident dream?", answer: "It may be approached as a caution about haste, livelihood stress, or trial on one's path, without treating the dream as certain knowledge of the unseen. Seek refuge in Allah if the dream distresses you, and do not use it to accuse or predict harm." },
      { question: "I dreamed I caused the accident. Am I guilty of something?", answer: "Dream guilt often tracks waking responsibility you already feel — a decision, a conflict, a risk. Use it as an invitation to review your direction, not as a verdict." },
    ],
  },
  horse: {
    introduction: [
      "Horse dreams feel kinetic: power under you, or power coming at you. Across cultures the horse carries drive, status, and freedom — and in Islamic dream literature it is among the more carefully graded animal symbols. Searchers asking for horse in dream meaning, including Islamic views, are usually tracking ambition, control, and whether their energy is servant or master.",
      "Color, riding, and wildness refine the image. A white horse often leans toward clear purpose; a black horse toward unfamiliar drive; riding suggests command; being chased by a horse suggests your own ambition has become the pursuer.",
    ],
    islamic: [
      "In classical Islamic interpretation, horses are often linked to honor, power, provision, and sometimes jihad in the broader sense of striving — with details changing the tone. A fine, obedient horse could be read toward strength and standing; an unruly or injured horse toward disrupted affairs or weakened capacity. Transmitted readings vary by school and dreamer, so humility remains essential.",
      "As with other animal dreams, a horse vision is not a license to boast or to fear a fixed fate. Receive a reassuring dream with gratitude; meet a distressing one by seeking refuge in Allah and keeping waking decisions tied to evidence, prayer, and good character rather than speculation about the unseen.",
    ],
    faq: [
      { question: "What does a horse mean in a dream?", answer: "Usually power, drive, freedom, and the energy carrying you toward a goal. Whether you ride, race, or flee the horse tells you how controlled that drive currently feels." },
      { question: "What is the Islamic meaning of a horse in a dream?", answer: "Classical interpreters often connected horses with honor, strength, and provision, graded by the animal's condition and your relationship to it. Treat any reading as possible counsel, not certainty." },
      { question: "Is dreaming of a white horse good?", answer: "Often it leans positive — clear intention, hope, or guided power — but your emotion in the dream still outweighs color folklore." },
    ],
  },
  work: {
    introduction: [
      "Dreaming about work is so common that people often dismiss it as leftover stress — yet the spiritual meaning of dreaming about work is usually sharper than that. The office, the boss, the late shift, the pink slip: these scenes stage duty, identity, and the question of whether your effort still serves a life you recognize.",
      "When the dream feels heavy, it is rarely predicting tomorrow's meeting. It is asking whether vocation has crowded out rest, whether performance has replaced worth, or whether a role is ending while you keep showing up in sleep.",
    ],
    spiritual: [
      "Spiritually, work dreams invite discernment about calling versus compulsion. Effort can be stewardship — skill offered with integrity — or it can become an idol that measures the soul in output. A dream of being overwhelmed, late, or fired often marks the moment that balance has tipped and the inner life is filing a complaint.",
      "A grounded spiritual response is to ask what quality the dream asks you to practice: honesty about capacity, courage to set a boundary, gratitude for provision, or willingness to release a role that no longer fits. Useful interpretation deepens responsibility and presence; it does not turn every inbox anxiety into prophecy.",
    ],
    faq: [
      { question: "What is the spiritual meaning of dreaming about work?", answer: "It often concerns vocation, stewardship, burnout, and whether effort still aligns with purpose — an invitation to rebalance duty and the rest of life, not a prediction of job loss." },
      { question: "What does a dream of working mean?", answer: "A dream of working usually reflects duty, identity, and performance pressure — or a calling question about whether your effort still fits the life you want. Details (boss, lateness, firing, old job) refine which part of vocation is speaking." },
      { question: "Why do I keep dreaming about my job?", answer: "Recurring work dreams usually track unresolved pressure, identity fused to performance, or a decision about a role that waking hours keep postponing." },
      { question: "Is dreaming of being fired a bad omen?", answer: "Usually it reflects insecurity, fear of rejection, or readiness to leave a role that no longer fits — not a reliable forecast of termination." },
    ],
  },
  tunnel: {
    introduction: [
      "A tunnel dream is almost always about passage: you are between where you were and where you are going, with limited visibility and no easy exit to the sides. Searchers looking for the biblical meaning of dreaming of a tunnel often wake with the same question — am I trapped, or am I simply mid-journey?",
      "Scripture and psychology both treat narrow passages seriously. The dream borrows architecture for a life season: confinement, faith without full sight, and the hope (or dread) of what waits at the far opening.",
    ],
    general: [
      "Read the tunnel by light, length, and your motion. Light ahead grades hope; pitch dark grades trust under uncertainty; an endless tube grades fatigue with a transition that will not resolve. Walking calmly differs from running, crawling, or being carried — those map onto agency inside the change.",
      "Companions and blockages matter. Alone in a tunnel often personalizes the trial; a crowd can mean a shared hardship or social pressure. A sealed exit or cave-in stages fear that the next chapter is closed — ask what waking choice feels blocked rather than treating it as fate.",
    ],
    psychological: [
      "Psychologically, tunnels stage liminality: identity between roles, recovery between illness and health, grief between loss and reorganization. The narrowness mirrors how few options feel available mid-transition, even when the destination is good.",
      "Anxiety-prone dreamers may loop the same tunnel when a decision is postponed. Completing the passage in the dream — exiting into light or open air — often coincides with accepting a next step awake, however small.",
    ],
    spiritual: [
      "Spiritually, the tunnel is a classic image of faith under constraint: moving forward when the full path is not visible. Many traditions treat the dark middle as formative rather than punitive — a season that strips distraction so that dependence, patience, or courage can grow.",
      "A useful spiritual response is practical: name the passage you are in, shorten the daily distance you demand of yourself, and watch for honest 'light' signs without forcing premature exits. The dream asks for steadfastness more than drama.",
    ],
    islamic: [
      "In an Islamic framing, dreams of dark passages or constrained travel may be weighed against the dreamer's current trial and reliance on Allah, without treating the image as certain knowledge of the unseen. Difficulty on a path can reflect worldly hardship or a season of sabr — patience with trust — rather than a fixed omen.",
      "A frightening tunnel dream is met like other unsettling dreams: seek refuge in Allah, avoid spreading fear through speculation, and keep waking decisions tied to faith, evidence, and good character. If the dream ends in light or open space, receive that texture with gratitude as encouragement, not as a guarantee of timing.",
    ],
    biblical: [
      "The biblical imagination is full of passages through the dark toward deliverance: Israel through the sea's corridor of walls, Jonah in the fish's confinement, and the 'valley of the shadow of death' walked with the Shepherd. Narrow ways also appear as moral architecture — the gate that is small, the road that is hard — so a tunnel dream can ask whether the hard path is the faithful one.",
      "Light at the end of a tunnel resonates with hope texts without becoming a code: 'the people walking in darkness have seen a great light,' and resurrection itself is emergence from a sealed place. A biblical reflection asks: what confinement am I in, who walks with me, and what would faithful next steps look like before the exit is fully visible? The dream is for prayerful discernment, not private prediction.",
    ],
    commonScenarios: [
      { title: "Light at the End of the Tunnel", meaning: "Hope after hardship — a sense that the difficult season has an exit. Note whether you are moving toward the light or standing still staring at it." },
      { title: "A Completely Dark Tunnel", meaning: "Transition without clarity. Often tracks decisions or recoveries where you must act before outcomes are visible." },
      { title: "An Endless Tunnel", meaning: "Fatigue with a process that will not resolve. Ask what waking expectation keeps resetting the finish line." },
      { title: "A Blocked or Collapsed Tunnel", meaning: "Fear that a path forward is sealed. Map it onto a specific stalled choice, relationship, or opportunity rather than global doom." },
      { title: "Riding a Train Through a Tunnel", meaning: "Being carried through change — less personal steering, more collective or systemic momentum. Useful when life feels on rails you did not lay." },
      { title: "Exiting Into Open Air", meaning: "Emergence and relief. Often marks the emotional beginning of a new phase before logistics catch up." },
    ],
    faq: [
      { question: "What is the biblical meaning of dreaming of a tunnel?", answer: "It commonly images a narrow passage through trial toward deliverance or a hard-but-faithful path — akin to valleys, sealed places, and narrow gates in scripture. Read it as an invitation to trust and next steps, not as a coded prophecy." },
      { question: "Is a tunnel dream a bad omen?", answer: "Not by default. Tunnels are passages. Fear grades the emotion of the transition; light, exit, or calm walking often lean toward hope and progress." },
      { question: "What if I never reach the end of the tunnel?", answer: "Endless-tunnel dreams usually track burnout with a process or a postponed decision. Shorten the next waking step instead of waiting for a cinematic exit." },
      { question: "Does light at the end of the tunnel mean my problems are over?", answer: "It more often means relief is conceivable and worth moving toward — encouragement, not a timestamp. Keep attending to the passage you are still in." },
    ],
  },
  "fear-of-heights": {
    introduction: [
      "Fear of heights in a dream — searched in German as traumdeutung höhenangst — usually stages vertigo at a life edge: a promotion, a risk, a view of how far you could fall. The dream may never show falling; the terror of the drop is enough.",
      "Unlike a simple falling dream, höhenangst imagery often freezes you at the brink. The question is less 'Will I fall?' than 'Can I stand this exposure without losing my footing?'",
    ],
    general: [
      "Note whether you chose the height or were placed there. Climbing willingly then panicking maps onto ambition meeting fear. Being forced to a ledge often tracks pressure from others. Looking down versus refusing to look separates curiosity about risk from total avoidance.",
      "Railings, wind, and companions refine the reading. A secure barrier that you still distrust points to safety you cannot feel. Wind that threatens balance can be emotional turbulence. Someone urging you forward or holding you back is often exactly who they are in waking life.",
    ],
    psychological: [
      "Psychologically, acrophobia dreams borrow the body's altitude alarm for status and competence fears: success that feels precarious, visibility that feels unsafe, or progress that outran your sense of support. Clinicians also see them after real elevation anxiety or after taking on roles with farther-to-fall consequences.",
      "If the dream freezes you mid-step, ask what waking decision feels like a ledge — speak up, launch, leave, commit. The dream exaggerates height; the underlying hesitation is usually specific and nameable.",
    ],
    spiritual: [
      "Spiritually, high places can mean perspective and temptation alike — a wider view that also exposes pride or isolation. A fear-of-heights dream may invite humility: hold the vantage without pretending you are invulnerable, and seek steady ground in practice, prayer, or trusted counsel.",
      "A grounded response is to distinguish wise caution from fear that blocks a needed step. Courage here is rarely a leap; it is one secure foothold at a time.",
    ],
    faq: [
      { question: "What does traumdeutung höhenangst mean in a dream?", answer: "Höhenangst (fear of heights) in dreams usually symbolizes exposure, precarious success, or anxiety about falling from a hard-won position — a psychological and spiritual status report, not a prediction of literal falls." },
      { question: "Is dreaming of fear of heights the same as dreaming of falling?", answer: "Related but not identical. Falling focuses on the drop; fear of heights focuses on standing at the edge. Many dreamers get the brink without the fall." },
      { question: "Why do I freeze at the top in the dream?", answer: "Freezing often maps onto a waking choice where ambition and fear cancel each other. Name the ledge decision; the dream usually softens once a small next step is taken." },
    ],
  },
  ghost: {
    introduction: [
      "Ghost in dream meaning searches usually come from the same night: someone who should be gone is still in the room. The figure may be a loved one, a stranger, or a presence without a face. In every case the dream borrows the language of hauntings to talk about unfinished feeling — grief, guilt, memory, or a past self that will not stay buried.",
      "Unlike a nightmare monster, a ghost often feels personal. That intimacy is the clue. The dream is less about the afterlife as spectacle and more about what still occupies your inner house.",
    ],
    faq: [
      { question: "What does a ghost in a dream mean?", answer: "Commonly unresolved past, memory, guilt, or the presence of something that has ended but still shapes you. The ghost's mood — gentle, angry, silent — steers the reading." },
      { question: "Is dreaming of a ghost a bad sign?", answer: "Not by default. Friendly or comforting ghosts often track continuing bonds and grief; attacking ghosts more often stage guilt or a past that feels actively disruptive." },
      { question: "What if the ghost is someone I know who died?", answer: "Many dreamers experience this as connection, unfinished words, or comfort. It is not proof of a visitation, but it can be a meaningful way the mind continues the relationship." },
    ],
  },
  "snake-and-water": {
    introduction: [
      "Dreaming of snakes in water combines two of the most loaded dream symbols: the snake's threat-and-transformation and water's emotional depth. Searchers often remember the image vividly — snakes swimming, coiling under a surface, or surfacing beside them — because instinct and feeling arrive in one scene.",
      "Read the pair together rather than as two separate dictionary entries. The water tells you the issue is emotional or intuitive; the snake tells you something in that current needs alertness, honesty, or change.",
    ],
    general: [
      "Clear water with a visible snake can mean a threat or truth you can already name. Murky water hides the snake and often maps onto confusion, mixed motives, or a fear you sense but cannot yet define. Snakes that ignore you in the water differ from snakes that pursue — presence versus pressure.",
      "Your body in the scene matters. Swimming calmly near snakes may show growing tolerance for instinctive or uncomfortable feelings. Freezing on the shore suggests avoidance. Killing snakes in water can mean trying to force emotional clarity through control.",
    ],
    faq: [
      { question: "What does dreaming of snakes in water mean?", answer: "It commonly points to a hidden threat or transformation inside an emotional situation — intuition mixed with caution, or change moving through deep feeling." },
      { question: "Are snakes in water a bad omen?", answer: "Not automatically. The dream asks for alertness in an emotional area of life. Calm endings lean toward integration; chase or bite scenes lean toward a live conflict needing attention." },
    ],
  },
  "snakes-in-water": {
    introduction: [
      "Snake in water in dream meaning searches usually describe the same vivid night: serpents swimming, coiled beneath a surface, or gliding through a pool beside you. The image merges two dictionaries — instinctive threat and emotional depth — into one scene that is hard to shake on waking.",
      "Unlike a snake on dry ground, water relocates the issue into feeling, intuition, and the parts of life that move below speech. The snake says: stay alert. The water says: this is about what you feel, not only what you think.",
    ],
    general: [
      "Visibility is the first fork. A snake clearly seen in clear water is a threat or truth you can already name. Murky water hides the animal and often maps onto confusion or a fear sensed but undefined. Multiple snakes swimming can mean several emotional pressures at once.",
      "Your stance grades agency. Entering the water calmly near snakes can mark growing tolerance for uncomfortable instinct. Standing frozen on the bank is avoidance. Being bitten in water concentrates a painful truth delivered through emotion.",
    ],
    psychological: [
      "Psychologically, snakes-in-water dreams often appear when relational or bodily intuition conflicts with a clean story you tell yourself. The psyche puts teeth in the current. Clinicians also see them during pregnancy and major transitions — transformation plus protective alertness wearing snake costume in emotional space.",
      "If you fear snakes waking, include phobia load: the brain may reach for its strongest fear image whenever anxiety needs a shape in a water setting (bath, pool, ocean news).",
    ],
    spiritual: [
      "Spiritually, water-and-serpent pairings appear in healing and temptation traditions alike. Ask whether the presence felt like medicine moving through feeling or like a test inside emotion. Discernment, not panic, is the discipline.",
      "A grounded response: name the emotional situation that needs honesty this week, and take one alert but non-paranoid step — a conversation, a boundary, a health check — rather than hunting enemies.",
    ],
    islamic: [
      "Classical readings often link snakes to enmity or harm and water to worldly or emotional states; combined, interpreters may caution about harm arising within an emotional or domestic current — always with humility, never as certain accusation of a named person.",
      "Meet a frightening snakes-in-water dream by seeking refuge in Allah, avoiding rumor based on the image, and letting waking conduct stay just and evidence-based.",
    ],
    faq: [
      { question: "What does snake in water in a dream mean?", answer: "Hidden threat or transformation inside an emotional situation — intuition mixed with caution, or change moving through deep feeling." },
      { question: "What about dreaming of snakes swimming?", answer: "Movement through emotion with instinctive alertness. Calm swimming snakes differ from pursuing ones — presence versus pressure." },
      { question: "Is it a bad omen?", answer: "Not automatically. It asks for alertness in a feeling-heavy area of life. Bite or chase scenes lean toward a live conflict; calm endings lean toward integration." },
    ],
  },
  "wedding-and-blood": {
    introduction: [
      "A wedding with blood in a dream — sometimes searched as 'wedding in bled a dream' — is jarring because vows and wounding arrive together. White and red collide: commitment marked by cost, family tension, sacrifice, or a union that feels stained before it begins.",
      "Blood does not automatically cancel the wedding's meaning. It grades it. The dream may be asking what this commitment will cost, whose pain is being ignored, or whether a bond is being sealed over an unhealed injury.",
    ],
    general: [
      "Note whose blood and when it appears. Blood on a dress or hands during vows focuses on identity and responsibility inside the commitment. Blood at a reception or among relatives often points to family conflict riding along with the union. A calm ceremony that suddenly turns bloody can mark a truth breaking through denial.",
      "Your role matters: bride, groom, guest, or outsider. Guests often process someone else's costly commitment; the couple-to-be may be weighing readiness against fear of harm — emotional, reputational, or practical.",
    ],
    faq: [
      { question: "What does a wedding with blood mean in a dream?", answer: "It often symbolizes commitment intertwined with cost, sacrifice, conflict, or an emotional wound that the union has not resolved — not a prediction of literal violence." },
      { question: "Is dreaming of blood at a wedding a bad omen for marriage?", answer: "Treat it as a prompt to examine doubts, family pressure, or unfinished hurt around commitment — not as fate. Calm reflection beats omen panic." },
    ],
  },
  "hair-falling-out": {
    introduction: [
      "Hair falling out in a dream hits vanity and vitality at once. Searchers opening a dream dictionary for hair falling out usually wake touching their scalp — the image is bodily enough to feel almost literal. Symbolically it tracks confidence, aging, attractiveness, and control over how you present yourself.",
      "Like teeth dreams, this one is soaked in exposure. Hair is public identity; watching it shed stages fear of being seen diminished. Health anxiety, stress, and real shedding can also feed the image, so start with body and stress before assuming pure metaphor.",
    ],
    faq: [
      { question: "What does hair falling out mean in a dream dictionary?", answer: "Commonly loss of confidence, aging anxiety, health worry, or fear of losing strength and attractiveness. Context and emotion refine whether the tone is vanity, grief, or stress." },
      { question: "Is it about real hair loss?", answer: "Sometimes. High stress and actual shedding can appear in dreams. If waking life includes scalp worry or illness anxiety, include that in the reading alongside symbolism." },
    ],
  },
  alligator: {
    introduction: [
      "What does dreaming about an alligator mean? Usually something patient and dangerous under a calm surface. Alligators (and crocodiles) wait. The dream borrows that biology for threats, instincts, or deceptions that do not rush — they linger until you step too close.",
      "Water settings intensify the reading: emotion with teeth. An alligator in the house brings the threat into private life. An attack concentrates the moment the dormant danger finally moves.",
    ],
    faq: [
      { question: "What does dreaming about an alligator mean?", answer: "Hidden danger, primal instinct, or a threat that seemed dormant. Where the alligator appears — water, house, chase — tells you which area of life needs alertness." },
      { question: "Is an alligator dream a warning about a person?", answer: "It can reflect mistrust you already feel, but it is not proof someone is betraying you. Use it to audit gut feelings and boundaries, not to accuse." },
    ],
  },
  "ex-family": {
    introduction: [
      "Dreaming of an ex and his family — or her family — often hurts in a specific way: you are not only revisiting the person, but the whole world that came with them. Holidays, parents, siblings, the in-law version of a future that ended. Searchers asking what it means when an ex and his family are in your dreams are usually grieving a social fabric, not just a romance.",
      "These dreams commonly return after you thought you were done. The family figures can stand for belonging you lost, approval you still want, or patterns from that relationship still echoing in how you attach now.",
    ],
    faq: [
      { question: "What does it mean when your ex and his family are in your dreams?", answer: "Often lingering attachment to a shared world, grief for connections lost with the breakup, or unfinished emotion about belonging and approval — not necessarily a wish to reunite." },
      { question: "Does dreaming of an ex's family mean they miss me?", answer: "Dreams are not messages from other people. They reflect your psyche's unfinished business with that chapter. Focus on what you still need — closure, community, or self-worth — rather than their feelings." },
    ],
  },
  kissing: {
    introduction: [
      "A kiss in a dream concentrates intimacy into a single contact — consent or its absence, desire or duty, blessing or boundary. Searchers looking for the biblical meaning of a kiss in a dream often wake with a specific face still on their lips and want to know whether scripture treats the image as holy greeting, romantic bond, or warning.",
      "Kissing dreams are less about prediction than about exchange: what are you offering, receiving, or refusing? A stranger's kiss differs from an ex's; a public kiss differs from one stolen in secret. The mouth is where affection and speech meet, so these dreams often sit next to questions of honesty and closeness.",
    ],
    general: [
      "Start with who and whether you wanted it. A welcome kiss from a partner usually tracks warmth, reconciliation, or hunger for contact. An unwanted kiss flags a boundary issue — attention you did not invite, or intimacy arriving faster than trust. Kissing an ex almost always revisits unfinished chemistry or a quality from that era you miss.",
      "Setting grades the reading. A wedding kiss leans toward commitment; a hidden kiss toward secrecy or divided loyalty; a kiss that turns sour mid-scene toward disappointment in how closeness actually feels. Note whether words followed the kiss — affection without speech can mean connection that is felt but not yet negotiated awake.",
    ],
    psychological: [
      "Psychologically, kiss dreams stage attachment needs and boundary clarity. Secure dreamers often report affectionate kisses during periods of bonding; anxious dreamers may dream of withheld or interrupted kisses when reassurance feels scarce. Clinicians also see kissing dreams spike around new relationships, reconciliations, and times when the body is asking for touch the schedule has denied.",
      "Desire in the dream is a poor literal guide. The psyche borrows kissing as the strongest shorthand for acceptance — being chosen, welcomed, or merged with something. Ask what in waking life you want to be closer to: a person, a path, a version of yourself.",
    ],
    spiritual: [
      "Spiritually, a kiss can image blessing, peace, or union — the sealing of goodwill. It can also warn when affection is used to bypass truth. Contemplative readings ask whether the kiss felt like gift or bargain, and whether your waking relationships honor the same honesty the dream demanded.",
      "A grounded practice after such a dream is simple: name the hunger (affection, approval, reconciliation) and meet one piece of it awake with integrity — a conversation, an apology, or a boundary — rather than hunting the dream-partner for meaning.",
    ],
    islamic: [
      "Islamic interpreters weigh kisses by context, relationship, and permissibility in waking life. Affection within lawful bonds may be read toward harmony or glad tidings; illicit imagery is more often treated as a prompt to guard the heart and lower the gaze than as a coded future event.",
      "A dream is never a license for what is forbidden. Meet a distressing or tempting kiss dream by seeking refuge in Allah, avoiding narration that spreads fitnah, and strengthening lawful bonds and character — not by treating the scene as permission or prophecy.",
    ],
    biblical: [
      "Scripture uses the kiss across a wide moral range: the holy kiss of greeting among believers, the kisses of the Song of Songs as devoted love, Jacob and Esau's reconciliation, and Judas's kiss as betrayal wearing affection's face. The biblical question is therefore not 'kiss = good' but 'what kind of kiss was this?'",
      "A biblical reflection asks whether the dream's kiss resembled peace, covenant affection, or a gesture that covered falsehood. Bring the scene into prayer beside texts on love that is truthful and greetings that are sincere — and let waking conduct match the integrity you hope the kiss represented.",
    ],
    commonScenarios: [
      { title: "Kissing a Stranger", meaning: "Attraction to the unfamiliar — a new possibility, trait, or path not yet claimed. Often less about that face than about readiness for a new kind of closeness." },
      { title: "Kissing an Ex", meaning: "Nostalgia, unfinished chemistry, or a quality from that relationship resurfacing. Check why now — anniversaries and new commitments commonly trigger it." },
      { title: "A Forced or Unwanted Kiss", meaning: "Boundary violation in symbolic form: attention, pressure, or intimacy arriving without consent. Map it onto waking situations where saying no feels hard." },
      { title: "A Public Kiss", meaning: "Visibility of the bond — pride, announcement, or anxiety about being seen as a couple or as attached to a choice." },
      { title: "Refusing a Kiss", meaning: "Self-respect and discernment. The dream may celebrate a boundary you are ready to hold, or rehearse one you still need to set." },
      { title: "A Kiss That Feels Holy or Peaceful", meaning: "Blessing, reconciliation, or spiritual comfort. Less erotic plot, more seal of goodwill — worth receiving with gratitude rather than over-analyzing." },
    ],
    faq: [
      { question: "What is the biblical meaning of a kiss in a dream?", answer: "Scripture frames kisses as greeting, devoted love, reconciliation — or betrayal. Read your dream's tone against that range: peace and covenant versus affection covering falsehood. It is for discernment, not a fixed omen." },
      { question: "Does dreaming of kissing someone mean they like me?", answer: "No reliable evidence links dream kisses to another person's waking feelings. The dream reflects your psyche's themes of closeness, desire, and boundary — start there." },
      { question: "Is kissing an ex in a dream cheating?", answer: "No. You do not control dream casting. It warrants attention only if waking loyalty or longing is also conflicted." },
      { question: "Why did the kiss feel wrong or sour?", answer: "Often a mismatch between hunger for closeness and the actual safety of the bond — or a warning that something presented as affection is not trustworthy." },
    ],
  },
  "being-naked": {
    introduction: [
      "Dreams about being naked in public are among the most searchable nightmare motifs for a reason: exposure without consent. You are in school, at work, on a street — and somehow undressed while everyone else is not. The panic is social before it is sexual. Searchers for naked in public dream meaning usually want one answer: am I about to be humiliated in real life?",
      "Almost never as a prediction. The dream stages vulnerability, shame, and the fear of being seen without the armor you wear awake — competence, polish, preparation. Sometimes it also stages a quieter wish: to be authentic and still accepted. Which tone you woke with decides the reading.",
    ],
    general: [
      "Ask who noticed. A crowd that stares intensifies performance anxiety. A crowd that does not notice — a classic variant — often means your fear of exposure is larger than the actual risk. Trying to cover up maps onto damage control in waking life; walking on calmly can mark growing self-acceptance.",
      "Place tags the department of life. Naked at school revisits evaluation and old social hierarchies. Naked at work tracks professional imposter feelings. Naked at home with strangers present may mean private life feeling invaded. Partially clothed dreams usually isolate one vulnerable topic rather than total exposure.",
    ],
    psychological: [
      "Psychologists link naked-in-public dreams to social-evaluative anxiety: fear of negative judgment when status, preparation, or attractiveness feels on trial. They spike before presentations, new jobs, dates, and any situation where you feel underdressed for the role — literally or metaphorically.",
      "There is also an authenticity reading. Some dreamers report relief mid-dream when nobody cares — a rehearsal for the discovery that imperfect visibility is survivable. If the dream repeats, log the waking trigger within 24 hours; the match is usually obvious.",
    ],
    spiritual: [
      "Spiritually, nakedness can mean truth without costume — the soul before God or conscience. Shame-heavy versions ask where you hide; peaceful versions may invite radical honesty. The discernment is whether the dream calls for covering what should stay private or for dropping a false self.",
      "A grounded response: choose one place to be more honestly seen this week (a friend, a journal, a prayer) while still honoring wise privacy. Exposure without discernment is not the same as integrity.",
    ],
    islamic: [
      "In Islamic framing, dreams of nakedness are weighed carefully and often tied to themes of exposure, dignity, and the covering Allah loves for believers — without treating every image as a literal scandal to come. Interpreters stress humility and avoiding harm through suspicion or rumor.",
      "A distressing nakedness dream is met like other unsettling dreams: seek refuge in Allah, do not narrate it in ways that spread shame, and let waking conduct protect ʿird (honor) and modesty. Use the dream as a private prompt toward dignity, not as public drama.",
    ],
    biblical: [
      "Scripture opens with nakedness without shame in Eden, then the fall that introduces covering and fear of being seen. Later texts treat nakedness as vulnerability, poverty, or disgrace in war — and clothing the naked as mercy. A biblical reflection can ask: am I hiding from God and others, or am I being called to honest humility?",
      "If the dream's shame feels crushing, remember that biblical hope includes being known and still loved. Pair the dream with prayer about worth that does not depend on performance costumes — and practical wisdom about what should remain private.",
    ],
    commonScenarios: [
      { title: "Naked at School or Work", meaning: "Evaluation anxiety — tests, reviews, audiences. Old hierarchies of who is 'prepared' enough resurface." },
      { title: "Nobody Notices", meaning: "Your fear of exposure outruns reality. Often reassuring once recognized." },
      { title: "Trying to Cover Up", meaning: "Damage control under pressure. Ask what waking image you are scrambling to protect." },
      { title: "Feeling Comfortable Naked", meaning: "Self-acceptance and authenticity. Less nightmare, more integration." },
      { title: "Partially Naked", meaning: "One specific vulnerability — a topic, role, or body concern — rather than total exposure." },
      { title: "Being Pointed At or Laughed At", meaning: "Acute shame. Map onto a recent criticism, mistake, or fear of ridicule." },
    ],
    faq: [
      { question: "What does dreaming of being naked in public mean?", answer: "Usually vulnerability, shame, or fear of being seen unprepared — sometimes a wish for authenticity. It is a status report on exposure anxiety, not a prediction of humiliation." },
      { question: "Is a naked dream about sex?", answer: "Sometimes erotic tone is present, but public-naked dreams are more often social than sexual. Judge by emotion: embarrassment points to evaluation; desire points elsewhere." },
      { question: "Why does nobody notice I'm naked?", answer: "A common and useful variant: the dream contrasts your inner panic with outer indifference, suggesting the feared judgment may be mostly internal." },
      { question: "How do I stop these dreams?", answer: "Reduce the waking trigger — over-preparation for performances, avoidance of feedback, or harsh self-talk. Imagery rehearsal of walking calmly clothed can also help recurrent versions." },
    ],
  },
  sister: {
    introduction: [
      "Sister dream meaning searches usually come from a night that felt familiar: rivalry, loyalty, a shared childhood hallway, or a sister who is no longer as close as she once was. Siblings occupy a unique symbolic slot — peers who knew you before you had a public self. Dreaming of a sister often stages comparison, empathy, and the parts of your personality that grew up beside hers.",
      "Whether the dream is tender or furious, start with the bond as it actually is now, then ask what quality she carries for you: the responsible one, the free one, the wounded one, the ally. Dreams borrow sisters as mirrors more often than as messengers about her waking life.",
    ],
    general: [
      "Plot matters less than role. Protecting your sister maps onto loyalty and a vulnerable trait you defend. Arguing with her often externalizes an inner conflict — two values that both feel like 'you.' A sister dying or in danger usually tracks fear of losing closeness or worry you have not voiced.",
      "Age dynamics refine the reading. An older sister may stand for standards and guidance; a younger sister for tenderness and responsibility. Estrangement in the dream asks about unfinished family story. If she appears happier or more successful than you, check waking comparison rather than assuming envy is the whole truth.",
    ],
    psychological: [
      "Sibling dreams draw on early competition for care and identity differentiation — how you became 'not her' while still belonging. Adult sister dreams often revisit those templates when life events (marriage, kids, careers, caregiving for parents) reshuffle the family hierarchy.",
      "Clinicians note that sister figures can also personify a same-gender peer archetype: collaboration, gossip, solidarity, or betrayal among women (or whoever filled that role). If you have no sister, the dream may still use the word for a friend who occupies sister-space.",
    ],
    spiritual: [
      "Spiritually, sisters can image kinship of soul — shared origin, mutual bearing of burdens. Conflict dreams may invite forgiveness work; protective dreams may invite stewardship of a tender calling. The aim is usually right relationship, not scorekeeping.",
      "A useful practice: write what you would thank her for and what you would release. Dreamers often find the night image softens once gratitude and boundary are both named.",
    ],
    islamic: [
      "Kinship (silat al-rahim) is emphasized in Islamic teaching; dreams of sisters may prompt care for family ties without becoming certain reports about a sister's unseen state. Avoid using a dream to accuse or to claim knowledge of her private affairs.",
      "If the dream distresses you, seek refuge in Allah, make du'a for her and for yourselves, and let waking contact be guided by kindness and evidence — not omen logic.",
    ],
    biblical: [
      "Biblical sisters — Miriam, Martha and Mary, Rachel and Leah — carry themes of leadership, jealousy, service, and different ways of loving. A sister dream can ask which pattern you are living: rivalry for blessing, or complementary gifts.",
      "Reflect in prayer on reconciliation texts and on carrying one another's burdens. The dream is for formation of love inside the family story, not for fortune-telling about her future.",
    ],
    commonScenarios: [
      { title: "Arguing With Your Sister", meaning: "Often an inner debate wearing her face — or unfinished friction from real life asking for a conversation." },
      { title: "Your Sister in Danger", meaning: "Protectiveness and anxiety about a bond or about a vulnerable trait she represents in you." },
      { title: "A Warm Reunion", meaning: "Longing for allyship, childhood safety, or repair after distance." },
      { title: "Comparing Lives", meaning: "Status and path anxiety. The dream exaggerates scorekeeping you already feel awake." },
      { title: "Sister as a Child", meaning: "Return to formative dynamics — who was favored, who cared, who rebelled." },
      { title: "An Unknown Sister", meaning: "A sisterly archetype: peer solidarity or rivalry without a literal sibling." },
    ],
    faq: [
      { question: "What does dreaming about your sister mean?", answer: "Commonly closeness, comparison, shared history, and mirrored traits. Emotion and plot tell you whether the tone is loyalty, rivalry, or grief for distance." },
      { question: "Does a bad dream about my sister mean something will happen to her?", answer: "No reliable predictive link. Treat frightening dreams as anxiety or unfinished feeling — and check on her with ordinary care if you are worried, not because the dream demanded it." },
      { question: "I dreamed of a sister I don't have. Why?", answer: "The psyche uses 'sister' as a role — peer, ally, rival. It may point to a friend or to a part of yourself that wants sisterly relating." },
    ],
  },
  angel: {
    introduction: [
      "Angel dream meaning queries usually follow a night that felt strangely gentle — or strangely urgent. An angel appears, speaks, watches, or simply stands in light. People want to know whether this is comfort, calling, or imagination wearing religious clothes.",
      "Across traditions angels image protection, guidance, and conscience. The dream's usefulness is less about proving a visitation and more about what reassurance or redirection your life was asking for when the figure arrived.",
    ],
    general: [
      "Tone first: peaceful presence versus stern warning. A comforting angel often arrives in grief, illness, or decision fatigue. A message-bearing angel focuses the question on what you already half-know. Wings without a face can mean help that feels abstract; a familiar face as 'angel' may be a loved one cast in protective role.",
      "Your response matters. Kneeling, fleeing, arguing, or calmly listening map onto how you meet guidance awake. If the angel leads you somewhere, ask what waking next step that path resembles.",
    ],
    psychological: [
      "Psychologically, angels can personify the caregiving and moral functions of the psyche — the part that wants you safe and aligned. They appear frequently in bereavement dreams and in high-stress periods when the mind needs a trustworthy protector image.",
      "Skepticism and faith can coexist in interpretation: even if you read the figure as internal, the comfort or conviction it brings is real data about what you need. If angel dreams leave fear rather than peace, examine whether 'guidance' in waking life has felt controlling.",
    ],
    spiritual: [
      "Spiritually, angel dreams invite gratitude, discernment, and courage. Traditions warn against chasing angels as spectacle and encourage testing spirits by fruit — peace, humility, love of good. A grounded response is to thank, then act on the ordinary good the dream illuminated.",
      "If the dream felt like a summons, translate it into one concrete faithful action this week rather than waiting for another vision.",
    ],
    islamic: [
      "Belief in angels is part of Islamic creed; still, a dream figure is not automatically a literal angelic visitation, and interpreters urge humility. True dreams are possible, yet so are self-talk and confusing images. Do not build aqidah or major life rulings on a single night vision.",
      "If the dream brings peace and reminds you of Allah, receive it with gratitude and increased worship. If it confuses or frightens, seek refuge in Allah and avoid speculative storytelling. Guidance is confirmed through Qur'an, Sunnah, and sound counsel — not dream chase alone.",
    ],
    biblical: [
      "Biblical angels announce, protect, strengthen, and sometimes terrify before they say 'do not fear.' They serve God's purposes rather than human curiosity. A biblical reflection asks whether the dream's fruit matches scripture's angels: directing attention to God, encouraging obedience, accompanying in trial.",
      "Weigh any 'message' against scripture and wise counsel. Hebrews reminds that some have entertained angels unawares — often through ordinary hospitality — so the waking follow-through may look like mercy and faithfulness more than mystical drama.",
    ],
    commonScenarios: [
      { title: "An Angel Visiting You", meaning: "Need for reassurance or a sense of being accompanied through uncertainty." },
      { title: "A Guardian Angel", meaning: "Protection themes — support you may underestimate, or a wish to be watched over." },
      { title: "An Angel With a Message", meaning: "An insight ready for conscious acknowledgment. Write the words on waking." },
      { title: "Angel and Demon Together", meaning: "Moral conflict staged visually — constructive versus destructive pulls." },
      { title: "A Crying Angel", meaning: "Compassion and grief — sorrow your conscience cannot ignore." },
      { title: "Angel Wings Only", meaning: "Aspiration and the desire to rise above a heavy situation without a full narrative." },
    ],
    faq: [
      { question: "What does an angel in a dream mean?", answer: "Often protection, guidance, hope, or conscience — comfort in a hard season. Tone and message refine whether it feels like reassurance or a call to change." },
      { question: "Was my dream a real angel?", answer: "Neither psychology nor this page can prove that. Evaluate fruit: peace, humility, alignment with known good. Major decisions still need waking wisdom." },
      { question: "Are angel dreams always positive?", answer: "Usually leaning protective, but stern or fearful angel dreams can mark conviction or awe. Fear alone does not make the dream evil — nor does light make every image trustworthy without discernment." },
    ],
  },
  tornado: {
    introduction: [
      "A tornado dream meaning search usually follows a night of dread with a funnel on the horizon — or already tearing through the house. Tornadoes in dreams stage chaotic emotion and sudden upheaval: something that can be seen coming and still cannot be negotiated with.",
      "Unlike a gentle storm, the tornado concentrates destruction into a moving point. Ask what in waking life feels like it could touch down without warning — a confrontation, a layoff, a diagnosis scare, a family blowup — and whether you were hiding, running, or watching from a strange calm.",
    ],
    general: [
      "Distance grades urgency. A tornado far away often means witnessing turmoil that is not yet personal. One coming toward you marks anticipatory anxiety. Multiple tornadoes suggest several volatile fronts at once. A tornado destroying a house focuses the hit on home, family, or identity foundations.",
      "Your strategy is the second half. Hiding in a basement can be wise self-protection. Trying to outrun it may mirror frantic coping. Surviving afterward often reflects resilience you underestimate. If you felt weirdly calm, the psyche may already be accepting a change you still argue with by day.",
    ],
    psychological: [
      "Tornado dreams correlate with anxiety about uncontrollable events and with environments that feel emotionally volatile — conflictual homes, chaotic workplaces, news-cycle dread. They are classic 'looming threat' images: the funnel is visible, the path uncertain.",
      "People with trauma histories sometimes dream tornadoes as condensed chaos. If the dream recreates a real storm or disaster, prioritize grounding and support; symbolic reading comes after safety.",
    ],
    spiritual: [
      "Spiritually, whirlwinds appear as images of forces larger than personal will — purification, judgment, or the raw power of change. The invitation is rarely to dominate the storm; it is to find refuge, release what cannot be held, and rebuild with clearer priorities.",
      "After such a dream, name what you can shelter (relationships, health, values) and what you have been clutching that the storm keeps loosening.",
    ],
    islamic: [
      "Destructive wind imagery may be weighed as trial, warning against heedlessness, or reflection of worldly turmoil — always without claiming certain knowledge of a destined disaster. Seek refuge in Allah from fear, make du'a, and do not spread panic from a dream.",
      "Let waking preparation be practical and faithful: mend relationships, reduce recklessness, trust Allah with what you cannot control. A dream is not a weather forecast.",
    ],
    biblical: [
      "Scripture's whirlwind can carry both theophany and upheaval — Job's encounter, Elijah's departure, prophetic storms. A tornado dream can ask where you need refuge in God amid forces you cannot steer.",
      "Pair the dream with Psalms of shelter and with wisdom about building on rock. The goal is steadfastness and compassion in chaos, not decoding a private apocalypse.",
    ],
    commonScenarios: [
      { title: "Tornado Coming Toward You", meaning: "Anticipatory dread — a crisis you can sense approaching." },
      { title: "Hiding From a Tornado", meaning: "Self-protection and bracing. Often healthy caution under real pressure." },
      { title: "Surviving a Tornado", meaning: "Resilience after upheaval; inventory what still stands." },
      { title: "Tornado Hits the House", meaning: "Upheaval aimed at belonging, family stability, or personal foundations." },
      { title: "Multiple Tornadoes", meaning: "Several volatile situations competing for fear." },
      { title: "Watching From Afar", meaning: "Turmoil at a distance — empathy, dread, or relief that it is not yet yours." },
    ],
    faq: [
      { question: "What does a tornado dream mean?", answer: "Usually chaotic emotion, sudden upheaval, and anxiety about change you cannot control. Details — distance, house damage, survival — refine the focus." },
      { question: "Is a tornado dream a warning of disaster?", answer: "Not as literal prediction. Treat it as a stress and control report. Practical readiness is wise; omen panic is not." },
      { question: "Why do I keep dreaming of tornadoes?", answer: "Recurrence tracks ongoing volatility or unresolved dread. Reduce chaos where you can, and name the funnel you keep watching for." },
    ],
  },
  heights: {
    introduction: [
      "Dreams about heights — standing on a ledge, looking down, climbing without a railing — are cousins of falling dreams, but the emphasis is often the brink rather than the drop. Searchers for dreams about heights and being scared want to know why success, visibility, or a high place felt unsafe even when nothing fell.",
      "Height stages exposure and ambition. The view can be thrilling or nauseating. Your body in the dream usually tells the truth: locked knees mean a waking choice where desire and fear cancel; steady footing with awe can mean earned perspective.",
    ],
    general: [
      "Did you climb or were you placed high? Chosen ascent maps onto ambition; forced elevation onto pressure and visibility you did not request. Looking down measures how far there is to fall — status, reputation, a relationship. Refusing to look can be avoidance of consequence.",
      "Railings, wind, and companions matter. A missing railing is unsupported progress. Wind is emotional turbulence at altitude. Someone pulling you back or pushing you forward is often exactly who influences your risk tolerance awake.",
    ],
    psychological: [
      "Height dreams borrow the vestibular alarm for precarious competence: promotions, launches, public roles, recoveries that still feel fragile. They differ from pure falling dreams by lingering in anticipation — the psyche rehearses standing there.",
      "If you have waking acrophobia, the dream may simply replay the phobia under stress. If you do not, ask which life ledge currently has a view you both want and fear.",
    ],
    spiritual: [
      "Spiritually, high places mean vision and temptation: clearer sight, and the risk of pride or isolation. The dream may invite humility that keeps the vantage without pretending you are invulnerable.",
      "Courage here is usually one secure step, not a leap. Seek counsel and practices that steady you at the altitude you have already reached.",
    ],
    islamic: [
      "Dreams of high places may be weighed in relation to status, trial, and reliance on Allah rather than on one's elevation. Avoid reading them as guaranteed rise or fall in dunya rank.",
      "If the dream frightens you, seek refuge in Allah and let waking conduct stay humble and careful. Gratitude for any sense of perspective is better than chasing height for its own sake.",
    ],
    biblical: [
      "Biblical high places include both encounter (mountains of revelation) and warning (altars of idolatry, pride before a fall). A heights dream can ask which kind of elevation you are living.",
      "Reflect with texts on humility and sure footing. The Shepherd leads beside still waters and also through valleys — altitude is not the only holy geography.",
    ],
    commonScenarios: [
      { title: "Standing at a Great Height", meaning: "Vantage after progress — or exposure that came with a new role." },
      { title: "Looking Down", meaning: "Assessing the cost of falling; comparison and vertigo about a choice." },
      { title: "Climbing Higher", meaning: "Ambition and strain; progress that requires continuous effort." },
      { title: "No Railing", meaning: "Unsupported success; missing safety in a visible position." },
      { title: "Afraid on a Bridge", meaning: "Transition anxiety — crossing between chapters mid-air." },
      { title: "Heights Without Falling", meaning: "The brink itself is the message; dread of exposure more than of impact." },
    ],
    faq: [
      { question: "What do dreams about heights mean?", answer: "Often exposure, ambition, and vertigo at a life edge — fear or thrill about standing above familiar ground. Emotion decides whether the tone is calling or warning." },
      { question: "Is dreaming of heights the same as dreaming of falling?", answer: "Related. Falling emphasizes the drop; heights emphasize standing at the edge. Many dreamers get one without the other." },
      { question: "Why am I scared of heights only in dreams?", answer: "The dream may use altitude as a metaphor for precarious status even if waking heights do not bother you. Name the ledge decision in daily life." },
    ],
  },
  nightmare: {
    introduction: [
      "Nightmare meaning and nightmare interpretation searches spike after nights that leave the body convinced the threat was real. A nightmare is not just a 'bad dream' — it is a dream that triggers fear intense enough to wake you, often with heart racing and a residue that stains the morning.",
      "Most nightmares are the mind's threat-simulation and stress-release systems working overtime. They become clinically important when they recur, follow trauma, or make you fear sleep itself. This page stays grounded: what horrible dreams usually reflect, and what actually helps.",
    ],
    general: [
      "Sort the nightmare by plot family: chase, falling, paralysis-adjacent fear, death imagery, disaster, interpersonal attack. Each family points to a different waking load — avoidance, loss of support, overwhelm, grief, chaos, boundary violation. Recurrence means the underlying question is still live.",
      "Context on the day before matters. Conflict, late news, fever, alcohol, missed sleep, and certain medications all raise nightmare frequency. Rule out the ordinary amplifiers before assuming deep symbolism — then interpret what remains.",
    ],
    psychological: [
      "Research links nightmares to stress, anxiety, PTSD, and disrupted REM. Threat-simulation theory suggests dreaming evolved partly to rehearse danger. Imagery rehearsal therapy — rewriting the ending while awake — has strong evidence for reducing recurrent nightmares.",
      "Children's nightmares are common and usually developmental. Adult nightmares that begin after a specific event deserve trauma-informed care. If nightmares come with daytime flashbacks or avoidance of sleep, professional support is appropriate — this dictionary is reflection, not treatment.",
    ],
    spiritual: [
      "Spiritual traditions often distinguish ordinary distressing dreams from meaningful warning or attack imagery — and nearly all counsel against granting nightmares authority over the day. Practices of prayer, protection, and releasing the image into trust are common across faiths.",
      "Use the nightmare as a prompt toward courage and repair in waking life, not as a verdict. If a spiritual frame helps you seek refuge and do good, keep it; if it fuels terror, simplify: safety, rest, and wise counsel first.",
    ],
    islamic: [
      "Islamic teaching distinguishes true dreams, self-talk, and distressing whisperings. Nightmares are generally met by seeking refuge in Allah, spitting lightly to the left, changing position, and not narrating the dream widely. Do not let a nightmare legislate fear about specific people.",
      "If nightmares persist, combine the prophetic etiquette with practical causes — sleep, stress, unresolved wrongs needing tawbah — and ask Allah for peace in rest.",
    ],
    biblical: [
      "Scripture acknowledges night terrors and also God's presence in the dark. Psalms speak of lying down in safety; Job knows frightening dreams. A biblical response pairs honest lament with trust, and refuses to treat every nightmare as prophecy.",
      "Bring recurrent nightmares into prayer and, when needed, into pastoral or clinical help. Peace that steadies sleep is a mercy worth asking for.",
    ],
    commonScenarios: [
      { title: "Recurring Nightmare", meaning: "Unresolved stressor or fear demanding attention until faced or reworked with imagery rehearsal." },
      { title: "Horrible Dream With No Clear Plot", meaning: "Free-floating dread — generalized anxiety or bodily stress narrating itself." },
      { title: "Waking From a Nightmare", meaning: "The body's interrupt. Ground with breath, light, and a simple reality check before interpreting." },
      { title: "Childhood Nightmare Returning", meaning: "Old fear templates reactivated by current stress." },
      { title: "Nightmare About Death", meaning: "Usually endings and change anxiety — not a forecast. Grief and transition amplify these." },
      { title: "Telling Someone the Nightmare", meaning: "Seeking co-regulation; sharing often reduces the dream's grip." },
    ],
    faq: [
      { question: "What does a nightmare mean?", answer: "Intense fear dreams usually reflect stress, threat rehearsal, or unresolved emotion — sometimes amplified by sleep disruption. Plot family and recurrence refine the reading." },
      { question: "How do I stop nightmares?", answer: "Improve sleep basics, reduce late stimulants and violent media, address daytime stress, and try imagery rehearsal for repeats. Seek care if nightmares follow trauma or impair life." },
      { question: "Are nightmares spiritual attacks?", answer: "Some traditions read them that way; even then, the advised response is refuge, calm, and not obsessing. Parallel practical causes should still be checked." },
      { question: "What is the difference between a nightmare and a bad dream?", answer: "Nightmares typically wake you in fear; bad dreams can be unpleasant without that abrupt fear awakening. Both can be meaningful; nightmares demand more attention to sleep and stress." },
    ],
  },
  "car-crash": {
    introduction: [
      "Car crash dream symbolism searches overlap with car accident dreams — metal, impact, the split-second of lost control. Crash imagery intensifies the sense of collision: goals, people, or timelines hitting the same intersection too hard and too fast.",
      "As with other vehicle dreams, the car is agency and direction. A crash interrupts the story of where you were going. The useful question remains waking, not prophetic: what is colliding, and who was driving?",
    ],
    general: [
      "Driver versus passenger versus witness splits responsibility. Brake failure leans toward momentum you cannot stop. Another car hitting you can map onto someone else's choices disrupting your path. Walking away unhurt often marks a wake-up call survived.",
      "If the crash repeats, look for a recurring conflict of priorities — work versus family, two relationships, two ambitions — that waking life keeps forcing into the same junction.",
    ],
    psychological: [
      "Crash dreams track feared consequences and loss of control more than traffic fate. Anxiety and exhaustion raise both crash dreams and real driving risk, which is why rest is a fair response to a run of these nights.",
      "People processing abrupt life failures — firings, breakups, public mistakes — may dream crashes as the psyche's blunt metaphor for impact.",
    ],
    faq: [
      { question: "What does a car crash dream mean?", answer: "Commonly colliding plans, abrupt failure, pressure, or fear of consequences — a direction crisis, not a reliable prediction of a road accident." },
      { question: "Is car crash dream symbolism different from a car accident dream?", answer: "Mostly overlapping. 'Crash' language often emphasizes impact and total loss of control; interpret with the same driver/passenger/aftermath questions." },
      { question: "Why do I dream of crashing when I'm a careful driver?", answer: "Because the metaphor is about life direction and consequence, not your parking skills. Map the collision onto waking pressures." },
    ],
  },
  stairs: {
    introduction: [
      "Stairs in dreams are almost too clear: you are between levels. Climbing, falling, endless flights, broken steps — each version stages effort, status, and the incremental work of changing altitude in life. Searchers for stairs dream meaning usually wake mid-ascent or mid-tumble.",
      "Unlike a sudden elevator, stairs demand participation. The dream asks what you are willing to step through to reach the next floor — and whether the structure under you can hold.",
    ],
    general: [
      "Climbing with ease suggests supported progress; climbing forever suggests burnout toward a moving goal. Falling down stairs is setback after progress — often public. Spiral stairs revisit themes while rising. Broken stairs mean the plan or support cannot take your weight yet.",
      "Notice destination and companions. Stairs to an attic lean toward memory and unused potential; to a basement, toward foundations and what is stored. Someone blocking the stairs is often a real gatekeeper.",
    ],
    psychological: [
      "Stair dreams map hierarchy and incremental achievement. They appear around promotions, recoveries, coursework, and any path that only works one step at a time. Falling on stairs often tracks shame about a visible stumble.",
      "If stairs appear in a childhood home, early family status dynamics may be in play — who was allowed upstairs, who was sent down.",
    ],
    faq: [
      { question: "What does dreaming of stairs mean?", answer: "Usually progress between levels of life — ambition, effort, setback, or foundation work. Direction (up/down) and condition of the stairs refine the reading." },
      { question: "Is falling down stairs a bad omen?", answer: "More often a metaphor for setback and lost footing than a prediction. Ask where waking progress feels unstable." },
      { question: "What do endless stairs mean?", answer: "Effort without arrival — burnout, perfectionism, or a goalpost that keeps moving. Shorten the next real-world step." },
    ],
  },
  trapped: {
    introduction: [
      "Dreams of being trapped — sealed room, locked door, underwater with no surface — stage the nightmare of no exit. Searchers for being trapped dream meaning usually wake still pushing on a door that would not open.",
      "Trapped dreams report stuck agency: a job, relationship, identity, or emotion that feels closed from every side. The first interpretive task is naming the box; the second is finding whether a waking key already exists.",
    ],
    general: [
      "Where you were trapped tags the life area. A room is private confinement; a crowd is social pressure; an elevator is suspended between levels; underwater is emotional seal. Unable to open a door focuses on a specific blocked choice.",
      "Escaping at the end is clinically and symbolically important — agency returning. If you never escape, ask what waking conversation or decision is still postponed.",
    ],
    psychological: [
      "These dreams correlate with helplessness, depression, coercive relationships, and high-constraint jobs. They also appear in grief when the future feels sealed. Panic disorder and claustrophobia can feed the imagery directly.",
      "If trapped dreams follow trauma of actual confinement, seek trauma-informed support; dictionary symbolism is secondary to safety.",
    ],
    faq: [
      { question: "What does dreaming of being trapped mean?", answer: "Usually stuckness, missing exits, and pressure without agency — a report on constraint in waking life, not a prophecy of captivity." },
      { question: "How do I stop trapped dreams?", answer: "Increase real options where you can (boundary, exit plan, help). Imagery rehearsal of finding a door or window helps recurrent versions." },
      { question: "Is a trapped dream about my relationship?", answer: "It can be — if the relationship is where you feel you cannot leave or speak. It can equally be work, family duty, or an emotion you have sealed in." },
    ],
  },
  "being-lost": {
    introduction: [
      "Being lost in a dream — city without a map, forest without a path, unable to find home — stages disorientation. The anxiety is not always danger; sometimes it is simply not knowing the next turn while everyone else seems to.",
      "Lost dreams ask about direction, belonging, and whether your internal compass still works after a change of life terrain.",
    ],
    general: [
      "Lost in a city leans toward complex systems and unfamiliar rules. Lost and cannot find home focuses identity and belonging. No phone intensifies disconnection from help. Asking directions can be a healthy dream move — humility and counsel.",
      "Finding your way at the end marks orientation returning. A lost child may be a vulnerable part of you or worry about someone dependent.",
    ],
    psychological: [
      "Disorientation dreams spike after moves, breakups, career changes, and immigration — any time familiar landmarks of self are gone. They also track ADHD-like overwhelm and anxiety that floods working memory.",
      "Practically, write three 'landmarks' of your current values when awake; dreamers report fewer lost dreams when orientation is explicitly rebuilt.",
    ],
    faq: [
      { question: "What does dreaming of being lost mean?", answer: "Disorientation, missing direction, or belonging anxiety — often after real life terrain has changed." },
      { question: "Why can't I find my house in dreams?", answer: "Home is identity and safety. Unable to find it usually tracks identity drift or fear that private life no longer orients you." },
      { question: "Is getting lost a spiritual sign?", answer: "It can prompt prayer for guidance. Pair that with concrete next steps and trusted counsel — lostness is also a psychological map problem." },
    ],
  },
  twins: {
    introduction: [
      "Twins in dreams double everything: two babies, two faces, two claims on your attention. Twin dream meaning often points to mirroring, divided energy, or two developments growing side by side — projects, relationships, or parts of the self.",
      "Even for people not expecting children, twins stage the psyche's interest in pairs: rivalry and complementarity, sameness and difference.",
    ],
    general: [
      "Having twins can mean abundance that splits care. Identical twins emphasize mirroring and identity confusion. Twins fighting externalize equal but opposing priorities. Losing one twin grieves a halved hope.",
      "If you are pregnant or hoping to be, include the literal layer — pregnancy dreams love fertility imagery — without treating the dream as a guaranteed ultrasound result.",
    ],
    faq: [
      { question: "What does dreaming of twins mean?", answer: "Often doubling, mirroring, and divided attention — two things growing at once. Context decides whether the tone is abundance or overload." },
      { question: "Does a twin dream mean I will have twins?", answer: "Not reliably. Fertility hopes and fears feed the image. Use medical care for predictions; use the dream for emotional inventory." },
      { question: "What if I meet my twin in a dream?", answer: "Frequently a neglected side of yourself or a relationship that reflects you closely — integration material more than literal sibling prophecy." },
    ],
  },
  lottery: {
    introduction: [
      "Winning the lottery in a dream is a pure wish-image: sudden fortune, skipped struggle, a life rewritten by chance. Lottery dream meaning usually tracks hope for relief and the fantasy that luck could solve what effort has not.",
      "The dream is less a prediction of numbers than a status report on how heavy ordinary paths feel right now — and what you wish could arrive without the middle.",
    ],
    general: [
      "Winning easily leans toward hunger for rescue. Losing the ticket stages missed chance or self-sabotage. Sharing the win asks who you imagine beside abundance. A fake win marks suspicion of easy answers.",
      "Pair the dream with money and debt themes in waking life. Sometimes the 'lottery' is not cash but a breakthrough — diagnosis clear, job offer, reconciliation — that would feel like winning.",
    ],
    faq: [
      { question: "What does dreaming of winning the lottery mean?", answer: "Hope for sudden change, relief from pressure, or a wish to skip hard process — rarely a literal forecast of a jackpot." },
      { question: "Should I play those numbers?", answer: "Dreams are not random-number generators. Play if you enjoy it; do not stake rent on dream digits." },
      { question: "Why did I lose the winning ticket in the dream?", answer: "Often fear of missing opportunity or difficulty allowing good things to stay — worth exploring if it repeats." },
    ],
  },
  debt: {
    introduction: [
      "Debt dreams weigh the ledger: what is owed, who collects, whether you can pay. Debt dream meaning reaches beyond money into emotional obligation — favors, guilt, family burdens, promises unpaid.",
      "These dreams often arrive when balances — literal or relational — feel unsustainable. The shame tone is a clue: money shame and moral shame use the same night language.",
    ],
    general: [
      "Unable to pay maps onto overwhelm. Someone owing you tracks unpaid recognition. Collectors intensify external pressure and exposure fear. Paying off debt is relief imagery. Hidden debt is secret cost. Inherited debt is legacy burden.",
      "If finances are truly stressed, include practical steps alongside symbolism — the dream may be amplifying a real spreadsheet problem.",
    ],
    faq: [
      { question: "What does dreaming about debt mean?", answer: "Obligation, imbalance, and anxiety about repayment — financial or emotional. Details tell you which ledger is loudest." },
      { question: "Is a debt dream only about money?", answer: "No. Guilt, favors, caregiving, and unfinished promises often wear debt costumes." },
      { question: "What if debt collectors chase me in the dream?", answer: "Pressure and accountability themes — something due that can no longer be postponed. Name the real 'collector' in waking life." },
    ],
  },
  rabbit: {
    introduction: [
      "Rabbit dreams borrow speed, fertility, and timidity. A rabbit dream meaning can swing from abundance and gentle instinct to freeze-or-flee vulnerability. White rabbits especially carry curiosity and invitation into the unexpected.",
      "Watch whether you held the rabbit, chased it, or watched it multiply. Softness under threat is often the emotional core.",
    ],
    general: [
      "A white rabbit may guide or tempt toward wonder. A rabbit running away marks avoidance. Many rabbits can mean fertility themes or small worries breeding fast. A dead rabbit grieves lost innocence. A rabbit in the house brings timidity into private space.",
      "If pregnancy is on your mind, rabbits' fertility symbolism may be literal-adjacent without being diagnostic.",
    ],
    faq: [
      { question: "What does a rabbit mean in a dream?", answer: "Fertility, timidity, quick instinct, abundance, or vulnerability — behavior and emotion choose which facet dominates." },
      { question: "Is a white rabbit a good sign?", answer: "Often leans toward innocence, guidance, or curiosity. Your feeling in the dream still outweighs color folklore." },
      { question: "Why so many rabbits?", answer: "Multiplication imagery — ideas, worries, or fertility themes increasing faster than you can manage." },
    ],
  },
  boat: {
    introduction: [
      "A boat dream places you on emotion with a craft: seaworthy or sinking, rowing or drifting, storm-tossed or docking in calm. Boat dream meaning asks how you navigate feeling — and whether your current life vessel can hold the load.",
      "Ships and small boats differ in scale. A yacht may add status insulation; a rowboat emphasizes personal effort across the water.",
    ],
    general: [
      "Sinking marks a plan or bond taking on water. Rowing is effortful progress. Storms test leadership and faith under turbulence. An empty boat can mean abandoned purpose. Docking is arrival and securing what you carried.",
      "Who else is aboard matters — crew as support, or overcrowding as emotional load shared poorly.",
    ],
    faq: [
      { question: "What does a boat mean in a dream?", answer: "How you navigate emotion and transition — the seaworthiness of your current craft. Condition of the boat and water refine the reading." },
      { question: "What does a sinking boat dream mean?", answer: "Fear that a plan, job, or relationship cannot hold the emotional or practical load — a prompt to bail, repair, or abandon ship wisely." },
      { question: "Is a boat in a storm a bad omen?", answer: "It usually reflects turmoil you are already in. Focus on course, crew, and refuge — not on predicting shipwreck." },
    ],
  },
};

/**
 * Hand-written meta tags for the highest-traffic pages, replacing the generated
 * seoTitle/seoDescription templates. Titles aim for ~50-60 chars with the query
 * up front; descriptions for ~150-160 chars with a reason to click.
 */
const META_OVERRIDES: Record<string, { seoTitle?: string; seoDescription?: string }> = {
  snake: {
    seoTitle: "Snake Dream Meaning: What Snakes in Dreams Really Symbolize",
    seoDescription:
      "Bitten, chased, or just watched? What snake dreams mean in psychology, Islam, and the Bible — plus six scenarios and why the snake's color changes the reading.",
  },
  "teeth-falling-out": {
    seoTitle: "Teeth Falling Out Dream Meaning: Why It's So Common",
    seoDescription:
      "Nearly 2 in 5 people dream their teeth fall out. What it means psychologically, what Islam and the Bible say, and when it's just your jaw clenching in your sleep.",
  },
  "being-chased": {
    seoTitle: "Being Chased in a Dream: Meaning, Causes & How to Stop It",
    seoDescription:
      "Chase dreams are the most common nightmare on earth — and who's chasing you matters. What they mean, plus the rehearsal technique that changes how they end.",
  },
  ex: {
    seoTitle: "Dreaming About Your Ex? What It Means (It's Rarely Love)",
    seoDescription:
      "Dreaming of an ex years later is normal — and usually not about wanting them back. What reunion, argument, and apology dreams mean, and why they start now.",
  },
  cheating: {
    seoTitle: "Cheating Dream Meaning: Why You Dream About Infidelity",
    seoDescription:
      "Dreams of cheating — yours or your partner's — don't predict betrayal. What they say about trust and insecurity, and how to shake the next-morning anger.",
  },
  pregnancy: {
    seoTitle: "Pregnancy Dream Meaning: Not Pregnant? Here's What It Says",
    seoDescription:
      "Pregnancy dreams visit men, teens, and grandmothers alike: something is growing that isn't ready to show. Meanings by scenario, and why pregnant sleep is so vivid.",
  },
  death: {
    seoTitle: "Death Dream Meaning: Why It's an Ending, Not a Prediction",
    seoDescription:
      "Dreaming of death — your own or a loved one's — marks change and endings, not fate. Psychological, Islamic, and biblical readings, plus dreams of the deceased.",
  },
  falling: {
    seoTitle: "Falling Dream Meaning: Lost Support or Just a Hypnic Jerk?",
    seoDescription:
      "That jolt as you drift off has a name — and falling dreams with a plot have a meaning. What failing support says about your life, and how to stop the dreams.",
  },
  flying: {
    seoTitle: "Flying Dream Meaning: Freedom, Ambition & Lucid Flight",
    seoDescription:
      "Flying dreams are the nightmare's happy opposite: agency, escape, perspective. What struggling to stay airborne means — and how to have these dreams more often.",
  },
  water: {
    seoTitle: "Water Dream Meaning: What the Water's State Says About You",
    seoDescription:
      "Clear, murky, rising, or drowning-deep — water in dreams mirrors your emotional life. Readings for every scenario, plus Islamic and biblical water symbolism.",
  },
  spider: {
    seoTitle: "Spider Dream Meaning: Webs, Fear & What's Being Woven",
    seoDescription:
      "Lurker or weaver? Spider dreams point to patient building — or quiet entanglement. What webs, bites, and giant spiders mean, plus Islamic and biblical readings.",
  },
  dog: {
    seoTitle: "Dog Dream Meaning: Loyalty, Attacks & Dreams of Lost Pets",
    seoDescription:
      "Dogs are the most common animal in dreams — and they speak the language of loyalty. What attacks, strays, and dreams of pets who died really mean.",
  },
  cat: {
    seoTitle: "Cat Dream Meaning: Independence, Intuition & Boundaries",
    seoDescription:
      "Cat dreams are about affection on its own terms: independence, intuition, and boundaries. What scratches, black cats, and strays in your house mean.",
  },
  house: {
    seoTitle: "House Dream Meaning: The Rooms, the Intruder, the New Wing",
    seoDescription:
      "In dreams, the house is you: basements hold the stored, new rooms mean unclaimed capacity. What intruders, floods, and childhood homes are telling you.",
  },
  money: {
    seoTitle: "Money Dream Meaning: Finding, Losing & Being Robbed",
    seoDescription:
      "Money dreams are rarely about money — they denominate worth. What finding cash, losing your wallet, and bills that won't count say about your real exchanges.",
  },
  car: {
    seoTitle: "Car Dream Meaning: Who's Driving Your Life?",
    seoDescription:
      "Failing brakes, back-seat driving, a stolen car — vehicle dreams are control reports. What each scenario says about who's steering, and how to read yours.",
  },
  baby: {
    seoTitle: "Baby Dream Meaning | Dream Dictionary Baby Symbolism",
    seoDescription:
      "Dream dictionary baby meanings — new potential, caregiving anxiety, and why the dream-baby is rarely a literal child. Psychological and spiritual angles.",
  },
  wedding: {
    seoTitle: "Wedding Dream Meaning: What a Wedding in a Dream Means",
    seoDescription:
      "Wedding dream meaning — disasters, strangers, cold feet, and commitment anxiety. Why wedding dreams go wrong so often, and what they say about vows in waking life.",
  },
  fire: {
    seoTitle: "Fire Dream Meaning: Destruction, Passion or Purification?",
    seoDescription:
      "Contained or loose — that's the first question of every fire dream. What burning houses, unstoppable flames, and fire that doesn't burn you really mean.",
  },
  drowning: {
    seoTitle: "Drowning Dream Meaning: Overwhelm and the Uncalled Cry",
    seoDescription:
      "Drowning dreams are overload reports — and the dream-self rarely calls for help. What being pulled under, unseen shores, and sudden footing mean.",
  },
  crawling: {
    seoTitle: "Dream of Crawling on Hands and Knees: Meaning",
    seoDescription:
      "What dreaming of crawling — including on hands and knees — means: vulnerability, regression, and slow progress when standing feels impossible.",
  },
  "crawling-through-small-spaces": {
    seoTitle: "Dream About Crawling Through Small Spaces: Meaning",
    seoDescription:
      "What dreaming of crawling through small or tight spaces means — claustrophobic progress, constraint, and advancing only by making yourself smaller.",
  },
  ghost: {
    seoTitle: "Ghost in Dream Meaning: Unfinished Past, Guilt & Memory",
    seoDescription:
      "What a ghost in a dream means — loved ones, hauntings, and houses that still hold the past. Psychological, spiritual, Islamic, and biblical interpretations.",
  },
  alligator: {
    seoTitle: "Alligator Dream Meaning: Hidden Danger Beneath the Surface",
    seoDescription:
      "What dreaming about an alligator means — attacks, water, and threats that wait patiently. Psychological, spiritual, Islamic, and biblical readings.",
  },
  "hair-falling-out": {
    seoTitle: "Hair Falling Out Dream Meaning | Dream Dictionary",
    seoDescription:
      "Dream dictionary entry for hair falling out: loss of confidence, aging anxiety, and identity under pressure — plus spiritual, Islamic, and biblical angles.",
  },
  "car-accident": {
    seoTitle: "Car Accident Dream Meaning (Including Islamic Views)",
    seoDescription:
      "What a car accident dream means psychologically and in Islamic dream tradition — collisions of plans, fear of consequence, and when the dream is about direction, not fate.",
  },
  horse: {
    seoTitle: "Horse in Dream Meaning: Power, Drive & Islamic Readings",
    seoDescription:
      "Horse dream meaning across psychology and classical Islamic interpretation — white and black horses, riding, races, and the drive carrying you toward a goal.",
  },
  work: {
    seoTitle: "Spiritual Meaning of Dreaming About Work",
    seoDescription:
      "What dreaming about work — or a dream of working — means spiritually and psychologically: duty, identity, burnout, and balance between effort and the rest of life.",
  },
  tunnel: {
    seoTitle: "Biblical Meaning of Dreaming of a Tunnel",
    seoDescription:
      "What a tunnel dream means biblically and psychologically — narrow passages, light at the end, and faithful next steps through a hard season.",
  },
  "fear-of-heights": {
    seoTitle: "Fear of Heights Dream Meaning | Dreaming of Heights & Fear",
    seoDescription:
      "Dreaming about heights and being scared — höhenangst, exposure after progress, and freezing at the edge. Psychological and spiritual readings.",
  },
  "ex-family": {
    seoTitle: "Dreaming of an Ex and Their Family: What It Means",
    seoDescription:
      "What it means when your ex and his family appear in your dreams — lingering bonds, grief for a shared world, and why these dreams often return after closure.",
  },
  "snake-and-water": {
    seoTitle: "Dreaming of Snakes in Water: Combined Meaning",
    seoDescription:
      "What dreaming of snakes in water means — hidden threat inside emotion, intuition mixed with fear, and change moving through deep feeling.",
  },
  "wedding-and-blood": {
    seoTitle: "Wedding and Blood Dream Meaning: Cost of Commitment",
    seoDescription:
      "What a wedding with blood in a dream means — sacrifice, family tension, stained vows, or a union that feels costly. Psychological and spiritual readings.",
  },
  "snakes-in-water": {
    seoTitle: "Snake in Water Dream Meaning: Hidden Threat in Emotion",
    seoDescription:
      "What snake in water in a dream means — snakes swimming, intuition mixed with fear, and change moving through deep feeling. Psychological and spiritual readings.",
  },
  "car-crash": {
    seoTitle: "Car Crash Dream Meaning: Symbolism & Interpretation",
    seoDescription:
      "Car crash dream symbolism — colliding plans, abrupt failure, and pressure to change course. Not a traffic prediction: psychological and spiritual readings.",
  },
  sister: {
    seoTitle: "Sister Dream Meaning: Closeness, Rivalry & Family Bonds",
    seoDescription:
      "What dreaming about your sister means — comparison, empathy, shared history, and the parts of yourself she mirrors. Psychological and spiritual readings.",
  },
  angel: {
    seoTitle: "Angel Dream Meaning: Protection, Guidance & Hope",
    seoDescription:
      "What angels in dreams mean — guardian visits, messages, and reassurance in a hard season. Psychological, spiritual, Islamic, and biblical interpretations.",
  },
  kissing: {
    seoTitle: "Biblical Meaning of a Kiss in a Dream (And More)",
    seoDescription:
      "What a kiss in a dream means biblically and psychologically — affection, desire, acceptance, and intimacy offered or refused. Common kiss scenarios explained.",
  },
  "being-naked": {
    seoTitle: "Naked in Public Dream Meaning: Exposure & Shame",
    seoDescription:
      "Dreams about being naked in public usually track vulnerability and fear of being seen — not literal prediction. Psychological and spiritual readings.",
  },
  tornado: {
    seoTitle: "Tornado Dream Meaning: Chaos, Upheaval & Anxiety",
    seoDescription:
      "What a tornado in a dream means — approaching crisis, hiding from upheaval, and surviving chaos. Psychological, spiritual, and grounded interpretations.",
  },
  heights: {
    seoTitle: "Dreams About Heights: Meaning, Fear & Vertigo",
    seoDescription:
      "What dreams about heights mean — standing at a life edge, looking down, climbing high, and being scared of the drop. Psychological and spiritual readings.",
  },
  nightmare: {
    seoTitle: "Nightmare Meaning & Interpretation: Why Bad Dreams Happen",
    seoDescription:
      "Nightmare interpretation that stays grounded — recurring nightmares, horrible dreams, and what distressing dreams usually reflect (stress, fear, unfinished threat).",
  },
  tsunami: {
    seoTitle: "Tsunami Dream Meaning: Overwhelm & Rising Emotion",
    seoDescription:
      "What a tsunami or tidal wave dream means — anticipatory dread, emotional flood, and surviving the wave. Psychological and spiritual interpretations.",
  },
  swimming: {
    seoTitle: "Swimming Dream Meaning: Moving Through Emotion",
    seoDescription:
      "What dreaming of swimming means — ease, struggle, underwater depth, and reaching shore. How you move through feeling in dream form.",
  },
  mirror: {
    seoTitle: "Mirror Dream Meaning: Self-Image & Hard Truths",
    seoDescription:
      "What a mirror in a dream means — broken glass, not recognizing yourself, and confronting identity. Psychological and spiritual readings.",
  },
  train: {
    seoTitle: "Train Dream Meaning: Tracks, Timing & Life Direction",
    seoDescription:
      "What dreaming of a train means — missing it, the wrong train, stations, and momentum you did or did not choose. Direction and timing decoded.",
  },
  plane: {
    seoTitle: "Plane Dream Meaning: Ambition, Travel & Plane Crash Dreams",
    seoDescription:
      "Airplane dreams and plane crash symbolism — high-stakes plans, turbulence mid-journey, and fear that ambition fails. Grounded interpretations.",
  },
  "plane-crash": {
    seoTitle: "Plane Crash Dream Meaning: High Ambition, Hard Landing",
    seoDescription:
      "What a plane crash dream means — trust breaking mid-flight, fear of catastrophic failure, and loss of control on a path you cannot pilot alone.",
  },
  grandparents: {
    seoTitle: "Grandparents Dream Meaning: Ancestry, Wisdom & Memory",
    seoDescription:
      "What dreaming of grandparents means — deceased grandparents, grandmother or grandfather visits, and inheritance of family story and values.",
  },
  "own-death": {
    seoTitle: "Dreaming of Your Own Death: Ending, Not Prediction",
    seoDescription:
      "What it means to dream you die — usually the end of an identity or chapter, not a literal warning. Psychological and spiritual readings.",
  },
  "dead-parent": {
    seoTitle: "Dreaming of a Dead Parent: Grief, Memory & Comfort",
    seoDescription:
      "What dreams of a deceased parent mean — unfinished conversations, inherited patterns, and comfort associated with a mother or father who has died.",
  },
  stairs: {
    seoTitle: "Stairs Dream Meaning: Climbing, Falling & Endless Steps",
    seoDescription:
      "What stairs in a dream mean — ascent, setback on the way up, broken steps, and the effort between levels of life. Psychological and spiritual readings.",
  },
  trapped: {
    seoTitle: "Being Trapped Dream Meaning: No Exit & Stuck Agency",
    seoDescription:
      "What dreaming of being trapped means — sealed rooms, locked doors, underwater confinement, and how to read stuckness without panic.",
  },
  "being-lost": {
    seoTitle: "Being Lost Dream Meaning: Disorientation & Direction",
    seoDescription:
      "What dreaming of being lost means — cities without maps, unable to find home, and rebuilding your inner compass after life terrain changes.",
  },
  twins: {
    seoTitle: "Twins Dream Meaning: Doubling, Mirroring & Divided Care",
    seoDescription:
      "What dreaming of twins means — double potential, identity mirrors, rival priorities, and fertility themes without treating the dream as ultrasound.",
  },
  lottery: {
    seoTitle: "Lottery Dream Meaning: Winning, Luck & Sudden Fortune",
    seoDescription:
      "What dreaming of the lottery means — jackpot wishes, lost tickets, and the hunger for a life changed without the hard middle.",
  },
  debt: {
    seoTitle: "Debt Dream Meaning: Obligation, Guilt & What Is Owed",
    seoDescription:
      "What dreaming about debt means — unpaid balances, collectors, hidden obligations, and emotional ledgers wearing money's clothes.",
  },
  rabbit: {
    seoTitle: "Rabbit Dream Meaning: Fertility, Timidity & Instinct",
    seoDescription:
      "What a rabbit in a dream means — white rabbits, fleeing, abundance, and soft vulnerability under threat.",
  },
  boat: {
    seoTitle: "Boat Dream Meaning: Navigating Emotion on the Water",
    seoDescription:
      "What a boat or ship in a dream means — sinking craft, storms, rowing, and whether your current vessel can hold the load.",
  },
};

/**
 * Curated combination pages ("dreaming of X and Y"). Only pairs with genuine
 * semantic overlap are listed — never generated cartesian-style.
 * URL: /dreams/{primary}-and-{secondary}. Growth = add a row here.
 */
type ComboSeed = {
  primary: string;
  secondary: string;
  focus: string;
  aliases?: string[];
};

const COMBINATIONS: ComboSeed[] = [
  {
    primary: "snake",
    secondary: "water",
    focus: "an emotional situation that carries a hidden threat, or transformation moving through deep feeling",
    aliases: [
      "dreaming of snakes in water",
      "snakes in water",
      "snake in water dream",
      "snakes swimming in water",
      "dream about snakes in water",
    ],
  },
  { primary: "snake", secondary: "baby", focus: "a vulnerable new beginning shadowed by fear, or protective alertness around something fragile" },
  { primary: "snake", secondary: "fire", focus: "a threat combined with rapid change: anger, temptation, or transformation that feels dangerous" },
  { primary: "snake", secondary: "house", focus: "a threat or transformation inside your private life, family, or personal foundations" },
  { primary: "snake", secondary: "pregnancy", focus: "anxiety, protectiveness, and heightened instinct around something important that is still developing" },
  { primary: "baby", secondary: "death", focus: "an ending and a beginning intertwined: one chapter closing while a fragile new one starts" },
  { primary: "baby", secondary: "water", focus: "new life surrounded by deep emotion, or the vulnerability of a beginning within a changing emotional current" },
  { primary: "death", secondary: "water", focus: "grief and release moving together, or an ending processed through deep emotion" },
  { primary: "death", secondary: "fire", focus: "an ending through destruction and purification: something consumed so that something else can begin" },
  { primary: "spider", secondary: "snake", focus: "two forms of threat at once: patient entanglement and sudden strike, or layered mistrust" },
  { primary: "cat", secondary: "dog", focus: "the tension between independence and loyalty, or two relationship styles in conflict" },
  { primary: "dog", secondary: "snake", focus: "trust and threat side by side: loyalty tested, or a warning within a trusted relationship" },
  { primary: "wedding", secondary: "death", focus: "commitment and ending intertwined: an old identity closing as a binding new chapter begins" },
  {
    primary: "wedding",
    secondary: "blood",
    focus: "a commitment marked by cost, sacrifice, family tension, or a union that feels stained by conflict or loss",
    aliases: [
      "wedding in blood",
      "wedding in bled a dream",
      "blood at a wedding",
      "bloody wedding dream",
      "wedding with blood",
      "dreaming of a wedding and blood",
    ],
  },
  { primary: "teeth", secondary: "blood", focus: "a loss that costs something vital: confidence, health, or words that wound on their way out" },
  { primary: "fire", secondary: "water", focus: "opposing forces in one scene: passion against emotion, destruction against renewal, or conflict seeking balance" },
  { primary: "house", secondary: "water", focus: "emotion flooding into private life: feelings rising inside family, memory, or personal foundations" },
];

function buildDictionary() {
  const entries: DreamEntry[] = [];

  for (const cluster of CLUSTERS) {
    const title = makeTitle(cluster.name);
    const variationSlugs = cluster.variations.map((variation) => variation.slug);
    const updatedAt = cluster.updatedAt ?? DICTIONARY_UPDATED_AT;
    const parent: DreamEntry = {
      slug: cluster.slug,
      canonicalSlug: cluster.slug,
      title,
      name: cluster.name,
      category: cluster.category,
      icon: cluster.icon,
      accent: cluster.accent,
      aliases: makeAliases(cluster.name, cluster.aliases),
      variationSlugs,
      relatedSymbols: cluster.relatedSymbols.filter((slug) => slug !== cluster.slug),
      shortMeaning: titleCase(cluster.summary) + ".",
      seoTitle: `${title} - Psychological, Spiritual, Islamic & Biblical Meaning`,
      seoDescription: `Discover what ${cluster.name} means in dreams, including psychological, spiritual, Islamic, biblical interpretations, common scenarios, and FAQs.`,
      updatedAt,
      sections: makeSections({
        title,
        name: cluster.name,
        category: cluster.category,
        summary: cluster.summary,
        variationSeeds: cluster.variations,
      }),
    };
    entries.push(parent);

    for (const variation of cluster.variations) {
      const variationTitle = makeTitle(variation.name);
      entries.push({
        slug: variation.slug,
        canonicalSlug: variation.slug,
        parentSlug: cluster.slug,
        title: variationTitle,
        name: variation.name,
        category: cluster.category,
        icon: cluster.icon,
        accent: cluster.accent,
        aliases: makeAliases(variation.name, variation.aliases),
        variationSlugs: cluster.variations
          .filter((candidate) => candidate.slug !== variation.slug)
          .map((candidate) => candidate.slug),
        relatedSymbols: cluster.relatedSymbols.filter((slug) => slug !== variation.slug),
        shortMeaning: `${titleCase(variation.focus)}.`,
        seoTitle: `${variationTitle} - Psychological, Spiritual, Islamic & Biblical Meaning`,
        seoDescription: `Discover what ${variation.name} means in dreams, including psychological, spiritual, Islamic, biblical interpretations, common scenarios, and FAQs.`,
        updatedAt,
        sections: makeSections({
          title: variationTitle,
          name: variation.name,
          category: cluster.category,
          summary: cluster.summary,
          focus: variation.focus,
          parentName: cluster.name,
        }),
      });
    }
  }

  const bySlug = new Map(entries.map((entry) => [entry.slug, entry]));
  for (const combo of COMBINATIONS) {
    const a = bySlug.get(combo.primary);
    const b = bySlug.get(combo.secondary);
    if (!a || !b) throw new Error(`Combination references missing parent: ${combo.primary} + ${combo.secondary}`);
    const name = `${a.name} and ${b.name}`;
    const title = `Dreaming of ${titleCase(a.name)} and ${titleCase(b.name)}`;
    entries.push({
      slug: `${combo.primary}-and-${combo.secondary}`,
      canonicalSlug: `${combo.primary}-and-${combo.secondary}`,
      parentSlug: a.slug,
      comboOf: [a.slug, b.slug],
      title,
      name,
      category: a.category,
      icon: a.icon,
      accent: a.accent,
      aliases: makeAliases(name, [
        `${b.name} and ${a.name}`,
        `dreaming of ${a.name} and ${b.name}`,
        ...(combo.aliases ?? []),
      ]),
      variationSlugs: [],
      relatedSymbols: [b.slug, ...b.variationSlugs.slice(0, 3)],
      shortMeaning: `${titleCase(combo.focus)}.`,
      seoTitle: `${title}: Combined Meaning & Interpretation`,
      seoDescription: `What it means to dream about ${a.name} and ${b.name} together, with psychological, spiritual, Islamic, and biblical interpretations plus FAQs.`,
      updatedAt: DICTIONARY_UPDATED_AT,
      sections: makeSections({
        title,
        name,
        category: a.category,
        summary: combo.focus,
        focus: combo.focus,
        parentName: a.name,
      }),
    });
  }

  for (const slug of [...Object.keys(SECTION_OVERRIDES), ...Object.keys(META_OVERRIDES)]) {
    if (!entries.some((entry) => entry.slug === slug)) {
      throw new Error(`Override references missing entry: ${slug}`);
    }
  }
  for (const entry of entries) {
    const sectionOverride = SECTION_OVERRIDES[entry.slug];
    if (sectionOverride) entry.sections = { ...entry.sections, ...sectionOverride };
    const metaOverride = META_OVERRIDES[entry.slug];
    if (metaOverride?.seoTitle) entry.seoTitle = metaOverride.seoTitle;
    if (metaOverride?.seoDescription) entry.seoDescription = metaOverride.seoDescription;
  }

  return entries;
}

export const ALL_DREAM_ENTRIES: DreamEntry[] = buildDictionary();

export const DREAM_DICTIONARY: Record<string, DreamEntry> = Object.fromEntries(
  ALL_DREAM_ENTRIES.map((entry) => [entry.slug, entry]),
);

if (Object.keys(DREAM_DICTIONARY).length !== ALL_DREAM_ENTRIES.length) {
  throw new Error("Dream dictionary contains duplicate slugs.");
}

for (const entry of ALL_DREAM_ENTRIES) {
  if (entry.parentSlug && !DREAM_DICTIONARY[entry.parentSlug]) {
    throw new Error(`Dream entry ${entry.slug} references missing parent ${entry.parentSlug}.`);
  }
  for (const linkedSlug of [...entry.variationSlugs, ...entry.relatedSymbols]) {
    if (!DREAM_DICTIONARY[linkedSlug]) {
      throw new Error(`Dream entry ${entry.slug} references missing symbol ${linkedSlug}.`);
    }
  }
  if (entry.relatedSymbols.includes(entry.slug)) {
    throw new Error(`Dream entry ${entry.slug} cannot list itself in relatedSymbols.`);
  }
  if (entry.variationSlugs.includes(entry.slug)) {
    throw new Error(`Dream entry ${entry.slug} cannot list itself in variationSlugs.`);
  }
}

export const DREAM_SLUGS: string[] = ALL_DREAM_ENTRIES.map((entry) => entry.slug);

export const PARENT_DREAMS: DreamEntry[] = ALL_DREAM_ENTRIES.filter((entry) => !entry.parentSlug);

for (const entry of PARENT_DREAMS) {
  const hasInboundLink = ALL_DREAM_ENTRIES.some(
    (candidate) => candidate.slug !== entry.slug && candidate.relatedSymbols.includes(entry.slug),
  );
  if (!hasInboundLink) {
    throw new Error(`Parent dream entry ${entry.slug} is an orphan: no other entry links to it via relatedSymbols.`);
  }
  for (const relatedSlug of entry.relatedSymbols) {
    if (entry.variationSlugs.includes(relatedSlug)) {
      throw new Error(`Parent dream entry ${entry.slug} lists its own variation ${relatedSlug} in relatedSymbols.`);
    }
    const related = DREAM_DICTIONARY[relatedSlug];
    if (!related.parentSlug && !related.relatedSymbols.includes(entry.slug)) {
      throw new Error(
        `Related-symbol link ${entry.slug} -> ${relatedSlug} is one-directional: add ${entry.slug} to ${relatedSlug}'s relatedSymbols.`,
      );
    }
  }
}

export const POPULAR_DREAM_SLUGS = [
  "snake",
  "teeth-falling-out",
  "water",
  "being-chased",
  "wedding",
  "ghost",
  "cheating",
  "death",
  "flying",
  "baby",
  "fire",
  "car-accident",
  "hair-falling-out",
  "alligator",
  "crawling",
  "tunnel",
  "work",
  "heights",
  "nightmare",
  "mirror",
] as const;

export function getDreamEntry(slug: string): DreamEntry | undefined {
  return DREAM_DICTIONARY[slug];
}

export function getParentEntry(entry: DreamEntry): DreamEntry {
  return entry.parentSlug ? DREAM_DICTIONARY[entry.parentSlug] : entry;
}

export function getDreamVariations(entry: DreamEntry): DreamEntry[] {
  const parent = getParentEntry(entry);
  return parent.variationSlugs
    .map((slug) => DREAM_DICTIONARY[slug])
    .filter((candidate): candidate is DreamEntry => Boolean(candidate));
}

export function getRelatedDreams(entry: DreamEntry): DreamEntry[] {
  return entry.relatedSymbols
    .map((slug) => DREAM_DICTIONARY[slug])
    .filter((candidate): candidate is DreamEntry => Boolean(candidate));
}

export function getDreamsByCategory(category: DreamCategory): DreamEntry[] {
  return PARENT_DREAMS.filter((entry) => entry.category === category);
}

export const COMBINATION_ENTRIES: DreamEntry[] = ALL_DREAM_ENTRIES.filter((entry) => entry.comboOf);

/** Combination pages that involve the given symbol (as either half of the pair). */
export function getCombosForSymbol(slug: string): DreamEntry[] {
  return COMBINATION_ENTRIES.filter((entry) => entry.comboOf?.includes(slug));
}

/** Every entry (parents + variations + combos) in a category. */
export function getAllEntriesByCategory(category: DreamCategory): DreamEntry[] {
  return ALL_DREAM_ENTRIES.filter((entry) => entry.category === category);
}

// --- Automated internal-linking machine -------------------------------------
// Deterministic "ring" links: entries are sorted by slug and each page links to
// the next N pages in the ring. This guarantees every page (including new ones)
// receives exactly N extra inbound links and gives N extra outbound links, with
// perfectly even distribution — no hardcoding, no orphans, scales to any size.

const RING: DreamEntry[] = [...ALL_DREAM_ENTRIES].sort((a, b) => a.slug.localeCompare(b.slug));
const RING_INDEX = new Map(RING.map((entry, index) => [entry.slug, index]));

export function getRingLinks(entry: DreamEntry, count = 9): DreamEntry[] {
  const start = RING_INDEX.get(entry.slug);
  if (start === undefined) return [];
  const links: DreamEntry[] = [];
  for (let offset = 1; links.length < count && offset < RING.length; offset++) {
    const candidate = RING[(start + offset) % RING.length];
    if (candidate.slug !== entry.slug) links.push(candidate);
  }
  return links;
}

/** Parent symbols from the same category, excluding the entry's own cluster. */
export function getCategorySiblings(entry: DreamEntry, count = 6): DreamEntry[] {
  const ownParent = entry.parentSlug ?? entry.slug;
  return PARENT_DREAMS.filter((parent) => parent.category === entry.category && parent.slug !== ownParent).slice(0, count);
}

/** Curated hub of the most-searched dream meanings on the site. */
export const MOST_COMMON_DREAM_SLUGS = [
  "snake",
  "teeth-falling-out",
  "being-chased",
  "falling",
  "flying",
  "death",
  "water",
  "pregnancy",
  "baby",
  "spider",
  "ex",
  "cheating",
  "being-naked",
  "money",
  "car-accident",
  "house",
  "fire",
  "drowning",
  "dog",
  "cat",
  "wedding",
  "hair-falling-out",
  "being-fired",
  "ghost",
] as const;
