import { createHash } from "node:crypto";
import { FieldPath, type DocumentData, type DocumentReference, type Firestore, type Transaction } from "firebase-admin/firestore";
import { GALLERY_DREAM_HEARTS_COLLECTION, isDreamGalleryHeartSlug, safeHeartCount, USER_GALLERY_HEARTS_COLLECTION } from "./galleryHearts";

const COLLECTION = "dreamImageGallery";
const PAGE_SIZE = 24;

export type Publication = { dreamPath: string; publishedAt: number; automatic: boolean };

export function imagePublication(dream: DocumentReference) {
  const id = `dream-${createHash("sha256").update(dream.path).digest("hex")}`;
  return dream.firestore.collection(COLLECTION).doc(id);
}

export function isImagePublished(publication: Publication | undefined, dream: DocumentData | undefined) {
  return Boolean(publication && dream && !dream.deleted && (!publication.automatic || dream.shared === true));
}

function sharedCopy(dream: DocumentReference) {
  const owner = dream.parent.parent;
  return owner ? dream.firestore.collection("shared_dreams").doc(`${owner.id}_${dream.id}`) : null;
}

function matchesSharedCopy(dream: DocumentReference, copy: DocumentData | undefined) {
  return Boolean(copy && !copy.deleted && copy.ownerUid === dream.parent.parent?.id && copy.ownerDreamId === dream.id);
}

export async function isImageVisible(publication: Publication | undefined, dream: DocumentReference, entry: DocumentData | undefined) {
  if (!isImagePublished(publication, entry)) return false;
  if (!publication?.automatic) return true;
  return matchesSharedCopy(dream, (await sharedCopy(dream)?.get())?.data());
}

export async function publishAutomaticImage(tx: Transaction, dream: DocumentReference, entry: DocumentData | undefined, job: DocumentData | undefined,
  { apply = true, publishedAt = Date.now() } = {}) {
  if (entry?.shared !== true || entry.deleted || job?.galleryHidden === true) return false;
  const copy = sharedCopy(dream);
  if (!copy || !matchesSharedCopy(dream, (await tx.get(copy)).data())) return false;
  if (apply) tx.set(imagePublication(dream), { dreamPath: dream.path, publishedAt, automatic: true } satisfies Publication);
  return true;
}

export async function backfillDreamImage(ref: DocumentReference, apply: boolean) {
  const owner = ref.parent.parent;
  if (!owner || owner.parent.path !== "users" || ref.parent.id !== "dreamImageJobs") return "skipped";
  const dream = owner.collection("dreams").doc(ref.id);
  const asset = owner.collection("dreamImageAssets").doc(ref.id);
  return ref.firestore.runTransaction(async tx => {
    const [job, entry, publication, image] = await tx.getAll(ref, dream, imagePublication(dream), asset, {
      fieldMask: ["state", "rewarded", "rewardedAt", "galleryHidden", "shared", "deleted", "sourceType"],
    });
    if (publication.exists) return "already-published";
    if (job.get("state") !== "saved" || job.get("rewarded") !== true || !image.exists
      || (entry.get("sourceType") != null && entry.get("sourceType") !== "dream")) return "skipped";
    const now = Date.now();
    const earnedAt = job.get("rewardedAt");
    const publishedAt = Number.isInteger(earnedAt) && earnedAt >= 1e12 && earnedAt <= now ? earnedAt : now;
    const eligible = await publishAutomaticImage(tx, dream, entry.data(), job.data(), { apply, publishedAt });
    return eligible ? "eligible" : "skipped";
  }, { readOnly: !apply });
}

export async function getDreamImagePublication(db: Firestore, id: string) {
  if (!isDreamGalleryHeartSlug(id)) return null;
  const publication = (await db.collection(COLLECTION).doc(id).get()).data() as Publication | undefined;
  return publication ? { publication, dream: db.doc(publication.dreamPath) } : null;
}

export async function publicDreamImage(db: Firestore, id: string) {
  const found = await getDreamImagePublication(db, id);
  if (!found) return null;
  const { publication, dream } = found;
  return await isImageVisible(publication, dream, (await dream.get()).data()) ? dream : null;
}

export async function listDreamGallery(db: Firestore, cursor: string | null, uid: string | null, guestId: string | null) {
  let query = db.collection(COLLECTION).orderBy("publishedAt", "desc").orderBy(FieldPath.documentId(), "desc");
  if (cursor) {
    const [time, id] = cursor.split(".");
    if (!/^\d{13}$/.test(time) || !isDreamGalleryHeartSlug(id ?? "") || cursor !== `${time}.${id}`) return null;
    query = query.startAfter(Number(time), id);
  }
  const posts = (await query.limit(PAGE_SIZE + 1).get()).docs;
  const page = posts.slice(0, PAGE_SIZE);
  const last = page.at(-1);
  const next = posts.length > PAGE_SIZE && last ? `${last.get("publishedAt")}.${last.id}` : null;
  if (!page.length) return { images: [], next };
  const sources = page.map(post => db.doc(post.get("dreamPath")));
  const copies = page.flatMap((post, index) => {
    const ref = post.get("automatic") === true ? sharedCopy(sources[index]) : null;
    return ref ? [ref] : [];
  });
  const countRefs = page.map(post => db.collection(GALLERY_DREAM_HEARTS_COLLECTION).doc(post.id));
  const reactionOwner = uid ? db.doc(`users/${uid}`) : guestId ? db.doc(`guestQuickSymbol/${guestId}`) : null;
  const reactionRefs = reactionOwner ? page.map(post => reactionOwner.collection(USER_GALLERY_HEARTS_COLLECTION).doc(post.id)) : [];
  const [dreams, liveCopies, counts, likes] = await Promise.all([
    db.getAll(...sources, { fieldMask: ["shared", "deleted"] }),
    copies.length ? db.getAll(...copies, { fieldMask: ["deleted", "ownerUid", "ownerDreamId"] }) : [],
    db.getAll(...countRefs), reactionRefs.length ? db.getAll(...reactionRefs) : [],
  ]);
  const shared = new Map(liveCopies.map(copy => [copy.ref.path, copy.data()]));
  return {
    images: page.flatMap((post, index) => {
      const publication = post.data() as Publication;
      const dream = sources[index];
      const copy = shared.get(sharedCopy(dream)?.path ?? "");
      if (!isImagePublished(publication, dreams[index].data()) || (publication.automatic && !matchesSharedCopy(dream, copy))) return [];
      return [{ id: post.id, count: safeHeartCount(counts[index].get("count")), liked: likes[index]?.exists ?? false }];
    }),
    next,
  };
}
