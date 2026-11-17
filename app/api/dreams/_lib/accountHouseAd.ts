import { createHash } from "node:crypto";
import type { Firestore } from "firebase-admin/firestore";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { hasPaidAccess } from "@/lib/subscriptions/status";
import { readingDreamId, READING_AD_GRANT_MS } from "@/lib/readingAdGrant";
import { translationAdTarget, TRANSLATION_AD_GRANT_MS } from "@/lib/translationAdGrant";

const textHash = (text: string) => createHash("sha256").update(text.trim()).digest("hex");
export type HouseAnalysisTarget = { dreamId: string; text: string; lang: string; lens: string };
const requestKey = (target: HouseAnalysisTarget) => textHash(JSON.stringify([target.text.trim(), target.lang, target.lens]));

/** Server-private receipts survive logout, cookie changes and the daily quota reset. */
export async function grantAccountHouseAd(
  uid: string, guestId: string | null, kind: "analysis" | "translate" | "reading",
  dreamId: unknown, targetLang?: unknown, database?: Firestore, analysisText?: unknown,
): Promise<boolean> {
  const id = readingDreamId(dreamId);
  const suppliedText = typeof analysisText === "string" ? analysisText.trim() : "";
  const textTarget = !id && suppliedText && suppliedText.length <= 20_000 ? { sharedDreamId: `text_${textHash(suppliedText)}` } : null;
  const target = kind === "translate" ? translationAdTarget(dreamId, targetLang) : id ? { sharedDreamId: id } : kind === "analysis" ? textTarget : null;
  if (!target) return false;
  const db = database ?? adminDb();
  const userRef = db.collection("users").doc(uid);
  const receiptRef = userRef.collection("houseAdGrants").doc(kind);
  const grantRef = kind === "analysis" ? null : userRef.collection(kind === "translate" ? "translationUnlocks" : "readingUnlocks").doc("__adGrant");
  const guestField = kind === "analysis" ? "yourfitAnalysisAccount" : kind === "translate" ? "yourfitTranslation" : "yourfitReading";
  return db.runTransaction(async tx => {
    const user = (await tx.get(userRef)).data();
    const receipt = (await tx.get(receiptRef)).data();
    const guestRef = guestId ? db.collection("guestQuickSymbol").doc(guestId) : null;
    const guest = guestRef ? (await tx.get(guestRef)).data() : null;
    const current = grantRef ? (await tx.get(grantRef)).data() : null;
    const dream = kind === "analysis" ? (id ? (await tx.get(userRef.collection("dreams").doc(id))).data() : { text: suppliedText, deleted: false }) : null;
    if (!user || hasPaidAccess(user)) return false;
    if (kind === "analysis" && (!dream || dream.deleted || typeof dream.text !== "string" || !dream.text.trim())) return false;
    if (receipt) {
      if (kind === "analysis") return !receipt.blocked && receipt.textHash === textHash(dream!.text);
      if (receipt.blocked || receipt.sharedDreamId !== target.sharedDreamId || receipt.targetLang !== ("targetLang" in target ? target.targetLang : undefined)) return false;
    } else if (guest?.[guestField] || (kind === "analysis" && guest?.firstAnalysisNoAd === true)) {
      // Persist the inherited limit so dropping the guest cookie cannot reset it.
      tx.set(receiptRef, { blocked: true, source: "guest", atMs: Date.now() });
      return false;
    }
    if (current && current.expiresAtMs > Date.now() && (current.source !== "yourfit" || current.sharedDreamId !== target.sharedDreamId || current.targetLang !== ("targetLang" in target ? target.targetLang : undefined))) return false;
    if (!receipt) tx.set(receiptRef, { ...target, source: "yourfit", atMs: Date.now(),
      ...(kind === "analysis" ? { textHash: textHash(dream!.text), available: true } : {}) });
    if (guestRef && !receipt) tx.set(guestRef, { [guestField]: { ...target, source: "account", uid } }, { merge: true });
    if (grantRef) tx.set(grantRef, { ...target, source: "yourfit", expiresAtMs: Date.now() + (kind === "translate" ? TRANSLATION_AD_GRANT_MS : READING_AD_GRANT_MS) });
    return true;
  });
}

export async function consumeAccountHouseAnalysis(uid: string, target: HouseAnalysisTarget, database?: Firestore) {
  const db = database ?? adminDb();
  const ref = db.collection("users").doc(uid).collection("houseAdGrants").doc("analysis");
  return db.runTransaction(async tx => {
    const grant = (await tx.get(ref)).data();
    if (!grant?.available || grant.textHash !== textHash(target.text)) return false;
    tx.set(ref, { available: false, requestKey: requestKey(target) }, { merge: true });
    return true;
  });
}

export async function finishAccountHouseAnalysis(uid: string, result: Record<string, unknown> | null, attemptId: string | null, database?: Firestore) {
  const db = database ?? adminDb();
  const ref = db.collection("users").doc(uid).collection("houseAdGrants").doc("analysis");
  await db.runTransaction(async tx => {
    const grant = (await tx.get(ref)).data();
    if (!grant || grant.result) return;
    tx.set(ref, result ? { result, attemptId, available: false } : { available: true }, { merge: true });
  });
}

export async function recoverAccountHouseAnalysis(uid: string, target: HouseAnalysisTarget, database?: Firestore) {
  const db = database ?? adminDb();
  const ref = db.collection("users").doc(uid).collection("houseAdGrants").doc("analysis");
  return db.runTransaction(async tx => {
    const grant = (await tx.get(ref)).data();
    return grant?.requestKey === requestKey(target) && grant.result ? { result: grant.result, attemptId: grant.attemptId } : null;
  });
}


/** Carry used trials across sign-in, and prevent logout from granting a new trial. */
export async function inheritGuestHouseAds(uid: string, guestId: string, database?: Firestore) {
  const db = database ?? adminDb();
  const guestRef = db.collection("guestQuickSymbol").doc(guestId);
  const kinds = ["analysis", "translate", "reading"] as const;
  const fields = ["yourfitAnalysisAccount", "yourfitTranslation", "yourfitReading"] as const;
  await db.runTransaction(async tx => {
    const guest = (await tx.get(guestRef)).data() ?? {};
    const refs = kinds.map(kind => db.collection("users").doc(uid).collection("houseAdGrants").doc(kind));
    const receipts = await Promise.all(refs.map(ref => tx.get(ref)));
    kinds.forEach((kind, index) => {
      const usedByGuest = guest[fields[index]] || (kind === "analysis" && guest.firstAnalysisNoAd === true);
      if (usedByGuest && !receipts[index].exists) tx.set(refs[index], { blocked: true, source: "guest", atMs: Date.now() });
      if (receipts[index].exists && !usedByGuest) tx.set(guestRef, { [fields[index]]: { source: "account", uid } }, { merge: true });
    });
  });
}
