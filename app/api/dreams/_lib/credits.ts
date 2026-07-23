import { FieldValue } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { adminDb } from "../../admin/_lib/firebaseAdmin";

/** Keep in sync with UI copy for paid AI actions. */
export const ANALYZE_CREDIT_COST = 2;
export const ROOTWORDS_CREDIT_COST = 1;
export const EMOJI_PICK_CREDIT_COST = 1;
export const TRANSLATE_CREDIT_COST = 1;

export type OpenAiCharge = {
  cost: number;
  credits: number;
  usedDailyFree: boolean;
};

function utcDayKey(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

export async function debitCredits(
  uid: string,
  amount: number
): Promise<{ credits: number } | { error: NextResponse }> {
  const cost = Math.max(0, Math.floor(amount));
  if (!uid || cost <= 0) {
    return {
      error: NextResponse.json({ error: "Invalid credit debit." }, { status: 400 }),
    };
  }

  const db = adminDb();
  const userRef = db.collection("users").doc(uid);

  try {
    const credits = await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const current = Number(snap.exists ? (snap.data() as any)?.credits ?? 0 : 0);
      if (!Number.isFinite(current) || current < cost) {
        throw new Error("INSUFFICIENT_CREDITS");
      }
      const next = current - cost;
      tx.set(
        userRef,
        {
          credits: next,
          creditsUpdatedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return next;
    });
    return { credits };
  } catch (e: any) {
    if (e?.message === "INSUFFICIENT_CREDITS") {
      return {
        error: NextResponse.json(
          { error: "Not enough credits.", code: "INSUFFICIENT_CREDITS" },
          { status: 402 }
        ),
      };
    }
    throw e;
  }
}

export async function refundCredits(uid: string, amount: number) {
  const cost = Math.max(0, Math.floor(amount));
  if (!uid || cost <= 0) return;
  try {
    await adminDb()
      .collection("users")
      .doc(uid)
      .set(
        {
          credits: FieldValue.increment(cost),
          creditsUpdatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
  } catch (e) {
    console.warn("credit refund failed:", e);
  }
}

/**
 * Soft routes (rootwords / translate / emoji-pick):
 * 1 free OpenAI call per user per UTC day, then charge `creditCost`.
 * Analyze stays always-paid via debitCredits directly.
 */
export async function chargeOpenAiCall(
  uid: string,
  creditCost: number
): Promise<OpenAiCharge | { error: NextResponse }> {
  const cost = Math.max(0, Math.floor(creditCost));
  if (!uid) {
    return {
      error: NextResponse.json(
        { error: "Sign in required.", code: "AUTH_REQUIRED" },
        { status: 401 }
      ),
    };
  }

  const db = adminDb();
  const userRef = db.collection("users").doc(uid);
  const dayKey = utcDayKey();

  try {
    return await db.runTransaction(async (tx) => {
      const snap = await tx.get(userRef);
      const data = snap.exists ? ((snap.data() as any) ?? {}) : {};
      const current = Number(data?.credits ?? 0);
      const freeDay = String(data?.openaiFreeDayKey ?? "");
      const freeUsed = freeDay === dayKey && !!data?.openaiFreeUsed;

      if (!freeUsed) {
        tx.set(
          userRef,
          {
            openaiFreeDayKey: dayKey,
            openaiFreeUsed: true,
            openaiFreeUpdatedAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        return {
          cost: 0,
          credits: Number.isFinite(current) ? Math.max(0, Math.floor(current)) : 0,
          usedDailyFree: true,
        };
      }

      if (cost <= 0) {
        throw new Error("INSUFFICIENT_CREDITS");
      }
      if (!Number.isFinite(current) || current < cost) {
        throw new Error("INSUFFICIENT_CREDITS");
      }
      const next = current - cost;
      tx.set(
        userRef,
        {
          credits: next,
          creditsUpdatedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return { cost, credits: next, usedDailyFree: false };
    });
  } catch (e: any) {
    if (e?.message === "INSUFFICIENT_CREDITS") {
      return {
        error: NextResponse.json(
          {
            error: "Not enough credits. Today's free AI call was already used.",
            code: "INSUFFICIENT_CREDITS",
          },
          { status: 402 }
        ),
      };
    }
    throw e;
  }
}

/** Undo a chargeOpenAiCall after OpenAI failure (restore free slot or credits). */
export async function refundOpenAiCall(uid: string, charge: OpenAiCharge) {
  if (!uid) return;
  try {
    if (charge.usedDailyFree) {
      const dayKey = utcDayKey();
      await adminDb()
        .collection("users")
        .doc(uid)
        .set(
          {
            openaiFreeDayKey: dayKey,
            openaiFreeUsed: false,
            openaiFreeUpdatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      return;
    }
    if (charge.cost > 0) {
      await refundCredits(uid, charge.cost);
    }
  } catch (e) {
    console.warn("openai charge refund failed:", e);
  }
}
