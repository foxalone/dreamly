// app/api/dreams/rootwords/route.ts
import { NextResponse } from "next/server";
import { getMissingOneiroOpenAiKeyMessage, getOneiroOpenAiApiKey } from "@/lib/openaiEnv";
import { pickDreamEmojisAi } from "@/lib/pickDreamEmojisAi";
import { extractRootWords } from "@/lib/dreams/rootWords";
import { requireSignedInUid } from "../_lib/requireUser";
import { requirePaidAccess } from "../_lib/subscription";

export const runtime = "nodejs";

// Manual "extract roots" from the journal. A fresh diary save no longer needs
// this route: /api/dreams/save enriches the dream on the server for everyone,
// including the free first save.
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));

    const auth = await requireSignedInUid(body?.idToken);
    if ("error" in auth) return auth.error;
    const uid = auth.uid;

    const text = String(body?.text ?? "").trim();
    if (!text) return NextResponse.json({ error: "Missing text" }, { status: 400 });

    const access = await requirePaidAccess(uid);
    if ("error" in access) return access.error;

    const apiKey = getOneiroOpenAiApiKey();
    if (!apiKey) {
      return NextResponse.json({ error: getMissingOneiroOpenAiKeyMessage() }, { status: 500 });
    }

    // Emoji pick runs alongside the root-word call; empty on failure so the
    // journal falls back to its per-root emoji-mart lookup.
    const emojiPromise = pickDreamEmojisAi(apiKey, text).catch(() => null);

    let result;
    try {
      result = await extractRootWords(apiKey, text);
    } catch (e: any) {
      return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
    }

    const emojiPick = await emojiPromise;

    return NextResponse.json({
      ...result,
      emojis: emojiPick?.emojis ?? [],
      cost: 0,
      usedDailyFree: false,
    });
  } catch (e: any) {
    console.error("rootwords error:", e);
    return NextResponse.json({ error: e?.message ?? "Failed" }, { status: 500 });
  }
}
