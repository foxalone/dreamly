// One-off: shared_dreams docs the author deleted before the fix still hold the
// dream text publicly (deleted:true, text intact). Strip them the same way the
// journal delete does now: text/title/author go, emojis/iconsEn/city stay.
// The full dream remains in users/{uid}/dreams (soft-deleted) for the admin.
//
//   node scripts/strip-deleted-shared.mjs          # dry run — lists what it would strip
//   node scripts/strip-deleted-shared.mjs --apply  # writes
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

const snap = await db.collection("shared_dreams").where("deleted", "==", true).get();
let n = 0;
for (const d of snap.docs) {
  const x = d.data();
  if (!x.text && !x.title && !x.authorName && !x.authorEmail) continue;
  n++;
  console.log(`${apply ? "strip" : "would strip"} ${d.id}  "${String(x.text || x.title).slice(0, 60)}…"  emojis=${(x.emojis || []).join("")}`);
  if (apply) {
    await d.ref.update({
      title: "",
      text: "",
      wordCount: null,
      charCount: null,
      authorName: null,
      authorEmail: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
}
console.log(`${n} doc(s) ${apply ? "stripped" : "to strip — rerun with --apply"}`);
