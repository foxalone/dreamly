import type { Locale } from "@/lib/i18n/config";
import type { MajorArcanaId } from "./deck";
import { tarotReadings } from "./readings";

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

/** Stable daily copy if the text provider or storage is unavailable. */
export function fallbackDailyTarotReading(day: string, cardId: MajorArcanaId, locale: Locale): DailyTarotReading {
  const [overview, relationships, work, resources, innerLife] = tarotReadings[locale][cardId];
  const [focus, reflection] = focusForDay(day, locale);
  return { overview: `${overview} ${focus}`, relationships, work, resources, innerLife, reflection };
}
