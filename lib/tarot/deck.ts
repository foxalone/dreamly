import type { Locale } from "@/lib/i18n/config";

export const MAJOR_ARCANA = [
  { id: "fool", numeral: "0" },
  { id: "magician", numeral: "I" },
  { id: "priestess", numeral: "II" },
  { id: "empress", numeral: "III" },
  { id: "emperor", numeral: "IV" },
  { id: "hierophant", numeral: "V" },
  { id: "lovers", numeral: "VI" },
  { id: "chariot", numeral: "VII" },
  { id: "strength", numeral: "VIII" },
  { id: "hermit", numeral: "IX" },
  { id: "wheel", numeral: "X" },
  { id: "justice", numeral: "XI" },
  { id: "hanged", numeral: "XII" },
  { id: "death", numeral: "XIII" },
  { id: "temperance", numeral: "XIV" },
  { id: "devil", numeral: "XV" },
  { id: "tower", numeral: "XVI" },
  { id: "star", numeral: "XVII" },
  { id: "moon", numeral: "XVIII" },
  { id: "sun", numeral: "XIX" },
  { id: "judgement", numeral: "XX" },
  { id: "world", numeral: "XXI" },
] as const;

export type MajorArcana = (typeof MAJOR_ARCANA)[number];
export type MajorArcanaId = MajorArcana["id"];

type DeckCopy = { tab: string; title: string; intro: string; preview: string; close: string; cards: Record<MajorArcanaId, string> };

export const tarotCopy: Record<Locale, DeckCopy> = {
  en: { tab: "Tarot cards", title: "Tarot card preview", intro: "Explore all 22 illustrated Major Arcana cards. Select a card to see it larger.", preview: "Preview only · the daily draw is not live yet", close: "Close preview", cards: {
    fool: "The Fool", magician: "The Magician", priestess: "The High Priestess", empress: "The Empress", emperor: "The Emperor", hierophant: "The Hierophant", lovers: "The Lovers", chariot: "The Chariot", strength: "Strength", hermit: "The Hermit", wheel: "Wheel of Fortune", justice: "Justice", hanged: "The Hanged Man", death: "Death", temperance: "Temperance", devil: "The Devil", tower: "The Tower", star: "The Star", moon: "The Moon", sun: "The Sun", judgement: "Judgement", world: "The World",
  } },
  es: { tab: "Cartas del tarot", title: "Vista previa de las cartas", intro: "Explora las 22 cartas ilustradas de los Arcanos Mayores. Selecciona una para verla más grande.", preview: "Solo vista previa · la carta del día aún no está disponible", close: "Cerrar vista previa", cards: {
    fool: "El Loco", magician: "El Mago", priestess: "La Sacerdotisa", empress: "La Emperatriz", emperor: "El Emperador", hierophant: "El Hierofante", lovers: "Los Enamorados", chariot: "El Carro", strength: "La Fuerza", hermit: "El Ermitaño", wheel: "La Rueda de la Fortuna", justice: "La Justicia", hanged: "El Colgado", death: "La Muerte", temperance: "La Templanza", devil: "El Diablo", tower: "La Torre", star: "La Estrella", moon: "La Luna", sun: "El Sol", judgement: "El Juicio", world: "El Mundo",
  } },
  ar: { tab: "بطاقات التاروت", title: "معاينة بطاقات التاروت", intro: "استكشف البطاقات المصوّرة الاثنتين والعشرين من الأركانا الكبرى. اختر بطاقة لعرضها بحجم أكبر.", preview: "معاينة فقط · بطاقة اليوم غير متاحة بعد", close: "إغلاق المعاينة", cards: {
    fool: "الأحمق", magician: "الساحر", priestess: "الكاهنة العليا", empress: "الإمبراطورة", emperor: "الإمبراطور", hierophant: "الكاهن الأعظم", lovers: "العشاق", chariot: "العربة", strength: "القوة", hermit: "الناسك", wheel: "عجلة الحظ", justice: "العدالة", hanged: "المشنوق", death: "الموت", temperance: "الاعتدال", devil: "الشيطان", tower: "البرج", star: "النجمة", moon: "القمر", sun: "الشمس", judgement: "الحُكم", world: "العالم",
  } },
  pt: { tab: "Cartas de tarô", title: "Prévia das cartas de tarô", intro: "Explore as 22 cartas ilustradas dos Arcanos Maiores. Selecione uma carta para vê-la maior.", preview: "Apenas prévia · a carta do dia ainda não está disponível", close: "Fechar prévia", cards: {
    fool: "O Louco", magician: "O Mago", priestess: "A Sacerdotisa", empress: "A Imperatriz", emperor: "O Imperador", hierophant: "O Hierofante", lovers: "Os Enamorados", chariot: "O Carro", strength: "A Força", hermit: "O Eremita", wheel: "A Roda da Fortuna", justice: "A Justiça", hanged: "O Enforcado", death: "A Morte", temperance: "A Temperança", devil: "O Diabo", tower: "A Torre", star: "A Estrela", moon: "A Lua", sun: "O Sol", judgement: "O Julgamento", world: "O Mundo",
  } },
  de: { tab: "Tarotkarten", title: "Vorschau der Tarotkarten", intro: "Entdecke alle 22 illustrierten Karten der Großen Arkana. Wähle eine Karte aus, um sie größer zu sehen.", preview: "Nur Vorschau · die Tageskarte ist noch nicht verfügbar", close: "Vorschau schließen", cards: {
    fool: "Der Narr", magician: "Der Magier", priestess: "Die Hohepriesterin", empress: "Die Herrscherin", emperor: "Der Herrscher", hierophant: "Der Hierophant", lovers: "Die Liebenden", chariot: "Der Wagen", strength: "Die Kraft", hermit: "Der Eremit", wheel: "Das Rad des Schicksals", justice: "Die Gerechtigkeit", hanged: "Der Gehängte", death: "Der Tod", temperance: "Die Mäßigkeit", devil: "Der Teufel", tower: "Der Turm", star: "Der Stern", moon: "Der Mond", sun: "Die Sonne", judgement: "Das Gericht", world: "Die Welt",
  } },
  ru: { tab: "Карты Таро", title: "Предпросмотр карт Таро", intro: "Посмотрите все 22 иллюстрированные карты Старших Арканов. Выберите карту, чтобы рассмотреть её крупнее.", preview: "Только предпросмотр · карта дня пока недоступна", close: "Закрыть предпросмотр", cards: {
    fool: "Шут", magician: "Маг", priestess: "Верховная Жрица", empress: "Императрица", emperor: "Император", hierophant: "Иерофант", lovers: "Влюблённые", chariot: "Колесница", strength: "Сила", hermit: "Отшельник", wheel: "Колесо Фортуны", justice: "Справедливость", hanged: "Повешенный", death: "Смерть", temperance: "Умеренность", devil: "Дьявол", tower: "Башня", star: "Звезда", moon: "Луна", sun: "Солнце", judgement: "Суд", world: "Мир",
  } },
};
