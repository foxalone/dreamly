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
  variations: VariationSeed[];
};

const CLUSTERS: ClusterSeed[] = [
  {
    slug: "snake",
    name: "snake",
    category: "animals",
    icon: "🐍",
    accent: "#72d572",
    summary: "transformation, hidden fear, instinct, healing, and situations that require alertness",
    aliases: ["serpent", "snakes", "dream about snake", "snake in a dream"],
    relatedSymbols: ["water", "death", "dog", "spider"],
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
    relatedSymbols: ["death", "falling", "money", "baby"],
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
    relatedSymbols: ["flying", "death", "baby", "house"],
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
    relatedSymbols: ["baby", "snake", "water", "falling"],
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
    relatedSymbols: ["pregnancy", "water", "death", "dog"],
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
    relatedSymbols: ["baby", "water", "death", "house"],
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
    relatedSymbols: ["cat", "snake", "baby", "spider"],
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
    relatedSymbols: ["dog", "snake", "spider", "house"],
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
    relatedSymbols: ["falling", "water", "car", "being-chased"],
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
    relatedSymbols: ["flying", "being-chased", "death", "water"],
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
    relatedSymbols: ["falling", "death", "dog", "snake"],
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
    relatedSymbols: ["baby", "pregnancy", "money", "death", "school", "castle"],
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
    relatedSymbols: ["house", "car", "gold", "teeth"],
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
    relatedSymbols: ["snake", "cat", "dog", "house"],
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
    relatedSymbols: ["flying", "falling", "money", "house"],
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
    relatedSymbols: ["house", "being-chased", "falling", "hospital"],
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
    relatedSymbols: ["house", "death", "baby", "pregnancy"],
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
    relatedSymbols: ["house", "death", "cemetery", "castle"],
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
    relatedSymbols: ["house", "death", "church", "forest"],
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
    relatedSymbols: ["house", "flying", "car", "hotel"],
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
    relatedSymbols: ["house", "being-chased", "death", "hospital"],
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
    relatedSymbols: ["house", "church", "forest", "hotel"],
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
    relatedSymbols: ["house", "water", "ocean", "forest"],
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
    relatedSymbols: ["being-chased", "dog", "snake", "spider", "house"],
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

function buildDictionary() {
  const entries: DreamEntry[] = [];

  for (const cluster of CLUSTERS) {
    const title = makeTitle(cluster.name);
    const variationSlugs = cluster.variations.map((variation) => variation.slug);
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
      relatedSymbols: cluster.relatedSymbols,
      shortMeaning: titleCase(cluster.summary) + ".",
      seoTitle: `${title} - Psychological, Spiritual, Islamic & Biblical Meaning`,
      seoDescription: `Discover what ${cluster.name} means in dreams, including psychological, spiritual, Islamic, biblical interpretations, common scenarios, and FAQs.`,
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
        relatedSymbols: cluster.relatedSymbols,
        shortMeaning: `${titleCase(variation.focus)}.`,
        seoTitle: `${variationTitle} - Psychological, Spiritual, Islamic & Biblical Meaning`,
        seoDescription: `Discover what ${variation.name} means in dreams, including psychological, spiritual, Islamic, biblical interpretations, common scenarios, and FAQs.`,
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
}

export const DREAM_SLUGS: string[] = ALL_DREAM_ENTRIES.map((entry) => entry.slug);

export const PARENT_DREAMS: DreamEntry[] = ALL_DREAM_ENTRIES.filter((entry) => !entry.parentSlug);

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
