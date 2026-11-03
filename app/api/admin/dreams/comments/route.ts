import { NextResponse } from "next/server";
import { moderateComment } from "@/lib/adminCommentModeration";
import { requireAdmin } from "../../_lib/auth";
import { adminDb } from "../../_lib/firebaseAdmin";

export const runtime = "nodejs";

const validId = (value: string) => /^[A-Za-z0-9_-]{1,120}$/.test(value);

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "COMMENTS_FAILED";
  const status = message === "UNAUTHENTICATED" ? 401 : message === "FORBIDDEN" ? 403 : 500;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const db = adminDb();
    const snap = await db.collectionGroup("comments").get();
    const docs = snap.docs.filter((doc) => doc.ref.parent.parent?.parent.id === "shared_dreams");
    const rows = await Promise.all(docs.map(async (doc) => {
      const data = doc.data();
      const dreamId = doc.ref.parent.parent!.id;
      const privateText = data.deleted === true
        ? (await doc.ref.collection("private").doc("moderation").get()).data()?.text
        : undefined;
      return {
        id: doc.id, dreamId,
        text: String(privateText ?? data.text ?? ""),
        authorUid: String(data.authorUid ?? ""),
        createdAtMs: Number(data.createdAtMs ?? 0) || 0,
        xpAwarded: Number(data.xpAwarded ?? 0) || 0,
        deleted: data.deleted === true,
        deletedAtMs: Number(data.deletedAtMs ?? 0) || 0,
      };
    }));
    rows.sort((a, b) => b.createdAtMs - a.createdAtMs || b.id.localeCompare(a.id));
    const dreamIds = [...new Set(rows.map((row) => row.dreamId))];
    const dreams = await Promise.all(dreamIds.map(async (id) => {
      const dream = await db.collection("shared_dreams").doc(id).get();
      return [id, String(dream.data()?.text ?? "").slice(0, 160)] as const;
    }));
    const dreamText = Object.fromEntries(dreams);
    return NextResponse.json({ rows: rows.map((row) => ({ ...row, dreamText: dreamText[row.dreamId] ?? "" })) },
      { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

async function mutate(req: Request, hard: boolean) {
  try {
    await requireAdmin(req);
    const body = await req.json().catch(() => ({}));
    const dreamId = String(body.dreamId ?? "");
    const commentId = String(body.commentId ?? "");
    if (!validId(dreamId) || !validId(commentId)) {
      return NextResponse.json({ error: "INVALID_ID" }, { status: 400 });
    }
    await moderateComment(adminDb(), dreamId, commentId, hard);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export const PATCH = (req: Request) => mutate(req, false);
export const DELETE = (req: Request) => mutate(req, true);
