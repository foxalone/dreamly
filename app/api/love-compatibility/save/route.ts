import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { adminAuth, adminDb, ensureAdmin } from "@/app/api/admin/_lib/firebaseAdmin";
import { loveMatchCanonical, validAiLoveMatch, validLoveMatchInput } from "@/lib/loveMatchAi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host") ?? url.host;
  const protocol = process.env.VERCEL === "1" ? "https:" : url.protocol;
  if (!/^[a-z0-9.\-:\[\]]+$/i.test(host) || request.headers.get("origin") !== `${protocol}//${host}` || request.headers.get("sec-fetch-site") === "cross-site") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403, headers });
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, "utf8") > 2_000_000) throw new Error("Too long");
    body = JSON.parse(text);
  } catch { return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers }); }
  if (!body || typeof body !== "object") return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
  const { idToken, input, match } = body as Record<string, unknown>;
  if (typeof idToken !== "string" || idToken.length > 5000 || !validLoveMatchInput(input) || !validAiLoveMatch(match)) {
    return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
  }
  for (const photo of [input.firstPhoto, input.secondPhoto]) {
    if (!photo) continue;
    const bytes = Buffer.from(photo.slice(photo.indexOf(",") + 1), "base64");
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8 || bytes[2] !== 0xff) {
      return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
    }
  }
  let uid: string;
  try { uid = (await adminAuth().verifyIdToken(idToken)).uid; }
  catch { return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401, headers }); }

  const savedPaths: string[] = [];
  try {
    const id = createHash("sha256").update(loveMatchCanonical(input)).digest("hex");
    const matchRef = adminDb().collection("users").doc(uid).collection("loveMatches").doc(id);
    if ((await matchRef.get()).exists) return NextResponse.json({ saved: true, id }, { headers });
    const bucket = getStorage(ensureAdmin()).bucket();
    const base = `users/${uid}/love-matches/${id}`;
    for (const [name, photo] of [["first", input.firstPhoto], ["second", input.secondPhoto]] as const) {
      if (!photo) continue;
      const bytes = Buffer.from(photo.slice(photo.indexOf(",") + 1), "base64");
      const path = `${base}/${name}.jpg`;
      await bucket.file(path).save(bytes, { resumable: false, metadata: { contentType: "image/jpeg", cacheControl: "private, no-store" } });
      savedPaths.push(path);
    }
    const profile = {
      locale: input.locale, you: input.you, them: input.them,
      firstBirthday: input.firstBirthday, secondBirthday: input.secondBirthday,
      firstGender: input.firstGender, secondGender: input.secondGender,
      firstStory: input.firstStory, secondStory: input.secondStory, status: input.status,
    };
    await matchRef.set({
      ...profile, match, photoPaths: savedPaths, createdAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ saved: true, id }, { headers });
  } catch {
    if (savedPaths.length) {
      try {
        const bucket = getStorage(ensureAdmin()).bucket();
        await Promise.allSettled(savedPaths.map(path => bucket.file(path).delete()));
      } catch { /* A storage outage may also prevent cleanup. */ }
    }
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503, headers });
  }
}
