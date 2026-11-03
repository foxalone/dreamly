import { createHash } from "node:crypto";
import OpenAI from "openai";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { TRANSLATE_MODEL } from "@/lib/aiModels";
import { EN_GUEST_SHARE_COPY, normalizeGuestShareCopy, type GuestShareCopy } from "@/lib/guestShareCopy";

const sourceHash = createHash("sha256").update(JSON.stringify(EN_GUEST_SHARE_COPY)).digest("hex");

export async function translatedGuestShareCopy(lang: string, apiKey: string): Promise<GuestShareCopy> {
  if (lang === "en") return EN_GUEST_SHARE_COPY;
  const ref = adminDb().collection("guest_share_translations").doc(lang);
  const saved = (await ref.get()).data();
  const cached = saved?.sourceHash === sourceHash ? normalizeGuestShareCopy(saved) : null;
  if (cached) return cached;

  const language = new Intl.DisplayNames(["en"], { type: "language" }).of(lang) ?? lang;
  const response = await new OpenAI({ apiKey }).responses.create({
    model: TRANSLATE_MODEL,
    reasoning: { effort: "minimal" },
    instructions: `Translate this guest sign-in UI copy into natural ${language} (${lang}). Keep the meaning and direct address. Translate the fantasy rank names unicorn and wizard naturally. Preserve the placeholders {badge} and {next} exactly in the done sentence. Return only a json object with the same five keys and no explanation.`,
    input: `Translate this json object:\n${JSON.stringify(EN_GUEST_SHARE_COPY)}`,
    text: { format: { type: "json_object" } },
  });
  const copy = normalizeGuestShareCopy(JSON.parse(response.output_text || "null"));
  if (!copy) throw new Error(`Invalid guest share translation for ${lang}`);
  await ref.set({ ...copy, sourceHash, model: TRANSLATE_MODEL, updatedAtMs: Date.now() });
  return copy;
}
