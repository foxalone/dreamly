import type { Firestore, QueryDocumentSnapshot, Timestamp } from "firebase-admin/firestore";
import type { ContentCounts, ContentTotals } from "./contentCounts";

function createdSince(data: FirebaseFirestore.DocumentData, start: number) {
  const ms = Number(data.createdAtMs ?? data.sharedAtMs ?? 0);
  return Number.isFinite(ms) && ms >= start;
}

/** Collection-group filters need indexes this project does not have, and the journals are small enough to tally in memory. */
function tally(docs: QueryDocumentSnapshot[], start: number, pick: (data: FirebaseFirestore.DocumentData) => "dreams" | "stories" | "journal" | "shared" | null) {
  const totals = { dreams: 0, stories: 0, journal: 0, shared: 0 };
  const added = { dreams: 0, stories: 0, journal: 0, shared: 0 };
  docs.forEach((doc) => {
    const data = doc.data();
    if (data.deleted === true) return;
    const kind = pick(data);
    if (!kind) return;
    totals[kind] += 1;
    if (createdSince(data, start)) added[kind] += 1;
  });
  return { totals, added };
}

export function readContentTotals(db: Firestore, start: number, readTime?: Timestamp) {
  return db.runTransaction(async (read): Promise<{ current: ContentTotals; addedToday: ContentCounts }> => {
    const [dreamSnap, guestSnap, storySnap, sharedSnap, commentSnap, userSnap, moonSnap, earthSnap, translationSnap, horoscopeMoreSnap, tarotMoreSnap] = await Promise.all([
      read.get(db.collectionGroup("dreams").select("deleted", "createdAtMs")),
      read.get(db.collection("guest_dreams").select("deleted", "imported", "createdAtMs")),
      read.get(db.collectionGroup("stories").select("deleted", "sourceType", "createdAtMs")),
      read.get(db.collection("shared_dreams").select("deleted", "sharedAtMs")),
      read.get(db.collectionGroup("comments").select("deleted")),
      read.get(db.collection("users").select("commentXpTotal")),
      read.get(db.collection("site_metrics").doc("moon_clicks")),
      read.get(db.collection("site_metrics").doc("earth_clicks")),
      read.get(db.collection("site_metrics").doc("translation_clicks")),
      read.get(db.collection("site_metrics").doc("horoscope_more_clicks")),
      read.get(db.collection("site_metrics").doc("tarot_more_clicks")),
    ]);

    const userDreams = tally(dreamSnap.docs, start, () => "dreams");
    const guests = tally(guestSnap.docs, start, (data) => (data.imported === true ? null : "dreams"));
    const notes = tally(storySnap.docs, start, (data) => (data.sourceType === "journal" ? "journal" : "stories"));
    const shares = tally(sharedSnap.docs, start, () => "shared");
    const activeShares = new Set(sharedSnap.docs.filter((doc) => doc.data().deleted !== true).map((doc) => doc.id));
    const comments = commentSnap.docs.filter((doc) =>
      doc.data().deleted !== true && doc.ref.parent.parent?.parent.id === "shared_dreams" &&
      activeShares.has(doc.ref.parent.parent.id)).length;
    const xp = userSnap.docs.reduce((total, doc) => total + Math.max(0, Number(doc.data().commentXpTotal) || 0), 0);

    const current: ContentTotals = {
      dreams: userDreams.totals.dreams + guests.totals.dreams,
      stories: notes.totals.stories,
      journal: notes.totals.journal,
      shared: shares.totals.shared,
      moon: Number(moonSnap.data()?.total ?? 0) || 0,
      earth: Number(earthSnap.data()?.total ?? 0) || 0,
      translation: Number(translationSnap.data()?.total ?? 0) || 0,
      horoscopeMore: Number(horoscopeMoreSnap.data()?.total ?? 0) || 0,
      tarotMore: Number(tarotMoreSnap.data()?.total ?? 0) || 0,
      comments,
      xp,
    };
    return {
      current,
      addedToday: {
        dreams: userDreams.added.dreams + guests.added.dreams,
        stories: notes.added.stories,
        journal: notes.added.journal,
        shared: shares.added.shared,
      },
    };
  }, { readOnly: true, readTime });
}
