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
const DICTIONARY_UPDATED_AT = "2026-07-04";

const CLUSTERS: ClusterSeed[] = [
  {
    slug: "snake",
    name: "snake",
    category: "animals",
    icon: "🐍",
    accent: "#72d572",
    summary: "transformation, hidden fear, instinct, healing, and situations that require alertness",
    aliases: ["serpent", "snakes", "dream about snake", "snake in a dream"],
    relatedSymbols: ["water", "death", "dog", "cat", "spider", "being-chased", "forest", "rat", "alligator"],
    variations: [
      { slug: "black-snake", name: "black snake", focus: "an unknown threat, repressed fear, mystery, or a change that is difficult to read" },
      { slug: "white-snake", name: "white snake", focus: "unfamiliar wisdom, clarity, healing, or a truth arriving in an unexpected form" },
      { slug: "green-snake", name: "green snake", focus: "growth, renewal, jealousy, health, or instinct connected with a new opportunity" },
      { slug: "snake-bite", name: "snake bite", focus: "a sudden wake-up call, painful truth, conflict, or urgent boundary issue" },
      { slug: "dead-snake", name: "dead snake", focus: "the end of a threat, a completed transformation, or instinct that has been suppressed" },
      { slug: "many-snakes", name: "many snakes", focus: "multiple pressures, social mistrust, overstimulation, or several changes happening together" },
      { slug: "big-snake", name: "big snake", focus: "a fear, temptation, responsibility, or personal power that feels impossible to ignore" },
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
    relatedSymbols: ["death", "falling", "money", "baby", "blood", "hair"],
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
    aliases: ["dream about water", "water in a dream", "water dream meaning"],
    relatedSymbols: ["snake", "death", "baby", "pregnancy", "falling", "beach", "fish", "shark", "fire", "storm", "alligator"],
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
    aliases: ["dying", "dream about death", "death in a dream", "death dream meaning"],
    relatedSymbols: ["snake", "water", "falling", "teeth", "baby", "cemetery", "church", "hospital", "being-chased", "blood", "wedding", "ghost", "angel", "mother", "fire", "father", "illness"],
    variations: [
      { slug: "someone-dying", name: "someone dying", focus: "fear of separation, a changing relationship, grief, or recognition that another person is changing" },
      { slug: "dead-person", name: "a dead person", focus: "memory, unfinished emotion, longing, comfort, or qualities associated with someone who has died" },
      { slug: "funeral", name: "a funeral", focus: "acknowledging an ending, honoring what has passed, and beginning the process of letting go" },
      { slug: "being-killed", name: "being killed", focus: "feeling overpowered, abruptly changed, silenced, or unable to control an important ending" },
      { slug: "killing-someone", name: "killing someone", focus: "intense conflict, rejected traits, buried anger, or a forceful attempt to end a pattern" },
      { slug: "dead-relative", name: "a dead relative", focus: "grief, family memory, inherited values, unresolved words, or a wish for comfort and connection" },
    ],
  },
  {
    slug: "baby",
    name: "baby",
    category: "life-events",
    icon: "👶",
    accent: "#fb923c",
    summary: "new beginnings, vulnerability, potential, responsibility, and a tender part of life that needs care",
    aliases: ["infant", "dream about baby", "baby in a dream", "baby dream meaning"],
    relatedSymbols: ["pregnancy", "water", "death", "dog", "hospital", "teeth", "house", "wedding", "mother"],
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
    relatedSymbols: ["baby", "water", "hospital", "house", "wedding"],
    variations: [
      { slug: "being-pregnant", name: "being pregnant", focus: "personally carrying an idea, identity, responsibility, or change that is still developing" },
      { slug: "pregnancy-test", name: "a pregnancy test", focus: "waiting for confirmation, fearing consequences, or needing clarity about a life-changing possibility" },
      { slug: "giving-birth", name: "giving birth", focus: "bringing a project, role, relationship, or new phase into visible and demanding reality" },
      { slug: "miscarriage", name: "miscarriage", focus: "grief, fear of lost potential, interrupted plans, or direct processing of a deeply personal experience" },
      { slug: "pregnant-woman", name: "a pregnant woman", focus: "witnessing potential, sensing change in another person, or recognizing growth around you" },
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
    relatedSymbols: ["cat", "snake", "baby", "spider", "forest", "wolf", "being-chased"],
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
    relatedSymbols: ["dog", "snake", "spider", "tiger", "owl", "rat"],
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
    relatedSymbols: ["falling", "being-chased", "car", "airport", "bird", "butterfly", "tornado"],
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
    aliases: ["fall", "dream about falling", "falling in a dream", "falling dream meaning"],
    relatedSymbols: ["flying", "being-chased", "death", "water", "school", "teeth", "car", "being-naked"],
    variations: [
      { slug: "falling-from-height", name: "falling from a height", focus: "fear of failure after progress, loss of status, or anxiety about a risk with serious consequences" },
      { slug: "falling-off-building", name: "falling off a building", focus: "instability in a structured area of life such as work, reputation, plans, or achievement" },
      { slug: "falling-into-water", name: "falling into water", focus: "sudden immersion in emotion, surrender to uncertainty, or an abrupt loss of emotional distance" },
      { slug: "falling-and-waking-up", name: "falling and waking up", focus: "a body-startle response, accumulated stress, or a fear that becomes urgent enough to interrupt sleep" },
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
    relatedSymbols: ["falling", "flying", "death", "dog", "snake", "prison", "school", "forest", "demon", "being-naked"],
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
    relatedSymbols: ["castle", "hotel", "prison", "school", "church", "money", "baby", "pregnancy", "fire", "earthquake", "mother", "ghost", "rat", "father"],
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
    relatedSymbols: ["house", "car", "teeth", "castle", "work", "phone"],
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
    relatedSymbols: ["snake", "cat", "dog", "butterfly", "rat"],
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
    relatedSymbols: ["flying", "falling", "money", "airport", "horse", "phone"],
    variations: [
      { slug: "car-accident", name: "car accident", focus: "a collision of plans, fear of consequences, sudden disruption, or concern about the direction of life" },
      { slug: "driving-car", name: "driving a car", focus: "personal agency, responsibility, confidence, and how much control you feel over your current direction" },
      { slug: "losing-car", name: "losing a car", focus: "lost direction, reduced independence, confusion about progress, or difficulty accessing your usual agency" },
      { slug: "stolen-car", name: "stolen car", focus: "violated autonomy, stolen opportunity, identity disruption, or fear that someone else controls your direction" },
      { slug: "car-crash", name: "car crash", focus: "conflicting goals, abrupt failure, accumulated pressure, or an urgent need to change course" },
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
    relatedSymbols: ["flying", "car", "hotel"],
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
    relatedSymbols: ["house", "being-chased", "hospital"],
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
    relatedSymbols: ["water", "ocean", "fish", "shark", "hotel", "storm"],
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
    relatedSymbols: ["snake", "dog", "wolf", "bear", "owl", "horse", "being-chased", "cemetery", "castle"],
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
    relatedSymbols: ["water", "shark", "beach"],
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
    aliases: ["horses", "dream about horse", "horse in a dream"],
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
    relatedSymbols: ["water", "fish", "beach", "alligator"],
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
    aliases: ["flames", "burning", "dream about fire", "fire in a dream"],
    relatedSymbols: ["water", "house", "storm", "tornado", "demon", "death"],
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
    aliases: ["twister", "cyclone", "dream about tornado", "tornado in a dream"],
    relatedSymbols: ["storm", "earthquake", "fire", "flying"],
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
    relatedSymbols: ["fire", "tornado", "earthquake", "water", "beach"],
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
    relatedSymbols: ["teeth", "death", "hospital", "hair", "illness"],
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
    relatedSymbols: ["teeth", "blood"],
    variations: [
      { slug: "hair-falling-out", name: "hair falling out", focus: "loss of confidence, health anxiety, aging, or fear of losing strength and attractiveness" },
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
    aliases: ["ex boyfriend", "ex girlfriend", "ex partner", "dream about ex", "dreaming of your ex"],
    relatedSymbols: ["cheating", "wedding", "kissing", "mother"],
    variations: [
      { slug: "ex-boyfriend", name: "an ex-boyfriend", focus: "unfinished emotion, a pattern from that relationship echoing in your current life" },
      { slug: "ex-girlfriend", name: "an ex-girlfriend", focus: "nostalgia, comparison with the present, or an unresolved question from a past bond" },
      { slug: "ex-coming-back", name: "an ex coming back", focus: "a wish for closure or reunion, or an old pattern trying to re-enter your life" },
      { slug: "arguing-with-ex", name: "arguing with an ex", focus: "unexpressed anger, unfinished business, or an internal debate that never got resolved" },
      { slug: "ex-apologizing", name: "an ex apologizing", focus: "a longing for acknowledgment, self-repair, or giving yourself the closure they never offered" },
      { slug: "ex-with-someone-else", name: "an ex with someone else", focus: "jealousy, comparison, acceptance of an ending, or anxiety about being replaced" },
      { slug: "ex-family", name: "an ex's family", focus: "lingering attachments to a shared world, or grief for connections lost alongside the relationship" },
    ],
  },
  {
    slug: "cheating",
    name: "cheating",
    category: "people",
    icon: "🥀",
    accent: "#be123c",
    summary: "trust, insecurity, guilt, betrayal, and fears about loyalty within a close relationship",
    aliases: ["infidelity", "being cheated on", "dream about cheating", "cheating in a dream"],
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
    aliases: ["marriage", "getting married", "dream about wedding", "wedding in a dream"],
    relatedSymbols: ["ex", "cheating", "kissing", "baby", "church", "death", "mother", "pregnancy"],
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
    aliases: ["a kiss", "dream about kissing", "kissing in a dream"],
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
    relatedSymbols: ["baby", "death", "house", "wedding", "ex", "father", "brother", "sister"],
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
    relatedSymbols: ["mother", "brother", "sister", "death", "house", "work"],
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
    relatedSymbols: ["sister", "mother", "father"],
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
    aliases: ["sisters", "dream about sister", "sister in a dream"],
    relatedSymbols: ["brother", "mother", "father"],
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
    aliases: ["spirit", "haunting", "dream about ghost", "ghost in a dream"],
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
    relatedSymbols: ["ghost", "angel", "fire", "being-chased", "god"],
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
    aliases: ["angels", "guardian angel", "dream about angel", "angel in a dream"],
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
    aliases: ["crocodile", "dream about alligator", "alligator in a dream", "crocodile in a dream"],
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
    aliases: ["naked dream", "being naked", "dream about being naked", "naked in public dream"],
    relatedSymbols: ["school", "falling", "being-chased"],
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
    aliases: ["job", "workplace", "dream about work", "work in a dream"],
    relatedSymbols: ["money", "school", "father"],
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
  { primary: "snake", secondary: "water", focus: "an emotional situation that carries a hidden threat, or transformation moving through deep feeling" },
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

  for (const slug of Object.keys(SECTION_OVERRIDES)) {
    if (!entries.some((entry) => entry.slug === slug)) {
      throw new Error(`SECTION_OVERRIDES references missing entry: ${slug}`);
    }
  }
  for (const entry of entries) {
    const override = SECTION_OVERRIDES[entry.slug];
    if (override) entry.sections = { ...entry.sections, ...override };
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
  "pregnancy",
  "death",
  "flying",
  "dog",
  "falling",
  "baby",
  "spider",
  "car-accident",
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
