import { adminAuth } from "../admin/_lib/firebaseAdmin";

export async function optionalGalleryUid(request: Request) {
  const token = request.headers.get("authorization")?.match(/^Bearer (\S+)$/i)?.[1];
  if (!token) return null;
  try {
    return (await adminAuth().verifyIdToken(token)).uid || null;
  } catch {
    return null;
  }
}
