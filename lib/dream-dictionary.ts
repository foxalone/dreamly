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
