"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";

/**
 * Внутренняя «Confluence»-страница: как устроена монетизация (PayPal-подписки).
 * Данные синхронизированы с кодом: lib/subscriptions/plans.ts, app/api/dreams/_lib/subscription.ts, PayPal Subscriptions API.
 */

const PLANS = [
  { id: "monthly", price: "$6.99", note: "3-дневный trial, затем каждый месяц" },
  { id: "yearly", price: "$69.99", note: "3-дневный trial, ~2 месяца в подарок" },
] as const;

/** Платные / условно платные действия — source: app/api/dreams/_lib/subscription.ts + dreams page */
const ACTIONS = [
  {
    action: "Сохранить сон / story",
    cost: "подписка + 1 из 5/день",
    note: "POST /api/dreams/consume-slot, затем Firestore addDoc. 250 символов.",
  },
  {
    action: "Analyze (разбор сна)",
    cost: "подписка + 1 из 5/день",
    note: "consumeDreamSlot на сервере. Гость: 1 бесплатный ask.",
  },
  {
    action: "Quick Symbol — нашли в словаре",
    cost: "0",
    note: "Бесплатно, без GPT",
  },
  {
    action: "Quick Symbol — GPT (не нашли)",
    cost: "гость 1 free / юзер — подписка",
    note: "Списание дневного слота нет, нужна активная подписка",
  },
  {
    action: "Rootwords / translate / emoji-pick",
    cost: "подписка",
    note: "Входят в план, без отдельного дневного капа",
  },
] as const;

const FREE_ALWAYS = [
  { action: "Словарь /dreams, SEO-страницы", note: "Публичный контент" },
  { action: "Share в ленту, реакции", note: "Без списания" },
  { action: "Translate из кэша", note: "Без OpenAI" },
  { action: "Локальные emoji / иконки в UI", note: "Без вызова emoji-pick API" },
] as const;

type BackfillRow = {
  uid: string;
  storyId: string;
  status: "ingested" | "skipped" | "error";
  reason?: string;
};

const SKIP_REASONS: Record<string, string> = {
  no_emojis: "нет emoji у story",
  already_ingested: "уже есть в map_ingested",
  deleted: "story удалена",
  bad_path: "битый путь users/{uid}/stories",
  ingest_skipped: "ingest вернул skipped",
};

