import { isSign, type Sign } from "@/lib/horoscope/model";

type Dependencies = {
  verifyToken: (token: string) => Promise<{ uid: string }>;
  isAdmin: (uid: string) => boolean;
  increment: (sign: Sign) => Promise<void>;
};

/** Count each forecast "more" press, including repeats, while excluding signed-in admins. */
export function createHoroscopeMoreClickHandler({ verifyToken, isAdmin, increment }: Dependencies) {
  return async (req: Request) => {
    const body = await req.json().catch(() => null);
    if (!isSign(body?.sign)) return Response.json({ error: "INVALID_SIGN" }, { status: 400 });

    const authorization = req.headers.get("authorization");
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
      await increment(body.sign);
      return Response.json({ ok: true, counted: true });
    } catch {
      return Response.json({ error: "COUNT_FAILED" }, { status: 500 });
    }
  };
}
