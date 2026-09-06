import type { Locale } from "./config";

export type FaithSlug = "biblical" | "islamic" | "spiritual";

export type FaithCopy = {
  heading: string;
  perspectiveLabel: string;
  seoTitle: string;
  seoDescription: string;
  intro: string[];
};

const FAITH: Record<Locale, Record<FaithSlug, FaithCopy>> = {
  en: {
    biblical: {
      heading: "Biblical Dream Meanings",
      perspectiveLabel: "Biblical meaning",
      seoTitle: "Biblical Dream Meanings: Scripture, Wisdom & Hope",
      seoDescription:
        "Dreams about snakes, water, death, fire, and weddings through scripture — wisdom and hope rather than a fixed code for every image.",
      intro: [
        "Scripture treats some dreams as significant — Joseph's sheaves, Pharaoh's cattle, the warnings given to the Magi — while never suggesting that every dream is a message. A biblical approach to a modern dream is therefore careful: it weighs the symbol against scriptural themes, the dreamer's circumstances, prayer, and wise counsel rather than reading it as a private prophecy.",
        "Each symbol below links to a full biblical reflection alongside its psychological, spiritual, and Islamic readings, so the same dream can be considered from several angles before any conclusion is drawn.",
      ],
    },
    islamic: {
      heading: "Islamic Dream Meanings",
      perspectiveLabel: "Islamic meaning",
      seoTitle: "Islamic Dream Meanings: Symbols, Scenarios & Readings",
      seoDescription:
        "Dreams about snakes, water, teeth, fire, and marriage in Islamic interpretation — without treating the image as a verdict.",
      intro: [
        "The Islamic tradition distinguishes between three kinds of dreams: truthful dreams regarded as glad tidings, dreams that arise from the self and its daily concerns, and distressing dreams. Interpretation is approached with humility — a dream is never treated as certain knowledge of the unseen, is not evidence against another person, and should be shared only with someone trustworthy.",
        "Each symbol below links to a full Islamic reflection presented alongside psychological, spiritual, and biblical readings, so interpretation stays grounded rather than fearful.",
      ],
    },
    spiritual: {
      heading: "Spiritual Dream Meanings",
      perspectiveLabel: "Spiritual meaning",
      seoTitle: "Spiritual Dream Meanings: Growth & Attention",
      seoDescription:
        "Dreams about snakes, water, angels, fire, and death as spiritual invitations to reflection — not predictions of what will happen next.",
      intro: [
        "A spiritual reading of a dream asks a different question than prediction: not \"what will happen?\" but \"what quality is this season of life asking me to practice?\" Patience, courage, release, protection, gratitude, discernment — a vivid symbol often marks the place where one of these is needed.",
        "Each symbol below links to a full spiritual reflection alongside its psychological, Islamic, and biblical readings, so the interpretation deepens awareness instead of creating fear.",
      ],
    },
  },
  es: {
    biblical: {
      heading: "Significados bíblicos de los sueños",
      perspectiveLabel: "Lectura bíblica",
      seoTitle: "Significado bíblico de los sueños: escritura y esperanza",
      seoDescription:
        "Soñar con serpientes, agua, muerte, fuego o bodas a la luz de la escritura: sabiduría y esperanza, no un código fijo.",
      intro: [
        "La escritura trata algunos sueños como significativos — las gavillas de José, el ganado de Faraón, las advertencias a los magos — y nunca dice que todo sueño sea un mensaje. Una lectura bíblica de un sueño de hoy es por eso cuidadosa: sopesa el símbolo junto a los temas de la escritura, las circunstancias de quien sueña, la oración y el consejo sabio, en vez de leerlo como profecía privada.",
        "Cada símbolo enlaza con una reflexión bíblica completa junto a las lecturas psicológica, espiritual e islámica, para mirar el mismo sueño desde varios ángulos antes de concluir.",
      ],
    },
    islamic: {
      heading: "Significados islámicos de los sueños",
      perspectiveLabel: "Lectura islámica",
      seoTitle: "Significado islámico de los sueños: símbolos y lecturas",
      seoDescription:
        "Soñar con serpientes, agua, dientes, fuego o matrimonio en la tradición islámica, sin tratar la imagen como veredicto.",
      intro: [
        "La tradición islámica distingue tres clases de sueños: los veraces como buena nueva, los que nacen del yo y de las preocupaciones del día, y los que angustian. Se interpreta con humildad: un sueño no es saber cierto de lo oculto, no es prueba contra otra persona y solo se comparte con alguien de confianza.",
        "Cada símbolo enlaza con una reflexión islámica completa junto a las lecturas psicológica, espiritual y bíblica, para que la interpretación se mantenga serena y no temerosa.",
      ],
    },
    spiritual: {
      heading: "Significados espirituales de los sueños",
      perspectiveLabel: "Lectura espiritual",
      seoTitle: "Significado espiritual de los sueños: crecimiento y atención",
      seoDescription:
        "Soñar con serpientes, agua, ángeles, fuego o muerte como invitación a reflexionar, no como predicción.",
      intro: [
        "Una lectura espiritual no pregunta «qué va a pasar», sino «qué cualidad me pide practicar esta estación de la vida». Paciencia, valor, soltar, amparo, gratitud, discernimiento: un símbolo vivo suele marcar el lugar donde hace falta una de estas.",
        "Cada símbolo enlaza con una reflexión espiritual completa junto a las lecturas psicológica, islámica y bíblica, para profundizar la atención en vez de crear miedo.",
      ],
    },
  },
  pt: {
    biblical: {
      heading: "Significados bíblicos dos sonhos",
      perspectiveLabel: "Leitura bíblica",
      seoTitle: "Significado bíblico dos sonhos: escritura e esperança",
      seoDescription:
        "Sonhar com cobras, água, morte, fogo ou casamento à luz da escritura: sabedoria e esperança, não um código fixo.",
      intro: [
        "A escritura trata alguns sonhos como significativos — os feixes de José, o gado do Faraó, os avisos aos magos — e nunca diz que todo sonho é uma mensagem. Uma leitura bíblica de um sonho de hoje é por isso cuidadosa: pesa o símbolo junto aos temas da escritura, às circunstâncias de quem sonha, à oração e ao conselho sábio, em vez de lê-lo como profecia privada.",
        "Cada símbolo liga a uma reflexão bíblica completa ao lado das leituras psicológica, espiritual e islâmica, para olhar o mesmo sonho de vários ângulos antes de concluir.",
      ],
    },
    islamic: {
      heading: "Significados islâmicos dos sonhos",
      perspectiveLabel: "Leitura islâmica",
      seoTitle: "Significado islâmico dos sonhos: símbolos e leituras",
      seoDescription:
        "Sonhar com cobras, água, dentes, fogo ou casamento na tradição islâmica, sem tratar a imagem como veredito.",
      intro: [
        "A tradição islâmica distingue três tipos de sonho: os verdadeiros como boa-nova, os que nascem do eu e das preocupações do dia, e os que angustiam. Interpreta-se com humildade: um sonho não é saber certo do invisível, não é prova contra outra pessoa e só se compartilha com alguém de confiança.",
        "Cada símbolo liga a uma reflexão islâmica completa ao lado das leituras psicológica, espiritual e bíblica, para que a interpretação permaneça serena, não temerosa.",
      ],
    },
    spiritual: {
      heading: "Significados espirituais dos sonhos",
      perspectiveLabel: "Leitura espiritual",
      seoTitle: "Significado espiritual dos sonhos: crescimento e atenção",
      seoDescription:
        "Sonhar com cobras, água, anjos, fogo ou morte como convite à reflexão, não como previsão.",
      intro: [
        "Uma leitura espiritual não pergunta «o que vai acontecer», e sim «que qualidade esta estação da vida me pede praticar». Paciência, coragem, soltar, amparo, gratidão, discernimento: um símbolo vivo costuma marcar o lugar onde falta uma dessas.",
        "Cada símbolo liga a uma reflexão espiritual completa ao lado das leituras psicológica, islâmica e bíblica, para aprofundar a atenção em vez de criar medo.",
      ],
    },
  },
  de: {
    biblical: {
      heading: "Biblische Traumbedeutungen",
      perspectiveLabel: "Biblische Lesart",
      seoTitle: "Biblische Traumdeutung: Schrift, Weisheit und Hoffnung",
      seoDescription:
        "Träume von Schlangen, Wasser, Tod, Feuer und Hochzeit im Licht der Schrift — Weisheit und Hoffnung, kein festes Codebuch.",
      intro: [
        "Die Schrift behandelt manche Träume als bedeutsam — Josefs Garben, die Kühe des Pharao, die Warnungen an die Magier — und behauptet nie, jeder Traum sei eine Botschaft. Eine biblische Lesart eines heutigen Traums ist deshalb behutsam: sie prüft das Bild an Schriftmotiven, an der Lage des Träumenden, am Gebet und am klugen Rat, statt es als private Weissagung zu lesen.",
        "Jedes Symbol führt zu einer vollständigen biblischen Reflexion neben psychologischer, spiritueller und islamischer Lesart, damit derselbe Traum von mehreren Seiten betrachtet wird, bevor ein Schluss gezogen wird.",
      ],
    },
    islamic: {
      heading: "Islamische Traumbedeutungen",
      perspectiveLabel: "Islamische Lesart",
      seoTitle: "Islamische Traumdeutung: Symbole und Lesarten",
      seoDescription:
        "Träume von Schlangen, Wasser, Zähnen, Feuer und Ehe in der islamischen Tradition — ohne das Bild als Urteil zu nehmen.",
      intro: [
        "Die islamische Überlieferung unterscheidet drei Arten von Träumen: wahrhaftige als frohe Botschaft, solche, die aus dem Selbst und den Sorgen des Tages kommen, und bedrängende. Man deutet mit Demut: ein Traum ist kein sicheres Wissen über das Verborgene, kein Beweis gegen einen anderen Menschen und wird nur einem Vertrauten anvertraut.",
        "Jedes Symbol führt zu einer vollständigen islamischen Reflexion neben psychologischer, spiritueller und biblischer Lesart, damit die Deutung geerdet bleibt und nicht ängstlich wird.",
      ],
    },
    spiritual: {
      heading: "Spirituelle Traumbedeutungen",
      perspectiveLabel: "Spirituelle Lesart",
      seoTitle: "Spirituelle Traumdeutung: Wachstum und Aufmerksamkeit",
      seoDescription:
        "Träume von Schlangen, Wasser, Engeln, Feuer und Tod als Einladung zur Reflexion — nicht als Vorhersage.",
      intro: [
        "Eine spirituelle Lesart fragt nicht «was wird geschehen?», sondern «welche Haltung verlangt diese Lebenszeit von mir?» Geduld, Mut, Loslassen, Schutz, Dank, Unterscheidung — ein lebendiges Bild markiert oft den Ort, an dem eines davon fehlt.",
        "Jedes Symbol führt zu einer vollständigen spirituellen Reflexion neben psychologischer, islamischer und biblischer Lesart, damit die Deutung Aufmerksamkeit vertieft statt Furcht zu nähren.",
      ],
    },
  },
  ru: {
    biblical: {
      heading: "Библейские значения снов",
      perspectiveLabel: "Библейское чтение",
      seoTitle: "Библейское толкование снов: Писание и надежда",
      seoDescription:
        "Сны о змее, воде, смерти, огне и свадьбе в свете Писания — мудрость и надежда, а не жёсткий код к каждому образу.",
      intro: [
        "Писание считает иные сны значимыми — снопы Иосифа, коровы фараона, предупреждения волхвам — и никогда не утверждает, что всякий сон есть весть. Библейское чтение сегодняшнего сна поэтому осторожно: оно сверяет образ с темами Писания, с обстоятельствами видящего, с молитвой и мудрым советом, а не читает его как частное пророчество.",
        "Каждый символ ведёт к полному библейскому размышлению рядом с психологическим, духовным и исламским чтением, чтобы один сон можно было рассмотреть с нескольких сторон, прежде чем делать вывод.",
      ],
    },
    islamic: {
      heading: "Исламские значения снов",
      perspectiveLabel: "Исламское чтение",
      seoTitle: "Исламское толкование снов: символы и чтения",
      seoDescription:
        "Сны о змее, воде, зубах, огне и браке в исламской традиции — без того, чтобы делать из образа приговор.",
      intro: [
        "Исламская традиция различает три рода снов: правдивые как благая весть, те, что рождаются из «я» и дневных забот, и тягостные. Толкуют со смирением: сон не есть достоверное знание о сокрытом, не доказательство против другого человека и им делятся только с тем, кому доверяют.",
        "Каждый символ ведёт к полному исламскому размышлению рядом с психологическим, духовным и библейским чтением, чтобы толкование оставалось спокойным, а не пугающим.",
      ],
    },
    spiritual: {
      heading: "Духовные значения снов",
      perspectiveLabel: "Духовное чтение",
      seoTitle: "Духовное толкование снов: рост и внимание",
      seoDescription:
        "Сны о змее, воде, ангелах, огне и смерти как приглашение к размышлению, а не прогноз того, что случится.",
      intro: [
        "Духовное чтение спрашивает не «что будет», а «какое качество просит практиковать этот сезон жизни». Терпение, мужество, отпускание, защита, благодарность, различение — живой образ часто отмечает место, где одного из этого не хватает.",
        "Каждый символ ведёт к полному духовному размышлению рядом с психологическим, исламским и библейским чтением, чтобы толкование углубляло внимание, а не плодило страх.",
      ],
    },
  },
  ar: {
    biblical: {
      heading: "المعاني الكتابية للأحلام",
      perspectiveLabel: "القراءة الكتابية",
      seoTitle: "التفسير الكتابي للأحلام: الكتاب والرجاء",
      seoDescription:
        "أحلام الثعبان والماء والموت والنار والزفاف في ضوء الكتاب: حكمة ورجاء لا شيفرة ثابتة لكل صورة.",
      intro: [
        "يعامل الكتاب بعض الأحلام بوصفها ذات شأن — حزم يوسف وبقر فرعون وتحذير المجوس — ولا يقول إن كل حلم رسالة. القراءة الكتابية لحلم اليوم لذلك متأنية: تزن الرمز بموضوعات الكتاب وظروف الرائي والصلاة والمشورة الحكيمة، لا تقرأه كنبوءة خاصة.",
        "كل رمز يصل إلى تأمل كتابي كامل إلى جانب القراءات النفسية والروحية والإسلامية، حتى يُنظر إلى الحلم ذاته من زوايا عدة قبل أي خلاصة.",
      ],
    },
    islamic: {
      heading: "المعاني الإسلامية للأحلام",
      perspectiveLabel: "القراءة الإسلامية",
      seoTitle: "التفسير الإسلامي للأحلام: رموز وقراءات",
      seoDescription:
        "أحلام الثعبان والماء والأسنان والنار والزواج في التقليد الإسلامي، دون اتخاذ الصورة حكمًا.",
      intro: [
        "يميّز التقليد الإسلامي ثلاثة أصناف: الرؤيا الصادقة بشرى، وأضغاثًا من النفس وهموم اليوم، وأحلامًا تُحزن. يُفسَّر بتواضع: الحلم ليس علمًا يقينيًا بالغيب، ولا بيّنة على أحد، ولا يُقصّ إلا على من يُوثق به.",
        "كل رمز يصل إلى تأمل إسلامي كامل إلى جانب القراءات النفسية والروحية والكتابية، ليبقى التفسير رصينًا لا مفزعًا.",
      ],
    },
    spiritual: {
      heading: "المعاني الروحية للأحلام",
      perspectiveLabel: "القراءة الروحية",
      seoTitle: "التفسير الروحي للأحلام: نمو وانتباه",
      seoDescription:
        "أحلام الثعبان والماء والملائكة والنار والموت بوصفها دعوة إلى التأمل، لا تنبؤًا بما سيحدث.",
      intro: [
        "القراءة الروحية لا تسأل «ماذا سيحدث؟» بل «أيّ خُلق يطلب مني هذا الموسم أن أمارسه؟» الصبر والشجاعة والإطلاق والحماية والشكر والتمييز: كثيرًا ما يعلّم رمز حيّ موضع الحاجة إلى واحد منها.",
        "كل رمز يصل إلى تأمل روحي كامل إلى جانب القراءات النفسية والإسلامية والكتابية، ليعمّق الانتباه بدل أن يزرع الخوف.",
      ],
    },
  },
};

export function getFaithCopy(locale: Locale, slug: FaithSlug): FaithCopy {
  return FAITH[locale][slug];
}
