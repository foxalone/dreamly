import { FieldPath, type QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/app/api/admin/_lib/firebaseAdmin";
import { backfillDreamImage } from "@/lib/dreamImageGallery";

async function main() {
  const flags = process.argv.slice(2);
  if (flags.length > 1 || (flags.length === 1 && flags[0] !== "--apply")) {
    throw new Error("Usage: tsx --env-file=.env.local scripts/backfill-dream-image-gallery.ts [--apply]");
  }
  const apply = flags[0] === "--apply";
  const db = adminDb();
  const limit = 100;
  const query = db.collectionGroup("dreamImageJobs").orderBy(FieldPath.documentId()).select("state", "rewarded").limit(limit);
  let cursor: QueryDocumentSnapshot | undefined;
  const counts = { scanned: 0, ready: 0, eligible: 0, alreadyPublished: 0 };

  try {
    while (true) {
      const page = await (cursor ? query.startAfter(cursor) : query).get();
      counts.scanned += page.size;
      for (const doc of page.docs) {
        if (doc.get("state") !== "saved" || doc.get("rewarded") !== true) continue;
        counts.ready++;
        const result = await backfillDreamImage(doc.ref, apply);
        if (result === "eligible") counts.eligible++;
        if (result === "already-published") counts.alreadyPublished++;
      }
      if (page.size < limit) break;
      cursor = page.docs.at(-1);
    }
    console.log(JSON.stringify({ mode: apply ? "apply" : "preview", ...counts }));
  } finally {
    await db.terminate();
  }
}

main().catch(error => {
  console.error("Dream gallery backfill failed:", error);
  process.exitCode = 1;
});
