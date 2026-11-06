import type { Locale } from "@/lib/i18n/config";
import { MAJOR_ARCANA, type MajorArcanaId } from "./deck";

export type DailyTarotReading = {
  overview: string;
  relationships: string;
  work: string;
  resources: string;
  innerLife: string;
  reflection: string;
};

type Focus = readonly [sentence: string, question: string];

const dailyFocus: Record<Locale, readonly Focus[]> = {
  en: [
    ["Today, notice a conversation that could use more honesty.", "What would you say if you spoke with both care and clarity?"],
    ["Today's focus is one small action that could make a larger plan feel possible.", "Which first step is within reach right now?"],
    ["Today, pay attention to the boundary between giving and overextending yourself.", "Where would a kind boundary create more room to breathe?"],
    ["Today's angle is patience: let a useful insight settle before acting on it.", "What might become clearer if you gave it a little time?"],
    ["Today, look at a familiar situation from someone else's point of view.", "What changes when you consider another perspective?"],
    ["Today's focus is the energy you spend on what matters most.", "What deserves your attention, and what can wait?"],
    ["Today, make space for a quiet change in direction.", "Which old assumption are you ready to revisit?"],
  ],
  es: [
    ["Hoy, presta atención a una conversación que necesita más sinceridad.", "¿Qué dirías si hablaras con cuidado y claridad?"],
    ["Hoy, concéntrate en una pequeña acción que acerque un plan mayor.", "¿Qué primer paso está a tu alcance ahora?"],
    ["Hoy, observa el límite entre dar y exigirte demasiado.", "¿Dónde te ayudaría un límite amable a respirar mejor?"],
    ["Hoy, deja que una idea útil madure antes de actuar.", "¿Qué podría aclararse si le dieras un poco de tiempo?"],
    ["Hoy, mira una situación conocida desde el punto de vista de otra persona.", "¿Qué cambia al considerar otra perspectiva?"],
    ["Hoy, fíjate en la energía que dedicas a lo que más importa.", "¿Qué merece tu atención y qué puede esperar?"],
    ["Hoy, deja espacio para un cambio tranquilo de rumbo.", "¿Qué antigua idea estás listo para revisar?"],
  ],
  ar: [
    ["اليوم، انتبه إلى حديث قد يحتاج إلى مزيد من الصراحة.", "ماذا ستقول لو تحدثت بعناية ووضوح؟"],
    ["ركز اليوم على خطوة صغيرة تقرّبك من خطة أكبر.", "ما الخطوة الأولى المتاحة لك الآن؟"],
    ["لاحظ اليوم الحد الفاصل بين العطاء واستنزاف نفسك.", "أين يمنحك وضع حد لطيف مساحة للتنفس؟"],
    ["دع اليوم فكرة مفيدة تستقر قبل أن تتصرف على أساسها.", "ما الذي قد يتضح لو منحت الأمر بعض الوقت؟"],
    ["انظر اليوم إلى موقف مألوف من وجهة نظر شخص آخر.", "ما الذي يتغير حين ترى منظورًا مختلفًا؟"],
    ["انتبه اليوم إلى الطاقة التي تمنحها لما يهمك حقًا.", "ما الذي يستحق انتباهك، وما الذي يمكنه الانتظار؟"],
    ["اترك اليوم مجالًا لتغيير هادئ في الاتجاه.", "ما الفكرة القديمة التي أنت مستعد لإعادة النظر فيها؟"],
  ],
  pt: [
    ["Hoje, observe uma conversa que pede mais sinceridade.", "O que você diria se falasse com cuidado e clareza?"],
    ["Hoje, foque em uma pequena ação que aproxime um plano maior.", "Qual primeiro passo está ao seu alcance agora?"],
    ["Hoje, perceba o limite entre oferecer ajuda e se sobrecarregar.", "Onde um limite gentil abriria mais espaço para respirar?"],
    ["Hoje, deixe uma ideia útil amadurecer antes de agir.", "O que pode ficar mais claro se você der um pouco de tempo?"],
    ["Hoje, veja uma situação conhecida pelo ponto de vista de outra pessoa.", "O que muda quando você considera outra perspectiva?"],
    ["Hoje, repare na energia que você dedica ao que mais importa.", "O que merece sua atenção e o que pode esperar?"],
    ["Hoje, abra espaço para uma mudança tranquila de rumo.", "Que ideia antiga você está pronto para rever?"],
  ],
  de: [
    ["Achte heute auf ein Gespräch, das mehr Ehrlichkeit vertragen könnte.", "Was würdest du mit Fürsorge und Klarheit sagen?"],
    ["Richte deinen Blick heute auf einen kleinen Schritt zu einem größeren Plan.", "Welcher erste Schritt ist jetzt möglich?"],
    ["Achte heute auf die Grenze zwischen Geben und Selbstüberforderung.", "Wo würde eine freundliche Grenze dir mehr Luft verschaffen?"],
    ["Lass heute eine hilfreiche Einsicht reifen, bevor du handelst.", "Was könnte klarer werden, wenn du dir etwas Zeit lässt?"],
    ["Betrachte heute eine vertraute Situation aus der Sicht eines anderen Menschen.", "Was ändert sich durch einen anderen Blickwinkel?"],
    ["Achte heute darauf, wofür du deine Energie einsetzt.", "Was verdient deine Aufmerksamkeit und was kann warten?"],
    ["Gib heute einer stillen Kursänderung Raum.", "Welche alte Annahme möchtest du neu betrachten?"],
  ],
  ru: [
    ["Сегодня обратите внимание на разговор, которому нужна большая честность.", "Что бы вы сказали с заботой и ясностью?"],
    ["Сегодня сосредоточьтесь на маленьком шаге к большому замыслу.", "Какой первый шаг вам по силам прямо сейчас?"],
    ["Сегодня присмотритесь к границе между помощью и истощением себя.", "Где мягкая граница даст вам больше свободы?"],
    ["Сегодня дайте полезной мысли созреть, прежде чем действовать.", "Что прояснится, если дать этому немного времени?"],
    ["Сегодня посмотрите на знакомую ситуацию глазами другого человека.", "Что меняется, когда вы учитываете другой взгляд?"],
    ["Сегодня обратите внимание, на что уходит ваша энергия.", "Что заслуживает внимания, а что может подождать?"],
    ["Сегодня оставьте место для тихой перемены курса.", "Какое прежнее убеждение вы готовы пересмотреть?"],
  ],
};

