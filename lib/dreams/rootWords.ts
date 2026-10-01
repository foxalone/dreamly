// lib/dreams/rootWords.ts
// The journal's root-word extraction (core symbols + English roots), shared by
// /api/dreams/rootwords and the server-side enrichment after a diary save.
import OpenAI from "openai";

export type RootWordsResult = {
  lang: "en" | "ru" | "he" | "unknown";
  core: string[];
  support: string[];
  themes: string[];
  roots: string[];
  rootsEn: string[];
};

function toStr(x: any) {
  return String(x ?? "").trim();
}

function cleanWord(x: any) {
  return toStr(x)
    .replace(/[^\p{L}\p{N}\s'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqKeepOrder(arr: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const w = cleanWord(x);
    if (!w) continue;
    const k = w.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(w);
  }
  return out;
}

function mapLangToRecLang(lang: string): "en" | "ru" | "he" | "unknown" {
  const l = toStr(lang).toLowerCase();
  if (l.startsWith("en")) return "en";
  if (l.startsWith("ru")) return "ru";
  if (l.startsWith("he") || l.startsWith("iw")) return "he";
  return "unknown";
}

/** Throws on model/parse failure. */
export async function extractRootWords(apiKey: string, text: string): Promise<RootWordsResult> {
    const client = new OpenAI({ apiKey });

    let resp: any;
    try {
      resp = await client.responses.create({
        model: "gpt-4.1-mini",
        input: [
          {
            role: "system",
            content: `
You are a symbolic dream analyzer.

Your task is NOT lemmatization.
Extract the CORE SYMBOLIC STRUCTURE of the dream.

OUTPUT (must match the provided JSON schema):

- lang: "en" | "ru" | "he" | "unknown"
- core: 4–6 most fundamental symbolic roots.
- support: 6–12 secondary supporting roots.
- themes: 3–5 short conceptual themes (1–3 words each).

CORE RULES:
1) Core symbols must be the elements without which the dream loses its identity.
2) Prefer symbolic anchors over decorative scenery.
3) Include emotional or transformation elements if present.
4) Be highly selective. Fewer, stronger symbols are better.
5) Cover the whole dream (beginning, middle, ending).

SUPPORT RULES:
- Include meaningful objects, actions, atmosphere elements.
- Avoid generic filler words.

REMOVE:
- stop-words
- numbers
- emojis
- proper names
- generic adjectives unless they function as symbols

LANGUAGE:
- Preserve original language.
- Return base lemma form.
- Do NOT translate.

Return only valid JSON.
`.trim(),
          },
          { role: "user", content: text },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "root_words",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                lang: { type: "string" },
                core: { type: "array", items: { type: "string" } },
                support: { type: "array", items: { type: "string" } },
                themes: { type: "array", items: { type: "string" } },
              },
              required: ["lang", "core", "support", "themes"],
            },
          },
        },
        temperature: 0.2,
      });
    } catch (e: any) {
      throw e instanceof Error ? e : new Error("Failed");
    }

    const jsonText = toStr((resp as any).output_text);
    let data: any;
    try {
      data = JSON.parse(jsonText);
    } catch {
      throw new Error("Invalid model response");
    }

    const lang = mapLangToRecLang(data?.lang);
    const core = Array.isArray(data?.core) ? uniqKeepOrder(data.core) : [];
    const support = Array.isArray(data?.support) ? uniqKeepOrder(data.support) : [];
    const themes = Array.isArray(data?.themes) ? uniqKeepOrder(data.themes) : [];
    const roots = uniqKeepOrder([...core, ...support]).slice(0, 12);
    let rootsEn = roots;

    if (roots.length > 0 && lang !== "en") {
      try {
        const tr = await client.responses.create({
          model: "gpt-4.1-mini",
          input: [
            {
              role: "system",
              content: `
Translate the given list of dream root words into English.

Rules:
- Return ONLY JSON that matches the schema.
- Keep the same number of items and the same order.
- Each item should be 1–2 words max.
- No explanations, no extra keys.
`.trim(),
            },
            { role: "user", content: roots.join("\n") },
          ],
          text: {
            format: {
              type: "json_schema",
              name: "roots_translation",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  rootsEn: { type: "array", items: { type: "string" } },
                },
                required: ["rootsEn"],
              },
            },
          },
          temperature: 0.1,
        });

        const trJsonText = toStr((tr as any).output_text);
        const trData = JSON.parse(trJsonText);
        const translated = Array.isArray(trData?.rootsEn)
          ? trData.rootsEn.map((x: any) => cleanWord(x)).filter(Boolean)
          : [];

        if (translated.length >= Math.min(roots.length, 3)) {
          rootsEn = translated.slice(0, roots.length);
        }
      } catch (e) {
        console.warn("rootwords EN translation failed; using original roots", e);
      }
    }

    return { lang: lang || "unknown", core, support, themes, roots, rootsEn };
}
