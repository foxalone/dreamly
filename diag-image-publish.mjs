// Diagnostic: last image jobs + queued image publishes. Run on the Mac:
//   node diag-image-publish.mjs
import { readFileSync } from "node:fs";
import admin from "firebase-admin";
const env = Object.fromEntries(readFileSync(".env.local","utf8").split("\n").filter(l=>l.includes("=")&&!l.startsWith("#")).map(l=>{const i=l.indexOf("=");return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^"|"$/g,"")]}));
const sa = JSON.parse(readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH || "serviceAccountKey.json","utf8"));
admin.initializeApp({ credential: admin.credential.cert(sa), databaseURL: env.FIREBASE_DATABASE_URL });
const db = admin.firestore();
const t = (v)=> v?.toDate ? v.toDate().toISOString() : (v ?? "");
console.log("=== adminAiImageJobs (newest first) ===");
const snap = await db.collection("adminAiImageJobs").orderBy("createdAt","desc").limit(16).get();
for (const d of snap.docs) {
  const x = d.data();
  console.log(JSON.stringify({id:d.id, created:t(x.createdAt), subject:(x.subject||"").slice(0,30), status:x.status,
    ig:x.instagramStatus, igAt:x.instagramPublishedAt, igErr:(x.instagramError||"").slice(0,200),
    fb:x.facebookStatus, th:x.threadsStatus, pin:x.pinterestStatus,
    sched:x.socialScheduledAt, schedStatus:x.socialScheduleStatus, schedErr:(x.socialScheduleError||"").slice(0,200),
    schedFail:x.socialScheduleFailures, feedUrl: x.instagramFeedImageUrl ? "yes":""}));
}
console.log("=== RTDB social_scheduled_assets (image:*) ===");
const q = await admin.database().ref("social_scheduled_assets").get();
q.forEach((c) => { const v = c.val(); if (String(v?.libraryId||c.key).includes("image")) console.log(c.key, JSON.stringify(v?.socialSchedule || v).slice(0,400)); });
console.log("=== adminSystem/metaAuth ===");
const auth = (await db.doc("adminSystem/metaAuth").get()).data() || {};
console.log(JSON.stringify({igUserId:auth.igUserId, pageId:auth.pageId, expiresAt:auth.expiresAt, igUsername:auth.igUsername, scopes:auth.scopes}));
process.exit(0);
