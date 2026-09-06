import type { DreamCategory } from "@/lib/dream-categories";
import type { DreamFaq, DreamScenario, DreamSections } from "@/lib/dream-dictionary";
import type { Locale } from "./config";

export type Lens = { psychological: string; spiritual: string; biblical: string };

const LENSES: Record<Locale, Record<DreamCategory, Lens>> = {
  en: {} as Record<DreamCategory, Lens>,
  es: {
    animals: { psychological: "el instinto, el apego, la confianza, la alerta ante la amenaza y las reacciones que llegan antes que el razonamiento", spiritual: "el discernimiento, la sabiduría natural, la protección y un trato respetuoso con lo indómito", biblical: "la sabiduría, la mayordomía, el apetito, la protección y el sentido moral que crea la conducta del animal" },
    body: { psychological: "la imagen de sí, la comunicación, la salud, la vulnerabilidad y el deseo de seguir siendo capaz", spiritual: "la encarnación, la integridad, la humildad y el cuidado del cuerpo por el que se expresa el sentido", biblical: "el cuerpo como responsabilidad vivida, el poder de la palabra, la fragilidad humana y la fuerza usada con sabiduría" },
    water: { psychological: "la emoción, la memoria, la regulación, la incertidumbre y sentimientos más fáciles de ver que de explicar", spiritual: "la limpieza, la renovación, la entrega, la profundidad y el paso por una estación que cambia", biblical: "la creación, la limpieza, el agua viva, el caos, la prueba, el refugio y la vida renovada" },
    "life-events": { psychological: "el desarrollo de la identidad, el apego, la responsabilidad, el duelo, la esperanza y la tensión entre un final y un comienzo", spiritual: "el tránsito, la entrega, la renovación, el propósito y el cuidado paciente de lo que nace o se va", biblical: "la promesa, la mortalidad, la responsabilidad fiel, la vida nueva, el duelo y la esperanza con discernimiento" },
    "fear-nightmares": { psychological: "el estrés, la evitación, la pérdida de control, la activación del sistema nervioso y los problemas que crecen si no se miran", spiritual: "el valor, el refugio, los límites, la honestidad y la diferencia entre cautela sabia y acción guiada por el miedo", biblical: "el temor, el refugio, el valor, la prueba, la perseverancia y la confianza unida al juicio práctico" },
    places: { psychological: "la memoria, la pertenencia, la intimidad, los patrones familiares, la identidad y las estructuras internas que dan seguridad", spiritual: "el cimiento, la hospitalidad, el santuario, lo heredado y el espacio interior que se prepara para crecer", biblical: "la casa, el cimiento, el refugio, la mayordomía, la herencia y la calidad de aquello sobre lo que se construye una vida" },
    movement: { psychological: "la agencia, la ambición, el rumbo, la huida, la competencia y la confianza para navegar el cambio", spiritual: "el llamado, la perspectiva, la libertad, el avance con los pies en la tierra y la alineación entre inspiración y acto", biblical: "el camino, la guía, la fuerza renovada, la humildad y la sabiduría de elegir una senda sana" },
    objects: { psychological: "el valor, la seguridad, la oportunidad, la autoestima, la escasez y el sentido que se asigna a los recursos", spiritual: "la mayordomía, la gratitud, el apego, la generosidad y el discernir qué vale de verdad", biblical: "la mayordomía, la provisión, el tesoro, la justicia, el contentamiento y la relación entre recursos y carácter" },
    people: { psychological: "el apego, el anhelo, la historia sin cerrar, la proyección y el modo en que los vínculos forman la imagen de sí", spiritual: "el amor, el perdón, la lealtad, soltar lazos viejos y la atención honesta a cómo se practica la conexión", biblical: "el pacto, la fidelidad, honrar a la familia, la reconciliación y el amor hecho acción comprometida" },
    nature: { psychological: "el desborde, el cambio súbito, fuerzas fuera de control y el clima emocional de una estación de vida", spiritual: "el asombro, la entrega, la purificación, la renovación tras el trastorno y el respeto por lo que no se manda", biblical: "la creación, el juicio y la misericordia, la prueba, el amparo y la confianza en medio de la tormenta" },
    spiritual: { psychological: "la memoria sin procesar, el miedo a lo desconocido, la conciencia, el anhelo de amparo y el conflicto interior hecho imagen", spiritual: "el discernir entre miedo y guía, la protección, la atención espiritual y la búsqueda de sentido más allá de lo material", biblical: "el discernimiento espiritual, la protección, los mensajeros, la tentación y probar cada impresión contra la sabiduría y la escritura" },
  },
  pt: {
    animals: { psychological: "instinto, apego, confiança, alerta à ameaça e reações que chegam antes do raciocínio", spiritual: "discernimento, sabedoria natural, proteção e contacto respeitoso com o indomado", biblical: "sabedoria, mordomia, apetite, proteção e o sentido moral que a conduta do animal cria" },
    body: { psychological: "autoimagem, comunicação, saúde, vulnerabilidade e o desejo de continuar capaz", spiritual: "encarnação, integridade, humildade e cuidado do corpo pelo qual o sentido se expressa", biblical: "o corpo como responsabilidade vivida, o poder da fala, a fragilidade humana e a força usada com sabedoria" },
    water: { psychological: "emoção, memória, regulação, incerteza e sentimentos mais fáceis de ver do que de explicar", spiritual: "limpeza, renovação, entrega, profundidade e passagem por uma estação que muda", biblical: "criação, limpeza, água viva, caos, prova, refúgio e vida renovada" },
    "life-events": { psychological: "identidade, apego, responsabilidade, luto, esperança e a tensão entre um fim e um começo", spiritual: "trânsito, entrega, renovação, propósito e o cuidado paciente do que nasce ou parte", biblical: "promessa, mortalidade, responsabilidade fiel, vida nova, luto e esperança com discernimento" },
    "fear-nightmares": { psychological: "estresse, evitação, perda de controle, alerta do sistema nervoso e problemas que crescem se não forem olhados", spiritual: "coragem, refúgio, limites, honestidade e a diferença entre cautela sábia e ação guiada pelo medo", biblical: "temor, refúgio, coragem, prova, perseverança e confiança ligada ao juízo prático" },
    places: { psychological: "memória, pertença, intimidade, padrões familiares, identidade e as estruturas internas que dão segurança", spiritual: "alicerce, hospitalidade, santuário, o herdado e o espaço interior que se prepara para crescer", biblical: "casa, fundamento, refúgio, mordomia, herança e a qualidade daquilo sobre o qual se constrói uma vida" },
    movement: { psychological: "agência, ambição, rumo, fuga, competência e confiança para navegar a mudança", spiritual: "chamado, perspectiva, liberdade, avanço com os pés no chão e alinhamento entre inspiração e ato", biblical: "jornada, guia, força renovada, humildade e a sabedoria de escolher um caminho são" },
    objects: { psychological: "valor, segurança, oportunidade, autoestima, escassez e o sentido atribuído aos recursos", spiritual: "mordomia, gratidão, apego, generosidade e o discernir o que vale de verdade", biblical: "mordomia, provisão, tesouro, justiça, contentamento e a relação entre recursos e caráter" },
    people: { psychological: "apego, saudade, história em aberto, projeção e o modo como os vínculos formam a autoimagem", spiritual: "amor, perdão, lealdade, soltar laços velhos e atenção honesta a como se pratica a ligação", biblical: "aliança, fidelidade, honrar a família, reconciliação e amor feito ação comprometida" },
    nature: { psychological: "transbordo, mudança súbita, forças fora de controle e o clima emocional de uma estação da vida", spiritual: "espanto, entrega, purificação, renovação após o abalo e respeito pelo que não se comanda", biblical: "criação, juízo e misericórdia, prova, abrigo e confiança no meio da tempestade" },
    spiritual: { psychological: "memória sem processar, medo do desconhecido, consciência, anseio de amparo e conflito interior feito imagem", spiritual: "discernir entre medo e guia, proteção, atenção espiritual e busca de sentido além do material", biblical: "discernimento espiritual, proteção, mensageiros, tentação e provar cada impressão contra a sabedoria e as escrituras" },
  },
  de: {
    animals: { psychological: "Instinkt, Bindung, Vertrauen, Bedrohungswahrnehmung und Reaktionen, die vor dem Nachdenken kommen", spiritual: "Unterscheidung, natürliche Weisheit, Schutz und respektvollen Umgang mit dem Ungezähmten", biblical: "Weisheit, Haushalterschaft, Begierde, Schutz und den sittlichen Sinn, den das Verhalten des Tiers schafft" },
    body: { psychological: "Selbstbild, Kommunikation, Gesundheitsbewusstsein, Verletzlichkeit und den Wunsch, handlungsfähig zu bleiben", spiritual: "Verkörperung, Integrität, Demut und die Sorge um den Leib, durch den Sinn erscheint", biblical: "den Leib als gelebte Verantwortung, die Macht der Rede, menschliche Schwachheit und Kraft, die mit Weisheit gebraucht wird" },
    water: { psychological: "Gefühl, Erinnerung, Regulation, Unsicherheit und Empfindungen, die sich leichter zeigen als erklären", spiritual: "Reinigung, Erneuerung, Hingabe, Tiefe und den Gang durch eine wechselnde Zeit", biblical: "Schöpfung, Reinigung, lebendiges Wasser, Chaos, Prüfung, Zuflucht und erneuertes Leben" },
    "life-events": { psychological: "Identität, Bindung, Verantwortung, Trauer, Hoffnung und die Spannung zwischen Ende und Anfang", spiritual: "Übergang, Hingabe, Erneuerung, Berufung und geduldige Sorge um das, was entsteht oder geht", biblical: "Verheißung, Sterblichkeit, treue Verantwortung, neues Leben, Trauer und Hoffnung mit Unterscheidung" },
    "fear-nightmares": { psychological: "Stress, Vermeidung, Kontrollverlust, Erregung des Nervensystems und Probleme, die wachsen, wenn man sie nicht ansieht", spiritual: "Mut, Zuflucht, Grenzen, Ehrlichkeit und den Unterschied zwischen kluger Vorsicht und angstgelenktem Handeln", biblical: "Furcht, Zuflucht, Mut, Prüfung, Ausdauer und Vertrauen, das mit praktischer Weisheit verbunden bleibt" },
    places: { psychological: "Erinnerung, Zugehörigkeit, Intimität, Familienmuster, Identität und innere Strukturen, die Sicherheit geben", spiritual: "Fundament, Gastfreundschaft, Heiligtum, Ererbtes und den inneren Raum, der auf Wachstum vorbereitet wird", biblical: "Haus, Fundament, Zuflucht, Haushalterschaft, Erbschaft und die Qualität dessen, worauf ein Leben gebaut ist" },
    movement: { psychological: "Handlungsfähigkeit, Ehrgeiz, Richtung, Flucht, Kompetenz und Vertrauen, den Wandel zu steuern", spiritual: "Berufung, Weitblick, Freiheit, geerdeten Fortschritt und die Übereinstimmung von Impuls und Tat", biblical: "Weg, Führung, erneuerte Kraft, Demut und die Weisheit, einen gesunden Pfad zu wählen" },
    objects: { psychological: "Wert, Sicherheit, Chance, Selbstwert, Knappheit und den Sinn, den man praktischen Mitteln gibt", spiritual: "Haushalterschaft, Dank, Bindung, Großzügigkeit und das Unterscheiden, was wirklich zählt", biblical: "Haushalterschaft, Versorgung, Schatz, Gerechtigkeit, Genügsamkeit und das Verhältnis von Mitteln und Charakter" },
    people: { psychological: "Bindung, Sehnsucht, offene Geschichte, Projektion und die Weise, wie Beziehungen das Selbstbild formen", spiritual: "Liebe, Vergebung, Treue, das Lösen alter Bande und ehrliche Aufmerksamkeit darauf, wie Verbindung gelebt wird", biblical: "Bund, Treue, die Ehrung der Familie, Versöhnung und Liebe, die sich in verbindlichem Handeln zeigt" },
    nature: { psychological: "Überwältigung, plötzlichen Wandel, Kräfte jenseits der Kontrolle und das emotionale Wetter einer Lebenszeit", spiritual: "Staunen, Hingabe, Läuterung, Erneuerung nach dem Umbruch und Achtung vor dem, was sich nicht befehlen lässt", biblical: "Schöpfung, Gericht und Barmherzigkeit, Prüfung, Obdach und Vertrauen mitten im Sturm" },
    spiritual: { psychological: "unverarbeitete Erinnerung, Furcht vor dem Unbekannten, Gewissen, das Verlangen nach Schutz und inneren Konflikt, der Gestalt annimmt", spiritual: "Unterscheidung zwischen Furcht und Führung, Schutz, geistliche Aufmerksamkeit und die Suche nach Sinn jenseits des Stofflichen", biblical: "geistliche Unterscheidung, Schutz, Boten, Versuchung und das Prüfen jedes Eindrucks an Weisheit und Schrift" },
  },
  ru: {
    animals: { psychological: "инстинкт, привязанность, доверие, чуткость к угрозе и реакции, что приходят раньше мысли", spiritual: "различение, природную мудрость, защиту и уважительный контакт с диким в жизни", biblical: "мудрость, попечение, влечение, защиту и нравственный смысл поведения животного" },
    body: { psychological: "образ себя, речь, внимание к здоровью, уязвимость и желание оставаться способным", spiritual: "воплощённость, цельность, смирение и заботу о теле, через которое выражается смысл", biblical: "тело как прожитую ответственность, силу слова, человеческую хрупкость и силу, употреблённую с мудростью" },
    water: { psychological: "чувство, память, регуляцию, неопределённость и переживания, которые легче увидеть, чем объяснить", spiritual: "очищение, обновление, доверие, глубину и переход через меняющийся сезон", biblical: "творение, очищение, живую воду, хаос, испытание, убежище и обновлённую жизнь" },
    "life-events": { psychological: "становление «я», привязанность, ответственность, горе, надежду и напряжение между концом и началом", spiritual: "переход, предание, обновление, смысл и терпеливую заботу о том, что рождается или уходит", biblical: "обещание, смертность, верную ответственность, новую жизнь, горе и надежду с рассуждением" },
    "fear-nightmares": { psychological: "стресс, избегание, потерю контроля, возбуждение нервной системы и задачи, что растут, пока на них не смотрят", spiritual: "мужество, убежище, границы, честность и разницу между мудрой осторожностью и действием из страха", biblical: "страх, убежище, мужество, испытание, стойкость и доверие, связанное с практическим смыслом" },
    places: { psychological: "память, принадлежность, частное, семейные узоры, идентичность и внутренние структуры, что дают безопасность", spiritual: "основание, гостеприимство, святилище, унаследованное и внутреннее пространство, готовящееся к росту", biblical: "дом, основание, убежище, попечение, наследие и качество того, на чём строится жизнь" },
    movement: { psychological: "субъектность, амбицию, направление, бегство, умение и уверенность в переменах", spiritual: "призвание, перспективу, свободу, земной шаг вперёд и согласие импульса и дела", biblical: "путь, ведение, обновлённую силу, смирение и мудрость выбрать здравую дорогу" },
    objects: { psychological: "ценность, безопасность, возможность, самооценку, нехватку и смысл, который придаётся средствам", spiritual: "попечение, благодарность, привязанность, щедрость и различение того, что действительно ценно", biblical: "попечение, пропитание, сокровище, справедливость, довольство и связь средств и характера" },
    people: { psychological: "привязанность, тоску, незакрытую историю, проекцию и то, как отношения формируют образ себя", spiritual: "любовь, прощение, верность, отпускание старых уз и честное внимание к тому, как живёт связь", biblical: "завет, верность, почитание семьи, примирение и любовь, ставшую обязательным действием" },
    nature: { psychological: "переполнение, внезапную перемену, силы вне контроля и эмоциональную погоду сезона жизни", spiritual: "изумление, предание, очищение, обновление после слома и уважение к тому, чем нельзя повелеть", biblical: "творение, суд и милость, испытание, кров и доверие посреди бури" },
    spiritual: { psychological: "непереработанную память, страх неизвестного, совесть, жажду защиты и внутренний конфликт, ставший образом", spiritual: "различение страха и ведения, защиту, духовное внимание и поиск смысла за пределами вещественного", biblical: "духовное различение, защиту, вестников, искушение и проверку каждого впечатления мудростью и Писанием" },
  },
  ar: {
    animals: { psychological: "الغريزة والتعلق والثقة ورصد التهديد وردودًا تأتي قبل التفكير الواعي", spiritual: "التمييز والحكمة الطبيعية والحماية ومقاربة محترمة لما هو جامح في الحياة", biblical: "الحكمة والرعاية والشهوة والحماية والمعنى الأخلاقي الذي يخلقه سلوك الحيوان" },
    body: { psychological: "صورة الذات والتواصل والوعي بالصحة والهشاشة والرغبة في البقاء قادرًا", spiritual: "التجسّد والنزاهة والتواضع والعناية بالجسد الذي يُعبَّر من خلاله عن المعنى", biblical: "الجسد كمسؤولية معيشة، وقوة الكلام، والضعف البشري، والقوة المستخدمة بحكمة" },
    water: { psychological: "العاطفة والذاكرة والتنظيم وعدم اليقين ومشاعر أسهل أن تُرى من أن تُشرح", spiritual: "التطهير والتجديد والتسليم والعمق والعبور في موسم يتغيّر", biblical: "الخلق والتطهير والماء الحي والفوضى والامتحان والملجأ والحياة المتجددة" },
    "life-events": { psychological: "تشكّل الهوية والتعلق والمسؤولية والحزن والرجاء والتوتر بين نهاية وبداية", spiritual: "الانتقال والتسليم والتجديد والقصد والعناية الصبورة بما يولد أو يمضي", biblical: "الوعد والفناء والمسؤولية الأمينة والحياة الجديدة والحزن والرجاء مع التمييز" },
    "fear-nightmares": { psychological: "التوتر والتجنّب وفقدان السيطرة واستثارة الجهاز العصبي ومشكلات تكبر إن تُركت بلا نظر", spiritual: "الشجاعة والملجأ والحدود والصدق والفرق بين حذر حكيم وفعل يقوده الخوف", biblical: "الخوف والملجأ والشجاعة والامتحان والمثابرة والثقة المتصلة بالحكمة العملية" },
    places: { psychological: "الذاكرة والانتماء والخصوصية وأنماط الأسرة والهوية والبنى الداخلية التي تصنع الأمان", spiritual: "الأساس والضيافة والقدس والموروث والمساحة الداخلية التي تُعدّ للنمو", biblical: "البيت والأساس والملجأ والرعاية والميراث ونوعية ما تُبنى عليه حياة" },
    movement: { psychological: "الفاعلية والطموح والاتجاه والهروب والكفاءة والثقة في عبور التغيّر", spiritual: "الدعوة والمنظور والحرية والتقدّم المتجذّر ومواءمة الإلهام والفعل", biblical: "الطريق والإرشاد والقوة المتجددة والتواضع وحكمة اختيار درب سليم" },
    objects: { psychological: "القيمة والأمان والفرصة وتقدير الذات والندرة والمعنى الممنوح للموارد", spiritual: "الرعاية والشكر والتعلق والكرم وتمييز ما يستحق حقًا", biblical: "الرعاية والرزق والكنز والعدل والقناعة وعلاقة الموارد بالخُلق" },
    people: { psychological: "التعلق والشوق وتاريخًا لم يُغلق والإسقاط وطريقة تشكّل صورة الذات بالروابط", spiritual: "المحبة والغفران والوفاء وإطلاق روابط قديمة وانتباهًا صادقًا لكيف تُعاش الصلة", biblical: "العهد والأمانة وإكرام الأسرة والمصالحة والمحبة التي تصير فعلًا ملتزمًا" },
    nature: { psychological: "الفيضان والتغيّر المفاجئ وقوى خارج السيطرة ومناخًا عاطفيًا لموسم من الحياة", spiritual: "الدهشة والتسليم والتطهير والتجديد بعد الاضطراب واحترام ما لا يُؤمر", biblical: "الخلق والقضاء والرحمة والامتحان والمأوى والثقة وسط العاصفة" },
    spiritual: { psychological: "ذاكرة لم تُعالَج وخوف المجهول والضمير وشوق الحماية وصراعًا داخليًا صار صورة", spiritual: "التمييز بين الخوف والهداية والحماية والانتباه الروحي وطلب معنى وراء المادة", biblical: "التمييز الروحي والحماية والرسل والتجربة واختبار كل انطباع بالحكمة والكتاب" },
  },
};

