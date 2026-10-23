import type { Locale } from "./config";

type Copy = { eyebrow: string; title: string; description: string; earth: string; moon: string; pause: string; play: string };

export const homeUniverseMessages: Record<Locale, Copy> = {
  en: { eyebrow: "The Dreamly universe", title: "From Earth to the Moon", description: "Turn your dreams into creatures and bring Earth to life.", earth: "Explore Earth", moon: "Explore the Moon", pause: "Pause animation", play: "Play animation" },
  es: { eyebrow: "El universo Dreamly", title: "De la Tierra a la Luna", description: "Convierte tus sueños en criaturas y llena la Tierra de vida.", earth: "Explorar la Tierra", moon: "Explorar la Luna", pause: "Pausar animación", play: "Reproducir animación" },
  ar: { eyebrow: "عالم Dreamly", title: "من الأرض إلى القمر", description: "حوّل أحلامك إلى كائنات واملأ الأرض بالحياة.", earth: "استكشف الأرض", moon: "استكشف القمر", pause: "إيقاف الحركة مؤقتًا", play: "تشغيل الحركة" },
  pt: { eyebrow: "O universo Dreamly", title: "Da Terra à Lua", description: "Transforme seus sonhos em criaturas e encha a Terra de vida.", earth: "Explorar a Terra", moon: "Explorar a Lua", pause: "Pausar animação", play: "Reproduzir animação" },
  de: { eyebrow: "Das Dreamly-Universum", title: "Von der Erde zum Mond", description: "Verwandle deine Träume in Wesen und erwecke die Erde zum Leben.", earth: "Die Erde erkunden", moon: "Den Mond erkunden", pause: "Animation pausieren", play: "Animation abspielen" },
  ru: { eyebrow: "Вселенная Dreamly", title: "С Земли на Луну", description: "Превращайте сны в существ и заселяйте Землю.", earth: "Исследовать Землю", moon: "Исследовать Луну", pause: "Приостановить анимацию", play: "Продолжить анимацию" },
};
