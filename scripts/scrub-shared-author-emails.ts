import { FieldValue } from "firebase-admin/firestore";

import { authorInitials } from "../lib/authorInitials";
import { adminFirestore } from "../lib/firebaseAdmin";

async function run() {
  const shares = adminFirestore().collection("shared_dreams");
  const legacy = shares.where("authorEmail", ">", "");
  if (!process.argv.includes("--write")) {
    console.log(`Публичных записей с заполненным полем email: ${(await legacy.count().get()).data().count}`);
    return;
  }

  let updated = 0;
  while (true) {
    const page = await legacy.limit(20).get();
    if (page.empty) break;
    const batch = shares.firestore.batch();
    for (const doc of page.docs) {
      const { authorEmail, authorInitials: stored, authorName } = doc.data();
      const initials = (typeof stored === "string" && stored.trim()) || authorInitials(authorEmail, authorName);
      // This subcollection is readable only by the admin. Keep the change reversible.
      batch.set(doc.ref.collection("private").doc("legacyAuthor"), { authorEmail }, { merge: true });
      batch.update(doc.ref, { authorEmail: FieldValue.delete(), authorInitials: initials }, { lastUpdateTime: doc.updateTime });
    }
    await batch.commit();
    updated += page.size;
  }
  console.log(`Очищено публичных записей: ${updated}`);
}

run().catch((error) => {
  console.error("Очистка публичных записей прервана", error.code ?? error.name);
  process.exitCode = 1;
});
