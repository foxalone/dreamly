import { NextResponse } from "next/server";
import OpenAI from "openai";
import { FieldValue } from "firebase-admin/firestore";
import {
  getMissingOneiroOpenAiKeyMessage,
  getOneiroOpenAiApiKey,
} from "@/lib/openaiEnv";
import { adminAuth, adminDb } from "../../admin/_lib/firebaseAdmin";
import {
  countWords,
  findBestDreamMatch,
  normalizeQuickQuery,
  QUICK_SYMBOL_MAX_WORDS,
} from "@/lib/quickSymbol";

export const runtime = "nodejs";

type Body = {
  query?: string;
  idToken?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}

function extractOutputText(resp: unknown): string {
  const direct = isRecord(resp) ? String(resp.output_text ?? "").trim() : "";
  if (direct) return direct;

  const out = isRecord(resp) ? resp.output : undefined;
  if (!Array.isArray(out)) return "";

  const chunks: string[] = [];
  for (const item of out) {
    const content = isRecord(item) ? item.content : undefined;
    if (!Array.isArray(content)) continue;
    for (const c of content) {
      const t = isRecord(c) ? String(c.text ?? "").trim() : "";
      if (t) chunks.push(t);
    }
  }
  return chunks.join("\n").trim();
}

function queryDocId(normalized: string) {
  return normalized
    .toLowerCase()
    .replace(/[^a-z0-9\u0400-\u04FF\u0590-\u05FF\s]+/gi, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 120) || "empty";
}

async function logQuery(params: {
  query: string;
  normalized: string;
  matched: boolean;
  slug: string | null;
  uid: string | null;
  cost: number;
}) {
  try {
    const db = adminDb();
    const id = queryDocId(params.normalized);
    const ref = db.collection("quick_symbol_queries").doc(id);
    await ref.set(
      {
        query: params.query,
        normalized: params.normalized,
        count: FieldValue.increment(1),
        lastAt: FieldValue.serverTimestamp(),
        lastMatched: params.matched,
        lastSlug: params.slug,
        hasPage: params.matched,
        lastUid: params.uid,
        lastCost: params.cost,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn("quick_symbol_queries log failed:", e);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const query = String(body?.query ?? "").trim();
    const idToken = String(body?.idToken ?? "").trim();

    if (!query) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const words = countWords(query);
    if (words > QUICK_SYMBOL_MAX_WORDS) {
      return NextResponse.json(
        { error: `Use up to ${QUICK_SYMBOL_MAX_WORDS} words.` },
        { status: 400 }
      );
    }

    const normalized = normalizeQuickQuery(query);

    let uid: string | null = null;
    if (idToken) {
      try {
        const decoded = await adminAuth().verifyIdToken(idToken);
        uid = decoded?.uid ?? null;
      } catch {
        uid = null;
      }
    }

    if (!idToken || !uid) {
      return NextResponse.json(
        { error: "Sign in required.", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    const match = findBestDreamMatch(query);

    // Strong dictionary match → free
    if (match) {
      await logQuery({
        query,
        normalized,
        matched: true,
        slug: match.slug,
        uid,
        cost: 0,
      });

      return NextResponse.json({
        ok: true,
        matched: true,
        cost: 0,
        match,
        answer: match.snippet || match.shortMeaning,
        href: `/dreams/${match.slug}`,
      });
    }

    // Miss → GPT + 1 credit
    const db = adminDb();
    const userRef = db.collection("users").doc(uid);

    try {
      await db.runTransaction(async (tx) => {
        const snap = await tx.get(userRef);
        const credits = Number(snap.exists ? (snap.data() as any)?.credits ?? 0 : 0);
        if (!Number.isFinite(credits) || credits < 1) {
          throw new Error("INSUFFICIENT_CREDITS");
        }
        tx.set(
          userRef,
          {
            credits: credits - 1,
            creditsUpdatedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      });
    } catch (e: any) {
      if (e?.message === "INSUFFICIENT_CREDITS") {
        return NextResponse.json(
          { error: "Not enough credits.", code: "INSUFFICIENT_CREDITS" },
          { status: 402 }
        );
      }
      throw e;
    }

    const apiKey = getOneiroOpenAiApiKey();
    if (!apiKey) {
      // refund
      await userRef.set(
        {
          credits: FieldValue.increment(1),
          creditsUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return NextResponse.json(
        { error: getMissingOneiroOpenAiKeyMessage() },
        { status: 500 }
      );
    }

    const model = process.env.OPENAI_QUICK_SYMBOL_MODEL?.trim() || "gpt-5-nano";
    const openai = new OpenAI({ apiKey });

    let answer = "";
    try {
      const resp = await openai.responses.create({
        model,
        instructions:
          "You are a concise dream-dictionary assistant. Given a short dream symbol or phrase, write 2–4 short sentences of practical meaning. No medical claims, no predictions, no titles, no bullet lists.",
        input: `Dream symbol / phrase: """${query}"""`,
        reasoning: { effort: "minimal" },
      });
      answer = extractOutputText(resp);
    } catch (e: any) {
      await userRef.set(
        {
          credits: FieldValue.increment(1),
          creditsUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return NextResponse.json(
        { error: e?.message ?? "Quick symbol failed" },
        { status: 500 }
      );
    }

    if (!answer) {
      await userRef.set(
        {
          credits: FieldValue.increment(1),
          creditsUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return NextResponse.json({ error: "Empty answer" }, { status: 500 });
    }

    await logQuery({
      query,
      normalized,
      matched: false,
      slug: null,
      uid,
      cost: 1,
    });

    return NextResponse.json({
      ok: true,
      matched: false,
      cost: 1,
      match: null,
      answer,
      href: null,
      model,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Quick symbol failed" },
      { status: 500 }
    );
  }
}
