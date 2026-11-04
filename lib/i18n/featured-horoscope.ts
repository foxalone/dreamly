import type { Locale } from "@/lib/i18n/config";

type Copy = {
  feedTag: string; feedMore: string; title: string; preview: string;
  relationships: string; work: string; wellbeing: string; takeaway: string;
  locked: string; translateLocked: string; watchAd: string; subscribe: string;
  translate: string; showEnglish: string; loading: string; error: string;
  personalEyebrow: string; personalTitle: string; personalDescription: string; personalAction: string;
  discoverDreams: string; openDream: string;
};

export const featuredCopy: Record<Locale, Copy> = {
  en: {
    feedTag: "Today's zodiac spotlight", feedMore: "more", title: "Daily zodiac spotlight", preview: "Today's preview",
    relationships: "Connections", work: "Work & direction", wellbeing: "Your rhythm", takeaway: "Take this with you",
    locked: "You've used this week's free forecast. Watch a short ad or subscribe to read this one.",
    translateLocked: "Translation is available with a short ad or a subscription.", watchAd: "Watch an ad", subscribe: "View subscription", translate: "Translate to {language}",
    showEnglish: "Show English", loading: "Opening today's forecast…", error: "We couldn't open the forecast. Please try again.",
    personalEyebrow: "Your own stars", personalTitle: "Explore your daily horoscope", personalDescription: "Choose your zodiac sign to see today's reading for you.", personalAction: "Get my forecast",
    discoverDreams: "Dreams to explore", openDream: "Open dream",
  },
  es: {
    feedTag: "El signo destacado de hoy", feedMore: "más", title: "El signo del día", preview: "Avance de hoy",
    relationships: "Vínculos", work: "Trabajo y rumbo", wellbeing: "Tu ritmo", takeaway: "Para llevar contigo",
    locked: "Ya usaste la lectura gratis de esta semana. Mira un anuncio breve o suscríbete para leer esta.",
    translateLocked: "Puedes traducirla con un anuncio breve o una suscripción.", watchAd: "Ver un anuncio", subscribe: "Ver suscripción", translate: "Traducir a {language}",
    showEnglish: "Ver en inglés", loading: "Abriendo la lectura de hoy…", error: "No pudimos abrir la lectura. Inténtalo de nuevo.",
    personalEyebrow: "Tus astros", personalTitle: "Explora tu horóscopo diario", personalDescription: "Elige tu signo zodiacal para leer tu pronóstico de hoy.", personalAction: "Ver mi pronóstico",
    discoverDreams: "Sueños por descubrir", openDream: "Abrir sueño",
  },
  ar: {
    feedTag: "برج اليوم المختار", feedMore: "المزيد", title: "برج اليوم المختار", preview: "لمحة اليوم",
    relationships: "العلاقات", work: "العمل والاتجاه", wellbeing: "إيقاعك", takeaway: "فكرة تحملها معك",
    locked: "استخدمت قراءتك المجانية لهذا الأسبوع. شاهد إعلانًا قصيرًا أو اشترك لقراءة هذه التوقعات.",
    translateLocked: "تتوفر الترجمة بعد إعلان قصير أو عبر الاشتراك.", watchAd: "شاهد إعلانًا", subscribe: "عرض الاشتراك", translate: "ترجمة إلى {language}",
    showEnglish: "عرض الإنجليزية", loading: "جارٍ فتح توقعات اليوم…", error: "تعذّر فتح التوقعات. حاول مجددًا.",
    personalEyebrow: "نجومك أنت", personalTitle: "اكتشف توقعات برجك اليومية", personalDescription: "اختر برجك لقراءة توقعاتك لهذا اليوم.", personalAction: "عرض توقعاتي",
    discoverDreams: "أحلام تستحق الاستكشاف", openDream: "افتح الحلم",
  },
  pt: {
    feedTag: "Signo em destaque hoje", feedMore: "mais", title: "Signo do dia", preview: "Prévia de hoje",
    relationships: "Relações", work: "Trabalho e direção", wellbeing: "Seu ritmo", takeaway: "Leve com você",
    locked: "Você já usou a leitura grátis desta semana. Assista a um anúncio curto ou assine para ler esta.",
    translateLocked: "A tradução está disponível com um anúncio curto ou uma assinatura.", watchAd: "Assistir a anúncio", subscribe: "Ver assinatura", translate: "Traduzir para {language}",
    showEnglish: "Ver em inglês", loading: "Abrindo a leitura de hoje…", error: "Não foi possível abrir a leitura. Tente novamente.",
    personalEyebrow: "Seus astros", personalTitle: "Explore seu horóscopo diário", personalDescription: "Escolha seu signo para ler a previsão de hoje para você.", personalAction: "Ver minha previsão",
    discoverDreams: "Sonhos para explorar", openDream: "Abrir sonho",
  },
  de: {
    feedTag: "Sternzeichen des Tages", feedMore: "mehr", title: "Sternzeichen des Tages", preview: "Vorschau für heute",
    relationships: "Beziehungen", work: "Arbeit und Richtung", wellbeing: "Dein Rhythmus", takeaway: "Ein Gedanke für dich",
    locked: "Du hast deine kostenlose Deutung für diese Woche schon genutzt. Sieh dir eine kurze Anzeige an oder schließe ein Abo ab.",
    translateLocked: "Die Übersetzung gibt es nach einer kurzen Anzeige oder mit Abo.", watchAd: "Anzeige ansehen", subscribe: "Abo ansehen", translate: "Übersetzen auf {language}",
    showEnglish: "Englisch anzeigen", loading: "Die heutige Deutung wird geöffnet…", error: "Die Deutung konnte nicht geöffnet werden. Bitte versuche es erneut.",
    personalEyebrow: "Deine Sterne", personalTitle: "Entdecke dein Tageshoroskop", personalDescription: "Wähle dein Sternzeichen und lies deine heutige Deutung.", personalAction: "Meine Deutung ansehen",
    discoverDreams: "Träume zum Entdecken", openDream: "Traum öffnen",
  },
  ru: {
    feedTag: "Знак дня", feedMore: "далее", title: "Знак дня", preview: "Анонс на сегодня",
    relationships: "Отношения", work: "Работа и планы", wellbeing: "Ваш ритм", takeaway: "Мысль на сегодня",
    locked: "Бесплатный прогноз на эту неделю уже использован. Посмотрите короткую рекламу или оформите подписку.",
    translateLocked: "Перевод доступен после короткой рекламы или по подписке.", watchAd: "Посмотреть рекламу", subscribe: "Оформить подписку", translate: "Перевести на {language}",
    showEnglish: "Показать английский", loading: "Открываем прогноз на сегодня…", error: "Не удалось открыть прогноз. Попробуйте ещё раз.",
    personalEyebrow: "Ваши звёзды", personalTitle: "Узнайте свой гороскоп на сегодня", personalDescription: "Выберите свой знак зодиака и прочитайте прогноз на день.", personalAction: "Посмотреть мой прогноз",
    discoverDreams: "Сны, которые стоит прочитать", openDream: "Открыть сон",
  },
};