export default function ProDocs() {
  const [backfillBusy, setBackfillBusy] = useState(false);
  const [backfillMsg, setBackfillMsg] = useState<string | null>(null);
  const [backfillRows, setBackfillRows] = useState<BackfillRow[]>([]);

  async function runStoryMapBackfill() {
    if (backfillBusy) return;
    const ok = confirm(
      "One-time backfill: добавить emoji существующих stories на карту?\nУже ingest’нутые будут пропущены."
    );
    if (!ok) return;

    setBackfillBusy(true);
    setBackfillMsg(null);
    setBackfillRows([]);

    try {
      const u = auth.currentUser;
      if (!u) throw new Error("Not signed in");
      const token = await u.getIdToken();

      const res = await fetch("/api/admin/map/backfill-stories", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Backfill failed");

      const rows: BackfillRow[] = Array.isArray(data.results) ? data.results : [];
      setBackfillRows(rows);
      setBackfillMsg(
        `Готово: total=${data.totalStories ?? 0}, ingested=${data.ingested ?? 0}, skipped=${data.skipped ?? 0}, errors=${data.errors ?? 0}`
      );
    } catch (e: any) {
      setBackfillMsg(e?.message ?? "Backfill failed");
    } finally {
      setBackfillBusy(false);
    }
  }

  return (
    <article className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      {/* Confluence-like header */}
      <div className="px-6 py-4 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_85%,transparent)]">
        <div className="text-xs text-[var(--muted)]">
          Admin / Docs / <span className="text-[var(--text)]">Монетизация и подписки</span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--text)]">
          Pro / Upgrade — как это работает
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Обновлено: 2026-09-07 · PayPal-подписки
        </p>
      </div>

      <div className="px-6 py-6 space-y-8 text-[var(--text)] text-sm leading-relaxed">
        {/* Info callout */}
        <div className="rounded-xl border border-[color-mix(in_srgb,#3b82f6_40%,var(--border))] bg-[color-mix(in_srgb,#3b82f6_12%,var(--card))] px-4 py-3">
          <div className="font-semibold">Важно</div>
          <p className="mt-1 text-[var(--muted)]">
            Доступ = активная PayPal-подписка или trial (
            <span className="font-mono text-[var(--text)]">users/&#123;uid&#125;.subscriptionStatus</span>
            ). Гость получает 1 бесплатную интерпретацию. Лимиты: 5 снов/день UTC и 250 символов.
          </p>
        </div>

        {/* TOC */}
        <section>
          <h3 className="text-base font-semibold border-b border-[var(--border)] pb-2">
            Содержание
          </h3>
          <ol className="mt-3 list-decimal pl-5 space-y-1 text-[var(--muted)]">
            <li>Модель монетизации</li>
            <li>Тарифы</li>
            <li>Что списывается (актуальная таблица)</li>
            <li>Платёжный flow (PayPal)</li>
            <li>Firebase / данные</li>
            <li>Ключевые файлы</li>
            <li>Admin / аналитика</li>
          </ol>
        </section>

        <section>
          <h3 className="text-base font-semibold border-b border-[var(--border)] pb-2">
            1. Модель монетизации
          </h3>
          <ul className="mt-3 list-disc pl-5 space-y-1.5 text-[var(--muted)]">
            <li>
              Гость: <strong className="text-[var(--text)]">1 бесплатная интерпретация</strong>.
            </li>
            <li>
              Дальше нужен PayPal-план: monthly $6.99 / yearly $69.99, trial 3 дня (
              <span className="font-mono text-[var(--text)]">/app/upgrade</span>).
            </li>
            <li>
              Лимиты всегда: 5 снов в UTC-день, 250 символов на сон.
            </li>
            <li>Welcome-кредиты больше не выдаются.</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold border-b border-[var(--border)] pb-2">
            2. Тарифы
          </h3>
          <p className="mt-3 text-[var(--muted)]">
            Source of truth:{" "}
            <span className="font-mono text-[var(--text)]">lib/subscriptions/plans.ts</span>
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_6%,transparent)] text-left">
                  <th className="p-3 font-semibold">Plan ID</th>
                  <th className="p-3 font-semibold">Цена</th>
                  <th className="p-3 font-semibold">Заметка</th>
                </tr>
              </thead>
              <tbody>
                {PLANS.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3 font-mono text-xs">{p.id}</td>
                    <td className="p-3">{p.price} USD</td>
                    <td className="p-3 text-[var(--muted)]">{p.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold border-b border-[var(--border)] pb-2">
            3. Что списывается
          </h3>

          <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,#f59e0b_40%,var(--border))] bg-[color-mix(in_srgb,#f59e0b_12%,var(--card))] px-4 py-3">
            <div className="font-semibold">5 снов в день (UTC)</div>
            <p className="mt-1 text-[var(--muted)]">
              Общий слот на save и analyze. Rootwords / translate / emoji-pick входят в подписку без
              отдельного капа. Гость: 1 бесплатный analyze.
            </p>
          </div>

          <h4 className="mt-5 text-sm font-semibold text-[var(--text)]">Что требует подписку</h4>
          <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_6%,transparent)] text-left">
                  <th className="p-3 font-semibold">Действие</th>
                  <th className="p-3 font-semibold">Цена</th>
                  <th className="p-3 font-semibold">Когда / комментарий</th>
                </tr>
              </thead>
              <tbody>
                {ACTIONS.map((a) => (
                  <tr key={a.action} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3">{a.action}</td>
                    <td className="p-3 font-semibold whitespace-nowrap">{a.cost}</td>
                    <td className="p-3 text-[var(--muted)]">{a.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 className="mt-5 text-sm font-semibold text-[var(--text)]">Бесплатно всегда</h4>
          <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_6%,transparent)] text-left">
                  <th className="p-3 font-semibold">Действие</th>
                  <th className="p-3 font-semibold">Цена</th>
                  <th className="p-3 font-semibold">Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {FREE_ALWAYS.map((a) => (
                  <tr key={a.action} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3">{a.action}</td>
                    <td className="p-3 font-semibold">0</td>
                    <td className="p-3 text-[var(--muted)]">{a.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h4 className="mt-5 text-sm font-semibold text-[var(--text)]">Типичный сценарий</h4>
          <ol className="mt-2 list-decimal pl-5 space-y-1 text-[var(--muted)]">
            <li>Гость: 1 бесплатный analyze</li>
            <li>Sign-in → Subscribe (trial 3 дня)</li>
            <li>Save + analyze: 1 слот из 5 за UTC-день</li>
          </ol>
          <p className="mt-3 text-[var(--muted)]">
            Auth обязателен на AI-роутах подписанного пользователя. При ошибке GPT analyze возвращает дневной слот.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold border-b border-[var(--border)] pb-2">
            4. Платёжный flow (PayPal)
          </h3>
          <ol className="mt-3 list-decimal pl-5 space-y-2 text-[var(--muted)]">
            <li>
              UI выбирает monthly/yearly →{" "}
              <span className="font-mono text-[var(--text)]">POST /api/paypal/create-subscription</span>
            </li>
            <li>PayPal Buttons (intent=subscription) → пользователь approve.</li>
            <li>
              <span className="font-mono text-[var(--text)]">POST /api/paypal/activate-subscription</span>{" "}
              пишет status/plan/accessUntilMs в users/&#123;uid&#125;.
            </li>
            <li>
              Webhook <span className="font-mono text-[var(--text)]">/api/paypal/webhook</span> синхронизирует
              renew/cancel/suspend.
            </li>
          </ol>
          <p className="mt-3 text-[var(--muted)]">
            Env:{" "}
            <span className="font-mono text-[var(--text)]">NEXT_PUBLIC_PAYPAL_CLIENT_ID</span>,{" "}
            <span className="font-mono text-[var(--text)]">PAYPAL_CLIENT_ID</span>,{" "}
            <span className="font-mono text-[var(--text)]">PAYPAL_CLIENT_SECRET</span>,{" "}
            <span className="font-mono text-[var(--text)]">PAYPAL_ENV</span>, опционально{" "}
            <span className="font-mono text-[var(--text)]">PAYPAL_WEBHOOK_ID</span> / plan IDs.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold border-b border-[var(--border)] pb-2">
            5. Firebase / данные
          </h3>
          <div className="mt-3 space-y-3 text-[var(--muted)]">
            <div>
              <div className="font-semibold text-[var(--text)]">users/&#123;uid&#125;</div>
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li>
                  <span className="font-mono text-[var(--text)]">subscriptionStatus</span> — trial / active /
                  cancelled / none
                </li>
                <li>
                  <span className="font-mono text-[var(--text)]">paypalSubscriptionId</span>
                </li>
                <li>
                  <span className="font-mono text-[var(--text)]">accessUntilMs</span>
                </li>
                <li>
                  <span className="font-mono text-[var(--text)]">dreamsDayKey</span> /{" "}
                  <span className="font-mono text-[var(--text)]">dreamsTodayCount</span>
                </li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-[var(--text)]">paypalSubscriptions/&#123;id&#125;</div>
              <p className="mt-1">Маппинг PayPal subscription → uid</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold border-b border-[var(--border)] pb-2">
            6. Ключевые файлы
          </h3>
          <ul className="mt-3 list-disc pl-5 space-y-1.5 font-mono text-xs text-[var(--muted)]">
            <li className="text-[var(--text)]">lib/subscriptions/plans.ts</li>
            <li className="text-[var(--text)]">app/api/dreams/_lib/subscription.ts</li>
            <li className="text-[var(--text)]">app/api/paypal/create-subscription/route.ts</li>
            <li className="text-[var(--text)]">app/api/paypal/webhook/route.ts</li>
            <li className="text-[var(--text)]">app/app/upgrade/UpgradeClient.tsx</li>
            <li className="text-[var(--text)]">app/app/profile/page.tsx</li>
            <li className="text-[var(--text)]">app/app/dreams/page.tsx</li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold border-b border-[var(--border)] pb-2">
            7. Admin / аналитика
          </h3>
          <ul className="mt-3 list-disc pl-5 space-y-1.5 text-[var(--muted)]">
            <li>
              Вкладка <strong className="text-[var(--text)]">Users</strong>: колонки Upgrade visits /
              Pack clicks из RTDB.
            </li>
            <li>
              UI для ручной выдачи / списания кредитов{" "}
              <strong className="text-[var(--text)]">нет</strong> — только Firebase Console.
            </li>
            <li>
              Список транзакций в админке не выведен; смотреть коллекцию{" "}
              <span className="font-mono text-[var(--text)]">transactions</span>.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold border-b border-[var(--border)] pb-2">
            8. Map — one-time backfill stories
          </h3>
          <p className="mt-3 text-[var(--muted)]">
            Проходит все <span className="font-mono text-[var(--text)]">users/*/stories</span> с
            emoji и пишет их в карту (
            <span className="font-mono text-[var(--text)]">storyEmojis</span> /{" "}
            <span className="font-mono text-[var(--text)]">map_ingested</span>). Уже загруженные
            пропускаются — можно жать повторно.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runStoryMapBackfill}
              disabled={backfillBusy}
              className="px-4 py-2 rounded-full text-sm font-semibold border border-[var(--border)] bg-[var(--text)] text-[var(--bg)] disabled:opacity-60"
            >
              {backfillBusy ? "Running…" : "Backfill stories → map"}
            </button>
            {backfillMsg ? (
              <span className="text-xs text-[var(--muted)] font-mono">{backfillMsg}</span>
            ) : null}
          </div>

          <div className="mt-3 text-xs text-[var(--muted)] space-y-1">
            <div>
              <strong className="text-[var(--text)]">skipped</strong> — не ошибка: нет emoji /
              уже в <span className="font-mono">map_ingested</span> / удалена
            </div>
            <div>
              <strong className="text-[var(--text)]">errors</strong> — ingest упал (часто нет
              Firebase admin env на сервере). Смотри reason ниже.
            </div>
          </div>

          {backfillRows.length > 0 ? (
            <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_6%,transparent)] text-left">
                    <th className="p-2 font-semibold">status</th>
                    <th className="p-2 font-semibold">reason</th>
                    <th className="p-2 font-semibold">uid</th>
                    <th className="p-2 font-semibold">storyId</th>
                  </tr>
                </thead>
                <tbody>
                  {backfillRows.map((r) => (
                    <tr
                      key={`${r.uid}_${r.storyId}`}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="p-2 font-semibold">{r.status}</td>
                      <td className="p-2 text-[var(--muted)]">
                        {r.reason
                          ? SKIP_REASONS[r.reason] || r.reason
                          : r.status === "ingested"
                            ? "ok"
                            : "—"}
                      </td>
                      <td className="p-2 font-mono">{r.uid.slice(0, 10)}…</td>
                      <td className="p-2 font-mono">{r.storyId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <div className="rounded-xl border border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)]">
          Эта страница — внутренняя документация в админке (Confluence-style). При изменении
          цен/стоимости действий обновляй{" "}
          <span className="font-mono text-[var(--text)]">app/api/dreams/_lib/subscription.ts</span>,{" "}
          <span className="font-mono text-[var(--text)]">lib/subscriptions/plans.ts</span> и этот блок.
        </div>
      </div>
    </article>
  );
}
