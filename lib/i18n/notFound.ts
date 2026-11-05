import type { Locale } from "./config";

type NotFoundCopy = {
  eyebrow: string;
  title: string;
  description: string;
  next: string;
  home: string;
  homeDetail: string;
  feed: string;
  feedDetail: string;
  horoscope: string;
  horoscopeDetail: string;
};

export const notFoundCopy: Record<Locale, NotFoundCopy> = {
  en: {
    eyebrow: "404 · Lost in the cosmos", title: "This page escaped to the Moon.",
    description: "We couldn't find it at this address. Choose a path and we'll bring you back among the stars.",
    next: "Choose your next stop",
    home: "Dreamly home", homeDetail: "Start again from the beginning",
    feed: "Dream feed", feedDetail: "See what others are dreaming",
    horoscope: "Horoscope", horoscopeDetail: "Explore your stars today",
  },
  es: {
    eyebrow: "404 · Perdida en el cosmos", title: "Esta página se escapó a la Luna.",
    description: "No la encontramos en esta dirección. Elige un camino para volver a las estrellas.",
    next: "Elige tu próxima parada",
    home: "Inicio de Dreamly", homeDetail: "Vuelve a empezar",
    feed: "Feed de sueños", feedDetail: "Descubre los sueños de otros",
    horoscope: "Horóscopo", horoscopeDetail: "Explora tus estrellas de hoy",
  },
  ar: {
    eyebrow: "404 · تائهة بين النجوم", title: "هربت هذه الصفحة إلى القمر.",
    description: "لم نجدها في هذا العنوان. اختر طريقًا يعيدك إلى عالم الأحلام.",
    next: "اختر وجهتك التالية",
    home: "الصفحة الرئيسية", homeDetail: "ابدأ رحلتك من جديد",
    feed: "منشورات الأحلام", feedDetail: "اكتشف ما يحلم به الآخرون",
    horoscope: "الأبراج", horoscopeDetail: "اكتشف توقعات برجك اليوم",
  },
  pt: {
    eyebrow: "404 · Perdida no cosmos", title: "Esta página fugiu para a Lua.",
    description: "Não a encontramos neste endereço. Escolha um caminho para voltar às estrelas.",
    next: "Escolha sua próxima parada",
    home: "Início do Dreamly", homeDetail: "Recomece sua jornada",
    feed: "Feed de sonhos", feedDetail: "Veja os sonhos de outras pessoas",
    horoscope: "Horóscopo", horoscopeDetail: "Explore seus astros hoje",
  },
  de: {
    eyebrow: "404 · Im All verloren", title: "Diese Seite ist zum Mond geflogen.",
    description: "Unter dieser Adresse finden wir sie nicht. Wähle einen Weg zurück zu den Sternen.",
    next: "Wähle dein nächstes Ziel",
    home: "Dreamly-Startseite", homeDetail: "Beginne deine Reise von vorn",
    feed: "Traum-Feed", feedDetail: "Entdecke die Träume anderer",
    horoscope: "Horoskop", horoscopeDetail: "Entdecke heute deine Sterne",
  },
  ru: {
    eyebrow: "404 · Затерялась среди звёзд", title: "Эта страница улетела на Луну.",
    description: "По этому адресу её не найти. Выберите путь обратно в мир снов.",
    next: "Выберите, куда отправиться",
    home: "Главная Dreamly", homeDetail: "Начните путешествие заново",
    feed: "Лента снов", feedDetail: "Узнайте, что снится другим",
    horoscope: "Гороскоп", horoscopeDetail: "Узнайте, что говорят звёзды сегодня",
  },
};
