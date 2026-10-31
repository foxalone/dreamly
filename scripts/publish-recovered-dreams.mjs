#!/usr/bin/env node
/**
 * Publish the unique dreams recovered by the 2026-10-28 rate-limit repair.
 * The site owner explicitly authorized publication of all five attempts; two
 * attempts belong to the same dream, so the normal share route creates four
 * public posts. Safe to rerun: the share route uses a stable guest/text ID.
 *
 * Dry run: node --env-file=.env.local --import tsx scripts/publish-recovered-dreams.mjs
 * Apply:   node --env-file=.env.local --import tsx scripts/publish-recovered-dreams.mjs --write
 */
import { adminFirestore } from "../lib/firebaseAdmin.ts";
import { guestDreamSnapshotId } from "../app/api/dreams/_lib/guestDreamSnapshot.ts";
import { guestSharedDreamDocId, checkShareableDreamText } from "../lib/shareBadges.ts";
import { POST as shareGuestDream } from "../app/api/dreams/share-guest/route.ts";

const BATCH = "2026-10-28-provider-rate-limit";
const WRITE = process.argv.includes("--write");
const db = adminFirestore();

async function main() {
  const attempts = await db.collection("analysis_attempts").where("recoveryBatch", "==", BATCH).get();
  const unique = new Map();
  for (const doc of attempts.docs.sort((a, b) => Number(a.data().createdAtMs) - Number(b.data().createdAtMs))) {
    const row = doc.data();
    if (row.status !== "succeeded" || !row.guestId || !row.text) throw new Error(`Attempt ${doc.id} is not ready`);
    unique.set(guestDreamSnapshotId(row.guestId, row.text), row);
  }
  if (attempts.size !== 5 || unique.size !== 4) throw new Error(`Unexpected repair batch size: ${attempts.size} attempts, ${unique.size} dreams`);

  let published = 0;
  let alreadyShared = 0;
  for (const [snapshotId, row] of unique) {
    const [snapshot, shared] = await Promise.all([
      db.collection("guest_dreams").doc(snapshotId).get(),
      db.collection("shared_dreams").doc(guestSharedDreamDocId(row.guestId, row.text)).get(),
    ]);
    const dream = snapshot.data();
    if (!snapshot.exists || dream?.deleted || dream?.recoveredFrom !== "ai_rate_limited" || !dream?.analysis || dream?.text !== row.text.trim()) {
      throw new Error(`Recovered dream ${snapshotId} is missing or changed`);
    }
    const check = checkShareableDreamText(dream.text, 4000);
    if (!check.ok) throw new Error(`Recovered dream ${snapshotId} is not shareable: ${check.reason}`);
    const sharedId = guestSharedDreamDocId(row.guestId, row.text);
    if (shared.exists) {
      const publicDream = shared.data();
      if (publicDream.deleted || publicDream.ownerGuestId !== row.guestId || publicDream.text !== dream.text ||
          publicDream.cityId !== dream.cityId || dream.shared !== true || dream.sharedId !== sharedId) {
        throw new Error(`Published dream ${sharedId} does not match its recovered snapshot`);
      }
      if (dream.mapIngestId && !(await db.collection("map_ingested").doc(dream.mapIngestId).get()).exists) {
        throw new Error(`Map marker is missing for ${snapshotId}`);
      }
      alreadyShared += 1;
      console.log(JSON.stringify({ snapshotId, sharedId, result: "already_shared" }));
      continue;
    }
    if (!WRITE) {
      console.log(JSON.stringify({ snapshotId, sharedId, result: "ready_to_share" }));
      continue;
    }

    const request = new Request("https://dreamly.art/api/dreams/share-guest", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        cookie: `dreamly_guest=${encodeURIComponent(row.guestId)}`,
        "x-real-ip": "127.0.0.1",
      },
      body: JSON.stringify({
        text: dream.text,
        lang: dream.lang,
        lens: dream.lens,
        emojis: dream.emojis,
        iconsEn: dream.iconsEn,
      }),
    });
    const response = await shareGuestDream(request);
    const result = await response.json();
    if (response.status === 409 && result.code === "ALREADY_SHARED") {
      alreadyShared += 1;
    } else if (response.ok && result.ok && result.sharedId === sharedId) {
      published += 1;
    } else {
      throw new Error(`Share failed for ${snapshotId}: HTTP ${response.status} ${JSON.stringify(result)}`);
    }
    console.log(JSON.stringify({ snapshotId, sharedId, result: response.ok ? "published" : "already_shared" }));
  }
  console.log(JSON.stringify({ mode: WRITE ? "write" : "dry_run", attempts: attempts.size, uniqueDreams: unique.size, published, alreadyShared }));
}

main().catch(error => { console.error(error instanceof Error ? error.message : "publish failed"); process.exitCode = 1; });
