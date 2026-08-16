import { NextResponse } from "next/server";
import {
  clearThreadsAuthForUser,
  parseSignedRequest,
  readSignedRequest,
  recordThreadsPrivacyRequest,
} from "@/app/api/admin/threads/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Meta calls this endpoint with a signed_request POST when a user removes the
// Threads app. Dreamly only ever connects its own @get.dreamly account, so the
// only stored data is the admin Threads token, which is dropped here.
export async function POST(request: Request) {
  try {
    const signedRequest = await readSignedRequest(request);
    if (!signedRequest) {
      return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
    }

    const { userId } = parseSignedRequest(signedRequest);
    const tokenRemoved = await clearThreadsAuthForUser(userId);
    await recordThreadsPrivacyRequest("deauthorize", userId, tokenRemoved);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deauthorize failed";
    const status = message.includes("not configured") ? 503 : message.includes("signed_request") ? 400 : 500;
    if (status === 500) console.error("[admin/threads/deauthorize]", error);
    return NextResponse.json({ error: message }, { status });
  }
}
