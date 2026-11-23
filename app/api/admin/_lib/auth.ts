import { adminAuth } from "./firebaseAdmin";

import { PRIMARY_ADMIN_UID } from "@/lib/auth/adminUid";
export { PRIMARY_ADMIN_UID } from "@/lib/auth/adminUid";

const ADMIN_UIDS = new Set<string>([PRIMARY_ADMIN_UID]);

export function isAdminUid(uid: string) {
  return ADMIN_UIDS.has(uid);
}

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

  if (!isAdminUid(uid)) {
    throw new Error("FORBIDDEN");
  }

  return uid;
}