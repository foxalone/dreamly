import { createHash } from "node:crypto";
import OpenAI from "openai";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { OPENAI_REASONING_EFFORT, TRANSLATE_MODEL } from "@/lib/aiModels";
import { EN_ESCAPE_NOTE, normalizeEscapeNoteCopy, type EscapeNoteCopy } from "@/lib/escapeNote";

const sourceHash = createHash("sha256").update(JSON.stringify(EN_ESCAPE_NOTE)).digest("hex");

export async function translatedEscapeNote(lang: string, apiKey: string): Promise<EscapeNoteCopy> {
  if (lang === "en") return EN_ESCAPE_NOTE;
  const ref = adminDb().collection("escape_note_translations").doc(lang);
  const saved = (await ref.get()).data();
  const cached = saved?.sourceHash === sourceHash ? normalizeEscapeNoteCopy(saved) : null;
  if (cached) return cached;

  const language = new Intl.DisplayNames(["en"], { type: "language" }).of(lang) ?? lang;
  const response = await new OpenAI({ apiKey }).responses.create({
    model: TRANSLATE_MODEL,
    reasoning: { effort: OPENAI_REASONING_EFFORT },
    instructions: `Translate the two UI strings into natural ${language} (${lang}). Keep the meaning, punctuation and second-person instruction. Return only a json object with string keys "lead" and "cta". Do not include emoji or the creature list.`,
    input: `Translate this json object:\n${JSON.stringify(EN_ESCAPE_NOTE)}`,
    text: { format: { type: "json_object" } },
  });
  const copy = normalizeEscapeNoteCopy(JSON.parse(response.output_text || "null"));
  if (!copy) throw new Error(`Invalid escape note translation for ${lang}`);
  await ref.set({ ...copy, sourceHash, model: TRANSLATE_MODEL, updatedAtMs: Date.now() });
  return copy;
}
