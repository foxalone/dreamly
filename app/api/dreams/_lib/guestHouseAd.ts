import type { Firestore } from "firebase-admin/firestore";
import { adminDb } from "../../admin/_lib/firebaseAdmin";
import { hashIp } from "./guestQuota";
import { readingDreamId, READING_AD_GRANT_MS } from "@/lib/readingAdGrant";
import { translationAdTarget, TRANSLATION_AD_GRANT_MS } from "@/lib/translationAdGrant";

/** One no-fill promotion per guest and action, bound permanently to its target.
 * Retrying the same target is safe: the existing unlock ledgers prevent a second charge.
 * The daily network cap also prevents resetting a cookie to mint repeated trials.
 */
export async function grantGuestHouseAd(
  guestId: string, ip: string, kind: "translate" | "reading",
  sharedDreamId: unknown, targetLang?: unknown, database?: Firestore,
): Promise<boolean> {
  const target = kind === "translate" ? translationAdTarget(sharedDreamId, targetLang)
    : readingDreamId(sharedDreamId) ? { sharedDreamId: readingDreamId(sharedDreamId)! } : null;
  if (!target) return false;
  const db = database ?? adminDb();
  const ref = db.collection("guestQuickSymbol").doc(guestId);
  const field = kind === "translate" ? "translationAdGrant" : "readingAdGrant";
  const auditField = kind === "translate" ? "yourfitTranslation" : "yourfitReading";
  const networkRef = db.collection("guestQuickSymbolIp").doc(`${hashIp(ip)}_${new Date().toISOString().slice(0, 10)}`);
  return db.runTransaction(async tx => {
    const guest = (await tx.get(ref)).data() ?? {};
    const network = (await tx.get(networkRef)).data() ?? {};
    const previous = guest[auditField];
    if (previous) {
      if (previous.sharedDreamId !== target.sharedDreamId || previous.targetLang !== ("targetLang" in target ? target.targetLang : undefined)) return false;
    } else if (network[auditField] === true) return false;
    // Never replace a watched-ad pass for another target.
    const current = guest[field];
    if (current?.expiresAtMs > Date.now() && (current.source !== "yourfit" || current.sharedDreamId !== target.sharedDreamId || current.targetLang !== ("targetLang" in target ? target.targetLang : undefined))) return false;
    tx.set(ref, {
      [field]: { ...target, source: "yourfit", expiresAtMs: Date.now() + (kind === "translate" ? TRANSLATION_AD_GRANT_MS : READING_AD_GRANT_MS) },
      ...(!previous ? { [auditField]: { ...target, source: "yourfit", grantedAtMs: Date.now() } } : {}),
    }, { merge: true });
    if (!previous) tx.set(networkRef, { [auditField]: true }, { merge: true });
    return true;
  });
}
