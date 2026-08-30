// Plain-text Telegram ping for things that happen while nobody is looking at
// the dashboard — a scheduled publish that failed, above all. Silent no-op when
// the bot is not configured, so nothing depends on it being set up.
const TELEGRAM_API = "https://api.telegram.org";
const MESSAGE_LIMIT = 3500;

function telegramConfig() {
  return {
    token: (process.env.TELEGRAM_BOT_TOKEN || "").trim(),
    chatId: (process.env.TELEGRAM_PERSONAL_CHAT_ID || "").trim(),
  };
}

export function telegramConfigured() {
  const { token, chatId } = telegramConfig();
  return Boolean(token && chatId);
}

export async function notifyTelegram(text: string) {
  const { token, chatId } = telegramConfig();
  const message = text.trim().slice(0, MESSAGE_LIMIT);
  if (!token || !chatId || !message) return "skipped" as const;

  try {
    const response = await fetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`telegram ${response.status}`);
    return "sent" as const;
  } catch (error) {
    console.error("[telegram]", error);
    return "failed" as const;
  }
}
