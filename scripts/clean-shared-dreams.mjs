// One-off cleanup of the public shared_dreams collection (every field of every
// doc is world-readable, rendered or not):
//  1. author-deleted dreams (deleted:true) still holding text/title — strip them
//     the way the journal delete does now; emojis/iconsEn/city stay.
//  2. any doc still carrying authorEmail/authorName — replace with authorInitials.
// The full dream and the author stay in users/{uid}/... for the admin.
//
//   node scripts/clean-shared-dreams.mjs          # dry run — lists what it would change
//   node scripts/clean-shared-dreams.mjs --apply  # writes
import { readFileSync } from "node:fs";
import admin from "firebase-admin";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);
const sa = JSON.parse(readFileSync(env.FIREBASE_SERVICE_ACCOUNT_PATH || "serviceAccountKey.json", "utf8"));
admin.initializeApp({ credential: admin.credential.cert(sa) });
const db = admin.firestore();
const apply = process.argv.includes("--apply");

// same as lib/authorInitials.ts
function authorInitials(email, name) {
  const src = String(email ?? "").trim() || String(name ?? "").trim();
  if (!src) return null;
  const left = src.includes("@") ? src.split("@")[0] : src;
  const parts = left.split(/[\s._-]+/).filter(Boolean);
  const a = (parts[0]?.[0] ?? "").toUpperCase();
  const b = (parts[1]?.[0] ?? parts[0]?.[1] ?? "").toUpperCase();
  return (a + b).slice(0, 2) || null;
}

const snap = await db.collection("shared_dreams").get();
let nDeleted = 0;
let nAuthor = 0;
for (const d of snap.docs) {
  const x = d.data();
  const patch = {};
  const notes = [];

  if (x.deleted === true && (x.text || x.title)) {
    Object.assign(patch, { title: "", text: "", wordCount: null, charCount: null });
    notes.push(`strip deleted "${String(x.text || x.title).slice(0, 50)}…"`);
    nDeleted++;
  }
  if (x.authorEmail || x.authorName) {
    Object.assign(patch, {
      authorName: null,
      authorEmail: null,
      authorInitials: x.deleted === true ? null : x.authorInitials || authorInitials(x.authorEmail, x.authorName),
    });
    notes.push(`drop author → ${patch.authorInitials ?? "—"}`);
    nAuthor++;
  }
  if (!notes.length) continue;

  console.log(`${apply ? "" : "[dry] "}${d.id}: ${notes.join("; ")}`);
  if (apply) await d.ref.update({ ...patch, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
}
console.log(
  `${snap.size} docs scanned · ${nDeleted} deleted dream(s) stripped · ${nAuthor} doc(s) lost email/name` +
    (apply ? "" : " — dry run, rerun with --apply")
);
