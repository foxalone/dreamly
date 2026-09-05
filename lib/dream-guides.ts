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
  {
    slug: "types-of-dreams",
    name: "Types of Dreams",
    title: "Types of Dreams",
    seoTitle: "Types of Dreams: Nightmares, Lucid, Recurring & More",
    seoDescription:
      "A map of common dream types — nightmares, lucid dreams, false awakenings, recurring loops, prophetic claims, and healing dreams — and how to read each without treating the night as a verdict.",
    icon: "🗂️",
    accent: "#7c3aed",
    summary: "A map of the main dream types — what they share, where they differ, and which page to open next.",
    intro: [
      "Most nights produce more than one kind of dream. A flying scene can become lucid. A chase can return for weeks. A false awakening can sit on the border of sleep paralysis. Treating every night as the same kind of message flattens the thing you are trying to understand.",
      "This page is a map, not a taxonomy that science has settled. Researchers disagree about purpose. Dreamers still need names for what happened. Use the type as a first cut: body-state, unfinished feeling, rehearsal, or a story the mind told once and will not repeat. Then open the dedicated guide or the symbol that furnished the scene.",
    ],
    sections: [
      {
        heading: "Ordinary dreams",
        paragraphs: [
          "Most dreams are neither lucid nor nightmares. They stitch recent residue, older memory, and feeling into a plot that may look random in the morning. The useful question is rarely 'what does this object mean forever?' It is closer to: what feeling, relationship, or unfinished decision does this scene resemble?",
          "If a single image stays — a house, a snake, a test — the dictionary is the next stop. If the night was just busy and faded by breakfast, it may not need a reading.",
        ],
      },
      {
        heading: "Nightmares, loops, and the border states",
        paragraphs: [
          "Nightmares are dreams that wake you with fear or dread. Recurring dreams reuse a file until the day handles what the night keeps staging. False awakenings stage the morning while you are still asleep. Sleep paralysis is a REM-wake overlap: the body is still offline while awareness returns.",
          "These four sit together. A nightmare can end in a false awakening. Trying to become lucid can produce both. Read the nightmare and recurring guides first if the night is frightening; read false awakening and sleep paralysis if the problem is the border of waking.",
        ],
      },
      {
        heading: "Lucid, vivid, and 'epic' nights",
        paragraphs: [
          "Lucidity is knowing you are dreaming while the dream continues. Vividness is intensity of sensation — color, sound, the conviction that it happened. An 'epic' dream is a long, story-like night that feels larger than usual. None of these is automatically more meaningful. Intensity is not the same as a message.",
          "Lucid dreams can be trained and used for rehearsal or for facing a nightmare. Vivid dreams often rise with pregnancy, fever, withdrawal from alcohol, new medication, or simply more REM awakenings. Treat the amplifier before building a life decision on one spectacular plot.",
        ],
      },
      {
        heading: "Prophetic, healing, and shared dreams",
        paragraphs: [
          "People report dreams that later seem to match an event, dreams that leave the body feeling repaired, and dreams that two people claim to have shared. The honest stance is the same for all three: rare, memorable, and easy to overfit after the fact. Anxiety wants certainty. Sleep is good at producing scenes that feel like answers.",
          "The prophetic and healing pages take those claims seriously without turning them into a method. Shared or 'mutual' dreams are usually coincidence plus a shared day, or a story told until the versions converge. If a dream helps you act with more care, it has already done enough work.",
        ],
      },
    ],
    faqs: [
      {
        question: "How many types of dreams are there?",
        answer:
          "There is no official list. Common working names include ordinary dreams, nightmares, lucid dreams, recurring dreams, false awakenings, and the rarer claims — prophetic, healing, epic, shared. The borders overlap.",
      },
      {
        question: "Is a vivid dream a different type?",
        answer:
          "Vividness is a quality, not a separate species. Hormones, sleep debt, fever, and waking in REM all raise intensity. Read the content if a theme remains; check sleep and health if every night is suddenly cinematic.",
      },
      {
        question: "Which type should I start with?",
        answer:
          "If you woke afraid, start with nightmares. If the same plot returns, start with recurring dreams. If you knew you were dreaming, start with lucid dreams. If you 'woke' and then woke again, start with false awakening.",
      },
      {
        question: "Do daydreams count?",
        answer:
          "Daydreams are waking imagination. They share imagery with night dreams but not REM physiology. They can still show what the mind keeps returning to. They are not evidence that the night world leaked into the day.",
      },
    ],
    relatedSymbolSlugs: ["nightmare", "flying", "falling", "house"],
    updatedAt: "2026-09-05",
  },
  {
    slug: "prophetic-dreams",
    name: "Prophetic Dreams",
    title: "Prophetic Dreams",
    seoTitle: "Prophetic Dreams: Premonition, Anxiety & What to Do",
    seoDescription:
      "A prophetic dream feels like it showed the future. How to tell anxiety and coincidence from a night that is actually asking for care — without treating dreams as forecasts.",
    icon: "🔮",
    accent: "#7c3aed",
    summary: "When a dream feels like the future — anxiety, coincidence, and a careful way to respond.",
    intro: [
      "A prophetic dream is a dream that seems, afterward, to have shown something that later happened. The feeling is specific: not a vague mood, but a scene that lines up with a call, an accident, a result. Cultures have treated such nights as warnings, gifts, or tests. Modern sleep science treats most of them as the mind's talent for pattern — plus the human talent for remembering the hits and forgetting the misses.",
      "You do not have to pick a side before you use the night. The useful move is the same whether you believe in preview or in probability: do not make a serious decision on a single dream, and do notice if the feeling points to a care you have been postponing.",
    ],
    sections: [
      {
        heading: "Why a dream can look like the future",
        paragraphs: [
          "The sleeping brain rehearses threat, stitches incomplete news, and runs versions of a decision you have not finished. If you are waiting for a test result, you will dream of verdicts. If a relative is ill, you will dream of phones ringing. When the day later rhymes with the night, the match feels supernatural. Often it is continuity: the mind was already working the file.",
          "Memory also edits. People remember the dream that 'came true' and lose the ten that did not. After the event, the dream is retold until it fits more tightly. That is ordinary cognition, not proof that nothing unusual ever happens.",
        ],
      },
      {
        heading: "Anxiety wearing a prophet's coat",
        paragraphs: [
          "Many so-called premonitions are anxiety asking for certainty. The dream offers a plot because uncertainty is harder to hold than a bad story. Plane-crash, death, and exam dreams are classic here. They feel like warnings because fear wants a target.",
          "A grounded check: is this a theme you already carry in the day? Are you sleeping badly? Did a film, a headline, or a conversation furnish the image? If yes, treat the dream as emotional weather, not as a schedule of events.",
        ],
      },
      {
        heading: "What to do with a dream that will not let go",
        paragraphs: [
          "Write it down before you interpret it. Note the feeling more than the plot. Then ask what care, conversation, or practical check the feeling is asking for — a doctor visit you have delayed, a boundary you have not spoken, a trip you are taking while exhausted. Acting on care is different from acting on a forecast.",
          "Faith traditions that take dreams seriously usually pair them with counsel, prayer or discernment, and a refusal to let one night overrule wisdom. The Islamic and biblical readings in the dictionary follow that etiquette. A dream may prompt reflection. It should not automatically be labeled a message and used to control other people.",
        ],
      },
      {
        heading: "When the claim is larger than a personal night",
        paragraphs: [
          "Dreams about disasters, lottery numbers, or public events are especially easy to overfit. They are also especially costly if you treat them as instructions. Do not change medication, end a relationship, or spend rent because a night felt certain.",
          "If prophetic-feeling dreams are frequent and frightening, you are closer to the nightmare and recurring-dream pages than to a gift. Sleep, stress, and — if needed — a clinician come before a theory of time.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can dreams predict the future?",
        answer:
          "There is no reliable scientific method for using dreams as forecasts. Some nights later rhyme with events because the mind was already rehearsing a fear or a hope. Treat matches as interesting, not as a system.",
      },
      {
        question: "What if my dream already came true once?",
        answer:
          "One match is not a method. Write future dreams before the day unfolds if you want an honest record. Even then, use them as prompts for care, not as proof you can see ahead.",
      },
      {
        question: "Are prophetic dreams mentioned in religion?",
        answer:
          "Yes — scripture and many traditions include warning and guidance dreams, and also warn against treating every night as revelation. Discernment, counsel, and ordinary wisdom stay in the loop.",
      },
      {
        question: "Should I warn someone about my dream?",
        answer:
          "You can share a concern without claiming prophecy. 'I am worried about you and I had a hard dream' is different from 'I saw what will happen.' The first is care. The second can frighten people you cannot actually protect.",
      },
    ],
    relatedSymbolSlugs: ["death", "plane-crash", "lottery", "god"],
    updatedAt: "2026-09-05",
  },
  {
    slug: "healing-dreams",
    name: "Healing Dreams",
    title: "Healing Dreams",
    seoTitle: "Healing Dreams: When a Night Leaves You Changed",
    seoDescription:
      "Some dreams leave the body quieter, a grief moved, or a problem newly solvable. What healing dreams are, what they are not, and how to use the morning without magic thinking.",
    icon: "🌿",
    accent: "#16a34a",
    summary: "Nights that leave you lighter — repair, rehearsal, and the difference between feeling healed and being finished.",
    intro: [
      "A healing dream is a night after which something in you is quieter: a grief has moved, a fear has a new ending, a body symptom has eased, or a problem looks solvable. People describe warmth, a guide, a completed cry, or simply waking without the usual knot. The experience is real as an experience. It is not a substitute for medicine, therapy, or the slow work of a life.",
      "Sleep itself is already a repair process — memory, emotion, immune function. A dream that feels healing may be the visible edge of that overnight work. Reading it as a miracle can steal the more useful follow-up: what did the night finish, and what still belongs to the day?",
    ],
    sections: [
      {
        heading: "What people usually mean",
        paragraphs: [
          "Three patterns get called healing. First, emotional completion: you cry, confront, or forgive in the dream and wake less charged. Second, body dreams: pain lessens, a wound is tended, an illness is pictured as cleaning or light. Third, guidance dreams: a figure, a place, or a sentence that leaves you oriented.",
          "Imagery rehearsal for nightmares is the closest clinical cousin — rewriting a bad ending while awake, then meeting a milder night. Lucid dreamers sometimes do the same from inside. That is skill plus safety, not proof that the dream world is a clinic.",
        ],
      },
      {
        heading: "How to use the morning",
        paragraphs: [
          "Write the feeling and one concrete image before they fade. If the dream offered an action — a conversation, a rest, a boundary — test a small version in daylight. If it offered only relief, protect the relief: do not immediately fill the space with the old argument.",
          "Spiritual language is welcome if it helps you receive care. The dictionary's spiritual readings ask what quality the season is practicing — patience, courage, release — rather than what the night guaranteed. A healing dream can be an invitation. It is not a certificate that the work is done.",
        ],
      },
      {
        heading: "What a healing dream is not",
        paragraphs: [
          "It is not a diagnosis and not a treatment plan. Do not stop medication, skip a biopsy, or abandon therapy because a night felt clean. Body-repair dreams are common during illness and recovery; they often track hope and attention, not outcome.",
          "It is also not owed to you. People in deep grief or trauma may have no gentle nights for a long time. That is not a spiritual failure. The nightmare and sleep-paralysis pages are the right neighbors when the night is still a battlefield.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can a dream heal my body?",
        answer:
          "Sleep supports healing. A dream that pictures repair can accompany that process and change how you feel. It does not replace medical care. Use the morning energy to keep the appointment, not to cancel it.",
      },
      {
        question: "Why did I wake up crying and feel better?",
        answer:
          "The night sometimes finishes a feeling the day would not allow. Tears in sleep can discharge charge. If the relief lasts, you used the dream well. If the same cry returns for weeks, you are closer to a recurring-dream loop.",
      },
      {
        question: "Is a guide or ancestor in a healing dream real?",
        answer:
          "This page cannot settle that. What can be said: the figure used a form you could receive. Thank the help, write what was said, and test any advice against waking wisdom and counsel.",
      },
      {
        question: "How is this different from a lucid dream?",
        answer:
          "Lucidity is knowing you are dreaming. Healing is an after-effect. They can overlap — a lucid dreamer may choose a repair scene — but a healing dream can happen without any control at all.",
      },
    ],
    relatedSymbolSlugs: ["water", "angel", "illness", "crying"],
    updatedAt: "2026-09-05",
  },
  {
    slug: "remembering-dreams",
    name: "Remembering Dreams",
    title: "Remembering Dreams",
    seoTitle: "Remembering Dreams: Why They Fade & How to Keep Them",
    seoDescription:
      "Most dreams are gone in minutes. Why recall is fragile, what actually helps you remember, and when forgetting is just ordinary sleep — not a blocked gift.",
    icon: "📝",
    accent: "#0ea5e9",
    summary: "Why dreams vanish by breakfast — and the few habits that actually improve recall.",
    intro: [
      "Dream memory is short on purpose. Five minutes after waking, much of the night is already gone. Ten minutes later, most of what remains has thinned to a mood. People who say they 'never dream' almost always dream; they wake in a way that misses the residue.",
      "Remembering more is a skill of catching, not of dreaming harder. The people with rich dream lives are often the people who lie still, write three lines, and treat the first image as worth keeping. You do not need a leather journal. You need a pause before the day starts talking.",
    ],
    sections: [
      {
        heading: "Why the night erases itself",
        paragraphs: [
          "During REM the brain is vivid and the chemical mix is poor at writing long-term memory. Waking into an alarm, rolling toward a phone, or standing up immediately finishes the erasure. Alcohol late, some medications, and severe sleep debt also cut recall — either by reducing REM or by making the morning too rough to notice.",
          "Forgetting is not a sign that you are blocked, unspiritual, or 'bad at dreams.' It is the default. The surprise is that we remember any of it.",
        ],
      },
      {
        heading: "What actually helps",
        paragraphs: [
          "The reliable method is small. Before sleep, tell yourself you will write one image. On waking, do not move for thirty seconds. Collect the last feeling, then the last place, then any person. Write fragments — 'blue kitchen, my brother, the door would not lock.' A full story is optional. Fragments train the catch.",
          "Waking naturally from REM helps more than an aggressive alarm. A notebook you do not have to unlock beats an app you will negotiate with. Recording a voice note in the dark works if writing feels like too much. Reviewing the week's fragments on Sunday often reveals a theme the single night hid.",
        ],
      },
      {
        heading: "When more recall is not the goal",
        paragraphs: [
          "Nightmare sufferers sometimes remember too well. The job then is not a better journal. It is safety, sleep timing, and — if the nights are frequent — a clinician who knows imagery rehearsal. Lucidity practice can also raise recall and false awakenings together. Increase the catch only if you want more of the night in the day.",
          "Children, pregnancy, and illness can all change recall without any technique. The life-stages guide covers those shifts. If recall suddenly vanishes with other sleep changes, mention it to a doctor the way you would mention new snoring or daytime crashes.",
        ],
      },
    ],
    faqs: [
      {
        question: "Why don't I remember my dreams?",
        answer:
          "You likely wake past the fragile window, or sleep in a way that skips easy REM awakenings. Alarms, rushing, alcohol, and some medicines all thin recall. A thirty-second pause and three written words change more than any supplement.",
      },
      {
        question: "Does everyone dream every night?",
        answer:
          "Healthy sleepers have several dream-rich periods a night, especially in REM. Not remembering is common. A true absence of dreaming is unusual and belongs with a doctor if it arrives with other sleep or mood changes.",
      },
      {
        question: "How long do dreams last?",
        answer:
          "A remembered dream can feel like hours and have been minutes. REM periods lengthen toward morning, which is why the last dream is the one you usually catch. There is no single official duration.",
      },
      {
        question: "Will writing dreams make them more intense?",
        answer:
          "Attention increases recall, and sometimes vividness, because you start waking with the question already on. That is usually manageable. If journaling makes nightmares louder, stop and use the nightmare guide instead.",
      },
    ],
    relatedSymbolSlugs: ["nightmare", "house", "mirror", "water"],
    updatedAt: "2026-09-05",
  },
  {
    slug: "children-and-dreams",
    name: "Children & Pregnancy",
    title: "Children, Babies & Pregnancy Dreams",
    seoTitle: "Children and Pregnancy Dreams: Sleep Science & Meaning",
    seoDescription:
      "How dreaming changes in pregnancy, in babies, and in childhood — more vivid nights, common fears, and what is ordinary versus worth a conversation with a doctor.",
    icon: "👶",
    accent: "#f472b6",
    summary: "How the night changes in pregnancy and childhood — vividness, fear, and what is ordinary.",
    intro: [
      "Dreaming is not the same across a life. Pregnancy often makes nights more vivid and more bodily. Young children have shorter, more fragmented sleep and different dream content than adults. New parents dream of lost babies and unlocked doors because the caregiving system is on. None of this is rare. Treating it as omen-making is the usual mistake.",
      "This page is sleep and development first, symbol second. The pregnancy, baby, and nightmare dictionary pages remain the place for a specific image. Here the question is: what is the night doing in this season, and when is a child's fear just a child learning the dark?",
    ],
    sections: [
      {
        heading: "Pregnancy: why the nights get louder",
        paragraphs: [
          "Hormones, frequent waking, and the sheer scale of what is coming all raise dream recall. Sleep research finds pregnant people report more vivid, more bizarre, and more anxious dreams, especially later in pregnancy. Water, animals, labor, and the baby's safety are common files. Men and non-pregnant partners can have pregnancy dreams too; those are almost always metaphor or empathy, not a body report.",
          "Anxiety dreams about labor or adequacy are documented in healthy pregnancies. They are rehearsal, not prediction. If nights become unmanageable — nightly terror, no sleep, or thoughts of harm — that belongs with a clinician, not a dictionary. The pregnancy symbol page covers the image. This page is the physiology around it.",
        ],
      },
      {
        heading: "Babies and very young children",
        paragraphs: [
          "Infants spend a large share of sleep in REM-like states. Whether they 'dream' in the adult story sense is still open. What parents see is twitching, smiles, and cries from sleep that are usually ordinary. Toddlers begin to report simple dream fragments as language arrives. They often do not appear as themselves in dreams until later preschool years.",
          "Nightmares typically rise around age three and are common through seven or eight. Monsters, animals, and being lost are the usual casts. Night terrors are a different event: the child may scream and look awake while still in deep non-REM sleep and remember little in the morning. Comfort, a regular schedule, and not over-interviewing the plot are the first tools. Persistent terror, injury during sleep, or daytime collapse needs a pediatric clinician.",
        ],
      },
      {
        heading: "What to say in the morning",
        paragraphs: [
          "For a child: believe the fear, keep the room ordinary, and avoid turning the dream into a prophecy or a joke. 'That was a scary dream. You are safe in this bed' is enough. Drawing the monster and changing the ending can help older children the way imagery rehearsal helps adults.",
          "For yourself in pregnancy or postpartum: write the feeling, check sleep and support, and use the baby or pregnancy pages if a symbol keeps returning. Do not read a lost-baby nightmare as a verdict on your care. Those dreams are common in attentive parents and usually fade as vigilance eases.",
        ],
      },
    ],
    faqs: [
      {
        question: "Do babies dream?",
        answer:
          "They have REM-rich sleep. Whether that includes story-like dreams as adults know them is not settled. Twitches and sleep-cries are usually normal. Ask a doctor about unusual pauses in breathing, extreme irritability, or sleep that never settles.",
      },
      {
        question: "Are pregnancy dreams more prophetic?",
        answer:
          "They are more frequent and more vivid, which makes them feel more important. That is not the same as prediction. Use them as a weather report on hope and fear, and keep prenatal care in the waking world.",
      },
      {
        question: "When is a child's nightmare a problem?",
        answer:
          "When it is frequent, when the child cannot be comforted over weeks, when they are hurt or leave the bed in a terror they do not remember, or when daytime fear of sleep takes over. Then you want a clinician, not only a meaning.",
      },
      {
        question: "Why do I dream I lost the baby?",
        answer:
          "The caregiving system rehearses loss because the stake is so high. It is a documented, painful, and usually non-prophetic dream. Check the crib if you must, then treat the night as vigilance — not as a message that you are failing.",
      },
    ],
    relatedSymbolSlugs: ["pregnancy", "baby", "nightmare", "water"],
    updatedAt: "2026-09-05",
  },
  {
    slug: "dream-theorists",
    name: "Freud, Jung & Others",
    title: "Freud, Jung & Dream Theorists",
    seoTitle: "Freud, Jung & Dream Theory: How to Use Them Now",
    seoDescription:
      "What Freud, Jung, Adler, and later researchers actually claimed about dreams — and how to use those lenses without turning one dead theorist into a verdict on your night.",
    icon: "📚",
    accent: "#6366f1",
    summary: "Freud, Jung, and later theory — useful lenses, not a court that rules your dream.",
    intro: [
      "Dream interpretation in the West still walks around two names. Freud treated the dream as a disguised wish and a royal road to what the waking mind would not admit. Jung treated it as a message from a wider psyche — personal and collective — using images that behave like living symbols, not like a code with one key. Both are part of why people still open a dictionary at all.",
      "Neither man had REM labs, pregnancy sleep studies, or a theory of threat rehearsal. Later researchers — Adler, Calvin Hall, Fritz Perls, and the sleep scientists of the last fifty years — revised the picture. Dreamly uses them as lenses beside spiritual, Islamic, and biblical readings. A lens is a way of looking. It is not the object.",
    ],
    sections: [
      {
        heading: "Freud: disguise, wish, and leftover day",
        paragraphs: [
          "Freud's claim, simplified: the dream is a wish — often unacceptable — dressed in leftover images from the day so that sleep can continue. He divided the remembered story (manifest) from the hidden thought (latent) and spent analysis translating one into the other. He also noticed that some dreams are just the body: thirst, an alarm, a full bladder.",
          "What still helps: ask what you wanted and could not want by day. What is dated: treating every snake as one kind of symbol, and treating the analyst as the owner of the meaning. If a Freudian reading tightens your chest with recognition, keep it. If it feels like a joke at your expense, drop it.",
        ],
      },
      {
        heading: "Jung: symbol, compensation, and the larger self",
        paragraphs: [
          "Jung kept Freud's seriousness about the night and rejected the idea that a dream is mainly a censored wish. He read dreams as compensation — showing what the waking attitude left out — and as encounters with figures that can be bigger than one biography: the shadow, the wise other, the house as psyche. He asked the dreamer to stay with the image rather than replace it with an explanation too fast.",
          "What still helps: 'What attitude in me is this night balancing?' and 'If this figure had a sentence, what would it say?' What to refuse: a collective-unconscious stamp that makes your personal history irrelevant. Jung himself started with the dreamer's life.",
        ],
      },
      {
        heading: "After them",
        paragraphs: [
          "Adler read many dreams as rehearsal of style and superiority — how you move toward a goal or defend against inferiority. Calvin Hall collected thousands of reports and argued that dreams picture the dreamer's conception of self, family, and world more plainly than Freud allowed. Fritz Perls treated every person and object as a part of you and asked you to speak as the image.",
          "Sleep science added machinery Freud and Jung did not have: REM and non-REM, memory consolidation, emotion regulation, threat simulation. That research does not cancel meaning. It explains why the night has material at all. The why-we-dream guide is the companion page for that half of the story.",
        ],
      },
      {
        heading: "How Dreamly uses the theorists",
        paragraphs: [
          "On a symbol page, the psychological section often owes a debt to this lineage without naming a school every time: wish and defense, compensation, parts of the self, the house as inner architecture. The spiritual, Islamic, and biblical sections sit beside it so one dead European man cannot own the night.",
          "If you want a method for tonight: write the dream, name the feeling, ask Freud's 'what wish or fear is dressed here?', ask Jung's 'what is this compensating?', then ask what you will do before noon. Three questions beat a system.",
        ],
      },
    ],
    faqs: [
      {
        question: "Should I interpret my dream the Freudian way or the Jungian way?",
        answer:
          "Try both as questions, not as loyalties. Freud is useful when something feels forbidden or disguised. Jung is useful when the image feels larger than a private wish. Keep whichever sentence makes your waking life more honest.",
      },
      {
        question: "Did science disprove Freud?",
        answer:
          "Science discarded a lot of his specific symbol keys and his single-wish theory. It did not discard the idea that dreams use personal material and feeling. Use him as a historical lens, not as a laboratory result.",
      },
      {
        question: "What is the collective unconscious?",
        answer:
          "Jung's name for shared patterns of image — mother, shadow, flood, snake — that turn up across cultures. It is a hypothesis, not a scanned organ. You can use the idea ('this image is older than my week') without needing to prove a psychic inheritance.",
      },
      {
        question: "Do I need an analyst to understand a dream?",
        answer:
          "No. Recurring terror, trauma nights, or a dream life that is wrecking the day belong with a professional. Ordinary symbols do not. A dictionary and a few written lines are enough to start.",
      },
    ],
    relatedSymbolSlugs: ["snake", "house", "water", "being-chased"],
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
  nightmare: ["recurring-dreams", "sleep-paralysis", "false-awakening", "healing-dreams"],
  pregnancy: ["children-and-dreams"],
  baby: ["children-and-dreams"],
  death: ["prophetic-dreams"],
  god: ["prophetic-dreams", "dream-theorists"],
  house: ["types-of-dreams", "remembering-dreams"],
  snake: ["dream-theorists"],
};

export function getGuidesForSymbol(symbolSlug: string): DreamGuide[] {
  return (GUIDES_FOR_SYMBOL[symbolSlug] ?? [])
    .map((slug) => getDreamGuide(slug))
    .filter((guide): guide is DreamGuide => Boolean(guide));
}

export function getSiblingGuides(slug: string): DreamGuide[] {
  return DREAM_GUIDES.filter((guide) => guide.slug !== slug);
}
