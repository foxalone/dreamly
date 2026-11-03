import { FieldValue, type Firestore } from "firebase-admin/firestore";

/** Keep earned XP and the anti-duplicate receipt, matching author deletion. */
export async function moderateComment(db: Firestore, dreamId: string, commentId: string, hard: boolean) {
  const dreamRef = db.collection("shared_dreams").doc(dreamId);
  const commentRef = dreamRef.collection("comments").doc(commentId);
  const moderationRef = commentRef.collection("private").doc("moderation");
  const translationsRef = commentRef.collection("private").doc("translations");
  await db.runTransaction(async (tx) => {
    const [dream, comment] = await Promise.all([tx.get(dreamRef), tx.get(commentRef)]);
    if (!comment.exists) return;
    const data = comment.data() ?? {};
    const active = data.deleted !== true;
    if (hard) {
      tx.delete(commentRef);
      tx.delete(moderationRef);
      tx.delete(translationsRef);
    } else if (active) {
      const deletedAtMs = Date.now();
      tx.set(moderationRef, { text: String(data.text ?? ""), deletedAtMs });
      tx.update(commentRef, { text: "", deleted: true, deletedAtMs, deletedBy: "admin" });
    }
    if (active && dream.exists) {
      tx.update(dreamRef, {
        commentCount: Math.max(0, (Number(dream.data()?.commentCount) || 0) - 1),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  });
}
