/** Shared by Next.js and the standalone image worker. Keep assignment time stable on retries. */
export async function saveDreamPageImage(db, slug, assignment, assignedAt) {
  const ref = db.collection("dreamPageImages").doc(slug);
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    const previous = snapshot.data();
    if (previous && ["imageJobId", "imageUrl", "subject"].every(
      (key) => String(previous[key] || "") === String(assignment[key] || ""),
    )) return false;
    transaction.set(ref, { ...assignment, slug, assignedAt }, { merge: true });
    return true;
  });
}
