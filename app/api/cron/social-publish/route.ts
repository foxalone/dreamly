import { NextResponse } from "next/server";

import { runDueSocialPublishes } from "@/app/api/admin/_lib/socialSchedule";
import { reconcileInFlightTikTokPublishes } from "@/app/api/admin/tiktok/_lib";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Publishes every "All" batch whose scheduled moment has passed. YouTube is not
// handled here: it holds scheduled uploads itself.
function requireSocialPublishCronSecret(request: Request) {
  const secret = (process.env.SOCIAL_PUBLISH_CRON_SECRET || process.env.CRON_SECRET || "").trim();
  if (!secret) throw new Error("SOCIAL_PUBLISH_CRON_SECRET is not configured");
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    throw new Error("UNAUTHENTICATED");
  }
}

async function run(request: Request) {
  try {
    requireSocialPublishCronSecret(request);
    const result = await runDueSocialPublishes();
    const tiktok = await reconcileInFlightTikTokPublishes();
    return NextResponse.json({ success: true, ...result, tiktok });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("not configured") ? 503 : 500;
    if (status === 500) console.error("[cron/social-publish]", error);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(request: Request) {
  return run(request);
}

export async function POST(request: Request) {
  return run(request);
}
