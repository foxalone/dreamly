import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { jerusalemDayKey } from "./clickDay";

/** Keep the existing total and the nested counter, and add one to today's bucket without erasing other days. */
export async function recordDailyClick(db: Firestore, docId: string, extra: Record<string, unknown>) {
  const ref = db.collection("site_metrics").doc(docId);
  await ref.set(
    {
      total: FieldValue.increment(1),
      lastAt: FieldValue.serverTimestamp(),
      ...extra,
    },
    { merge: true },
  );
  await ref.update({ [`byDay.${jerusalemDayKey()}`]: FieldValue.increment(1) });
}
