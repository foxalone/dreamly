export type MoonClickSource = "map" | "home";

type Dependencies = {
  verifyToken: (token: string) => Promise<{ uid: string }>;
  isAdmin: (uid: string) => boolean;
  increment: (source: MoonClickSource) => Promise<void>;
};

/** Authenticate before counting; invalid credentials must never become guest clicks. */
export function createMoonClickHandler({ verifyToken, isAdmin, increment }: Dependencies) {
  return async (req: Request) => {
    const body = await req.json().catch(() => null);
    if (body?.source !== "map" && body?.source !== "home") {
      return Response.json({ error: "INVALID_SOURCE" }, { status: 400 });
    }
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
      await increment(body.source);
      return Response.json({ ok: true, counted: true });
    } catch {
      return Response.json({ error: "COUNT_FAILED" }, { status: 500 });
    }
  };
}
