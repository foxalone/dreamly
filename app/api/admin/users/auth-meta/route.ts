import { NextResponse } from "next/server";
import { requireAdmin } from "../../_lib/auth";
import { adminAuth } from "../../_lib/firebaseAdmin";

export const runtime = "nodejs";

type Body = { uids?: string[] };

function s(v: unknown) {
  return String(v ?? "").trim();
}

export async function POST(req: Request) {
  try {
    await requireAdmin(req);

    const body = (await req.json().catch(() => ({}))) as Body;
    const uids = Array.from(
      new Set(
        (Array.isArray(body?.uids) ? body.uids : [])
          .map((x) => s(x))
          .filter(Boolean)
      )
    ).slice(0, 200);

    if (!uids.length) {
      return NextResponse.json({ ok: true, users: {} });
    }

    const auth = adminAuth();
    const users: Record<
      string,
      { lastSignInAtMs: number | null; creationAtMs: number | null; email: string | null }
    > = {};

    // getUsers accepts up to 100 identifiers per call
    for (let i = 0; i < uids.length; i += 100) {
      const chunk = uids.slice(i, i + 100);
      const res = await auth.getUsers(chunk.map((uid) => ({ uid })));

      for (const u of res.users) {
        const last = u.metadata?.lastSignInTime
          ? Date.parse(u.metadata.lastSignInTime)
          : NaN;
        const created = u.metadata?.creationTime
          ? Date.parse(u.metadata.creationTime)
          : NaN;

        users[u.uid] = {
          lastSignInAtMs: Number.isFinite(last) ? last : null,
          creationAtMs: Number.isFinite(created) ? created : null,
          email: u.email ?? null,
        };
      }
    }

    return NextResponse.json({ ok: true, users });
  } catch (e: any) {
    const msg = e?.message ?? "auth-meta failed";
    const code =
      msg === "FORBIDDEN" ? 403 : msg === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
