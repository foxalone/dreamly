import { FieldPath, FieldValue, type DocumentReference, type Firestore } from "firebase-admin/firestore";
import { galleryHeartCollection, safeHeartCount, USER_GALLERY_HEARTS_COLLECTION } from "./galleryHearts";

const reactionKeys = ["heart", "like", "star"] as const;

async function removePublicContributions(db: Firestore, post: DocumentReference, uid: string) {
  const reaction = post.collection("reactions").doc(uid);
  const comments = await post.collection("comments").where("authorUid", "==", uid).get();
  if (comments.empty && !(await reaction.get()).exists) return;

  // Limit each transaction's reads and writes. Re-reading ownership protects a
  // changed document and makes retries safe for both the counts and the data.
  for (let offset = 0; offset < Math.max(1, comments.size); offset += 100) {
    const refs = comments.docs.slice(offset, offset + 100).map(comment => comment.ref);
    await db.runTransaction(async tx => {
      const [current, reactionSnap, ...commentSnaps] = await tx.getAll(post, reaction, ...refs);
      const changes: Record<string, unknown> = {};
      let commentsRemoved = 0;
      for (const comment of commentSnaps) {
        const data = comment.data();
        if (data?.authorUid !== uid) continue;
        if (data.deleted !== true) commentsRemoved++;
        tx.delete(comment.ref);
        tx.delete(comment.ref.collection("private").doc("moderation"));
        tx.delete(comment.ref.collection("private").doc("translations"));
      }
      if (reactionSnap.exists) {
        tx.delete(reaction);
        for (const key of reactionKeys) {
          if (reactionSnap.get(key) === true) {
            changes["reactions." + key] = Math.max(0, safeHeartCount(current.get("reactions." + key)) - 1);
          }
        }
      }
      if (commentsRemoved) changes.commentCount = Math.max(0, safeHeartCount(current.get("commentCount")) - commentsRemoved);
      if (current.exists && Object.keys(changes).length) {
        tx.update(post, { ...changes, updatedAt: FieldValue.serverTimestamp() });
      }
    });
  }
}

export async function purgeDreamlyAccount(
  db: Firestore,
  uid: string,
  startAfter: string | undefined,
  deadline: number,
  saveCursor: (id: string) => Promise<void>,
): Promise<boolean> {
  // Old clients wrote reactions and comments directly to a post, so the
  // account's private index alone cannot locate all of its public activity.
  const posts = db.collection("shared_dreams").orderBy(FieldPath.documentId()).select("ownerUid").limit(24);
  let cursor = startAfter;
  for (;;) {
    if (Date.now() >= deadline) return false;
    const page = await (cursor ? posts.startAfter(cursor) : posts).get();
    if (page.empty) break;
    for (let offset = 0; offset < page.size; offset += 6) {
      await Promise.all(page.docs.slice(offset, offset + 6).map(async post => {
        if (post.get("ownerUid") === uid && (await post.ref.get()).get("ownerUid") === uid) {
          await db.recursiveDelete(post.ref);
        } else {
          await removePublicContributions(db, post.ref, uid);
        }
      }));
    }
    cursor = page.docs.at(-1)!.id;
    await saveCursor(cursor);
    if (page.size < 24) break;
  }

  const user = db.collection("users").doc(uid);
  const hearts = await user.collection(USER_GALLERY_HEARTS_COLLECTION).get();
  for (const item of hearts.docs) {
    const total = db.collection(galleryHeartCollection(item.id)).doc(item.id);
    const heart = total.collection("users").doc(uid);
    await db.runTransaction(async tx => {
      const [counter, liked] = await tx.getAll(total, heart);
      if (!liked.exists) return;
      tx.delete(heart);
      if (counter.exists) tx.update(total, { count: Math.max(0, safeHeartCount(counter.get("count")) - 1) });
    });
  }

  // The user's journal and illustration bytes are stored under users/{uid}.
  await db.recursiveDelete(user);
  return true;
}
