import { indexNowKey } from "@/lib/indexnow";

/**
 * IndexNow key verification file. Reached as `/{INDEXNOW_KEY}.txt` through the
 * `beforeFiles` rewrite in next.config.ts, so the key never has to be committed
 * as a static file. Body is the bare key and nothing else.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const key = indexNowKey();
  if (!key) return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  return new Response(key, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