export function focusForDay(day: string, locale: Locale): Focus {
  const date = Date.parse(`${day}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isFinite(date) || new Date(date).toISOString().slice(0, 10) !== day) {
    throw new Error("Invalid tarot day");
  }
  const focuses = dailyFocus[locale];
  return focuses[Math.floor(date / 86_400_000) % focuses.length];
}

// These daily angles are written separately from the public card guide.
const dailyAngles: Record<Locale, readonly string[]> = {
  en: [
    "Begin with one modest step before asking for certainty.", "Put one skill you already have to work.", "Let a quiet impression sit before you explain it.", "Care for what is growing without hurrying it.", "Give a useful boundary a clear shape.", "Listen for wisdom, then decide what still fits.", "Choose with your values, not only with attraction.", "Give competing priorities one direction.", "Meet resistance with patience instead of force.", "Take enough space to hear your own judgment.", "Adapt one plan to the turn in front of you.", "Check the facts before you call a choice fair.", "Pause long enough to see another angle.", "Make room by letting one finished chapter close.", "Blend two workable approaches instead of rushing to extremes.", "Name a pattern before it makes the choice for you.", "Repair what is unstable before adding another layer.", "Protect a small source of hope with a practical act.", "Check an assumption before following a strong feeling.", "Let a clear success be seen and shared.", "Use an old lesson without letting it define you.", "Recognize what is complete before starting again.",
  ],
  es: [
    "Da un paso pequeño antes de exigir certezas.", "Pon en práctica una habilidad que ya tienes.", "Deja reposar una intuición antes de explicarla.", "Cuida lo que crece sin apresurarlo.", "Dale forma clara a un límite que te ayude.", "Escucha un consejo y decide qué sigue siendo útil.", "Elige desde tus valores, no solo desde el deseo.", "Dales una dirección a tus prioridades en conflicto.", "Responde a la resistencia con paciencia, no con fuerza.", "Busca un momento de silencio para escuchar tu criterio.", "Adapta un plan al cambio que tienes delante.", "Revisa los hechos antes de llamar justa a una decisión.", "Detente lo suficiente para ver otro ángulo.", "Abre espacio al cerrar una etapa que ya terminó.", "Combina dos caminos posibles sin irte a los extremos.", "Nombra un patrón antes de que decida por ti.", "Repara lo inestable antes de construir encima.", "Protege una pequeña esperanza con una acción concreta.", "Comprueba una suposición antes de seguir una emoción intensa.", "Deja que un logro claro se vea y se comparta.", "Aprende de una decisión pasada sin quedar atrapado en ella.", "Reconoce lo que completaste antes de empezar de nuevo.",
  ],
  ar: [
    "ابدأ بخطوة صغيرة قبل أن تطلب اليقين الكامل.", "استخدم اليوم مهارة تملكها بالفعل.", "دع إحساسًا هادئًا يستقر قبل أن تفسره.", "اعتنِ بما ينمو دون أن تستعجله.", "امنح حدًا مفيدًا شكلًا واضحًا.", "استمع إلى نصيحة ثم قرر ما يناسبك منها.", "اختر وفق قيمك لا وفق الانجذاب وحده.", "امنح أولوياتك المتعارضة اتجاهًا واحدًا.", "واجه المقاومة بالصبر بدل القوة.", "اترك لنفسك هدوءًا تسمع فيه حكمك الخاص.", "عدّل خطة واحدة وفق التغير الذي أمامك.", "راجع الوقائع قبل أن تصف قرارًا بأنه عادل.", "توقف قليلًا لترى زاوية أخرى.", "أفسح مجالًا بإغلاق فصل اكتمل.", "اجمع بين طريقتين نافعتين بدل الاندفاع إلى الطرفين.", "سمّ نمطًا يتكرر قبل أن يختار بدلًا منك.", "أصلح ما لا يستقر قبل أن تبني فوقه.", "احمِ بصيص أمل بفعل عملي صغير.", "تحقق من افتراض قبل أن تتبع شعورًا قويًا.", "اسمح لنجاح واضح بأن يُرى ويُشارك.", "استفد من درس قديم دون أن تدعه يحددك.", "اعترف بما اكتمل قبل أن تبدأ من جديد.",
  ],
  pt: [
    "Dê um pequeno passo antes de exigir certezas.", "Ponha em prática uma habilidade que você já tem.", "Deixe uma impressão silenciosa amadurecer antes de explicá-la.", "Cuide do que cresce sem apressar o processo.", "Dê forma clara a um limite que faz bem.", "Ouça um conselho e escolha o que ainda serve para você.", "Escolha de acordo com seus valores, não só com o desejo.", "Dê uma direção às prioridades que puxam para lados diferentes.", "Enfrente a resistência com paciência, não com força.", "Reserve silêncio suficiente para ouvir seu próprio critério.", "Adapte um plano à mudança que está diante de você.", "Confira os fatos antes de chamar uma escolha de justa.", "Pare tempo bastante para enxergar outro ângulo.", "Abra espaço encerrando uma etapa que já terminou.", "Combine dois caminhos possíveis sem correr para os extremos.", "Dê nome a um padrão antes que ele escolha por você.", "Repare o que está instável antes de construir em cima.", "Proteja uma pequena esperança com uma ação concreta.", "Confira uma suposição antes de seguir uma emoção intensa.", "Deixe uma conquista clara ser vista e compartilhada.", "Use uma lição antiga sem deixar que ela defina você.", "Reconheça o que foi concluído antes de recomeçar.",
  ],
  de: [
    "Beginne mit einem kleinen Schritt, bevor du Gewissheit verlangst.", "Setze heute eine Fähigkeit ein, die du bereits besitzt.", "Lass einen stillen Eindruck wirken, bevor du ihn erklärst.", "Pflege, was wächst, ohne es zu drängen.", "Gib einer hilfreichen Grenze eine klare Form.", "Höre einen Rat an und entscheide, was davon noch passt.", "Wähle nach deinen Werten, nicht nur nach Anziehung.", "Gib widersprüchlichen Prioritäten eine Richtung.", "Begegne Widerstand mit Geduld statt mit Druck.", "Nimm dir genug Ruhe, um dein eigenes Urteil zu hören.", "Passe einen Plan an die Veränderung vor dir an.", "Prüfe die Fakten, bevor du eine Entscheidung gerecht nennst.", "Halte lange genug inne, um einen anderen Blickwinkel zu sehen.", "Schaffe Raum, indem du ein abgeschlossenes Kapitel schließt.", "Verbinde zwei gangbare Wege, statt in Extreme zu eilen.", "Benenne ein Muster, bevor es für dich entscheidet.", "Stabilisiere, was wackelt, bevor du darauf aufbaust.", "Schütze einen kleinen Hoffnungsschimmer durch eine konkrete Tat.", "Prüfe eine Annahme, bevor du einem starken Gefühl folgst.", "Lass einen klaren Erfolg sichtbar werden und teile ihn.", "Nutze eine alte Lehre, ohne dich von ihr festlegen zu lassen.", "Würdige das Erreichte, bevor du erneut beginnst.",
  ],
  ru: [
    "Сделайте небольшой шаг, прежде чем требовать полной уверенности.", "Примените сегодня навык, который у вас уже есть.", "Дайте тихому впечатлению улечься, прежде чем объяснять его.", "Позаботьтесь о том, что растёт, не торопя его.", "Обозначьте полезную границу яснее.", "Выслушайте совет и решите, что из него вам подходит.", "Выбирайте в согласии со своими ценностями, а не только с желанием.", "Направьте противоречивые приоритеты к одной цели.", "Ответьте на сопротивление терпением, а не нажимом.", "Оставьте себе тишину, чтобы услышать собственное суждение.", "Подстройте один план под перемену, которая уже происходит.", "Проверьте факты, прежде чем называть решение справедливым.", "Остановитесь, чтобы увидеть ситуацию под другим углом.", "Освободите место, закрыв завершённую главу.", "Соедините два рабочих подхода, не бросаясь в крайности.", "Назовите повторяющийся шаблон, прежде чем он сделает выбор за вас.", "Укрепите непрочное, прежде чем строить дальше.", "Поддержите маленькую надежду конкретным действием.", "Проверьте предположение, прежде чем идти за сильным чувством.", "Позвольте явному успеху стать заметным и разделите его.", "Возьмите урок из прошлого, не позволяя ему определять вас.", "Признайте завершённое, прежде чем начинать снова.",
  ],
};

const dailyLenses: Record<Locale, Pick<DailyTarotReading, "relationships" | "work" | "resources" | "innerLife">> = {
  en: { relationships: "In a conversation today, make room to hear what matters to both sides.", work: "Choose one practical task that moves your day forward and give it a clear next step.", resources: "Before spending time or money, check whether the choice supports your longer direction.", innerLife: "Notice your first reaction to the card and what it asks you to pay attention to." },
  es: { relationships: "En una conversación de hoy, deja espacio para escuchar lo importante para ambas partes.", work: "Elige una tarea útil para avanzar y define su próximo paso con claridad.", resources: "Antes de gastar tiempo o dinero, comprueba si la decisión apoya tu rumbo a largo plazo.", innerLife: "Observa tu primera reacción ante la carta y aquello a lo que te invita a prestar atención." },
  ar: { relationships: "في حديث اليوم، اترك مساحة لسماع ما يهم الطرفين.", work: "اختر مهمة عملية تدفع يومك إلى الأمام وحدد خطوتها التالية.", resources: "قبل أن تنفق وقتًا أو مالًا، اسأل إن كان الخيار يخدم اتجاهك الأبعد.", innerLife: "لاحظ رد فعلك الأول تجاه البطاقة وما الذي يدعوك إلى الانتباه إليه." },
  pt: { relationships: "Em uma conversa de hoje, abra espaço para ouvir o que importa aos dois lados.", work: "Escolha uma tarefa prática que faça o dia avançar e defina o próximo passo.", resources: "Antes de gastar tempo ou dinheiro, veja se a escolha apoia sua direção de longo prazo.", innerLife: "Observe sua primeira reação à carta e o que ela convida você a notar." },
  de: { relationships: "Lass in einem Gespräch heute Raum für das, was beiden Seiten wichtig ist.", work: "Wähle eine praktische Aufgabe, die deinen Tag voranbringt, und bestimme den nächsten Schritt.", resources: "Prüfe vor dem Einsatz von Zeit oder Geld, ob die Wahl zu deiner längerfristigen Richtung passt.", innerLife: "Achte auf deine erste Reaktion auf die Karte und darauf, was sie in den Blick rückt." },
  ru: { relationships: "В сегодняшнем разговоре найдите место для того, что важно обеим сторонам.", work: "Выберите одно полезное дело и определите для него ясный следующий шаг.", resources: "Прежде чем тратить время или деньги, проверьте, поддерживает ли выбор ваш долгосрочный путь.", innerLife: "Заметьте свою первую реакцию на карту и то, к чему она привлекает внимание." },
};

/** Stable daily copy, kept distinct from the public card guide, if text generation is unavailable. */
export function fallbackDailyTarotReading(day: string, cardId: MajorArcanaId, locale: Locale): DailyTarotReading {
  const [focus, reflection] = focusForDay(day, locale);
  const index = MAJOR_ARCANA.findIndex(card => card.id === cardId);
  if (index < 0 || dailyAngles[locale].length !== MAJOR_ARCANA.length) throw new Error("Missing daily tarot angle");
  return { overview: `${dailyAngles[locale][index]} ${focus}`, ...dailyLenses[locale], reflection };
}
