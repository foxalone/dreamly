import { adMobTimestampMs, verifyAdMobCallback } from "@/lib/admobSsv";

export const runtime = "nodejs";

const WEB_UNIT = "23381967403";
const WEB_UNIT_PATH = "/23382781832/dreamly_rewarded";
const TEST_UNIT = "1234567890";
const MAX_CLOCK_SKEW_MS = 5 * 60_000;
const headers = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  try {
    const params = await verifyAdMobCallback(request.url);
    if (!params) return new Response(null, { status: 400, headers });

    const unit = params.get("ad_unit");
    if (unit === TEST_UNIT && !params.has("custom_data") && !params.has("user_id")) {
      return new Response(null, { status: 200, headers });
    }
    const time = adMobTimestampMs(params.get("timestamp"));
    if ((unit !== WEB_UNIT && unit !== WEB_UNIT_PATH) || params.get("reward_amount") !== "1"
      || params.get("reward_item") !== "dream" || !/^[A-Za-z0-9_-]{12,128}$/.test(params.get("transaction_id") ?? "")
      || !Number.isSafeInteger(time) || Math.abs(Date.now() - time) > MAX_CLOCK_SKEW_MS) {
      return new Response(null, { status: 400, headers });
    }

    // Check what the web inventory actually returns before enabling credits for it.
    console.info("Google web reward callback verified", {
      hasCustomData: Boolean(params.get("custom_data")),
      hasUserId: Boolean(params.get("user_id")),
    });
    return new Response(null, { status: 200, headers });
  } catch {
    return new Response(null, { status: 503, headers });
  }
}
