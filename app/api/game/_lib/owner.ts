import { NextResponse } from "next/server";
import { adminAuth } from "../../admin/_lib/firebaseAdmin";
import { newGuestId, readGuestId, setGuestCookie } from "../../dreams/_lib/guestQuota";

/** Who is playing: a signed-in user (Bearer Firebase ID token) or a guest (dreamly_guest cookie). */
export type Owner = {
  ownerKey: string;
  uid: string | null;
  /** Guest id from the cookie — present for guests, and for users who still carry a guest cookie (to merge). */
  guestId: string | null;
  newGuest: boolean;
};

export async function resolveOwner(req: Request): Promise<Owner> {
  const cookieGuest = readGuestId(req);
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (token) {
    try {
      const decoded = await adminAuth().verifyIdToken(token);
      if (decoded?.uid) return { ownerKey: `u_${decoded.uid}`, uid: decoded.uid, guestId: cookieGuest, newGuest: false };
    } catch {
      /* invalid token → treat as guest */
    }
  }
  const guestId = cookieGuest ?? newGuestId();
  return { ownerKey: `g_${guestId}`, uid: null, guestId, newGuest: !cookieGuest };
}

/** Guests get (or keep) their cookie on every game response. */
export function withOwner<T extends NextResponse>(res: T, owner: Owner): T {
  return !owner.uid && owner.guestId ? setGuestCookie(res, owner.guestId) : res;
}
