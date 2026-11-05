import type { Locale } from "./config";

type ReadingCopy = {
  back: string;
  eyebrow: string;
  heading: string;
  subtitle: string;
  relationships: string;
  work: string;
  resources: string;
  innerLife: string;
  reflection: string;
  prompt: string;
  note: string;
  description: string;
};

export const tarotReadingCopy: Record<Locale, ReadingCopy> = {
  en: {
    back: "Go back", eyebrow: "Your card for today", heading: "A closer look at your card",
    subtitle: "One image, several ways to reflect on the day.", relationships: "Relationships", work: "Work & direction",
    resources: "Money & resources", innerLife: "Inner life", reflection: "A question to carry", prompt: "What is one small choice you can make with this perspective today?",
    note: "Tarot here is a tool for reflection, not a prediction or a substitute for professional advice.", description: "Explore today's tarot card through relationships, work, resources and inner life.",
  },
  es: {
    back: "Volver", eyebrow: "Tu carta de hoy", heading: "Una mirada más profunda a tu carta",
    subtitle: "Una imagen, varias formas de pensar en el día.", relationships: "Relaciones", work: "Trabajo y rumbo",
    resources: "Dinero y recursos", innerLife: "Mundo interior", reflection: "Una pregunta para llevar contigo", prompt: "¿Qué pequeña decisión puedes tomar hoy desde esta perspectiva?",
    note: "Aquí el tarot invita a reflexionar; no predice el futuro ni sustituye el consejo profesional.", description: "Explora la carta del tarot de hoy desde las relaciones, el trabajo, los recursos y tu mundo interior.",
  },
  ar: {
    back: "العودة", eyebrow: "بطاقتك لهذا اليوم", heading: "نظرة أعمق إلى بطاقتك",
    subtitle: "صورة واحدة، وطرق متعددة للتأمل في يومك.", relationships: "العلاقات", work: "العمل والاتجاه",
    resources: "المال والموارد", innerLife: "العالم الداخلي", reflection: "سؤال تأخذه معك", prompt: "ما الخيار الصغير الذي يمكنك اتخاذه اليوم على ضوء هذه الرؤية؟",
    note: "التاروت هنا وسيلة للتأمل، لا تنبؤ بالمستقبل ولا بديلًا عن المشورة المتخصصة.", description: "تأمل بطاقة التاروت اليومية من منظور العلاقات والعمل والموارد والعالم الداخلي.",
  },
  pt: {
    back: "Voltar", eyebrow: "Sua carta de hoje", heading: "Um olhar mais atento para sua carta",
    subtitle: "Uma imagem, várias formas de refletir sobre o dia.", relationships: "Relacionamentos", work: "Trabalho e direção",
    resources: "Dinheiro e recursos", innerLife: "Vida interior", reflection: "Uma pergunta para levar com você", prompt: "Que pequena escolha você pode fazer hoje a partir dessa perspectiva?",
    note: "Aqui o tarô é um convite à reflexão, não uma previsão nem substituto de orientação profissional.", description: "Explore a carta de tarô de hoje pelas relações, trabalho, recursos e vida interior.",
  },
  de: {
    back: "Zurück", eyebrow: "Deine Karte für heute", heading: "Ein genauerer Blick auf deine Karte",
    subtitle: "Ein Bild, mehrere Wege, über den Tag nachzudenken.", relationships: "Beziehungen", work: "Arbeit & Richtung",
    resources: "Geld & Mittel", innerLife: "Innenleben", reflection: "Eine Frage für den Tag", prompt: "Welche kleine Entscheidung kannst du heute aus dieser Perspektive treffen?",
    note: "Tarot dient hier der Reflexion, nicht als Vorhersage oder Ersatz für fachlichen Rat.", description: "Betrachte die heutige Tarotkarte im Hinblick auf Beziehungen, Arbeit, Mittel und Innenleben.",
  },
  ru: {
    back: "Назад", eyebrow: "Ваша карта на сегодня", heading: "Посмотрим на карту внимательнее",
    subtitle: "Один образ и несколько способов осмыслить день.", relationships: "Отношения", work: "Работа и направление",
    resources: "Деньги и ресурсы", innerLife: "Внутренний мир", reflection: "Вопрос на сегодня", prompt: "Какой небольшой выбор вы можете сделать сегодня, опираясь на эту мысль?",
    note: "Здесь Таро служит поводом для размышления, а не предсказанием или заменой профессионального совета.", description: "Осмыслите сегодняшнюю карту Таро через отношения, работу, ресурсы и внутренний мир.",
  },
};
