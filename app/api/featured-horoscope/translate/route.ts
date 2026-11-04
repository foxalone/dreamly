import { NextResponse } from "next/server";
import OpenAI from "openai";
import { adminFirestore } from "@/lib/firebaseAdmin";
import { readFeatured, featuredId } from "@/lib/featuredHoroscope";
import { canReadFeatured, canTranslateFeatured, FeaturedAccessError } from "@/lib/featuredHoroscopeAccess";
import { FEATURED_MODEL } from "@/lib/featuredHoroscopeGenerate";
import { horoscopeActor, finishAccess } from "@/lib/horoscope/access-http";
import { getOneiroOpenAiApiKey } from "@/lib/openaiEnv";
import { normalizeTranslationLanguage, TRANSLATION_LANGUAGE_LABELS } from "@/lib/translationLanguage";
import { HoroscopeAccessError } from "@/lib/horoscope/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;
const headers = { "Cache-Control": "private, no-store" };
const fields = ["headline", "teaser", "opening", "relationships", "work", "wellbeing", "takeaway"] as const;
const schema = { type: "object", additionalProperties: false, required: [...fields], properties: Object.fromEntries(fields.map(field => [field, { type: "string" }])) };

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > 256) throw new FeaturedAccessError(400, "INVALID_REQUEST");
    const body = JSON.parse(raw) as { day?: unknown; lang?: unknown };
    const day = String(body.day ?? "");
    try { featuredId(day); } catch { throw new FeaturedAccessError(400, "INVALID_REQUEST"); }
    const lang = normalizeTranslationLanguage(body.lang);
    if (!lang || lang === "en") throw new FeaturedAccessError(400, "INVALID_LANGUAGE");
    const forecast = await readFeatured(day);
    if (!forecast) throw new FeaturedAccessError(404, "NOT_FOUND");
    const { actor, newGuestId } = await horoscopeActor(request);
    if (!await canReadFeatured(actor, day)) throw new FeaturedAccessError(403, "READING_LOCKED");
    if (!await canTranslateFeatured(actor, day, lang)) throw new FeaturedAccessError(402, "AD_REQUIRED");
    const cacheRef = adminFirestore().collection("featured_horoscopes").doc(day).collection("translations").doc(lang);
    const cached = await cacheRef.get();
    let translation = cached.data()?.content as Record<string, string> | undefined;
    if (!translation) {
      const apiKey = getOneiroOpenAiApiKey();
      if (!apiKey) throw new Error("OpenAI key is not configured");
      const response = await new OpenAI({ apiKey, timeout: 75_000 }).responses.create({
        model: FEATURED_MODEL,
        reasoning: { effort: "low" },
        text: { format: { type: "json_schema", name: "featured_translation", strict: true, schema } },
        instructions: `Translate this daily horoscope naturally into ${TRANSLATION_LANGUAGE_LABELS[lang]}. Preserve every meaning, its warm literary voice and all seven fields. Do not invent new predictions or details. Return only the JSON fields.`,
        input: JSON.stringify(Object.fromEntries(fields.map(field => [field, forecast[field]]))),
      });
      if (response.status !== "completed" || !response.output_text) throw new Error("Incomplete translation");
      translation = JSON.parse(response.output_text) as Record<string, string>;
      if (fields.some(field => !translation?.[field]?.trim())) throw new Error("Incomplete translation fields");
      await cacheRef.set({ content: translation, model: FEATURED_MODEL, generatedAtMs: Date.now() });
    }
    return finishAccess(NextResponse.json({ translation }, { headers }), newGuestId);
  } catch (error) {
    const known = error instanceof FeaturedAccessError || error instanceof HoroscopeAccessError;
    const status = known ? error.status : error instanceof SyntaxError ? 400 : 503;
    return NextResponse.json({ code: known ? error.code : "UNAVAILABLE" }, { status, headers });
  }
}
