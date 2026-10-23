import { getDreamEntry } from "@/lib/dream-dictionary";
import { FieldValue } from "firebase-admin/firestore";
import { AUTO_USED_SLUGS_COLLECTION } from "@/lib/adminAutoDictionary";
import { DICTIONARY_VIDEO_QUEUE_COLLECTION, dictionaryVideoState } from "@/lib/adminDictionaryVideoQueue";
import { adminDb } from "./firebaseAdmin";

/** Read in batches: status follows the actual video file, even if the nightly runner exits. */
export async function dictionaryVideoStates(slugs: string[], db = adminDb()) {
  const states = new Map<string, ReturnType<typeof dictionaryVideoState>>();
  for (let i = 0; i < slugs.length; i += 100) {
    const batch = slugs.slice(i, i + 100);
    const requests = await db.getAll(...batch.map((slug) => db.collection(DICTIONARY_VIDEO_QUEUE_COLLECTION).doc(slug)));
    const reservations = await db.getAll(...batch.map((slug) => db.collection(AUTO_USED_SLUGS_COLLECTION).doc(slug)));
    const ids = [...new Set(reservations.map((doc) => String(doc.get("videoJobId") || "")).filter(Boolean))];
    const videos = ids.length ? await db.getAll(...ids.map((id) => db.collection("adminVideoJobs").doc(id))) : [];
    const byId = new Map(videos.map((doc) => [doc.id, doc.data()]));
    batch.forEach((slug, index) => {
      const id = String(reservations[index].get("videoJobId") || "");
      states.set(slug, dictionaryVideoState(requests[index].exists, byId.get(id)));
    });
  }
  return states;
}

/** The slug is the document ID, making repeat clicks idempotent and preserving FIFO order. */
export async function requestDictionaryVideo(slug: string, createdBy: string, db = adminDb()) {
  const state = (await dictionaryVideoStates([slug], db)).get(slug)!;
  if (state === "completed") return state;
  const reference = db.collection(DICTIONARY_VIDEO_QUEUE_COLLECTION).doc(slug);
  await db.runTransaction(async (transaction) => {
    if ((await transaction.get(reference)).exists) return;
    transaction.create(reference, { slug, status: "queued", createdBy, requestedAt: FieldValue.serverTimestamp() });
  });
  return (await dictionaryVideoStates([slug], db)).get(slug)!;
}

/** FIFO uses one ordered field, so Firestore needs no composite index. */
export async function nextRequestedDictionaryVideo(db = adminDb()) {
  const requests = await db.collection(DICTIONARY_VIDEO_QUEUE_COLLECTION).orderBy("requestedAt").get();
  for (const candidate of requests.docs) {
    if (candidate.get("status") === "completed" || !getDreamEntry(candidate.id)) continue;
    const reservation = await db.collection(AUTO_USED_SLUGS_COLLECTION).doc(candidate.id).get();
    const videoJobId = String(reservation.get("videoJobId") || "");
    const video = videoJobId ? await db.collection("adminVideoJobs").doc(videoJobId).get() : null;
    if (video?.get("status") === "completed" && video.get("videoUrl")) {
      await candidate.ref.update({ status: "completed" });
      continue;
    }
    return candidate;
  }
  return null;
}
