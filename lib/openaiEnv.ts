export const ONEIRO_OPENAI_API_KEY_ENV = "ONEIRO_OPENAI_API_KEY";
export const FALLBACK_OPENAI_API_KEY_ENV = "OPENAI_API_KEY";

export function getOneiroOpenAiApiKey() {
  return (
    process.env[ONEIRO_OPENAI_API_KEY_ENV]?.trim() ||
    process.env[FALLBACK_OPENAI_API_KEY_ENV]?.trim() ||
    ""
  );
}

export function getMissingOneiroOpenAiKeyMessage() {
  return `Missing ${ONEIRO_OPENAI_API_KEY_ENV} in environment. ${FALLBACK_OPENAI_API_KEY_ENV} is still accepted as a temporary fallback.`;
}
