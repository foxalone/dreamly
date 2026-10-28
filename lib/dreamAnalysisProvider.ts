import { DREAM_ANALYSIS_FALLBACK_MODEL, DREAM_ANALYSIS_MODEL } from "./aiModels";

const BALANCE_CODES = new Set(["credit_balance_exhausted", "insufficient_quota", "billing_hard_limit_reached"]);

export function isProviderBalanceExhausted(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === "string" && BALANCE_CODES.has(code);
}

export function dreamAnalysisErrorCode(error: unknown): "AI_QUOTA_EXHAUSTED" | "AI_RATE_LIMITED" | "AI_TIMEOUT" | "AI_UNAVAILABLE" {
  if (isProviderBalanceExhausted(error)) return "AI_QUOTA_EXHAUSTED";
  const e = error as { status?: number; name?: string; code?: string } | null;
  if (e?.status === 429) return "AI_RATE_LIMITED";
  if (e?.status === 408 || e?.status === 504 || e?.name === "APIConnectionTimeoutError" || e?.code === "ETIMEDOUT") return "AI_TIMEOUT";
  return "AI_UNAVAILABLE";
}

/** Try another existing model only for a temporary, model-specific 429. */
export async function generateDreamAnalysis(create: (model: string) => Promise<string>) {
  try {
    return { analysis: await create(DREAM_ANALYSIS_MODEL), model: DREAM_ANALYSIS_MODEL };
  } catch (error) {
    if (dreamAnalysisErrorCode(error) !== "AI_RATE_LIMITED") throw error;
    return { analysis: await create(DREAM_ANALYSIS_FALLBACK_MODEL), model: DREAM_ANALYSIS_FALLBACK_MODEL };
  }
}
