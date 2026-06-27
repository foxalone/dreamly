export const DREAM_SLUGS = [
  "snake",
  "water",
  "flying",
  "baby",
  "death",
  "teeth",
  "dog",
] as const;

export type DreamSlug = (typeof DREAM_SLUGS)[number];

export type DreamFaq = {
  question: string;
  answer: string;
};

export type DreamScenario = {
  title: string;
  meaning: string;
};

export type RelatedDream = {
  slug: DreamSlug;
  reason: string;
};

export type DreamEntry = {
  slug: DreamSlug;
  symbol: string;
  emoji: string;
  accent: string;
  shortMeaning: string;
  metaDescription: string;
  introduction: string[];
  scenarios: DreamScenario[];
  psychological: string[];
  spiritual: string[];
  islamic: string[];
  biblical: string[];
  questions: DreamFaq[];
  related: RelatedDream[];
};

export const DREAM_DICTIONARY: Record<DreamSlug, DreamEntry> = {
  snake: {
    slug: "snake",
    symbol: "Snake",
    emoji: "🐍",
    accent: "#72d572",
    shortMeaning: "Transformation, hidden fear, instinct, healing, or a situation that requires alertness.",
    metaDescription:
      "What does it mean to dream about snakes? Explore psychological, spiritual, Islamic, and biblical interpretations, common scenarios, and related dream symbols.",
    introduction: [
      "A snake in a dream often appears when something powerful is moving beneath the surface of your life. Because snakes shed their skin, they can represent renewal, recovery, and the uncomfortable process of becoming someone new. Their silent movement and sudden strike can also express suspicion, a boundary being crossed, or a fear you have not fully named.",
      "The emotional tone matters more than a universal definition. A calm snake may point toward wisdom or instinct; an aggressive snake may mirror pressure, betrayal, or a threat. Your own culture, beliefs, experiences, and feelings about snakes should always guide the final interpretation.",
    ],
    scenarios: [
      { title: "Being bitten by a snake", meaning: "A sharp wake-up call, painful truth, conflict, or urgent issue demanding attention." },
      { title: "A snake chasing you", meaning: "Avoidance of a fear, difficult conversation, temptation, or emotionally charged person." },
      { title: "Killing a snake", meaning: "Regaining control, ending a harmful pattern, or confronting something you once feared." },
      { title: "Many snakes", meaning: "Overstimulation, several hidden worries, social mistrust, or a period of intense change." },
      { title: "A calm or friendly snake", meaning: "Growing trust in your intuition, healing energy, or acceptance of personal power." },
      { title: "A snake shedding its skin", meaning: "A direct image of renewal, leaving an identity behind, and emerging changed." },
    ],
    psychological: [
      "Psychologically, a snake can embody an instinctive reaction that the conscious mind has tried to ignore. It may appear around anxiety, attraction, rivalry, mistrust, or a major transition. The dream gives this hidden energy a vivid shape so you can notice it instead of carrying it as vague tension.",
      "Ask what happened immediately before the snake appeared and how your body reacted. Freezing may reflect helplessness; watching with curiosity may indicate readiness to understand a difficult feeling. The snake does not automatically mean that someone is dangerous—it can just as easily represent your own strength, anger, desire, or capacity to heal.",
    ],
    spiritual: [
      "Across many spiritual traditions, the snake is linked with life force, transformation, cycles, and knowledge. A snake dream may accompany an inner awakening or a time when old beliefs are falling away. Its closeness to the earth can also suggest grounding and a return to basic wisdom.",
      "Spiritual meanings are personal rather than predictive. Consider whether the dream invited reverence, fear, or discernment. It may be asking you to respect change, protect your energy, or distinguish genuine insight from seductive appearances.",
    ],
    islamic: [
      "In classical Islamic dream literature, a snake is often treated as a possible symbol of hostility, rivalry, concealed harm, or worldly power. Details can change the reading: the snake’s location, size, behavior, and the dreamer’s response all matter. Overcoming it may suggest overcoming an adversarial situation; fear without injury may reflect caution rather than actual harm.",
      "Islam also distinguishes meaningful dreams from ordinary dreams and distressing dreams. A disturbing image should not be treated as certain knowledge or used to accuse another person. Seek calm, make du’a, and consult a trustworthy, knowledgeable person if the dream continues to trouble you.",
    ],
    biblical: [
      "In the Bible, the serpent can symbolize temptation, deception, and the need for spiritual discernment, especially through the Genesis story. Yet serpent imagery is not one-dimensional: Moses’ bronze serpent is connected with healing, and Jesus tells his followers to be wise as serpents while remaining innocent.",
      "A biblical reflection might therefore ask where wisdom and caution are needed, where temptation is active, or where healing is possible. A dream is not automatically a divine message; weigh it alongside scripture, prayer, character, and the real circumstances of your life.",
    ],
    questions: [
      { question: "Is dreaming about a snake a bad sign?", answer: "Not necessarily. It may reflect fear or mistrust, but it can also symbolize healing, intuition, renewal, and personal growth. Your emotion and the snake’s behavior are the strongest clues." },
      { question: "What does a snake bite mean in a dream?", answer: "A bite often represents urgency: a painful truth, sudden conflict, strong emotional reaction, or a problem that can no longer be ignored." },
      { question: "What does the snake’s color mean?", answer: "Color adds context rather than a fixed rule. Black may intensify mystery or fear, green can suggest growth or jealousy, white can suggest clarity or an unfamiliar spiritual theme, and red can emphasize passion or danger." },
      { question: "Why do I keep dreaming about snakes?", answer: "Recurring snake dreams may indicate an unresolved fear, ongoing change, boundary issue, or instinctive feeling you have not addressed. Record each version and look for repeated places, people, and emotions." },
    ],
    related: [
      { slug: "water", reason: "Both symbols often reveal emotions moving below conscious awareness." },
      { slug: "death", reason: "Snake shedding and death dreams can both mark endings and transformation." },
      { slug: "dog", reason: "Compare a symbol of uncertain instinct with one commonly tied to trust and loyalty." },
    ],
  },
  water: {
    slug: "water",
    symbol: "Water",
    emoji: "🌊",
    accent: "#48b9ff",
    shortMeaning: "Emotion, intuition, cleansing, uncertainty, and the changing state of your inner world.",
    metaDescription:
      "Discover the meaning of water dreams, from clear oceans to floods. Explore psychological, spiritual, Islamic, and biblical interpretations and common questions.",
    introduction: [
      "Water dreams commonly mirror the emotional climate of your life. Water can soothe, support, cleanse, overwhelm, or hide what lies beneath, making it a natural image for feelings and the unconscious. Calm, clear water often accompanies emotional steadiness, while rough, murky, or rising water may reflect confusion, pressure, or feelings that are becoming difficult to contain.",
      "Notice the form of the water and your relationship to it. Were you drinking, swimming, floating, drowning, watching from shore, or searching for a way across? The same ocean can mean freedom to one dreamer and vulnerability to another.",
    ],
    scenarios: [
      { title: "Clear, calm water", meaning: "Emotional clarity, peace, restoration, or trust in the direction of your life." },
      { title: "Flooding water", meaning: "Feelings, responsibilities, or changes that seem to be exceeding your capacity." },
      { title: "Drowning", meaning: "Emotional overwhelm, loss of control, or difficulty asking for the support you need." },
      { title: "Swimming", meaning: "Actively navigating emotion; ease or struggle in the water reflects your current confidence." },
      { title: "Dirty or muddy water", meaning: "Confusion, mixed motives, emotional residue, or a situation that is hard to read." },
      { title: "Drinking water", meaning: "Renewal, a need for emotional nourishment, healing, or a return to what is essential." },
    ],
    psychological: [
      "From a psychological perspective, water often represents emotions that cannot be captured neatly in words. A dream may translate stress into a flood, emotional distance into a frozen lake, or relief into a warm bath. This does not predict an event; it dramatizes your current inner experience.",
      "Depth is an important clue. Looking into deep water can suggest curiosity or anxiety about unknown parts of yourself. Crossing water may represent a transition. If you are rescuing someone, ask whether you are carrying another person’s feelings—or trying to recover a neglected part of your own life.",
    ],
    spiritual: [
      "Spiritually, water is widely associated with purification, rebirth, blessing, surrender, and the flow of life. A water dream may arrive during a period of emotional release or when you are being invited to soften control and move with change.",
      "Clean water can feel like renewal, while a storm may symbolize spiritual testing or a necessary clearing. Rather than treating the dream as prophecy, consider what needs cleansing, what needs to flow again, and where you need a steadier inner shore.",
    ],
    islamic: [
      "Water carries rich meanings in Islamic life and classical dream interpretation, including purity, mercy, knowledge, livelihood, and life itself. Clean, beneficial water may suggest ease or blessing, while polluted, bitter, or destructive water can reflect hardship or troubled conditions. Context and the dreamer’s state remain essential.",
      "Wudu and water’s purifying role may make a cleansing dream especially resonant, but no single image guarantees a future outcome. Respond to a comforting dream with gratitude; respond to a disturbing one without panic, and avoid making major decisions from symbolism alone.",
    ],
    biblical: [
      "Biblical water imagery ranges from creation and cleansing to chaos and judgment. Still waters evoke restoration, living water evokes spiritual life, baptism represents renewal, and storms or floods can express danger and testing. The dream’s tone helps identify which theme feels most relevant.",
      "A biblical reflection may ask whether you need refreshment, faith amid uncertainty, repentance, or healthy limits around overwhelming emotion. Interpret the image humbly and in the wider context of prayer, scripture, and everyday wisdom.",
    ],
    questions: [
      { question: "What does clear water mean in a dream?", answer: "Clear water often points to peace, honesty, emotional clarity, or recovery. If it felt cold or frightening, however, it could instead emphasize distance or vulnerability." },
      { question: "What does a flood mean in a dream?", answer: "A flood commonly pictures emotions or demands that feel uncontained. Look for what the water entered, what you tried to save, and whether the water eventually receded." },
      { question: "Why do I dream of the ocean?", answer: "The ocean can represent vast emotion, freedom, the unknown, or forces larger than the individual self. Calmness, waves, weather, and distance from shore refine the meaning." },
      { question: "Does drowning in a dream mean something bad will happen?", answer: "No. It more often reflects present overwhelm, exhaustion, or loss of control. If these feelings continue while awake, consider practical support rather than treating the dream as a prediction." },
    ],
    related: [
      { slug: "flying", reason: "Water and flying dreams often contrast emotional depth with freedom and perspective." },
      { slug: "baby", reason: "Both can symbolize renewal, vulnerability, and a fresh emotional beginning." },
      { slug: "death", reason: "Water crossings and death imagery frequently appear during major transitions." },
    ],
  },
  flying: {
    slug: "flying",
    symbol: "Flying",
    emoji: "🪽",
    accent: "#b69cff",
    shortMeaning: "Freedom, ambition, perspective, escape, confidence, or a desire to move beyond limits.",
    metaDescription:
      "What does flying in a dream mean? Explore common flying scenarios and their psychological, spiritual, Islamic, and biblical interpretations.",
    introduction: [
      "Flying dreams often create an unforgettable sense of freedom. Rising above streets, landscapes, or crowds can reflect confidence, possibility, and a wider perspective on problems that once felt too close. When flight is unstable or frightening, the same image may reveal fear of failure, lack of control, or pressure to maintain success.",
      "Pay attention to how you took off, how high you flew, and whether you could choose your direction. Effortless flight differs from being carried by a violent wind. The people and places below can also show what you are seeking distance from—or hoping to understand more clearly.",
    ],
    scenarios: [
      { title: "Flying effortlessly", meaning: "Confidence, relief, creative momentum, or feeling capable of moving beyond a limit." },
      { title: "Struggling to stay airborne", meaning: "Self-doubt, unstable progress, fatigue, or anxiety about maintaining expectations." },
      { title: "Flying very high", meaning: "Big ambition and expanded perspective, sometimes mixed with disconnection from practical life." },
      { title: "Flying away from danger", meaning: "A wish to escape pressure or discover a solution outside familiar patterns." },
      { title: "Falling after flying", meaning: "Fear of losing status, control, confidence, or a promising opportunity." },
      { title: "Flying over water", meaning: "Gaining perspective on strong feelings or moving between freedom and emotional depth." },
    ],
    psychological: [
      "Psychologically, flight can express agency: the feeling that normal restrictions no longer apply. It may follow a breakthrough, new relationship, career opportunity, or creative discovery. It can also compensate for a waking life that feels confined, giving the mind a temporary experience of spaciousness and control.",
      "If the dream includes fear, ask what success would require from you. Difficulty steering can mirror uncertainty; hiding your ability to fly may reflect discomfort with attention or talent. A recurring pleasant flying dream may simply be your mind rehearsing confidence and possibility.",
    ],
    spiritual: [
      "Spiritual interpretations connect flying with transcendence, expanded awareness, and release from burdens. Seeing the world from above can symbolize a broader viewpoint or a desire to live by higher values rather than immediate pressure.",
      "Grounding still matters. A dream of soaring may encourage hope, but it can also ask whether inspiration is connected to action. Healthy spiritual growth usually brings greater presence and responsibility, not only escape from ordinary life.",
    ],
    islamic: [
      "In classical Islamic dream traditions, flying can be associated with travel, change of condition, aspiration, or movement between places and responsibilities. Controlled flight and a safe landing differ from aimless flight or disappearing into the sky, and interpretations vary with the dreamer’s circumstances.",
      "Because dream symbols are not certain evidence, avoid using a flight dream to predict status, travel, or death. Reflect on it with humility, gratitude if it was pleasant, and practical judgment about any real-life change you are considering.",
    ],
    biblical: [
      "The Bible uses wings and rising flight as images of refuge, renewed strength, divine care, and swift movement. Eagles especially suggest endurance and renewed perspective. Human pride and overreaching, however, are also recurring biblical cautions, so the emotional and moral context matters.",
      "A biblical reading might ask whether the dream points toward hope, trust, escape from responsibility, or ambition without grounding. Let it prompt reflection rather than assuming that every vivid flight is revelation.",
    ],
    questions: [
      { question: "Why did flying feel completely real?", answer: "Dreams can simulate movement and balance very vividly, especially during REM sleep. The realism does not make the dream predictive, but it can make its emotional message memorable." },
      { question: "What does it mean if I can control my flight?", answer: "Controlled flight often suggests confidence, adaptability, or growing agency. It may also occur during a lucid dream, when you become partly aware that you are dreaming." },
      { question: "Why can’t I stay in the air?", answer: "Losing altitude often mirrors self-doubt, inconsistent energy, fear of failure, or a goal that needs more practical support." },
      { question: "Is flying in a dream a spiritual experience?", answer: "It can carry spiritual meaning for the dreamer, but it can also be an ordinary expression of freedom, ambition, or imagination. The lasting effect and your wider beliefs provide context." },
    ],
    related: [
      { slug: "water", reason: "Flying above water often combines perspective with the emotional unknown." },
      { slug: "death", reason: "Both symbols can appear when an old limitation or identity is being left behind." },
      { slug: "baby", reason: "New beginnings can feel both vulnerable and full of possibility." },
    ],
  },
  baby: {
    slug: "baby",
    symbol: "Baby",
    emoji: "👶",
    accent: "#ffb86b",
    shortMeaning: "New beginnings, vulnerability, potential, responsibility, or a tender part of yourself.",
    metaDescription:
      "Understand dreams about babies through psychological, spiritual, Islamic, and biblical perspectives, including pregnancy, crying babies, and common questions.",
    introduction: [
      "A baby in a dream often symbolizes something new, dependent, and full of possibility. It may represent an idea, relationship, identity, responsibility, or part of yourself that needs patient care. Baby dreams are common during major transitions and do not necessarily refer to literal pregnancy or a future child.",
      "The baby’s condition and your response are central. Joy can suggest readiness to nurture a beginning; panic may reflect feeling unprepared; forgetting or losing the baby may show fear of neglecting something important. Personal experiences with parenting, fertility, and family naturally shape the dream’s emotional weight.",
    ],
    scenarios: [
      { title: "Holding a baby", meaning: "Accepting a new responsibility, protecting potential, or connecting with tenderness." },
      { title: "A crying baby", meaning: "An unmet emotional need, neglected project, or vulnerable issue asking for attention." },
      { title: "Losing a baby", meaning: "Fear of failure, lost potential, or anxiety about caring for what matters." },
      { title: "Giving birth", meaning: "Bringing an idea, identity, or new life phase into visible form after development." },
      { title: "An abandoned baby", meaning: "A disowned need, forgotten talent, or responsibility that has been left without care." },
      { title: "A smiling baby", meaning: "Hope, uncomplicated joy, emotional renewal, or confidence in a new beginning." },
    ],
    psychological: [
      "Psychologically, a dream baby can represent emerging potential and the vulnerable ‘new self’ that comes with change. New habits, creative work, recovery, and relationships all require attention before they become stable. The dream may show how you feel about that dependence.",
      "It may also connect with your own need for care. If you are always the capable one, a crying or abandoned baby can symbolize needs you dismiss in waking life. For people dealing with pregnancy, loss, or fertility stress, the image may process direct hopes and fears and deserves especially gentle, personal interpretation.",
    ],
    spiritual: [
      "Spiritually, babies can symbolize innocence, renewal, trust, and a gift whose full nature is not yet known. The dream may invite a beginner’s mind or ask you to protect something sincere before exposing it to judgment.",
      "Newness is not the same as ease. Spiritual beginnings need patience, boundaries, and ordinary care. Consider what small living possibility in your life needs consistent attention rather than a dramatic leap.",
    ],
    islamic: [
      "In Islamic reflection, children may evoke blessing, mercy, responsibility, innocence, and sometimes the worries that accompany care. Classical interpretations vary greatly according to whether the child is known, healthy, distressed, carried, or found, and according to the dreamer’s own circumstances.",
      "A baby dream should not be treated as proof of pregnancy or a guaranteed future event. Receive a comforting dream with gratitude, and approach an upsetting one with compassion and du’a rather than certainty or fear.",
    ],
    biblical: [
      "Biblically, children can represent blessing, humility, dependence, promise, and new life. Stories of long-awaited births also make a baby a powerful image of hope, while the responsibility to protect the vulnerable remains equally strong.",
      "A biblical reflection might ask what promise, calling, or tender responsibility needs faithful care. It may also invite childlike trust—not childish avoidance—while remembering that a dream must be discerned rather than automatically labeled a message from God.",
    ],
    questions: [
      { question: "Does dreaming about a baby mean I am pregnant?", answer: "No. Baby dreams frequently symbolize new responsibilities, ideas, or emotional needs. If pregnancy is possible, only an appropriate test or medical advice can answer that question." },
      { question: "What does an unknown baby mean?", answer: "An unfamiliar baby often represents potential you do not yet fully recognize: a new role, ability, project, or vulnerable aspect of yourself." },
      { question: "Why was the baby crying?", answer: "Crying usually signals an unmet need. Ask what in your life has been postponed, undernourished, or unable to communicate directly." },
      { question: "What does giving birth in a dream mean?", answer: "It commonly symbolizes completion of a developmental phase and the arrival of something new into your visible life, whether creative, relational, or personal." },
    ],
    related: [
      { slug: "water", reason: "Both dreams can carry themes of birth, emotion, cleansing, and renewal." },
      { slug: "death", reason: "Endings and beginnings often appear together during a major life transition." },
      { slug: "dog", reason: "Care, attachment, protection, and responsibility connect these dream symbols." },
    ],
  },
  death: {
    slug: "death",
    symbol: "Death",
    emoji: "🕯️",
    accent: "#a8a8bd",
    shortMeaning: "An ending, transformation, grief, fear of loss, or the release of an old identity.",
    metaDescription:
      "Dreaming about death rarely predicts literal death. Explore psychological, spiritual, Islamic, and biblical meanings, common scenarios, and questions.",
    introduction: [
      "Dreams about death can be frightening, but they rarely indicate a literal event. More often, death gives the dreaming mind a dramatic image for an ending: a relationship changing, a role being left behind, a habit losing its power, or an identity entering a new phase. It can also be a direct way of processing grief, health anxiety, aging, or recent news.",
      "Who died, how it happened, and what you felt afterward all matter. Grief may show attachment and fear of change; relief can reveal that a burden is ending; calmness may suggest acceptance. If the dream follows a real bereavement, it may simply be part of the mind’s ongoing work of remembering and adapting.",
    ],
    scenarios: [
      { title: "Your own death", meaning: "A major identity shift, loss of control, renewal, or concern about mortality." },
      { title: "A loved one dying", meaning: "Fear of separation, a changing relationship, grief, or recognition that they are changing." },
      { title: "Attending a funeral", meaning: "Acknowledging an ending, honoring what was, and beginning to let go." },
      { title: "A dead person appearing alive", meaning: "Memory, unfinished emotion, longing, comfort, or qualities associated with that person." },
      { title: "Dying and returning", meaning: "Recovery, radical change, a second chance, or an identity rebuilt after difficulty." },
      { title: "Trying to prevent a death", meaning: "Resistance to unavoidable change or a strong desire to protect someone or something." },
    ],
    psychological: [
      "Psychologically, death dreams often accompany transitions because the mind experiences meaningful change as both gain and loss. Graduation, parenthood, separation, relocation, recovery, and career change can all end a familiar version of life. The dream makes that invisible ending concrete.",
      "They may also express ordinary mortality anxiety or grief. Repeated distressing dreams after trauma or loss deserve care, not superstition. Journaling, talking with someone you trust, and professional support can be more useful than searching for a fixed prediction.",
    ],
    spiritual: [
      "Spiritually, death often symbolizes surrender, release, initiation, and transformation. Something outgrown may need to end before a more honest way of living can emerge. The image can therefore feel solemn without being negative.",
      "The useful question is often not ‘Will this happen?’ but ‘What is already ending, and how can I meet that change consciously?’ Spiritual interpretation should make room for grief and practical reality rather than bypassing them with a promise of instant rebirth.",
    ],
    islamic: [
      "Islamic teachings treat death, the soul, and the unseen with seriousness, while dream interpretation remains uncertain and context-dependent. Classical sources give many different symbolic readings of death, return to life, burial, and funerals; no isolated dream can establish when someone will die.",
      "Do not spread fear or make accusations from a death dream. If it is disturbing, seek refuge in Allah, pray, and share it only with someone trustworthy if needed. If it evokes remembrance of mortality, it may be used as a gentle prompt toward repentance, gratitude, and better conduct—not prediction.",
    ],
    biblical: [
      "Biblically, death can be associated with human mortality, judgment, sacrifice, the end of an old way of life, and the hope of resurrection. New Testament imagery of dying to an old self and walking in new life makes death a potent symbol of moral and spiritual transformation.",
      "A biblical reflection might examine what needs to be released, where grief needs comfort, or where hope is being renewed. Scripture also encourages sober discernment; a frightening dream should not be assumed to announce a literal death.",
    ],
    questions: [
      { question: "Does dreaming of someone dying mean they will die?", answer: "No. There is no reliable basis for treating a death dream as a forecast. It more commonly reflects fear, change, grief, attachment, or your perception of the relationship." },
      { question: "Why did I dream about my own death?", answer: "Your own death may symbolize a major identity transition, loss of control, a wish to escape pressure, or ordinary awareness of mortality." },
      { question: "What does it mean when a deceased loved one visits?", answer: "Such dreams can be a meaningful part of grief, memory, longing, or comfort. Different spiritual traditions understand them differently, and certainty is not possible from the dream alone." },
      { question: "Why do death dreams repeat?", answer: "Recurring dreams can follow unresolved grief, ongoing transition, health anxiety, trauma, or persistent stress. If they disrupt sleep or daily life, consider speaking with a mental-health professional." },
    ],
    related: [
      { slug: "baby", reason: "Dreams of endings and new life often arrive during the same transition." },
      { slug: "snake", reason: "A snake shedding its skin is another strong symbol of transformation." },
      { slug: "water", reason: "Crossing deep water can mirror grief, surrender, and emotional change." },
    ],
  },
  teeth: {
    slug: "teeth",
    symbol: "Teeth",
    emoji: "🦷",
    accent: "#e6d9ff",
    shortMeaning: "Anxiety, confidence, communication, appearance, control, or concern about change and loss.",
    metaDescription:
      "Why do teeth fall out in dreams? Explore psychological, spiritual, Islamic, and biblical interpretations of common teeth dream scenarios.",
    introduction: [
      "Dreams of teeth falling out, breaking, or crumbling are remarkably common. Teeth are tied to appearance, speech, nourishment, strength, and age, so changes to them can express anxiety about how you are seen, what you have said, or whether you can handle a demanding situation. The dream can also be prompted by real physical sensations such as jaw tension or dental discomfort.",
      "Look at what you were trying to do when the teeth changed. Speaking may point toward communication; looking in a mirror may emphasize self-image; chewing can relate to processing a difficult experience. Shame, pain, surprise, and relief each lead toward different interpretations.",
    ],
    scenarios: [
      { title: "Teeth falling out", meaning: "Loss of confidence or control, transition, embarrassment, or anxiety about appearance." },
      { title: "Teeth crumbling", meaning: "A situation or self-image that feels fragile, overstrained, or difficult to maintain." },
      { title: "Loose teeth", meaning: "Uncertainty, an unstable decision, fear of speaking, or awareness that change is coming." },
      { title: "Broken teeth", meaning: "Vulnerability after conflict, damaged confidence, regret, or pressure exceeding your limits." },
      { title: "Rotten teeth", meaning: "A neglected issue, lingering shame, harmful communication, or concern that something is worsening." },
      { title: "New or perfect teeth", meaning: "Renewed confidence, improved communication, healing, or a stronger public identity." },
    ],
    psychological: [
      "Psychologically, teeth dreams often cluster around stress, social evaluation, and perceived loss of control. Because the mouth is central to expression, damaged teeth can represent words you cannot say, words you regret, or fear that you will not be taken seriously.",
      "They can also be bodily dreams. Grinding, clenching, sleep disruption, or a real dental concern may be incorporated into dream imagery. A recurring dream with waking pain is a reason to check the physical cause as well as exploring the emotional context.",
    ],
    spiritual: [
      "Spiritually, teeth may symbolize personal power, discernment, and the ability to ‘break down’ experience into something you can absorb. Losing them can mark a season of humility or a transition away from an identity based on appearance and control.",
      "The dream may invite more careful speech and stronger inner foundations. Avoid fatalistic interpretations: a useful spiritual reading should lead toward awareness, integrity, and care rather than fear.",
    ],
    islamic: [
      "Classical Islamic dream literature sometimes relates teeth to family members, longevity, debts, or changes within a household, with different teeth assigned different symbolic roles. These systems are detailed and interpretations vary according to what happened to the tooth, whether there was pain or blood, and what became of it.",
      "Popular claims that a falling-tooth dream certainly predicts death are not a sound basis for fear. Dreams do not establish the unseen. Consider your real circumstances, avoid alarming relatives, and consult a trustworthy person grounded in Islamic knowledge if the dream weighs heavily on you.",
    ],
    biblical: [
      "In biblical imagery, teeth can signify strength, conflict, appetite, judgment, or suffering. ‘Gnashing of teeth’ expresses anguish, while broken teeth can picture the defeat of violent power. These images do not create a single fixed code for modern dreams.",
      "A biblical reflection might focus on speech, self-control, the use of strength, or anxiety about loss. As with other dreams, discernment is more responsible than turning one bodily symbol into a prediction.",
    ],
    questions: [
      { question: "Why are teeth-falling-out dreams so common?", answer: "Teeth combine several universal concerns—appearance, communication, aging, health, and control. Jaw clenching and other sleep sensations may also contribute." },
      { question: "Does a teeth dream predict death?", answer: "No reliable evidence supports that claim. It is a culturally widespread interpretation, but anxiety, transition, communication, self-image, and physical sensations are more grounded explanations." },
      { question: "What does blood mean in a teeth dream?", answer: "Blood may intensify the sense of pain, personal cost, vitality, or family connection. It does not by itself make the dream predictive." },
      { question: "Could the dream mean I need a dentist?", answer: "Possibly. Dreams can incorporate pain, pressure, grinding, or worry about dental health. Persistent discomfort, bleeding, or tooth damage should be assessed by a dental professional." },
    ],
    related: [
      { slug: "death", reason: "Both can express anxiety about loss, aging, and irreversible change." },
      { slug: "snake", reason: "Bites, teeth, and hidden threats can overlap in dreams about boundaries and fear." },
      { slug: "flying", reason: "Compare a dream of lost control with one centered on freedom and agency." },
    ],
  },
  dog: {
    slug: "dog",
    symbol: "Dog",
    emoji: "🐕",
    accent: "#f2b35f",
    shortMeaning: "Loyalty, friendship, protection, instinct, companionship, or a boundary under pressure.",
    metaDescription:
      "What does a dog symbolize in dreams? Explore friendly, attacking, lost, and black dog dreams through psychological, spiritual, Islamic, and biblical perspectives.",
    introduction: [
      "Dogs in dreams often reflect loyalty, companionship, protection, and social instinct. A friendly dog may represent trusted support or your own dependable nature, while a barking or attacking dog can express conflict, violated boundaries, or fear that loyalty has been broken. Your real experiences with dogs strongly affect the meaning.",
      "Notice whether the dog was yours, a stranger, a pet from the past, or a wild pack. Its condition and behavior may mirror the state of a relationship or an instinct you are learning to trust. A neglected dog can point toward neglected friendship, play, movement, or self-protection.",
    ],
    scenarios: [
      { title: "A friendly dog", meaning: "Trust, support, companionship, emotional safety, or comfort with your instincts." },
      { title: "A dog attacking or biting", meaning: "Conflict, betrayal, threatened boundaries, fear, or instinctive anger breaking through." },
      { title: "A lost dog", meaning: "Disconnection from loyalty, belonging, guidance, or a dependable part of yourself." },
      { title: "A barking dog", meaning: "A warning, demand for attention, communication problem, or boundary being announced." },
      { title: "A dog protecting you", meaning: "Reliable support, healthy defenses, courage, or a strong protective instinct." },
      { title: "A deceased pet", meaning: "Memory, grief, enduring affection, comfort, or renewed connection to an earlier life chapter." },
    ],
    psychological: [
      "Psychologically, a dog can personify attachment and instinct. Its behavior may resemble the emotional pattern of a relationship: dependable, demanding, playful, protective, abandoned, or unpredictable. It can also represent how comfortable you are with closeness and trust.",
      "An aggressive dog is not always an external enemy. It may be your own anger or protective response, especially if you routinely suppress conflict. A playful dog may signal a need for uncomplicated connection, movement, and joy.",
    ],
    spiritual: [
      "Spiritually, dogs are often associated with guardianship, fidelity, guidance, and the ability to sense what the rational mind misses. A dog appearing at a threshold or on a journey may symbolize protection or the need to trust a grounded instinct.",
      "The dream may also ask whether devotion has become unhealthy dependence, or whether protection has become aggression. True loyalty includes discernment and boundaries, not blind obedience.",
    ],
    islamic: [
      "Dogs have varied associations in Islamic law, culture, history, and classical dream literature. Depending on context, a dream dog may be read in relation to guarding, hunting, loyalty, base impulses, hostility, or a person of weak conduct. A trained helpful dog is symbolically different from a threatening or uncontrolled one.",
      "Because personal experience and cultural context matter, avoid turning the symbol into a judgment about a real person. A dream is not evidence of impurity, guilt, or future harm. Reflect calmly and seek reliable guidance if a religious concern persists.",
    ],
    biblical: [
      "Dogs in biblical texts can appear as scavengers or figures in warnings, reflecting their ancient social setting; they also appear through images of persistence, guarding, and life at the edge of the household. Modern companionship with dogs adds a personal layer not captured by a single ancient reference.",
      "A biblical reflection may ask about loyalty, humility, protection, appetite, or discernment about company. The dream’s actual behavior and your response are more useful than assuming every dog carries the same moral meaning.",
    ],
    questions: [
      { question: "What does a friendly dog mean in a dream?", answer: "It often represents trust, companionship, reliable support, or a healthy relationship with your own instincts. A familiar dog may also bring memories tied to a particular period of life." },
      { question: "What does a dog bite mean?", answer: "A bite may signal conflict, betrayal, a boundary violation, or anger that demands attention. Consider the location of the bite and what happened immediately before it." },
      { question: "What does a black dog mean?", answer: "A black dog can intensify mystery, fear, grief, protection, or the unknown. Color is only one clue; the dog’s behavior and your personal associations matter more." },
      { question: "Why did I dream of a pet who died?", answer: "Dreaming of a deceased pet can be part of grief and loving memory. It may bring comfort or reconnect you with the qualities and life period associated with that animal." },
    ],
    related: [
      { slug: "snake", reason: "Both animal dreams explore instinct, trust, warning, and personal boundaries." },
      { slug: "baby", reason: "Care, attachment, vulnerability, and protection connect these symbols." },
      { slug: "teeth", reason: "Dog-bite and teeth imagery can both reveal conflict and defensive reactions." },
    ],
  },
};

export function isDreamSlug(value: string): value is DreamSlug {
  return DREAM_SLUGS.includes(value as DreamSlug);
}

export function getDreamEntry(slug: string): DreamEntry | undefined {
  return isDreamSlug(slug) ? DREAM_DICTIONARY[slug] : undefined;
}
