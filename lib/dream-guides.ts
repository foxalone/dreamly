export type DreamGuideFaq = {
  question: string;
  answer: string;
};

export type DreamGuideSection = {
  heading: string;
  paragraphs: string[];
};

export type DreamGuide = {
  slug: string;
  name: string;
  title: string;
  seoTitle: string;
  seoDescription: string;
  icon: string;
  accent: string;
  summary: string;
  intro: string[];
  sections: DreamGuideSection[];
  faqs: DreamGuideFaq[];
  relatedSymbolSlugs: string[];
  updatedAt: string;
};

export const DREAM_GUIDES: DreamGuide[] = [
  {
    slug: "why-we-dream",
    name: "Why We Dream",
    title: "Why We Dream",
    seoTitle: "Why We Dream: Memory, Emotion & Overnight Processing",
    seoDescription:
      "Why we dream is still an open scientific question. What current research says about memory, emotion, threat rehearsal — and why interpretation can still help.",
    icon: "🌙",
    accent: "#8b5cf6",
    summary: "What current science says dreams are doing overnight — and why meaning still matters.",
    intro: [
      "Why we dream is not a settled fact. Researchers agree that dreaming is a regular product of sleep, especially REM, and that it is tightly bound to memory, emotion, and the brain's overnight housekeeping. They do not agree on a single purpose. That is useful to know before you treat any dream as a coded message or as meaningless noise.",
      "A grounded answer holds both sides: the brain is doing work while you sleep, and the story you remember on waking is one way that work becomes visible. Interpretation is not a substitute for science. It is a way to notice what the night kept returning to.",
    ],
    sections: [
      {
        heading: "What the sleeping brain is doing",
        paragraphs: [
          "During REM sleep the brain is highly active, the body is largely paralyzed, and the visual and emotional systems are more engaged than the parts that handle logic and self-monitoring. That combination helps explain why dreams feel vivid, why time and identity slip, and why the plot can ignore waking rules. Non-REM sleep produces dreams too, often shorter and more thought-like, so dreaming is not only a REM event.",
          "Sleep also consolidates memory, downscales unused connections, and recalibrates emotional charge. Dreams may be a side effect of that processing, a useful rehearsal, or both. The honest summary is that overnight the mind is sorting what mattered, what threatened you, and what is not finished.",
        ],
      },
      {
        heading: "The main scientific theories",
        paragraphs: [
          "Memory-consolidation views treat dreams as the felt surface of replay and integration: recent events mix with older files so the new can be stored without overwriting the old. Emotion-regulation views emphasize that sleep, especially REM, reduces the sting of difficult material while keeping the information. Threat-simulation theory argues that nightmares and chase dreams rehearse danger cheaply, which would have been useful long before modern bedrooms.",
          "None of these theories needs to win for a dream to be worth reading. A flying dream can still mark recovered agency. A recurring exam can still mark evaluation anxiety. Science explains the machinery; your life supplies the material the machinery used.",
        ],
      },
      {
        heading: "Why interpretation still helps",
        paragraphs: [
          "You do not need a complete theory of dreaming to use a dream. The useful question is almost always local: what feeling, relationship, or unfinished decision does this scene resemble? Emotion, setting, and what changed at the end are usually more informative than a fixed symbol key.",
          "Dreamly's dictionary treats symbols as starting points, not verdicts. Psychological, spiritual, Islamic, and biblical readings sit beside each other so one image can be considered from several angles. The overnight process may be biological; the morning question is still what you will do with what it showed you.",
        ],
      },
      {
        heading: "When a dream is just a dream",
        paragraphs: [
          "Fever, alcohol, late caffeine, skipped sleep, certain medications, and a violent film before bed all raise odd or frightening imagery. Those dreams can still feel important and still be mostly noise. Rule out the ordinary amplifiers before building a life decision on a single night.",
          "Recurrence, a strong emotion that lasts into the day, or a theme that matches a real pressure is a better signal than novelty. One strange plot is common. The same plot arriving for weeks is an invitation to look at waking life.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is there one accepted reason why we dream?",
        answer:
          "No. Leading accounts include memory consolidation, emotional processing, and threat rehearsal. They can overlap. A complete single purpose has not been proven.",
      },
      {
        question: "Do all dreams mean something?",
        answer:
          "Not every dream is a message. Many are leftover fragments of the day's load. Meaning is more likely when the emotion is strong, the theme repeats, or the scene clearly rhymes with a waking situation.",
      },
      {
        question: "Are dreams predictions?",
        answer:
          "Most dreams are processing, not prophecy. They can anticipate a feeling you have not named yet. They should not be used to forecast events or other people's actions.",
      },
      {
        question: "Why do I forget most dreams?",
        answer:
          "Dream memory is fragile. Waking into an alarm, delaying a journal, or moving immediately into tasks wipes most of the night. People who write a few lines on waking remember more — not because they dream more, but because they catch the residue before it fades.",
      },
    ],
    relatedSymbolSlugs: ["flying", "nightmare", "water", "death"],
    updatedAt: "2026-09-05",
  },
  {
    slug: "recurring-dreams",
    name: "Recurring Dreams",
    title: "Recurring Dreams",
    seoTitle: "Recurring Dreams: Why the Same Dream Comes Back",
    seoDescription:
      "Recurring dreams usually track an unfinished feeling, pressure, or pattern. Why they repeat, common themes, and what actually helps them change.",
    icon: "🔁",
    accent: "#6366f1",
    summary: "Why the same dream returns — and how to read a loop without treating it as fate.",
    intro: [
      "A recurring dream is a night that refuses to archive itself. The plot may stay almost identical, or the emotion stays fixed while the scenery updates. Either way, repetition is data: something in waking life is still live, still avoided, or still asking for a different ending.",
      "Recurring dreams are among the most searched dream experiences because they feel personal and urgent. They are rarely predictions. They are closer to a reminder the mind keeps sending until the day handles what the night keeps staging.",
    ],
    sections: [
      {
        heading: "Why the same dream comes back",
        paragraphs: [
          "Dreams reuse efficient images. Being unprepared for a test, missing a train, being chased, teeth crumbling, an ex at the door — these scenes pack a lot of feeling into a familiar set. If the waking pressure continues, the mind reaches for the same file. That is why adults who left school decades ago still dream of exams during performance weeks.",
          "Recurrence also happens after trauma and during chronic stress. In those cases the loop is less a clever metaphor and more an unfinished alarm. The first job is safety and support, not symbol hunting. Imagery rehearsal — rewriting the ending while awake — has evidence for recurrent nightmares specifically.",
        ],
      },
      {
        heading: "How to read a loop",
        paragraphs: [
          "Compare versions. What stayed the same: the feeling, the place, the person, the failed action? What changed: who was chasing you, whether you spoke, whether you woke before the ending? The stable piece is usually the theme. The changing piece often shows what you are trying, or refusing, to do.",
          "Then map the theme onto the current week, not your whole biography. Recurring cheating dreams during a trust crisis, recurring house-intruder dreams during a boundary crisis, recurring falling dreams during an unstable job — the match is often obvious once you ask the blunt question: what am I not finishing while awake?",
        ],
      },
      {
        heading: "Common recurring themes",
        paragraphs: [
          "Chase and pursuit track avoidance. Tests and being late track evaluation. Teeth and public nakedness track exposure and control. An ex returning tracks unfinished attachment or an old pattern re-entering a new relationship. Death and disaster track endings and overwhelm. The dictionary pages for those symbols go deeper; this page is about the fact of the repeat.",
          "A recurring pleasant dream exists too — flying, a childhood house, a reunion. Those loops can mark a resource you keep needing, not only a problem you keep dodging. Ask what the good dream restores, and whether waking life is starving that same need.",
        ],
      },
      {
        heading: "What actually changes the dream",
        paragraphs: [
          "Acting on the waking counterpart is the most reliable closer. A small concrete step — a conversation, a boundary, a doctor's visit, a decision written down — often does more than another night of analysis. Journaling helps you see the pattern; it does not replace the action the pattern is asking for.",
          "If the recurring dream is a nightmare that disrupts sleep, treat it as a sleep problem as well as a symbol. Regular hours, less late alcohol, and imagery rehearsal are practical. Frequent, distressing loops that follow trauma deserve clinical care. These pages are for reflection, not treatment.",
        ],
      },
    ],
    faqs: [
      {
        question: "Are recurring dreams a warning?",
        answer:
          "Usually they are a reminder, not an omen. The warning, if any, is about an unfinished waking situation — stress, avoidance, grief, or a decision you keep postponing.",
      },
      {
        question: "Why did a childhood dream come back?",
        answer:
          "Old templates reactivate when a current situation rhymes with an earlier one: evaluation, abandonment, lack of control. The childhood school or monster is often the efficient picture, not a literal return to the past.",
      },
      {
        question: "How do I stop a recurring dream?",
        answer:
          "Address the waking pressure, write the versions down, and for nightmares try imagery rehearsal — a new ending practiced while awake. Seek help if the loop follows trauma or makes you fear sleep.",
      },
      {
        question: "Do recurring dreams mean I am stuck?",
        answer:
          "They mean something is unfinished, which is different from being doomed. Many people notice the dream shift or retire once they take a real step the night had been asking for.",
      },
    ],
    relatedSymbolSlugs: ["nightmare", "recurring-nightmare", "being-chased", "falling"],
    updatedAt: "2026-09-05",
  },
  {
    slug: "lucid-dreams",
    name: "Lucid Dreams",
    title: "Lucid Dreams",
    seoTitle: "Lucid Dreams: How to Know You Are Dreaming",
    seoDescription:
      "Lucid dreams are dreams in which you know you are dreaming. How they start, why flying is a common doorway, and grounded ways to practice lucidity.",
    icon: "✨",
    accent: "#0ea5e9",
    summary: "Knowing you are dreaming — how lucidity starts, and how people learn to notice it.",
    intro: [
      "A lucid dream is a dream in which you know, while it is happening, that you are dreaming. The plot can stay ordinary or become a playground. The defining feature is the recognition, not the special effects. For many people the first lucid moment arrives mid-flight: the body should not be able to do this, therefore this is a dream, therefore I can fly on purpose.",
      "Lucidity is a skill-adjacent state, not a moral achievement and not proof of a supernatural visit. Some people have it spontaneously. Others train for it with journaling, reality checks, and bedtime rehearsal. Either way, it sits beside the dictionary: a lucid flying dream can still be about agency, and a lucid nightmare can still be about a fear you can now turn toward.",
    ],
    sections: [
      {
        heading: "What lucidity feels like",
        paragraphs: [
          "The click is usually cognitive: a mismatch between the scene and waking rules. Text that will not stay still, a dead relative in the kitchen, the ability to breathe underwater, a house with extra rooms. Once the thought 'this is a dream' holds, emotion often brightens — excitement, relief, or a sudden sense of choice.",
          "Lucidity is graded. You may know you are dreaming and still be swept by the plot. You may have a few seconds of clarity and then forget. Full steering of the dream is less common than people hope, and losing lucidity when you get excited is ordinary. Treat early attempts as noticing, not as failure to become a director.",
        ],
      },
      {
        heading: "Why flying dreams open the door",
        paragraphs: [
          "Flying is strongly associated with lucidity in dream reports. The sensation is vivid, pleasant, and physically impossible, which makes the reality check almost automatic. Once lucid, flying is also the action people choose most often. If you already have flying dreams, you already have a rehearsal stage.",
          "Falling, false awakenings, and nightmares can open the same door from the other side: 'this cannot be real' becomes 'this is a dream.' Some people then stabilize the scene; others wake. Both outcomes are normal. The lucid-dreams page and the flying symbol page are meant to be read together.",
        ],
      },
      {
        heading: "Practices that raise the odds",
        paragraphs: [
          "Write dreams in the morning, even in fragments. Memory is the raw material of lucidity: you cannot recognize a dream state you never review. During the day, ask 'am I dreaming?' and actually check — read text twice, look at your hands, notice whether physics holds. The habit has to be sincere or it will not transfer into the night.",
          "MILD — rehearsing before sleep that next time you are dreaming you will know it — is a standard technique. Some people also use wake-back-to-bed: sleep, wake after several hours, stay up briefly, return to bed with the intention. Keep the frame modest. These methods raise probability. They do not guarantee a nightly cinema, and sleep loss in pursuit of lucidity is a bad trade.",
        ],
      },
      {
        heading: "What to do once you are lucid",
        paragraphs: [
          "Stabilize first: look at your hands, spin, touch a surface, name objects out loud in the dream. Then pick one intention. Flying, asking a figure a question, or changing a nightmare ending are enough. Trying to do everything at once usually collapses the state.",
          "Lucidity does not cancel meaning. A dream you steer is still made of your material. If you use lucidity only to escape every difficult scene, you may miss the question the dream was staging. If you use it to turn toward a chase or rewrite a recurrent nightmare, you are practicing the same agency the flying dreams already hint at.",
        ],
      },
    ],
    faqs: [
      {
        question: "Are lucid dreams dangerous?",
        answer:
          "For most people they are safe and often enjoyable. Sleep disruption from aggressive training is the more common downside. If lucidity comes with distress, sleep paralysis fear, or obsession, ease off the techniques and protect ordinary rest.",
      },
      {
        question: "Can anyone learn to lucid dream?",
        answer:
          "Many people can increase frequency with journaling and reality checks. Not everyone becomes highly lucid on demand. Baseline dream recall and how you treat sleep matter more than talent myths.",
      },
      {
        question: "Is a lucid dream the same as a spiritual vision?",
        answer:
          "Some traditions read lucidity as a trained or gifted state of awareness. A grounded approach keeps the experience and the interpretation separate: you knew you were dreaming; what you do with that awareness is a values question, not a required doctrine.",
      },
      {
        question: "Why do I wake up as soon as I become lucid?",
        answer:
          "Excitement spikes, and the brain often translates that into waking. Slow down, stabilize the scene, and avoid celebrating too hard in the first seconds. This is one of the most common early problems and it usually improves with practice.",
      },
    ],
    relatedSymbolSlugs: ["flying", "falling", "nightmare", "being-chased"],
    updatedAt: "2026-09-05",
  },
  {
    slug: "false-awakening",
    name: "False Awakening",
    title: "False Awakening",
    seoTitle: "False Awakening: When You Dream That You Woke Up",
    seoDescription:
      "A false awakening is a dream of waking — getting up, checking the room, starting the day — while you are still asleep. Why it happens and how to tell.",
    icon: "🛏️",
    accent: "#94a3b8",
    summary: "Dreaming that you woke up — loops, morning routines, and how to reality-check the room.",
    intro: [
      "A false awakening is a dream in which you believe you have woken up. You sit up, walk to the bathroom, check your phone, start coffee — and then you actually wake, still in bed, sometimes after several loops of the same morning. The scene is often more ordinary than a typical dream, which is why it convinces you.",
      "False awakenings cluster with lucid dreams, sleep paralysis, and nightmares. They are not a prophecy that you cannot wake. They are a misfire of the 'I am awake now' signal, usually when sleep is light, fragmented, or highly self-monitoring — after alarms, during stress, or while you are trying hard to become lucid.",
    ],
    sections: [
      {
        heading: "What a false awakening looks like",
        paragraphs: [
          "The classic version is domestic and dull: your real bedroom, your real clothes, a slightly wrong clock. Details slip — a window in the wrong place, text that will not stay stable, a person who should not be in the house. Many people only notice the error after the real waking, which is why the experience can leave a residue of unreality for an hour.",
          "Nested loops happen: you wake from the false morning into another false morning. That stack is startling but still a dream phenomenon. It is more common when you are anxious about sleep itself or training for lucidity with constant reality checks. The mind starts producing the waking scene you keep asking for.",
        ],
      },
      {
        heading: "How it connects to lucidity and paralysis",
        paragraphs: [
          "A false awakening is a near-lucid state. If you catch the mismatch — the clock, the text, the physics — it can become a lucid dream. If you try to get out of bed and the body will not move, you may be in sleep paralysis: REM muscle atonia with a waking-like scene. Those three experiences share a border and often visit the same night.",
          "Nightmares can end in a false awakening: you 'wake' sweating in the dream-bedroom, relieved, and the threat continues in the hallway. That sequence is why this page sits next to the nightmare hub. The feeling of escape was part of the dream's plot.",
        ],
      },
      {
        heading: "How to tell the room is still a dream",
        paragraphs: [
          "Use the same checks lucid dreamers use, without turning them into an obsession. Read a line of text twice. Look at a clock, look away, look again. Try to push a finger through the opposite palm. Notice whether light switches work. In a false awakening these tests often fail in small, eerie ways.",
          "On real waking, add one grounding fact: name the date, the actual room, and one physical sensation (feet on the floor, water on your hands). The leftover unreality usually fades. If false awakenings become frequent and frightening, treat sleep timing, late screens, and anxiety about sleep as the first levers — then read the content if a theme remains.",
        ],
      },
      {
        heading: "What the loop can mean",
        paragraphs: [
          "Symbolically, a false awakening often tracks a life that looks like starting the day but is not quite begun: going through the motions, checking the same messages, rehearsing a morning that never becomes a choice. People also have them when they are hypervigilant — waiting for a call, a result, an alarm.",
          "Do not over-read a single loop after a short night. Do notice a pattern of 'I thought I was up' dreams during a period when you feel not fully in your own life. The dictionary pages for house, being naked, and nightmare cover the rooms and exposures that often furnish the false morning.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is a false awakening the same as a lucid dream?",
        answer:
          "No. In a false awakening you usually believe you are awake. Lucidity is knowing you are dreaming. A false awakening can turn lucid if you catch the error.",
      },
      {
        question: "Why do I keep waking up over and over in the dream?",
        answer:
          "The brain is staging the waking sequence you expect. Stress, alarms, and lucidity practice make that sequence more available. Nested loops are startling and still ordinary as a dream type.",
      },
      {
        question: "Can false awakenings hurt me?",
        answer:
          "They do not trap you in sleep. They can leave anxiety or a sense of unreality. Protect regular sleep, and seek care if the episodes are frequent, terrifying, or paired with daytime confusion you cannot shake.",
      },
      {
        question: "What should I do during a false awakening?",
        answer:
          "Run a calm reality check. If you confirm you are dreaming, stabilize and choose one action — or simply observe. If you cannot move, treat it as possible sleep paralysis: wait, breathe, and let the atonia pass.",
      },
    ],
    relatedSymbolSlugs: ["nightmare", "house", "being-naked", "mirror"],
    updatedAt: "2026-09-05",
  },
  {
    slug: "sleep-paralysis",
    name: "Sleep Paralysis",
    title: "Sleep Paralysis",
    seoTitle: "Sleep Paralysis: Why You Cannot Move on Waking",
    seoDescription:
      "Sleep paralysis is a REM-wake overlap: the body is still offline while awareness returns. Why it happens, why figures appear, and what actually helps.",
    icon: "😶",
    accent: "#78716c",
    summary: "Waking unable to move — the REM overlap, the figures in the room, and a calm response.",
    intro: [
      "Sleep paralysis is the experience of being aware — often in your real bedroom — while the body cannot move. It can last seconds or a couple of minutes. Breathing may feel restricted. A presence in the room, a figure on the chest, or a sound in the hallway is common. The fear is real. The plot is usually the dreaming mind decorating a body state that has a physical name: REM atonia lasting into wake.",
      "This is one of the most culturally loaded night experiences. Traditions have called it an attack, a visitation, or a warning. A grounded page holds the science first, leaves room for spiritual language if it helps you seek refuge, and refuses both mockery and omen-making. You are not crazy, and the figure is not a reliable messenger.",
    ],
    sections: [
      {
        heading: "What is happening in the body",
        paragraphs: [
          "In REM sleep the brain blocks most voluntary muscle movement so you do not act out the dream. Sleep paralysis is a timing error: awareness returns (or never fully left) while that block is still on. Irregular sleep, sleep deprivation, sleeping on the back, jet lag, and conditions that fragment REM all raise the odds. It is common across the lifespan and often clusters in stressful seasons.",
          "The chest pressure and the sense of a presence are easier to understand once you know the body is still in a REM-like state. The dreaming system can project a figure onto a room you can actually see. That is why sleep paralysis sits on the border of nightmare, false awakening, and hypnagogic hallucination rather than in the ordinary symbol dictionary.",
        ],
      },
      {
        heading: "The figures and the fear",
        paragraphs: [
          "Cultures independently report a watcher, an old woman, a shadow, a demon, or someone sitting on the chest. The image follows local folklore because the terrified mind uses the scariest available file. The emotion comes first: helplessness plus a bedroom you cannot leave. The character is how that emotion becomes a scene.",
          "Read as a dream symbol, the intruder or demon pages are the closest neighbors — a boundary crossed, a threat in private space. Read as a sleep event, the first move is not interpretation. It is recognizing the state, waiting, and not fighting the paralysis, which usually prolongs the panic.",
        ],
      },
      {
        heading: "What to do in the moment",
        paragraphs: [
          "Remind yourself, if you can, that this is sleep paralysis and it ends. Focus on small movements — a toe, a finger, the eyes — or on slowing the breath rather than on sitting up. Trying to scream or thrash tends to feed the fear loop. Many people find that deliberately relaxing shortens the episode.",
          "Afterward, sit up, turn on a light, and name the real room. If a spiritual practice of refuge or prayer steadies you, use it. Then go back to the sleep basics that reduce recurrence: regular hours, less back-sleeping if that is your trigger, less late alcohol, and treating the next night as ordinary rather than as a battlefield.",
        ],
      },
      {
        heading: "When to get help",
        paragraphs: [
          "Isolated episodes are common and usually do not need a clinic. Frequent paralysis, sudden sleep attacks in the day, or collapsing with emotion can be signs of a sleep disorder and belong with a doctor. Nightmares that make you fear sleep, or trauma-linked bedroom terror, belong with a clinician who understands both sleep and fear.",
          "Do not let a dictionary, including this one, diagnose you. The related symbol pages for nightmare, demon, ghost, and being chased are here so the imagery has somewhere to go once the body is safe. The body comes first.",
        ],
      },
    ],
    faqs: [
      {
        question: "Is sleep paralysis a dream or a medical event?",
        answer:
          "It is both: a REM-wake overlap with dream imagery laid on a real room. The paralysis has a physiological mechanism. The figure in the room is how the dreaming mind explains the helplessness.",
      },
      {
        question: "Is it a spiritual attack?",
        answer:
          "Some traditions read it that way. Even then, the advised response is usually refuge, calm, and not granting the episode authority over the next day. Check sleep timing and stress in parallel. This page is not a religious ruling.",
      },
      {
        question: "How do I stop sleep paralysis?",
        answer:
          "Regular sleep, avoiding severe sleep debt, and not sleeping on your back if that is your pattern are the usual first steps. Reduce late alcohol. See a doctor if episodes are frequent or come with daytime sleep attacks.",
      },
      {
        question: "Why do I see someone in the room?",
        answer:
          "Awareness plus REM imagery plus terror is a recipe for a presence. The figure is typically a hallucination of the state, not evidence that someone entered the house. After the episode, treat the room as ordinary and the image as leftover dream material.",
      },
    ],
    relatedSymbolSlugs: ["nightmare", "demon", "ghost", "being-chased"],
    updatedAt: "2026-09-05",
  },
];

export const DREAM_GUIDE_SLUGS = DREAM_GUIDES.map((guide) => guide.slug);

export function getDreamGuide(slug: string): DreamGuide | undefined {
  return DREAM_GUIDES.find((guide) => guide.slug === slug);
}

/** Parent symbol slugs that should surface educational guides. */
export const GUIDES_FOR_SYMBOL: Record<string, string[]> = {
  flying: ["lucid-dreams"],
  nightmare: ["recurring-dreams", "sleep-paralysis", "false-awakening"],
};

export function getGuidesForSymbol(symbolSlug: string): DreamGuide[] {
  return (GUIDES_FOR_SYMBOL[symbolSlug] ?? [])
    .map((slug) => getDreamGuide(slug))
    .filter((guide): guide is DreamGuide => Boolean(guide));
}

export function getSiblingGuides(slug: string): DreamGuide[] {
  return DREAM_GUIDES.filter((guide) => guide.slug !== slug);
}