export type SectionInput = {
  title: string;
  name: string;
  category: DreamCategory;
  summary: string;
  focus?: string;
  parentName?: string;
  variationSeeds?: { name: string; focus: string }[];
};

function titleCase(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function localizedTitle(locale: Locale, name: string): string {
  switch (locale) {
    case "es":
      return `Significado de soñar con ${name}`;
    case "pt":
      return `Significado de sonhar com ${name}`;
    case "de":
      return `Traumdeutung: ${titleCase(name)}`;
    case "ru":
      return `К чему снится ${name}`;
    case "ar":
      return `تفسير حلم ${name}`;
    default:
      return `${titleCase(name)} Dream Meaning`;
  }
}

export function localizedSeoTitle(locale: Locale, name: string, hook: string): string {
  const title = localizedTitle(locale, name);
  const short = hook.split(",")[0]?.trim() || hook;
  const full = `${title}: ${short}`;
  return full.length <= 70 ? full : title;
}

export function localizedSeoDescription(locale: Locale, name: string, meaning: string): string {
  const clean = meaning.replace(/\.+$/, "").trim();
  const map: Record<Locale, string> = {
    en: `Dreams about ${name} often point to ${clean} — not a prediction. Psychological, spiritual, Islamic, and biblical readings.`,
    es: `Soñar con ${name} suele apuntar a ${clean} — no es una predicción. Lecturas psicológica, espiritual, islámica y bíblica.`,
    pt: `Sonhar com ${name} costuma apontar para ${clean} — não é previsão. Leituras psicológica, espiritual, islâmica e bíblica.`,
    de: `Träume von ${name} deuten oft auf ${clean} — keine Vorhersage. Psychologische, spirituelle, islamische und biblische Lesarten.`,
    ru: `Сны про ${name} часто указывают на ${clean} — это не прогноз. Психологическое, духовное, исламское и библейское чтение.`,
    ar: `حلم ${name} كثيرًا ما يشير إلى ${clean} — وليس نبوءة. قراءات نفسية وروحية وإسلامية وكتابية.`,
  };
  const text = map[locale];
  return text.length <= 170 ? text : text.slice(0, 167).trimEnd() + "…";
}

export function localizedAliases(locale: Locale, name: string, extra: string[] = []): string[] {
  const core: Record<Locale, string[]> = {
    en: [name, `dream about ${name}`, `${name} in a dream`, `${name} dream meaning`],
    es: [name, `soñar con ${name}`, `sueño de ${name}`, `significado de soñar con ${name}`],
    pt: [name, `sonhar com ${name}`, `sonho com ${name}`, `significado de sonhar com ${name}`],
    de: [name, `Traum von ${name}`, `${name} Traumdeutung`, `Bedeutung Traum ${name}`],
    ru: [name, `к чему снится ${name}`, `сон про ${name}`, `значение сна ${name}`],
    ar: [name, `تفسير حلم ${name}`, `حلم ${name}`, `رؤية ${name} في المنام`],
  };
  return Array.from(new Set([...core[locale], ...extra]));
}

export function localizedShortMeaning(locale: Locale, summary: string): string {
  const trimmed = summary.replace(/\.+$/, "").trim();
  if (locale === "en") return `${titleCase(trimmed)}.`;
  return `${trimmed.charAt(0).toUpperCase()}${trimmed.slice(1)}.`;
}

export function makeLocalizedSections(locale: Locale, input: SectionInput): DreamSections {
  if (locale === "en") {
    throw new Error("English sections stay in dream-dictionary.ts");
  }
  const lens = LENSES[locale][input.category];
  const subject = input.name;
  const theme = input.focus ?? input.summary;
  const parentContext = input.parentName
    ? parentLine(locale, input.parentName, input.focus ?? theme)
    : coreThemes(locale, input.summary);

  const introduction = intro(locale, input.title, parentContext, subject);
  const general = generalBlock(locale, input.title, theme, subject);
  const psychological = psychBlock(locale, input.title, lens.psychological, subject);
  const spiritual = spiritBlock(locale, input.title, lens.spiritual);
  const islamic = islamBlock(locale, input.title, theme);
  const biblical = bibleBlock(locale, input.title, lens.biblical);

  const commonScenarios: DreamScenario[] = input.variationSeeds?.length
    ? input.variationSeeds.slice(0, 6).map((variation) => ({
        title: titleCase(variation.name),
        meaning: variationLine(locale, input.title, variation.focus),
      }))
    : defaultScenarios(locale, input.title, subject);

  const faq: DreamFaq[] = faqBlock(locale, input.title, subject, theme, lens);

  return { introduction, general, psychological, spiritual, islamic, biblical, commonScenarios, faq };
}

function parentLine(locale: Locale, parent: string, focus: string): string {
  switch (locale) {
    case "es":
      return `Afina el símbolo más amplio de ${parent} en una imagen concreta: ${focus}.`;
    case "pt":
      return `Aproxima o símbolo mais amplo de ${parent} a uma imagem concreta: ${focus}.`;
    case "de":
      return `Es verdichtet das weitere Symbol ${parent} auf ein bestimmtes Bild: ${focus}.`;
    case "ru":
      return `Это сужает более широкий символ «${parent}» до одного образа: ${focus}.`;
    case "ar":
      return `يضيّق رمز ${parent} الأوسع إلى صورة واحدة: ${focus}.`;
    default:
      return focus;
  }
}

function coreThemes(locale: Locale, summary: string): string {
  switch (locale) {
    case "es":
      return `Sus temas de fondo incluyen ${summary}.`;
    case "pt":
      return `Seus temas de fundo incluem ${summary}.`;
    case "de":
      return `Zu den Kernthemen gehören ${summary}.`;
    case "ru":
      return `В ядре темы — ${summary}.`;
    case "ar":
      return `من موضوعاته الأساسية ${summary}.`;
    default:
      return summary;
  }
}

function intro(locale: Locale, title: string, parentContext: string, subject: string): string[] {
  switch (locale) {
    case "es":
      return [
        `${title} se entiende mejor partiendo de la escena, de la emoción que dejó y de lo que estaba cambiando a su alrededor. ${parentContext} La lectura útil une esos detalles con tu vida actual, no trata el sueño como un vaticinio fijo.`,
        `Un sueño de ${subject} puede sentirse bueno, amenazante o extrañamente neutro. El tono cambia la lectura: la curiosidad puede señalar disposición a entender; el pánico, presión, evitación o necesidad de resguardo. La historia personal y las creencias siguen siendo contexto esencial para ${title}.`,
      ];
    case "pt":
      return [
        `${title} se entende melhor a partir da cena, da emoção que ficou e do que estava mudando ao redor. ${parentContext} A leitura útil liga esses detalhes à sua vida acordada, em vez de tratar o sonho como previsão fixa.`,
        `Um sonho com ${subject} pode parecer bom, assustador ou estranhamente neutro. O tom muda a leitura: curiosidade pode indicar disposição para entender; pânico, pressão, evitação ou necessidade de abrigo. História pessoal e crenças continuam sendo contexto essencial para ${title}.`,
      ];
    case "de":
      return [
        `${title} versteht man am ehesten über die Szene, das Gefühl danach und das, was sich im Bild veränderte. ${parentContext} Eine brauchbare Deutung verbindet diese Details mit dem Wachleben und behandelt den Traum nicht als feste Vorhersage.`,
        `Ein Traum von ${subject} kann gut, bedrohlich oder seltsam neutral wirken. Der Ton ändert die Lesart: Neugier kann Bereitschaft zum Verstehen zeigen; Panik Druck, Vermeidung oder das Bedürfnis nach Schutz. Persönliche Geschichte und Glauben bleiben wesentlicher Kontext für ${title}.`,
      ];
    case "ru":
      return [
        `${title} лучше читать от сцены, от чувства, которое осталось, и от того, что в кадре менялось. ${parentContext} Полезное толкование связывает эти детали с нынешней жизнью, а не делает из сна жёсткий прогноз.`,
        `Сон про ${subject} может быть тёплым, пугающим или странно ровным. Тон меняет чтение: любопытство говорит о готовности понять; паника — о давлении, избегании или нужде в защите. Личная история и вера остаются важным контекстом для «${title}».`,
      ];
    case "ar":
      return [
        `يُفهم ${title} بدءًا من المشهد، ومن الشعور الذي خلّفه، وممّا كان يتغيّر حوله. ${parentContext} التفسير النافع يربط هذه التفاصيل بحياتك الآن، لا يعامل الحلم كنبوءة ثابتة.`,
        `قد يبدو حلم ${subject} طيبًا أو مخيفًا أو محايدًا على نحو غريب. النبرة تغيّر القراءة: الفضول قد يشير إلى استعداد للفهم، والذعر إلى ضغط أو تجنّب أو حاجة إلى أمان. يبقى التاريخ الشخصي والمعتقد سياقًا أساسيًا لـ ${title}.`,
      ];
    default:
      return [];
  }
}

function generalBlock(locale: Locale, title: string, theme: string, subject: string): string[] {
  switch (locale) {
    case "es":
      return [
        `En general, ${title} apunta hacia ${theme}. El sueño puede estar señalando algo que ya se mueve en la vigilia, sobre todo donde aparece la misma incertidumbre, atracción, responsabilidad o urgencia.`,
        `Los detalles afinan ${title}. Fíjate dónde apareció ${subject}, quién más estaba, qué cambió y si actuaste o solo miraste. Un final sereno suele hablar de integración; un final abierto, de una pregunta que aún pide atención.`,
      ];
    case "pt":
      return [
        `Em geral, ${title} aponta para ${theme}. O sonho pode estar chamando atenção para algo que já se move na vigília, sobretudo onde aparece a mesma incerteza, atração, responsabilidade ou urgência.`,
        `Os detalhes afinam ${title}. Note onde ${subject} apareceu, quem mais estava, o que mudou e se você agiu ou só observou. Um final calmo costuma falar de integração; um final aberto, de uma pergunta que ainda pede atenção.`,
      ];
    case "de":
      return [
        `Im Allgemeinen weist ${title} auf ${theme}. Der Traum kann auf etwas hinweisen, das im Wachleben schon im Gang ist — besonders dort, wo dieselbe Unsicherheit, Anziehung, Verantwortung oder Dringlichkeit erscheint.`,
        `Einzelheiten präzisieren ${title}. Beachte, wo ${subject} erschien, wer sonst da war, was sich änderte und ob du handelte oder nur zusahst. Ein ruhiges Ende deutet oft auf Integration; ein offenes Ende darauf, dass die Frage noch Aufmerksamkeit braucht.`,
      ];
    case "ru":
      return [
        `В целом ${title} указывает на ${theme}. Сон может привлекать внимание к тому, что уже движется наяву, особенно там, где есть та же неясность, влечение, ответственность или срочность.`,
        `Детали уточняют «${title}». Заметьте, где появился образ ${subject}, кто ещё был рядом, что изменилось и действовали вы или только смотрели. Спокойный финал часто говорит о сборке; открытый — о вопросе, который ещё ждёт внимания.`,
      ];
    case "ar":
      return [
        `عامةً يشير ${title} إلى ${theme}. قد ينبّه الحلم إلى أمر يتحرّك أصلًا في اليقظة، خصوصًا حيث تظهر نفس الحيرة أو الجذب أو المسؤولية أو الإلحاح.`,
        `التفاصيل تضبط ${title}. لاحظ أين ظهر ${subject}، ومن كان معك، وما الذي تغيّر، وهل فعلت أم شاهدت فقط. خاتمة هادئة غالبًا اندماج؛ وخاتمة مفتوحة سؤال ما زال يطلب انتباهًا.`,
      ];
    default:
      return [];
  }
}

function psychBlock(locale: Locale, title: string, lens: string, subject: string): string[] {
  switch (locale) {
    case "es":
      return [
        `En clave psicológica, ${title} puede dar forma visible a ${lens}. El sueño suele convertir un estado interior complejo en una escena memorable, para ensayar una respuesta sin afirmar que la escena ocurrirá tal cual.`,
        `Para una lectura personal de ${title}, compara la emoción más fuerte con lo reciente. Si ${subject} se repetía, la repetición puede reflejar una decisión, un patrón relacional, un estrés o una necesidad que aún no ha encontrado expresión directa.`,
      ];
    case "pt":
      return [
        `Em chave psicológica, ${title} pode dar forma visível a ${lens}. O sonho costuma transformar um estado interior complexo numa cena memorável, para ensaiar uma resposta sem afirmar que a cena acontecerá ao pé da letra.`,
        `Para uma leitura pessoal de ${title}, compare a emoção mais forte com o que é recente. Se ${subject} se repetia, a repetição pode refletir uma decisão, um padrão relacional, um estresse ou uma necessidade que ainda não encontrou expressão direta.`,
      ];
    case "de":
      return [
        `Psychologisch kann ${title} ${lens} eine sichtbare Gestalt geben. Träume machen oft einen komplexen inneren Zustand zu einer Szene, damit die Psyche eine Antwort üben kann, ohne zu behaupten, die Szene werde wörtlich eintreten.`,
        `Für eine persönliche Lesart von ${title} vergleiche das stärkste Gefühl mit dem, was kürzlich geschah. Wiederholte Bilder von ${subject} können auf eine offene Entscheidung, ein Beziehungsmuster, Stress oder ein Bedürfnis deuten, das noch keinen direkten Ausdruck hat.`,
      ];
    case "ru":
      return [
        `Психологически ${title} может дать видимую форму тому, что связано с ${lens}. Сон часто превращает сложное внутреннее состояние в одну запоминающуюся сцену — чтобы ум мог репетировать ответ, не утверждая, что сцена случится буквально.`,
        `Для личного чтения сравните самое сильное чувство сна с недавним. Если образ ${subject} повторялся, повтор может отражать нерешённый выбор, узор отношений, стресс или нужду, которой ещё нет прямого выражения.`,
      ];
    case "ar":
      return [
        `نفسيًا قد يعطي ${title} شكلًا مرئيًا لـ ${lens}. كثيرًا ما يحوّل الحلم حالًا داخلية معقّدة إلى مشهد يُحفظ، ليتدرّب العقل على استجابة دون أن يزعم أن المشهد سيحدث حرفيًا.`,
        `لقراءة شخصية قارن أقوى شعور في الحلم بما جرى مؤخرًا. إن تكرّر ${subject} فقد يعكس قرارًا معلّقًا أو نمط علاقة أو ضغطًا أو حاجة لم تجد بعد تعبيرًا مباشرًا.`,
      ];
    default:
      return [];
  }
}

function spiritBlock(locale: Locale, title: string, lens: string): string[] {
  switch (locale) {
    case "es":
      return [
        `En clave espiritual, ${title} puede invitar a mirar ${lens}. La imagen puede marcar una estación de atención o tránsito; su valor está en la honestidad que pide, no en la certeza sobre el futuro.`,
        `Una respuesta espiritual sobria a ${title} pregunta qué cualidad conviene practicar ahora: paciencia, valor, soltar, protección, gratitud o discernimiento. La interpretación útil profundiza la responsabilidad, no el miedo.`,
      ];
    case "pt":
      return [
        `Em chave espiritual, ${title} pode convidar a olhar ${lens}. A imagem pode marcar uma estação de atenção ou trânsito; o valor está na honestidade que pede, não na certeza sobre o futuro.`,
        `Uma resposta espiritual sóbria a ${title} pergunta que qualidade convém praticar agora: paciência, coragem, soltar, proteção, gratidão ou discernimento. A interpretação útil aprofunda a responsabilidade, não o medo.`,
      ];
    case "de":
      return [
        `Spirituell kann ${title} dazu einladen, ${lens} ins Auge zu fassen. Das Bild kann eine Zeit der Aufmerksamkeit oder des Übergangs markieren; sein Wert liegt in der Ehrlichkeit, die es fordert, nicht in Gewissheit über die Zukunft.`,
        `Eine nüchterne spirituelle Antwort auf ${title} fragt, welche Haltung jetzt geübt werden will: Geduld, Mut, Loslassen, Schutz, Dank oder Unterscheidung. Nützliche Deutung vertieft Verantwortung, nicht Angst.`,
      ];
    case "ru":
      return [
        `Духовно ${title} может звать взглянуть на ${lens}. Образ может отметить сезон внимания или перехода; ценность — в честности, которую он просит, а не в уверенности насчёт будущего.`,
        `Трезвый духовный ответ на «${title}» спрашивает, какое качество практиковать сейчас: терпение, мужество, отпускание, защиту, благодарность или различение. Полезное толкование углубляет ответственность, не страх.`,
      ];
    case "ar":
      return [
        `روحيًا قد يدعو ${title} إلى النظر في ${lens}. قد تعلّم الصورة موسم انتباه أو انتقال؛ قيمتها في الصدق الذي تطلبه لا في اليقين بالمستقبل.`,
        `ردّ روحي رصين على ${title} يسأل أي خصلة تُمارَس الآن: صبر، شجاعة، إفلات، حماية، شكر أو تمييز. التفسير النافع يعمّق المسؤولية لا الخوف.`,
      ];
    default:
      return [];
  }
}

function islamBlock(locale: Locale, title: string, theme: string): string[] {
  switch (locale) {
    case "es":
      return [
        `En un marco islámico, ${title} se aborda con humildad. Las tradiciones distinguen sueños reconfortantes o significativos de la actividad mental ordinaria y de los sueños penosos, de modo que la imagen puede considerarse en relación con ${theme} sin tomarse como saber cierto de lo oculto.`,
        `Un ${title} inquietante no es prueba contra otra persona ni sirve para predecir daño. Busca refugio en Alá, haz du’a y comparte el sueño solo con alguien de confianza si hace falta guía. Un sueño tranquilizador se recibe con gratitud; las decisiones siguen ancladas en la fe, el carácter y las circunstancias reales.`,
      ];
    case "pt":
      return [
        `Num quadro islâmico, ${title} se aborda com humildade. As tradições distinguem sonhos reconfortantes ou significativos da atividade mental comum e dos sonhos aflitivos, de modo que a imagem pode ser considerada em relação a ${theme} sem ser tomada como saber certo do invisível.`,
        `Um ${title} inquietante não é prova contra outra pessoa nem serve para prever dano. Busque refúgio em Allah, faça du’a e compartilhe o sonho só com alguém de confiança se precisar de orientação. Um sonho tranquilizador se recebe com gratidão; as decisões continuam ancoradas na fé, no caráter e nas circunstâncias reais.`,
      ];
    case "de":
      return [
        `Im islamischen Rahmen begegnet man ${title} mit Demut. Die Überlieferung unterscheidet tröstliche oder bedeutsame Träume von gewöhnlicher seelischer Tätigkeit und von bedrückenden Träumen. Das Bild darf mit ${theme} in Verbindung gebracht werden, ohne als sicheres Wissen über das Verborgene zu gelten.`,
        `Ein beunruhigendes ${title} ist kein Beweis gegen einen anderen Menschen und taugt nicht zur Vorhersage von Schaden. Suche Zuflucht bei Allah, sprich Du’a und teile den Traum nur mit jemandem Vertrauenswürdigen, wenn Führung nötig ist. Ein beruhigender Traum wird mit Dank aufgenommen; Entscheidungen bleiben in Glauben, Charakter und wirklichen Umständen gegründet.`,
      ];
    case "ru":
      return [
        `В исламском контексте к «${title}» подходят со смирением. Предание отличает утешительные или значимые сны от обычной работы ума и от тягостных сновидений, поэтому образ можно соотнести с ${theme}, не делая из него достоверного знания о сокрытом.`,
        `Тревожный сон не доказательство против другого человека и не повод предсказывать вред. Ищите защиты у Аллаха, делайте дуа и делитесь сном только с тем, кому доверяете, если нужна опора. Утешительный сон принимают с благодарностью; решения остаются в вере, нраве и реальных обстоятельствах.`,
      ];
    case "ar":
      return [
        `في الإطار الإسلامي يُقارَب ${title} بتواضع. تميّز التقاليد الرؤيا المبشّرة أو ذات المعنى عن حديث النفس وعن الحلم المكدّر، فيجوز النظر إلى الصورة وصلتها بـ ${theme} من دون اتخاذها علمًا يقينيًا بالغيب.`,
        `حلم مزعج ليس بيّنة على أحد ولا وسيلة للتنبؤ بأذى. استعذ بالله، وادعُ، ولا تقصّه إلا على ثقة إن احتجت مشورة. الرؤيا المطمئنة تُتلقّى بالشكر، وتبقى القرارات مربوطة بالإيمان والخُلق والواقع.`,
      ];
    default:
      return [];
  }
}

function bibleBlock(locale: Locale, title: string, lens: string): string[] {
  switch (locale) {
    case "es":
      return [
        `Una reflexión bíblica sobre ${title} puede partir de ${lens}. La Escritura no da un código fijo para cada imagen moderna, así que el símbolo se sopesa junto a su conducta en el sueño, las circunstancias, la oración y el consejo más amplio de las escrituras.`,
        `Pregúntate si ${title} señala sabiduría, tentación, mayordomía, miedo, esperanza o un cambio de conducta. Un sueño vívido puede mover a una reflexión sincera, pero no debe llamarse automáticamente mensaje divino ni decidir un asunto grave sin discernimiento.`,
      ];
    case "pt":
      return [
        `Uma reflexão bíblica sobre ${title} pode partir de ${lens}. A Escritura não dá um código fixo para cada imagem moderna, por isso o símbolo se sopesa junto à sua conduta no sonho, às circunstâncias, à oração e ao conselho mais amplo das escrituras.`,
        `Pergunte se ${title} aponta sabedoria, tentação, mordomia, medo, esperança ou uma mudança de conduta. Um sonho vívido pode mover a uma reflexão sincera, mas não deve ser chamado automaticamente de mensagem divina nem decidir assunto grave sem discernimento.`,
      ];
    case "de":
      return [
        `Eine biblische Besinnung auf ${title} kann bei ${lens} ansetzen. Die Schrift liefert keinen festen Code für jedes moderne Traumbild; das Symbol wird mit seinem Verhalten im Traum, den Umständen, dem Gebet und dem weiteren Zeugnis der Schrift gewogen.`,
        `Frage, ob ${title} Weisheit, Versuchung, Haushalterschaft, Furcht, Hoffnung oder eine nötige Änderung des Wandels hervorhebt. Ein lebhafter Traum kann zur ehrlichen Prüfung bewegen, soll aber nicht automatisch als göttliche Botschaft gelten oder eine schwere Entscheidung ohne Unterscheidung treffen.`,
      ];
    case "ru":
      return [
        `Библейское размышление о «${title}» может начаться с тем ${lens}. Писание не даёт жёсткого кода на каждый современный образ, поэтому символ взвешивают вместе с его поведением во сне, обстоятельствами, молитвой и более широким советом Писания.`,
        `Спросите, выделяет ли «${title}» мудрость, искушение, попечение, страх, надежду или нужную перемену в поступках. Яркий сон может подвигнуть к честному размышлению, но его не стоит автоматически звать божественным посланием и решать по нему тяжёлое дело без рассуждения.`,
      ];
    case "ar":
      return [
        `تأمّل كتابي في ${title} يمكن أن يبدأ من ${lens}. لا يقدّم الكتاب شفرة ثابتة لكل صورة حديثة، فيُوزَن الرمز مع سلوكه في الحلم والظروف والصلاة وشهادة الكتاب الأوسع.`,
        `اسأل إن كان ${title} يبرز حكمة أو تجربة أو رعاية أو خوفًا أو رجاء أو تغييرًا مطلوبًا في السلوك. حلم حيّ قد يدعو إلى تفكّر صادق، لكن لا يُسمّى تلقائيًا رسالة إلهية ولا يُبتُّ به أمر جسيم بلا تمييز.`,
      ];
    default:
      return [];
  }
}

function variationLine(locale: Locale, title: string, focus: string): string {
  switch (locale) {
    case "es":
      return `Dentro de ${title}, esta variación enfatiza ${focus}.`;
    case "pt":
      return `Dentro de ${title}, esta variação enfatiza ${focus}.`;
    case "de":
      return `Innerhalb von ${title} betont diese Variante ${focus}.`;
    case "ru":
      return `Внутри «${title}» эта вариация выделяет ${focus}.`;
    case "ar":
      return `داخل ${title} تبرز هذه الصورة ${focus}.`;
    default:
      return focus;
  }
}

function defaultScenarios(locale: Locale, title: string, subject: string): DreamScenario[] {
  const rows: Record<Exclude<Locale, "en">, DreamScenario[]> = {
    es: [
      { title: `Calma junto a ${subject}`, meaning: `La calma en ${title} puede mostrar aceptación creciente, perspectiva o confianza con el tema de fondo.` },
      { title: `Miedo a ${subject}`, meaning: `El miedo en ${title} puede intensificar preocupaciones por peligro, cambio, juicio, vulnerabilidad o pérdida de control.` },
      { title: `Sueño recurrente de ${subject}`, meaning: `La repetición sugiere que la pregunta de ${title} sigue activa o emocionalmente abierta.` },
    ],
    pt: [
      { title: `Calma perto de ${subject}`, meaning: `A calma em ${title} pode mostrar aceitação crescente, perspectiva ou confiança no tema de fundo.` },
      { title: `Medo de ${subject}`, meaning: `O medo em ${title} pode intensificar preocupações com perigo, mudança, julgamento, vulnerabilidade ou perda de controle.` },
      { title: `Sonho recorrente com ${subject}`, meaning: `A repetição sugere que a pergunta de ${title} segue ativa ou emocionalmente aberta.` },
    ],
    de: [
      { title: `Ruhe bei ${subject}`, meaning: `Ruhe in ${title} kann wachsende Annahme, Weitblick oder Vertrauen im zugrunde liegenden Thema zeigen.` },
      { title: `Angst vor ${subject}`, meaning: `Angst in ${title} kann Sorgen um Gefahr, Wandel, Urteil, Verletzlichkeit oder Kontrollverlust verstärken.` },
      { title: `Wiederkehrender Traum von ${subject}`, meaning: `Wiederholung deutet darauf, dass die Frage von ${title} noch aktiv oder emotional offen ist.` },
    ],
    ru: [
      { title: `Спокойствие рядом с ${subject}`, meaning: `Спокойствие в «${title}» может говорить о растущем принятии, взгляде со стороны или уверенности в теме.` },
      { title: `Страх перед ${subject}`, meaning: `Страх в «${title}» может усиливать тревогу об опасности, перемене, суждении, уязвимости или потере контроля.` },
      { title: `Повторяющийся сон про ${subject}`, meaning: `Повтор значит, что вопрос «${title}» ещё жив или эмоционально не закрыт.` },
    ],
    ar: [
      { title: `هدوء مع ${subject}`, meaning: `الهدوء في ${title} قد يظهر قبولًا متزايدًا أو منظورًا أو ثقة بالموضوع.` },
      { title: `خوف من ${subject}`, meaning: `الخوف في ${title} قد يشدّ القلق من خطر أو تغيّر أو حكم أو هشاشة أو فقدان سيطرة.` },
      { title: `حلم متكرر بـ ${subject}`, meaning: `التكرار يوحي أن سؤال ${title} ما زال حيًا أو مفتوحًا عاطفيًا.` },
    ],
  };
  return rows[locale as Exclude<Locale, "en">] ?? [];
}

function faqBlock(locale: Locale, title: string, subject: string, theme: string, lens: Lens): DreamFaq[] {
  switch (locale) {
    case "es":
      return [
        { question: `¿Qué significa soñar con ${subject}?`, answer: `${title} suele relacionarse con ${theme}. La emoción, el escenario y lo que ocurrió justo antes y después dan las pistas más personales.` },
        { question: `¿Soñar con ${subject} es una mala señal?`, answer: `No. ${title} no es automáticamente bueno ni malo y no predice un suceso con fiabilidad. Una versión aterradora puede reflejar estrés; una serena, comprensión o crecimiento.` },
        { question: `¿Cuál es el significado psicológico de ${subject}?`, answer: `El sentido psicológico de ${title} suele concernir ${lens.psychological}. Compáralo con relaciones, decisiones, presiones y sensaciones actuales.` },
        { question: `¿Cuál es el significado espiritual de ${subject}?`, answer: `El sentido espiritual de ${title} puede implicar ${lens.spiritual}. Tómalo como invitación a reflexionar y actuar con tino, no como prueba de un vaticinio.` },
        { question: `¿Por qué sueño una y otra vez con ${subject}?`, answer: `Un ${title} recurrente puede seguir un sentimiento sin resolver, un estrés repetido, una identidad que cambia o una necesidad importante. Anota cada versión y busca emociones, personas, lugares y desenlaces que se repiten.` },
      ];
    case "pt":
      return [
        { question: `O que significa sonhar com ${subject}?`, answer: `${title} costuma relacionar-se com ${theme}. A emoção, o cenário e o que aconteceu logo antes e depois dão as pistas mais pessoais.` },
        { question: `Sonhar com ${subject} é mau sinal?`, answer: `Não. ${title} não é automaticamente bom nem mau e não prevê um evento com confiabilidade. Uma versão assustadora pode refletir estresse; uma serena, compreensão ou crescimento.` },
        { question: `Qual é o significado psicológico de ${subject}?`, answer: `O sentido psicológico de ${title} costuma concernir ${lens.psychological}. Compare com relações, decisões, pressões e sensações atuais.` },
        { question: `Qual é o significado espiritual de ${subject}?`, answer: `O sentido espiritual de ${title} pode envolver ${lens.spiritual}. Trate como convite a refletir e agir com tino, não como prova de um vaticínio.` },
        { question: `Por que sonho sempre com ${subject}?`, answer: `Um ${title} recorrente pode acompanhar um sentimento sem resolver, um estresse repetido, uma identidade em mudança ou uma necessidade importante. Anote cada versão e procure emoções, pessoas, lugares e desfechos que se repetem.` },
      ];
    case "de":
      return [
        { question: `Was bedeutet ein Traum von ${subject}?`, answer: `${title} hängt häufig mit ${theme} zusammen. Gefühl, Schauplatz und das, was unmittelbar davor und danach geschah, geben die persönlichsten Hinweise.` },
        { question: `Ist ein Traum von ${subject} ein schlechtes Zeichen?`, answer: `Nein. ${title} ist nicht automatisch gut oder schlecht und sagt kein Ereignis zuverlässig voraus. Eine ängstliche Fassung kann Stress spiegeln; eine ruhige Verständnis oder Wachstum.` },
        { question: `Was ist die psychologische Bedeutung von ${subject}?`, answer: `Die psychologische Bedeutung von ${title} betrifft oft ${lens.psychological}. Vergleiche das mit heutigen Beziehungen, Entscheidungen, Druck und Körpergefühlen.` },
        { question: `Was ist die spirituelle Bedeutung von ${subject}?`, answer: `Die spirituelle Bedeutung von ${title} kann ${lens.spiritual} berühren. Nimm das als Einladung zum Nachdenken und klugen Handeln, nicht als Beweis einer Vorhersage.` },
        { question: `Warum träume ich immer wieder von ${subject}?`, answer: `Ein wiederkehrendes ${title} kann ein unerledigtes Gefühl, wiederholten Stress, eine sich wandelnde Identität oder ein wichtiges Bedürfnis begleiten. Schreibe jede Fassung auf und suche wiederkehrende Gefühle, Menschen, Orte und Ausgänge.` },
      ];
    case "ru":
      return [
        { question: `К чему снится ${subject}?`, answer: `${title} обычно связано с ${theme}. Чувство, место и то, что было сразу до и после символа, дают самые личные подсказки.` },
        { question: `Сон про ${subject} — плохая примета?`, answer: `Нет. ${title} само по себе не добро и не зло и не предсказывает событие надёжно. Пугающая версия может отражать стресс; спокойная — понимание или рост.` },
        { question: `Какое психологическое значение у ${subject}?`, answer: `Психологический смысл «${title}» часто касается ${lens.psychological}. Сверьте это с нынешними отношениями, решениями, давлением и телесными ощущениями.` },
        { question: `Какое духовное значение у ${subject}?`, answer: `Духовный смысл «${title}» может затрагивать ${lens.spiritual}. Это приглашение подумать и поступить здраво, не доказательство сверхъестественного прогноза.` },
        { question: `Почему мне снова и снова снится ${subject}?`, answer: `Повторяющееся «${title}» может вести незакрытое чувство, повторный стресс, меняющееся «я» или важную нужду. Записывайте каждую версию и ищите повторяющиеся чувства, людей, места и исходы.` },
      ];
    case "ar":
      return [
        { question: `ماذا يعني حلم ${subject}؟`, answer: `${title} يرتبط غالبًا بـ ${theme}. الشعور والمكان وما جرى قبل الرمز وبعده مباشرة أعطي أدق الإشارات الشخصية.` },
        { question: `هل حلم ${subject} فأل سيئ؟`, answer: `لا. ${title} ليس خيرًا ولا شرًا تلقائيًا ولا يتنبأ بحدث بيقين. النسخة المخيفة قد تعكس توترًا؛ والهادئة فهمًا أو نموًا.` },
        { question: `ما المعنى النفسي لـ ${subject}؟`, answer: `المعنى النفسي لـ ${title} يخص غالبًا ${lens.psychological}. قارنه بعلاقاتك وقراراتك وضغوطك وأحاسيس جسدك الآن.` },
        { question: `ما المعنى الروحي لـ ${subject}؟`, answer: `المعنى الروحي لـ ${title} قد يتصل بـ ${lens.spiritual}. خذه دعوة إلى التأمّل والفعل الرشيد، لا برهانًا على نبوءة.` },
        { question: `لماذا أحلم بـ ${subject} مرارًا؟`, answer: `تكرار ${title} قد يتابع شعورًا معلّقًا أو ضغطًا متكررًا أو هوية تتغيّر أو حاجة مهمة. سجّل كل نسخة وابحث عن مشاعر وأشخاص وأماكن وخواتيم تتكرر.` },
      ];
    default:
      return [];
  }
}
