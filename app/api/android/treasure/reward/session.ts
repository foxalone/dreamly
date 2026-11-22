export const rewardSessions = "androidTreasureRewards";
export const rewardHeaders = { "Cache-Control": "private, no-store" };

export function treasureRewardUnit() {
  const unit = process.env.ADMOB_TREASURE_REWARDED_UNIT_ID?.trim();
  return unit && /^ca-app-pub-\d{16}\/\d+$/.test(unit) && !unit.startsWith("ca-app-pub-3940256099942544/") ? unit : null;
}

export function validTreasureChallenge(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(value);
}
