import { NextResponse } from "next/server";
import { getStorage } from "firebase-admin/storage";
import { adminAuth, adminDb, ensureAdmin } from "@/app/api/admin/_lib/firebaseAdmin";
import { isRelationshipStatus, validAiLoveMatch } from "@/lib/loveMatchAi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  const uid = await uidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401, headers });
  try {
    const snapshot = await adminDb().collection("users").doc(uid).collection("loveMatches").limit(50).get();
    const matches = snapshot.docs.flatMap(doc => {
      const data = doc.data();
      const createdAt = typeof data.createdAt?.toMillis === "function" ? data.createdAt.toMillis() : 0;
      if (typeof data.you !== "string" || typeof data.them !== "string" || !validAiLoveMatch(data.match)) return [];
      const status = isRelationshipStatus(data.status) ? data.status : null;
      return [{ id: doc.id, you: data.you, them: data.them, createdAt, match: data.match, ...(status ? { status } : {}) }];
    }).sort((a, b) => b.createdAt - a.createdAt);
    return NextResponse.json({ matches }, { headers });
  } catch {
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503, headers });
  }
}

async function uidFromRequest(request: Request): Promise<string | null> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  try { return (await adminAuth().verifyIdToken(authorization.slice(7))).uid; }
  catch { return null; }
}

export async function DELETE(request: Request) {
  const uid = await uidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401, headers });
  let id = "";
  try {
    const body = await request.json() as { id?: unknown };
    if (typeof body.id === "string") id = body.id;
  } catch { /* An empty body cannot name a match. */ }
  if (!/^[0-9a-f]{64}$/.test(id)) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400, headers });
  try {
    const ref = adminDb().collection("users").doc(uid).collection("loveMatches").doc(id);
    const snapshot = await ref.get();
    const paths = snapshot.data()?.photoPaths;
    await ref.delete();
    if (Array.isArray(paths)) {
      const bucket = getStorage(ensureAdmin()).bucket();
      const prefix = `users/${uid}/love-matches/${id}/`;
      await Promise.allSettled(paths.filter((path): path is string => typeof path === "string" && path.startsWith(prefix)).map(path => bucket.file(path).delete()));
    }
    return NextResponse.json({ deleted: true }, { headers });
  } catch {
    return NextResponse.json({ error: "UNAVAILABLE" }, { status: 503, headers });
  }
}
