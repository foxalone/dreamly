import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Credit packs are retired. Use PayPal subscriptions.", code: "CREDITS_RETIRED" },
    { status: 410 }
  );
}
