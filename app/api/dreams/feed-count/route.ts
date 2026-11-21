import { unstable_cache } from "next/cache";
import { NextResponse } from "next/server";
import { adminDb } from "../../admin/_lib/firebaseAdmin";

export const runtime = "nodejs";

const readCount = unstable_cache(async () => {
  const shares = adminDb().collection("shared_dreams");
  const [all, deleted] = await Promise.all([
    shares.count().get(),
    shares.where("deleted", "==", true).count().get(),
  ]);
  return Math.max(0, all.data().count - deleted.data().count);
}, ["dreamly-public-feed-count"], { revalidate: 60 });

export async function GET() {
  try {
    return NextResponse.json({ count: await readCount() }, {
      headers: { "Cache-Control": "public, max-age=20, s-maxage=60" },
    });
  } catch {
    return NextResponse.json({ code: "COUNT_UNAVAILABLE" }, { status: 503 });
  }
}
