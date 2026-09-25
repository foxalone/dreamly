import OpenAI from "openai";
import emojiData from "@emoji-mart/data";
import {
  createEmojiResolver,
  DREAM_EMOJI_MAX,
  type DreamEmojiEntry,
  type EmojiResolver,
} from "@/lib/dreamEmojiResolve";

/**
 * Server-side emoji picking for a dream text: one small model call that
 * returns 3–4 emojis for the dream's key symbols and mood. Every emoji the
 * model emits is checked against @emoji-mart/data (see dreamEmojiResolve), so
 * callers only ever get real, single, non-flag emojis with the id/name the
 * map stats and the admin emoji search rely on.
 *
 * Used by /api/dreams/analyze (homepage Ask) and /api/dreams/rootwords
 * (journal). Never throws on model trouble — returns an empty list so the
 * caller can fall back to the keyword picker.
 */
export const DREAM_EMOJI_MODEL_ENV = "OPENAI_EMOJI_MODEL";

export function dreamEmojiModel() {
  return process.env[DREAM_EMOJI_MODEL_ENV]?.trim() || "gpt-4.1-mini";
}

let resolver: EmojiResolver | null = null;
export function getDreamEmojiResolver(): EmojiResolver {
  if (!resolver) resolver = createEmojiResolver(emojiData as any);
  return resolver;
}

export type PickDreamEmojisResult = {
  emojis: DreamEmojiEntry[];
  model: string;
  /** What the model actually answered, before validation (for logs). */
  raw: string[];
};

const INSTRUCTIONS = `
You pick emojis that represent a dream for a dream-journal UI and a world map of dreams.

Rules:
- Return 3 to 4 emojis, most important first.
- Prefer concrete symbols from the dream (animals, objects, places, people, nature) over abstract ones.
- At most one emoji may express the dominant emotion of the dream.
- Each item must be exactly one standard Unicode emoji character (a single grapheme). No text, no letters, no digits, no keycaps, no flags, no skin-tone modifiers, no multi-person ZWJ combinations.
- Only emojis that exist in the standard Unicode emoji set. When unsure, pick a simpler, well-known emoji.
- Never repeat an emoji.
`.trim();

export async function pickDreamEmojisAi(apiKey: string, text: string): Promise<PickDreamEmojisResult> {
  const model = dreamEmojiModel();
  const clean = String(text ?? "").trim();
  if (!clean) return { emojis: [], model, raw: [] };

  const openai = new OpenAI({ apiKey });
  let raw: string[] = [];
  try {
    const resp = await openai.responses.create({
      model,
      instructions: INSTRUCTIONS,
      input: `Dream:\n"""${clean.slice(0, 2000)}"""`,
      text: {
        format: {
          type: "json_schema",
          name: "dream_emojis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              emojis: { type: "array", items: { type: "string" } },
            },
            required: ["emojis"],
          },
        },
      },
      temperature: 0.3,
    });
    const parsed = JSON.parse(String(resp.output_text ?? "").trim() || "{}");
    raw = Array.isArray(parsed?.emojis) ? parsed.emojis.map((x: unknown) => String(x ?? "")) : [];
  } catch (e) {
    console.warn("pickDreamEmojisAi failed:", e);
    return { emojis: [], model, raw: [] };
  }

  const emojis = getDreamEmojiResolver().resolveMany(raw, DREAM_EMOJI_MAX);
  return { emojis, model, raw };
}
