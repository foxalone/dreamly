/** Translate upstream failures without returning provider responses or secrets to the browser. */
export function seoErrorResponse(error: unknown) {
  const info = error && typeof error === 'object' ? error as { code?: unknown; status?: unknown; name?: unknown; message?: unknown } : {};
  const code = typeof info.code === 'string' ? info.code : '';
  if (['credit_balance_exhausted', 'insufficient_quota', 'billing_hard_limit_reached'].includes(code)) {
    return { status: 503, code: 'SEO_AI_BALANCE', error: 'На аккаунте OpenAI исчерпан баланс или достигнут лимит расходов API. Проверьте оплату и лимиты проекта OpenAI, к которому относится ключ сервера. Затем повторите анализ. Повторно загружать отчёт не нужно.' };
  }
  if (info.status === 401 || code === 'invalid_api_key') {
    return { status: 503, code: 'SEO_AI_KEY', error: 'OpenAI отклонил ключ API сервера. Проверьте ключ и доступ к проекту OpenAI в настройках сервера.' };
  }
  if (info.status === 429) {
    return { status: 429, code: 'SEO_AI_RATE_LIMIT', error: 'OpenAI временно ограничил частоту запросов. Подождите немного и повторите анализ.' };
  }
  if (info.name === 'APIConnectionTimeoutError') {
    return { status: 504, code: 'SEO_AI_TIMEOUT', error: 'OpenAI не успел завершить анализ. Повторите попытку позже. Отчёт сохранён.' };
  }
  if (info.name === 'APIConnectionError') {
    return { status: 502, code: 'SEO_AI_CONNECTION', error: 'Сервер не смог подключиться к OpenAI. Повторите анализ позже. Отчёт сохранён.' };
  }
  if (error instanceof SyntaxError) {
    return { status: 502, code: 'SEO_INVALID_RESPONSE', error: 'Сервер получил неполный или некорректный ответ. Повторите действие. Если ошибка повторяется, проверьте журнал сервера.' };
  }
  const message = typeof info.message === 'string' ? info.message : '';
  if (message === 'UNAUTHENTICATED') return { status: 401, code: 'SEO_AUTH', error: 'Войдите в аккаунт.' };
  if (message === 'FORBIDDEN') return { status: 403, code: 'SEO_FORBIDDEN', error: 'Доступ только для администратора.' };
  return { status: 400, code: 'SEO_ERROR', error: /[А-Яа-яЁё]/.test(message) ? message.slice(0, 500) : 'Не удалось выполнить действие. Проверьте подключение и настройки сервера.' };
}
