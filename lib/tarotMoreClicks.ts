import { isTarotCardId } from "./tarot/access";
import type { MajorArcanaId } from "./tarot/deck";

type Dependencies = {
  verifyToken: (token: string) => Promise<{ uid: string }>;
  isAdmin: (uid: string) => boolean;
  validDraw: (request: Request, day: string, cardId: MajorArcanaId) => boolean;
  increment: (cardId: MajorArcanaId) => Promise<void>;
};

/** Count taps on a revealed card that open its reading/access flow, including repeats. */
export function createTarotMoreClickHandler({ verifyToken, isAdmin, validDraw, increment }: Dependencies) {
  return async (request: Request) => {
    const body = await request.json().catch(() => null);
    const day = body?.day;
    const cardId = body?.cardId;
    if (typeof day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(day) || typeof cardId !== "string" || !isTarotCardId(cardId)) {
      return Response.json({ error: "INVALID_CARD" }, { status: 400 });
    }
    if (!validDraw(request, day, cardId)) return Response.json({ error: "DRAW_REQUIRED" }, { status: 403 });

    const authorization = request.headers.get("authorization");
    if (authorization) {
      if (!authorization.startsWith("Bearer ") || !authorization.slice(7).trim()) {
        return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
      }
      let uid: string;
      try {
        uid = (await verifyToken(authorization.slice(7).trim())).uid;
        if (!uid) throw new Error("UNAUTHENTICATED");
      } catch {
        return Response.json({ error: "UNAUTHENTICATED" }, { status: 401 });
      }
      if (isAdmin(uid)) return Response.json({ ok: true, counted: false });
    }

    try {
      await increment(cardId);
      return Response.json({ ok: true, counted: true });
    } catch {
      return Response.json({ error: "COUNT_FAILED" }, { status: 500 });
    }
  };
}
