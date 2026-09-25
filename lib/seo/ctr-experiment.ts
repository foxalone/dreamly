import type { Locale } from "@/lib/i18n/config";

/**
 * CTR experiment (2026-09): Google-facing `<title>` and `meta description` only.
 * See docs/seo/ctr-experiment-2026-09.md for the page list, baseline and rationale.
 *
 * Deliberately separate from META_OVERRIDES / entry-overrides `seoTitle`:
 * those feed OpenGraph, Twitter, the Article JSON-LD `description` and the
 * IndexNow fingerprint, and META_OVERRIDES is rewritten by polishSeoTitle /
 * polishSeoDescription. This map is read only by `dreamSymbolMetadata` for
 * the `title` / `description` fields. Remove an entry (or the whole map) to
 * restore the generated metadata for that page.
 */
export type CtrExperimentMeta = { title: string; description: string };

export const CTR_EXPERIMENT_META: Partial<Record<Locale, Record<string, CtrExperimentMeta>>> = {
  en: {
    work: {
      title: "Dreaming About Work Every Night? Spiritual Meaning",
      description:
        "Why work keeps coming back in your dreams: what it can say about pressure, duty and unfinished tasks, and how the spiritual reading of work dreams differs.",
    },
    "elephant-chasing-you": {
      title: "Elephant Chasing You in a Dream: Spiritual Meaning",
      description:
        "Being chased by an elephant in a dream can point to a major issue you keep avoiding that demands attention. What it means, plus the spiritual and biblical view.",
    },
    "luxury-hotel": {
      title: "Dream Meaning of a Hotel: Staying in a Luxury Hotel",
      description:
        "Dreamed you were staying in a hotel, especially a luxurious one? What hotel dreams can say about aspiration, reward, self-worth and a wish for recognition.",
    },
    flying: {
      title: "Flying in a Dream: Biblical, Islamic & Spiritual Meaning",
      description:
        "Flying in a dream can reflect freedom, ambition or a wish to escape. See how psychology, the Bible and Islamic dream interpretation read flying dreams.",
    },
    "falling-off-building": {
      title: "Falling Off a Building in a Dream: What It Means",
      description:
        "What it can mean to fall from a building in a dream: instability in work, reputation or plans, loss of control, and how the fear you felt shapes the reading.",
    },
    tunnel: {
      title: "Dreaming of a Tunnel: Biblical Meaning and Interpretation",
      description:
        "A tunnel in a dream is a passage from one place to another. What it can mean, whether you walk or ride through it, and how the biblical view reads tunnels.",
    },
    "white-elephant": {
      title: "White Elephant in a Dream: Meaning and Symbolism",
      description:
        "A white elephant in a dream is often read as a rare blessing, or a gift that is costly to keep. What seeing one may mean and which details change the reading.",
    },
    "being-ignored": {
      title: "Being Ignored in a Dream: Spiritual Meaning",
      description:
        "Dreamed that people looked straight through you, or someone you love ignored you? What this dream can reflect about feeling unseen, and its spiritual meaning.",
    },
    "goat-attack": {
      title: "Dream About a Goat Attacking You? What It Means",
      description:
        "A goat charging or butting you in a dream can point to stubborn conflict, a clash of wills or a demand you dismissed. What it may mean and what changes it.",
    },
    "friendly-lion": {
      title: "Friendly Lion in a Dream: Meaning of a Calm Lion",
      description:
        "A calm, friendly lion in a dream is often read as confidence, earned respect or a powerful ally on your side. What it may mean and what changes the reading.",
    },
  },
  es: {
    heights: {
      title: "Soñar con alturas: significado y por qué da miedo",
      description:
        "Soñar que estás en un lugar alto puede hablar de ambición, presión o miedo a perder el control. Qué significa según lo que sentías y lo que pasaba en el sueño.",
    },
    deer: {
      title: "¿Qué significa soñar con un venado?",
      description:
        "El venado o ciervo en sueños se asocia con la ternura, la alerta y una belleza tímida. Qué significa soñar con venados según lo que hacían en tu sueño.",
    },
    "tsunami-and-family": {
      title: "Soñar con un tsunami y tu familia: significado",
      description:
        "Un tsunami que amenaza a tu familia en un sueño suele reflejar el afán de protegerlos cuando todo desborda, o una crisis compartida en tus vínculos cercanos.",
    },
    debt: {
      title: "Soñar con deudas de dinero: qué quiere decir",
      description:
        "Soñar que debes dinero o que te cobran una deuda puede reflejar obligaciones pendientes, culpa o presión. Qué significa según los detalles del sueño.",
    },
    "earthquake-at-home": {
      title: "Soñar con un terremoto en casa: qué significa",
      description:
        "Un terremoto en tu casa en un sueño apunta a sacudidas en lo más cercano: familia, hogar, seguridad. Qué puede significar y qué detalles cambian la lectura.",
    },
    "arguing-with-mother": {
      title: "¿Qué significa soñar que discutes con tu mamá?",
      description:
        "Pelear con tu mamá en un sueño no anuncia necesariamente una pelea real. Suele hablar de autonomía, patrones familiares viejos o valores heredados. Cómo leerlo.",
    },
    "escaping-prison": {
      title: "Soñar que estás preso y te escapas: significado",
      description:
        "Estar preso en un sueño y escapar suele hablar de deseo de libertad, de romper una limitación o de recuperar el control. Qué significa escapar de la cárcel.",
    },
  },
  de: {
    miscarriage: {
      title: "Traumdeutung Fehlgeburt: Was der Traum bedeuten kann",
      description:
        "Ein Traum von einer Fehlgeburt ist belastend. So liest die Traumdeutung ihn: als Bild für Trauer, Angst vor verlorenem Potenzial oder unterbrochene Pläne.",
    },
    funeral: {
      title: "Traumdeutung Beerdigung: Was der Traum bedeutet",
      description:
        "Eine Beerdigung im Traum steht in der Traumdeutung meist für ein anerkanntes Ende und für Loslassen – nicht für einen echten Todesfall. Was der Traum verrät.",
    },
    goat: {
      title: "Traumdeutung Ziege: Was bedeutet eine Ziege im Traum?",
      description:
        "Die Ziege im Traum steht für störrischen Aufstieg, Appetit und einen Willen, der nicht um Erlaubnis fragt. Was sie bedeutet und was die Deutung verändert.",
    },
  },
  ru: {
    "wedding-and-death": {
      title: "Правда ли, что свадьба снится к смерти? Толкование",
      description:
        "Народная примета связывает свадьбу во сне со смертью. Как такой сон толкуют на самом деле: не как предсказание, а как конец прежней жизни и начало новой главы.",
    },
    "arguing-with-father": {
      title: "К чему снится ссора с отцом: толкование сна",
      description:
        "Ругаться с отцом во сне — не обязательно к реальному конфликту. Чаще такой сон говорит о споре с авторитетом, борьбе за одобрение и семейных ожиданиях.",
    },
    "stag-with-antlers": {
      title: "К чему снится олень с большими рогами",
      description:
        "Олень с рогами во сне связан с кроткой силой, достоинством и мощью, которая приходит и уходит. Что значит такой сон и какие детали меняют толкование.",
    },
    "dead-cat": {
      title: "К чему снится мёртвая кошка: толкование сна",
      description:
        "Мёртвая кошка во сне пугает, но обычно говорит об утраченной независимости, неуслышанной интуиции или конце оборонительной поры. Что значит такой сон.",
    },
    "losing-money": {
      title: "Потерять деньги во сне — к чему это снится",
      description:
        "Если во сне вы теряете деньги, речь обычно идёт о неуверенности, упущенном шансе, растраченных силах или тревоге о достатке. К чему это снится и что важно.",
    },
  },
  pt: {
    "big-fish": {
      title: "Sonhar com peixe grande: o que significa?",
      description:
        "Um peixe grande no sonho costuma ser ligado a uma oportunidade grande, uma ambição importante ou uma emoção grande demais para ignorar. Veja o que significa.",
    },
    "colorful-fish": {
      title: "Peixe colorido no sonho: significado e simbolismo",
      description:
        "Peixes coloridos no sonho estão ligados a emoção viva, potencial criativo e uma oportunidade que se destaca. Veja o que significa sonhar com peixe colorido.",
    },
  },
};

export function getCtrExperimentMeta(slug: string, locale: Locale): CtrExperimentMeta | undefined {
  return CTR_EXPERIMENT_META[locale]?.[slug];
}
