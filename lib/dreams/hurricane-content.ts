import type { DreamSections } from "../dream-dictionary";
import type { Locale } from "../i18n/config";
import type { EntryL10nOverride } from "../i18n/entry-overrides/types";

type Article = EntryL10nOverride & { sections: DreamSections };

function article(
  seoTitle: string,
  seoDescription: string,
  prose: [string, string, string, string, string, string, string, string],
  scenarios: [string, string][],
  faq: [string, string][],
): Article {
  const [intro, links, general, psychological, spiritual, islamic, biblical, journal] = prose;
  return {
    seoTitle,
    seoDescription,
    sections: {
      introduction: [intro, links],
      general: [general],
      psychological: [psychological],
      spiritual: [spiritual, journal],
      islamic: [islamic],
      biblical: [biblical],
      commonScenarios: scenarios.map(([title, meaning]) => ({ title, meaning })),
      faq: faq.map(([question, answer]) => ({ question, answer })),
    },
  };
}

export const HURRICANE_CONTENT: Record<Locale, Article> = {
  en: article(
    "Hurricane Dream Meaning: Shelter, Change, and What Survives",
    "Dreaming of a hurricane? Explore approaching winds, shelter, damage, and the calm afterward through psychological, spiritual, Islamic, and biblical lenses.",
    [
      "A hurricane changes an entire landscape, not just one corner of it. In a dream, its wide reach can capture the feeling that several parts of life are under pressure at once: home, work, relationships, and plans. The important question is how you experienced its arrival. Did you have warning, find shelter, help someone else, or wake before the storm reached you?",
      "A hurricane is a broad, sustained storm. If your dream centered on a narrow funnel, compare [tornado](/dreams/tornado); if the water rose higher than the wind, see [tsunami](/dreams/tsunami). The wider [storm](/dreams/storm) entry covers conflict, thunder, and weather that passes. These distinctions help you keep the dream's actual scene instead of forcing one symbol onto another.",
      "An approaching hurricane may express anticipation more than disaster: the exhausting wait before an announcement, move, conflict, or family decision. Being inside a sturdy house can bring attention to the support you already have. A damaged roof may point toward fear for the place or people you depend on. The dream is not a weather forecast or a prediction of loss.",
      "Psychologically, the storm can turn diffuse stress into a visible event with a beginning and an end. The dreamer may rehearse evacuation, protect loved ones, or discover that no plan feels sufficient. If you have lived through a real hurricane or followed disaster coverage, memory and recent images may be a more direct explanation than symbolism. Notice whether the strongest feeling was panic, responsibility, grief, or relief.",
      "Spiritually, the image can invite a question about what serves as shelter when circumstances cannot be controlled. That might mean community, prayer, rest, or a practical plan. Surviving the storm can offer a sense of renewal; it does not promise that every real difficulty will end quickly. Let the dream point toward care and steadiness rather than certainty about the future.",
      "In an Islamic reflection, a frightening dream is not certain knowledge of coming harm or a judgment on your household. Wind and storms can evoke power and trial in religious language, but their meaning in one person's dream is not fixed. If the dream upset you, seek refuge in Allah and return to ordinary care and sound advice. Decisions about safety should follow real conditions, not the dream.",
      "For a biblical reflection, Jesus calming the storm (Mark 4:35–41) gives language for fear and trust, while the house founded on rock (Matthew 7:24–27) asks what can withstand rough weather. Neither passage supplies a code that makes a dreamed hurricane a divine warning. You might instead consider where you need help, a firmer foundation, or compassion for someone else in the storm.",
      "In Dreamly, record the storm's distance, the condition of your shelter, whom you tried to protect, and the scene after the wind stopped. If the dream followed a real threat, begin with the practical feeling it left you with. Comparing those details over time may show whether the pressure is growing, easing, or changing shape.",
    ],
    [["A hurricane approaches", "Anticipation and preparation may matter more than any damage that never occurs."], ["Sheltering with family", "The dream may bring shared safety, responsibility, or strained closeness into focus."], ["A house survives the hurricane", "Notice resilience and the supports that held, even if the scene was frightening."], ["Walking outside afterward", "The aftermath may center on grief, relief, rebuilding, or a clearer view of what matters."]],
    [["Does a hurricane dream predict a disaster?", "No. A dream does not forecast weather or personal events. Consider recent stress, memories, and the details of the scene."], ["What if I survived the hurricane?", "Survival may emphasize resilience, relief, or the wish to know you can get through upheaval."], ["Is a hurricane the same as a tornado in a dream?", "They can share themes of lost control, but a hurricane often affects a broad area over time while a tornado is a narrower, sudden funnel. Keep the image you actually saw."]],
  ),
  es: article(
    "Soñar con un huracán: refugio, cambios y lo que resiste",
    "¿Soñaste con un huracán? Explora el viento, la casa, el resguardo y la calma posterior con lecturas psicológicas, espirituales, islámicas y bíblicas.",
    [
      "Un huracán no revuelve solo un rincón: altera todo el paisaje. Por eso, en un sueño puede reunir presiones que llegan juntas, como problemas de familia, trabajo y vivienda. Pero el centro del relato no siempre es la destrucción. Recuerda si hubo aviso, si lograste resguardarte, a quién buscaste y en qué momento despertaste.",
      "Conviene nombrar el fenómeno que viste. Un embudo de viento se acerca más al [tornado](/dreams/tornado); una gran ola, al [tsunami](/dreams/tsunami). La página de [tormenta](/dreams/storm) amplía el tema del mal tiempo y los conflictos. El huracán destaca por su alcance y duración: quizá en el sueño no había un solo problema del que escapar, sino muchos frentes abiertos.",
      "Verlo venir puede representar la espera de una noticia difícil, una mudanza o una conversación pendiente. Estar en casa con las ventanas cerradas invita a pensar en qué apoyo está disponible. Si el techo cede, pregúntate qué seguridad temes perder. Ninguna de estas escenas anuncia que vaya a ocurrir una catástrofe.",
      "Desde la psicología, el huracán puede dar forma visible a una tensión que cuesta ordenar. Preparar bolsas, buscar a alguien o no encontrar una salida son maneras de ensayar respuestas mientras dormimos. Si viviste una tormenta real, o viste noticias recientes, el recuerdo también puede explicar la imagen. Da prioridad a la emoción que quedó al despertar.",
      "En una lectura espiritual, el refugio puede ser una pregunta sobre compañía, descanso, oración o ayuda concreta. Salir al claro después del viento puede sugerir un nuevo comienzo; no promete que los problemas reales se resolverán solos. El valor del sueño está en reconocer qué necesitas cuidar hoy.",
      "Para una persona musulmana, un sueño angustiante no confirma un castigo ni anticipa daño para su familia. El viento puede evocar poder y prueba en el lenguaje religioso, pero no tiene una interpretación obligatoria en cada sueño. Buscar amparo en Alá puede dar consuelo; las decisiones prácticas requieren hechos y buen consejo.",
      "En la Biblia, Jesús calma una tormenta (Marcos 4:35–41), y la casa sobre roca resiste la lluvia y el viento (Mateo 7:24–27). Son pasajes para meditar sobre miedo, confianza y fundamento, no claves para declarar profético cualquier huracán soñado. Pregunta qué apoyo real podrías fortalecer.",
      "Anota en Dreamly si el huracán estaba lejos, cómo era tu refugio y qué ocurrió después. Si el sueño siguió a una alerta real, toma en serio tu necesidad de seguridad sin convertir el sueño en pronóstico. Con el tiempo, tus notas pueden mostrar si la presión disminuye o solo cambia de forma.",
    ],
    [["El huracán se acerca", "La espera y los preparativos pueden ser más importantes que un daño que no llega."], ["Te refugias con tu familia", "Observa cómo se reparten el cuidado y la responsabilidad."], ["La casa queda en pie", "La escena puede destacar los apoyos que resistieron."], ["Sales después del temporal", "El final puede hablar de alivio, pérdidas o ganas de reconstruir."]],
    [["¿Soñar con un huracán anuncia una desgracia?", "No. El sueño no pronostica fenómenos naturales ni sucesos personales."], ["¿Qué significa sobrevivir al huracán?", "Puede expresar resistencia, alivio o el deseo de comprobar que podrás atravesar una etapa difícil."], ["¿Huracán y tornado son lo mismo en sueños?", "Comparten viento y temor, pero el huracán suele abarcar una zona mayor y durar más. Respeta la imagen que recuerdas."]],
  ),
  ar: article(
    "تفسير حلم الإعصار المداري: المأوى وما يبقى بعد العاصفة",
    "ماذا يعني حلم الإعصار المداري؟ قراءة للرياح والمأوى والبيت والهدوء بعد العاصفة من زوايا نفسية وروحية وإسلامية وكتابية.",
    [
      "حين يظهر إعصار مداري في الحلم، لا يقتصر أثره على زاوية صغيرة؛ فالريح والمطر يطاولان المكان كله. قد يجسّد ذلك شعورًا بتزاحم الضغوط في البيت والعمل والعلاقات. لكن لا تبدأ القراءة بحجم الخراب وحده. هل تلقيت إنذارًا؟ هل وجدت مأوى؟ ومن حاولت أن تحميه؟",
      "إذا كان المشهد قمعًا ضيقًا من الريح، فقارن [حلم الزوبعة](/dreams/tornado). وإذا غلبت موجة الماء، فاقرأ عن [التسونامي](/dreams/tsunami). أما [العاصفة](/dreams/storm) فتتناول اضطراب الطقس على نحو أوسع. الإعصار المداري هنا يلفت النظر إلى اتساع الحدث واستمراره، ولذلك قد يمثّل ضغوطًا تمتد إلى أكثر من جانب في الحياة.",
      "اقتراب الإعصار قد يصوّر انتظار خبر أو قرار تخشاه، لا وقوع كارثة. والاحتماء ببيت متين قد يلفت انتباهك إلى سند متاح، بينما يثير تضرر السقف سؤال الأمان الذي تخشى فقدانه. لا يتنبأ الحلم بحالة الطقس ولا بمصير البيت أو أهله.",
      "نفسيًا، تمنح العاصفة شكلًا واضحًا لتوتر يصعب تسميته. قد تتدرّب في الحلم على جمع الأهل أو إغلاق النوافذ أو البحث عن طريق للخروج. وإذا عشت إعصارًا حقيقيًا، أو شاهدت تغطية لكارثة قريبة، فقد يكون المشهد امتدادًا للذاكرة. لاحظ الشعور الأقوى عند الاستيقاظ: خوفًا كان أم مسؤولية أم ارتياحًا.",
      "روحيًا، يطرح المأوى سؤالًا بسيطًا: أين تجد الثبات حين لا تملك إيقاف الريح؟ قد يكون في الدعاء، أو في صحبة موثوقة، أو في خطوة عملية لحماية من تحب. النجاة في الحلم قد تفتح بابًا للأمل، لكنها لا تعد بنهاية سريعة لكل شدة في الواقع.",
      "في النظر الإسلامي لا يكون الحلم المخيف علمًا بالغيب ولا دليلًا على عقاب يصيب الأسرة. ترد الرياح في النصوص بصور متعددة، فلا يصح تثبيت معنى واحد لكل رؤيا. إن أقلقك الحلم فاستعذ بالله، واطلب السكينة والمشورة الموثوقة. أما تدابير السلامة فتُبنى على الوقائع والإنذارات الحقيقية.",
      "في قراءة كتابية، تهدئة يسوع للعاصفة في مرقس 4:35–41 تفتح باب التأمل في الخوف والثقة، ومثل البيت المبني على الصخر في متى 7:24–27 يسأل عن الأساس الذي يصمد. لا يجعل ذلك الإعصار في حلمك نبوءة. قد تكون الدعوة الأجدى هي تقوية الروابط وطلب المعونة عند الحاجة.",
      "دوّن في Dreamly بُعد الإعصار وحال المأوى ومن كان معك وما ظهر بعد هدوء الريح. إن سبق الحلمَ خطرٌ حقيقي، فاعتنِ بإحساسك بالأمان وبالخطوات الواقعية. ومراجعة التفاصيل لاحقًا قد تكشف كيف تغيّر الضغط الذي تعيشه.",
    ],
    [["إعصار يقترب", "قد تكون فترة الانتظار والاستعداد أهم من ضرر لم يقع في الحلم."], ["الاحتماء مع الأسرة", "تظهر الحاجة إلى الأمان وتقاسم المسؤولية."], ["بقاء البيت قائمًا", "انتبه إلى ما ثبت وإلى الأشخاص الذين ساندوك."], ["الخروج بعد انحسار الريح", "قد يحمل المشهد راحة أو حزنًا أو رغبة في إعادة البناء."]],
    [["هل ينبئ حلم الإعصار بكارثة؟", "لا. لا يكشف الحلم طقس المستقبل ولا مصير الأشخاص."], ["ماذا تعني النجاة من الإعصار؟", "قد تعبّر عن المرونة أو الارتياح أو الحاجة إلى الثقة بقدرتك على تجاوز الشدة."], ["هل الإعصار المداري هو الزوبعة نفسها؟", "يشتركان في الرياح والخوف، لكن الإعصار المداري أوسع أثرًا وأطول زمنًا؛ احتفظ بتفاصيل حلمك كما هي."]],
  ),
  pt: article(
    "Sonhar com furacão: abrigo, mudança e o que permanece",
    "Sonhou com um furacão? Entenda a chegada dos ventos, o abrigo, a casa e a calmaria depois da tempestade em diferentes perspectivas.",
    [
      "Um furacão não mexe só com um detalhe da paisagem. No sonho, ele pode reunir a sensação de que várias áreas da vida exigem atenção ao mesmo tempo: família, trabalho, casa e planos. Antes de pensar em destruição, lembre-se da sequência. Houve aviso? Você encontrou abrigo? Estava tentando proteger alguém?",
      "Vale distinguir as imagens. Um funil estreito de vento se aproxima do [tornado](/dreams/tornado); uma onda enorme, do [tsunami](/dreams/tsunami). A página sobre [tempestade](/dreams/storm) trata do tempo ruim de modo mais amplo. No furacão, a extensão e a duração do evento podem ser justamente o que tornou o sonho marcante.",
      "Um furacão no horizonte pode dar forma à espera por uma notícia, mudança ou conversa difícil. Ficar numa casa firme pode destacar os apoios que você já tem. Se o telhado se abre, pergunte que proteção parece frágil agora. O sonho não prevê uma tragédia nem informa como estará o tempo.",
      "Pela psicologia, o vento pode transformar um estresse difuso numa cena com começo, meio e fim. Arrumar uma bolsa, fechar janelas ou procurar uma pessoa são ensaios possíveis de resposta. Quem já passou por uma tempestade real, ou viu imagens recentes de desastres, também pode estar revisitando memórias. O sentimento ao acordar ajuda a separar essas possibilidades.",
      "Numa leitura espiritual, a pergunta pode ser onde você encontra amparo quando não controla as circunstâncias. O abrigo pode ser uma pessoa, uma prática de fé, descanso ou um plano concreto. A calmaria ao fim sugere esperança, mas não garante que dificuldades reais vão desaparecer depressa.",
      "Para uma pessoa muçulmana, um sonho assustador não comprova castigo nem revela o futuro da família. Ventos e tempestades aparecem em diferentes contextos religiosos; uma imagem sonhada não recebe significado fixo por isso. Buscar refúgio em Allah pode trazer conforto, enquanto decisões práticas devem seguir fatos e orientação confiável.",
      "Numa reflexão bíblica, Jesus acalma a tempestade em Marcos 4:35–41, e a casa sobre a rocha resiste à chuva e ao vento em Mateus 7:24–27. Essas passagens podem ajudar a pensar em medo e fundamento, sem transformar todo furacão sonhado em aviso divino. Considere de que apoio você precisa hoje.",
      "Registre no Dreamly a distância do furacão, as condições do abrigo, quem estava junto e o que aconteceu depois. Se o sonho veio após um alerta verdadeiro, cuide da segurança com base nas informações reais. Suas anotações podem mostrar como a pressão mudou com o tempo.",
    ],
    [["O furacão se aproxima", "A espera e a preparação podem importar mais do que um dano que nem chegou a ocorrer."], ["Abrigo com a família", "Cuidado, responsabilidade e convivência aparecem na mesma cena."], ["A casa resiste", "Perceba os recursos e vínculos que sustentaram você."], ["Sair depois da tempestade", "O final pode trazer alívio, perdas ou vontade de recomeçar."]],
    [["Sonhar com furacão prevê desastre?", "Não. Sonhos não fornecem previsão do tempo nem de acontecimentos pessoais."], ["O que significa sobreviver ao furacão?", "A sobrevivência pode destacar resistência, alívio ou o desejo de atravessar uma fase difícil."], ["Furacão e tornado são iguais no sonho?", "Ambos envolvem vento e perigo, mas o furacão costuma cobrir uma área maior por mais tempo. Preserve a cena que você viu."]],
  ),
  de: article(
    "Hurrikan im Traum: Schutz, Umbruch und was Bestand hat",
    "Was bedeutet ein Traum von einem Hurrikan? Deutungen zu herannahendem Wind, Zuflucht, Haus und Stille danach aus mehreren Perspektiven.",
    [
      "Ein Hurrikan verändert eine ganze Gegend. Im Traum kann dieses Ausmaß das Gefühl abbilden, dass Zuhause, Arbeit und Beziehungen zugleich unter Druck stehen. Doch der Sturm allein erzählt noch nicht alles. Hattest du eine Warnung? Konntest du Schutz finden? Wen wolltest du in Sicherheit bringen?",
      "Ein schmaler Windtrichter passt eher zum [Tornado](/dreams/tornado), eine überwältigende Welle zum [Tsunami](/dreams/tsunami). Der allgemeinere Artikel über den [Sturm](/dreams/storm) behandelt Gewitter und Konflikte. Beim Hurrikan fallen vor allem die große Fläche und die Dauer ins Gewicht. Das kann für eine Belastung stehen, die nicht auf einen einzigen Lebensbereich begrenzt ist.",
      "Ein Sturm am Horizont kann das Warten auf eine schwierige Nachricht oder Entscheidung ausdrücken. Ein festes Haus lenkt den Blick auf vorhandenen Rückhalt. Ein beschädigtes Dach kann die Sorge um Sicherheit und Verlässlichkeit sichtbar machen. Keine dieser Szenen sagt ein Unglück oder tatsächliches Wetter voraus.",
      "Psychologisch gibt der Hurrikan einem schwer greifbaren Stress eine sichtbare Form. Im Traum packst du vielleicht das Nötigste, suchst Angehörige oder merkst, dass kein Plan vollkommen ist. Nach einer wirklichen Sturmerfahrung oder aktuellen Katastrophenbildern können auch Erinnerungen die Szene speisen. Achte darauf, ob Angst, Verantwortung oder Erleichterung am stärksten war.",
      "Spirituell kann die Suche nach einem sicheren Ort fragen, was dich trägt, wenn du äußere Umstände nicht beherrschst. Das können Menschen, Gebet, Ruhe oder konkrete Vorbereitung sein. Das Überstehen des Sturms lässt Hoffnung zu, verspricht aber keinen schnellen Ausgang einer realen Krise.",
      "Aus islamischer Sicht liefert ein beängstigender Traum kein sicheres Wissen über kommendes Unheil und kein Urteil über die eigene Familie. Wind erscheint in religiösen Texten in verschiedenen Zusammenhängen; eine feste Deutung dieses Traums folgt daraus nicht. Wer erschrocken ist, kann bei Allah Zuflucht suchen. Sicherheitsentscheidungen brauchen reale Informationen.",
      "Für eine biblische Betrachtung können die Stillung des Sturms (Markus 4,35–41) und das Haus auf Fels (Matthäus 7,24–27) Fragen nach Angst, Vertrauen und tragfähigem Grund öffnen. Sie machen den geträumten Hurrikan nicht automatisch zu einer göttlichen Warnung. Welche Hilfe oder welcher Halt wäre jetzt sinnvoll?",
      "Halte in Dreamly fest, wie weit der Sturm entfernt war, wie sicher dein Zufluchtsort wirkte, wer dabei war und was danach geschah. Ging dem Traum eine reale Unwetterwarnung voraus, orientiere dich an den tatsächlichen Hinweisen. Später zeigen deine Notizen vielleicht, ob der Druck nachgelassen hat.",
    ],
    [["Der Hurrikan rückt näher", "Warten und Vorbereiten können wichtiger sein als Schäden, die gar nicht eintreten."], ["Schutz mit der Familie suchen", "Fürsorge und geteilte Verantwortung stehen im Vordergrund."], ["Das Haus bleibt stehen", "Der Traum kann zeigen, worauf du dich stützen konntest."], ["Nach dem Sturm hinausgehen", "Die Szene kann Erleichterung, Trauer oder einen Neuanfang betonen."]],
    [["Sagt ein Hurrikantraum eine Katastrophe voraus?", "Nein. Träume liefern keine Wetterprognosen und bestimmen keine persönlichen Ereignisse."], ["Was bedeutet es, den Hurrikan zu überleben?", "Das kann Widerstandskraft, Erleichterung oder die Sehnsucht nach Zuversicht ausdrücken."], ["Sind Hurrikan und Tornado im Traum dasselbe?", "Beide können Kontrollverlust zeigen; ein Hurrikan erfasst meist ein größeres Gebiet über längere Zeit. Entscheidend ist dein tatsächliches Traumbild."]],
  ),
  ru: article(
    "К чему снится ураган: укрытие, перемены и жизнь после бури",
    "Приснился ураган? Разбираем приближение ветра, дом, поиски укрытия и затишье после него с психологической, духовной, исламской и библейской точек зрения.",
    [
      "Ураган затрагивает не одну точку, а целый город или побережье. Во сне такой масштаб может передавать ощущение, что проблемы навалились сразу с нескольких сторон: дома, на работе, в отношениях. Но важен не только размах стихии. Вы узнали о ней заранее? Успели укрыться? Кого пытались защитить?",
      "Если вы видели узкую воронку, сравните сон со статьёй о [смерче](/dreams/tornado). Если главным был вал воды, ближе [цунами](/dreams/tsunami). О грозе и конфликте шире рассказывает [буря](/dreams/storm). Ураган отличается длительностью и охватом: тревога во сне может касаться сразу многих областей жизни.",
      "Ураган на горизонте нередко похож на ожидание трудного разговора, переезда или решения, которое уже нельзя отложить. Крепкий дом во сне обращает внимание на имеющуюся поддержку. Сорванная крыша может выразить страх лишиться привычной защиты. Сам по себе сон не предсказывает бедствие.",
      "С психологической стороны стихия придаёт расплывчатому напряжению видимые очертания. Во сне человек собирает вещи, ищет близких, закрывает окна или понимает, что подготовиться ко всему невозможно. Если вы пережили настоящий ураган либо недавно видели кадры разрушений, память может объяснять сюжет напрямую. Вспомните, что преобладало: паника, ответственность, горе или облегчение.",
      "В духовном прочтении укрытие становится вопросом о внутренней и внешней опоре. Для одного это молитва, для другого — близкие люди, отдых или разумный план. Уцелеть во сне может быть образом надежды, но не обещанием, что реальные трудности исчезнут быстро. Полезнее спросить, о чём можно позаботиться сегодня.",
      "В исламском понимании пугающий сон не даёт достоверного знания о будущей беде и не означает наказания для семьи. Образы ветра встречаются в разных религиозных контекстах, поэтому единого приговора по одному сну нет. Если вы встревожены, можно искать защиты у Аллаха и обратиться за советом к надёжному человеку. Практические решения принимайте по реальным обстоятельствам.",
      "Для библейского размышления подойдут история об усмирении бури (Марк 4:35–41) и притча о доме на камне (Матфей 7:24–27). Они помогают говорить о страхе, доверии и прочной основе, но не превращают приснившийся ураган в пророчество. Подумайте, какую поддержку стоит укрепить и кому сейчас нужна ваша помощь.",
      "Запишите в Dreamly, далеко ли был ураган, выдержало ли укрытие, кто находился рядом и что вы увидели после затишья. Если сон последовал за настоящим предупреждением о непогоде, опирайтесь на реальные сообщения служб. Вернувшись к записи позже, вы заметите, усилилось ли напряжение или начало спадать.",
    ],
    [["Ураган приближается", "Ожидание и подготовка могут быть важнее разрушений, которых во сне ещё не было."], ["Укрыться вместе с семьёй", "На первый план выходят забота, общая безопасность и распределение ответственности."], ["Дом устоял", "Обратите внимание на то, что выдержало натиск и помогло вам."], ["Выйти после бури", "Сцена может передавать облегчение, печаль или готовность восстанавливать привычную жизнь."]],
    [["Сон об урагане предвещает беду?", "Нет. Сновидение не прогнозирует погоду и не определяет будущие события."], ["Что значит пережить ураган во сне?", "Такой финал может выделять стойкость, облегчение или желание убедиться, что вы справитесь с переменами."], ["Ураган и смерч во сне — одно и то же?", "Оба связаны с сильным ветром, но ураган обычно охватывает большую территорию и длится дольше. Сохраняйте детали именно своего сна."]],
  ),
};
