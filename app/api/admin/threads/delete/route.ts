import { NextResponse } from "next/server";
import {
  clearThreadsAuthForUser,
  parseSignedRequest,
  readSignedRequest,
  readThreadsPrivacyRequest,
  recordThreadsPrivacyRequest,
} from "@/app/api/admin/threads/_lib";
import { threadsDeletionStatusUrl } from "@/lib/adminThreads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Meta's data deletion request callback: signed_request POST in, and a
// { url, confirmation_code } JSON response out. Dreamly stores no Threads
// end-user data beyond its own admin account token, so deletion completes
// synchronously and the status URL below always reports "completed".
export async function POST(request: Request) {
  try {
    const signedRequest = await readSignedRequest(request);
    if (!signedRequest) {
      return NextResponse.json({ error: "Missing signed_request" }, { status: 400 });
    }

    const { userId } = parseSignedRequest(signedRequest);
    const tokenRemoved = await clearThreadsAuthForUser(userId);
    const { confirmationCode } = await recordThreadsPrivacyRequest("delete", userId, tokenRemoved);

    return NextResponse.json({
      url: threadsDeletionStatusUrl(confirmationCode),
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deletion request failed";
    const status = message.includes("not configured") ? 503 : message.includes("signed_request") ? 400 : 500;
    if (status === 500) console.error("[admin/threads/delete]", error);
    return NextResponse.json({ error: message }, { status });
  }
}

function statusPage(title: string, body: string, status: number) {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:40rem;margin:4rem auto;padding:0 1.5rem;line-height:1.6">
<h1 style="font-size:1.25rem">${title}</h1><p>${body}</p></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

// Human-readable status page linked from the deletion response above.
export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") || "";
  if (!code) {
    return statusPage("Data deletion status", "Provide the confirmation code from your deletion request.", 400);
  }
  try {
    const record = await readThreadsPrivacyRequest(code);
    if (!record) {
      return statusPage("Data deletion status", `No deletion request found for confirmation code ${code}.`, 404);
    }
    return statusPage(
      "Data deletion status",
      `Request ${code} was received on ${record.receivedAt} and completed on ${record.completedAt}. All Threads data held by Dreamly for this account has been deleted.`,
      200,
    );
  } catch (error) {
    console.error("[admin/threads/delete:status]", error);
    return statusPage("Data deletion status", "The status of this request could not be loaded. Please try again later.", 500);
  }
}
