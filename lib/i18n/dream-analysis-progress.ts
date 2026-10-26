import type { Locale } from "./config";

export const dreamAnalysisProgressMessages: Record<Locale, { title: string; body: string }> = {
  en: { title: "Analyzing your dream…", body: "Please wait while we prepare your interpretation." },
  es: { title: "Analizando tu sueño…", body: "Espera un momento mientras preparamos tu interpretación." },
  ar: { title: "جارٍ تحليل حلمك…", body: "يرجى الانتظار بينما نجهّز تفسير حلمك." },
  pt: { title: "Analisando seu sonho…", body: "Aguarde enquanto preparamos a interpretação do seu sonho." },
  de: { title: "Dein Traum wird gedeutet…", body: "Bitte warte einen Moment, während wir deine Traumdeutung vorbereiten." },
  ru: { title: "Анализируем ваш сон…", body: "Подождите немного — мы готовим толкование вашего сна." },
};
