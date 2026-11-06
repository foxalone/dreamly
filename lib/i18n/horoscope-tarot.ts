import type { Locale } from "./config";

type Copy = { eyebrow: string; title: string; intro: string; action: string; guideAction: string; star: string; moon: string; sun: string };

export const horoscopeTarotCopy: Record<Locale, Copy> = {
  en: { eyebrow: "Tarot · Dreamly", title: "A moment with the cards", intro: "Begin with a little reflection. The Star, the Moon and the Sun each offer a different way to meet the day. Then draw a card of your own.", action: "Draw today's card", guideAction: "Explore Tarot", star: "Hope", moon: "Wonder", sun: "Clarity" },
  es: { eyebrow: "Tarot · Dreamly", title: "Un momento con las cartas", intro: "Empieza con una pausa para reflexionar. La Estrella, la Luna y el Sol ofrecen distintas maneras de mirar el día. Después, descubre tu propia carta.", action: "Descubre la carta de hoy", guideAction: "Explora el tarot", star: "Esperanza", moon: "Asombro", sun: "Claridad" },
  ar: { eyebrow: "التاروت · Dreamly", title: "لحظة مع البطاقات", intro: "ابدأ بلحظة تأمل. تدعوك النجمة والقمر والشمس إلى النظر إلى يومك من زوايا مختلفة. ثم اكشف بطاقتك الخاصة.", action: "اكشف بطاقة اليوم", guideAction: "استكشف التاروت", star: "أمل", moon: "تساؤل", sun: "وضوح" },
  pt: { eyebrow: "Tarô · Dreamly", title: "Um momento com as cartas", intro: "Comece com uma pausa para refletir. A Estrela, a Lua e o Sol oferecem olhares diferentes para o dia. Depois, descubra a sua carta.", action: "Revele a carta de hoje", guideAction: "Explore o tarô", star: "Esperança", moon: "Encanto", sun: "Clareza" },
  de: { eyebrow: "Tarot · Dreamly", title: "Ein Moment mit den Karten", intro: "Nimm dir einen Augenblick zum Nachdenken. Der Stern, der Mond und die Sonne eröffnen drei Blicke auf deinen Tag. Zieh danach deine eigene Karte.", action: "Zieh deine Tageskarte", guideAction: "Tarot entdecken", star: "Hoffnung", moon: "Staunen", sun: "Klarheit" },
  ru: { eyebrow: "Таро · Dreamly", title: "Мгновение с картами", intro: "Начните день с короткой паузы. Звезда, Луна и Солнце предлагают три разных взгляда на происходящее. Затем откройте свою карту.", action: "Открыть карту дня", guideAction: "Исследовать Таро", star: "Надежда", moon: "Любопытство", sun: "Ясность" },
};
