import { adminFirestore } from "@/lib/firebaseAdmin";
import {
  AYET_POSTBACK_SIGNATURE_HEADER, parseAyetPostback, recordAyetPostback, verifyAyetPostback,
} from "@/lib/ayetPostback";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  const url = new URL(request.url);
  // A bare GET can check reachability before any publisher credentials are configured.
  if (!url.search) return new Response("OK", { headers });
  if (url.search.length > 4096) return new Response("Invalid postback", { status: 400, headers });

  const publisherKey = process.env.AYET_PUBLISHER_API_KEY?.trim();
  if (!publisherKey) return new Response("Unavailable", { status: 503, headers });

  const signature = request.headers.get(AYET_POSTBACK_SIGNATURE_HEADER);
  if (!verifyAyetPostback(url.searchParams, signature, publisherKey)) {
    return new Response("Invalid signature", { status: 401, headers });
  }

  const postback = parseAyetPostback(url.searchParams);
  if (!postback) return new Response("Invalid postback", { status: 400, headers });

  try {
    await recordAyetPostback(adminFirestore(), postback);
    return new Response("OK", { headers });
  } catch {
    console.error("Could not save ayeT Rewarded Video postback");
    return new Response("Unavailable", { status: 503, headers });
  }
}
