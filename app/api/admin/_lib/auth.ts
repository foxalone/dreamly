import { adminAuth } from "./firebaseAdmin";

const ADMIN_UIDS = new Set<string>([
  "sGbA77TlcsatEMrgEvCv7Shjrj32",
]);

export async function requireAdmin(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";

  const token =
    authHeader.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : "";

  if (!token) {
    throw new Error("UNAUTHENTICATED");
  }

  const decoded = await adminAuth().verifyIdToken(token);
  const uid = decoded?.uid;

  if (!uid) {
    throw new Error("UNAUTHENTICATED");
  }

  if (!ADMIN_UIDS.has(uid)) {
    throw new Error("FORBIDDEN");
  }

  return uid;
}