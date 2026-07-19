"use client";

/**
 * Внутренняя «Confluence»-страница: как устроена монетизация (кредиты / Upgrade).
 * Данные синхронизированы с кодом: lib/credits/packs.ts, PayPal API, dreams page.
 */

const PACKS = [
  { id: "pack_20", credits: 20, price: "$3.99" },
  { id: "pack_50", credits: 50, price: "$7.99" },
  { id: "pack_120", credits: 120, price: "$14.99", note: "default на /app/upgrade" },
  { id: "pack_300", credits: 300, price: "$29.99" },
] as const;

const ACTIONS = [
  { action: "Save dream / story", cost: "1 кредит", note: "при нехватке → /app/upgrade" },
  { action: "Analyze dream", cost: "2 кредита", note: "только dreams, не stories" },
  { action: "Roots / emoji icons", cost: "0", note: "бесплатно, без gate" },
  { action: "Share / Feed / Dictionary", cost: "0", note: "без списания кредитов" },
  { action: "Translate (shared feed)", cost: "0", note: "GPT через API, кэш в Firebase" },
] as const;

export default function ProDocs() {
  return (
    <article className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      {/* Confluence-like header */}
      <div className="px-6 py-4 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_85%,transparent)]">
        <div className="text-xs text-[var(--muted)]">
          Admin / Docs / <span className="text-[var(--text)]">Монетизация и кредиты</span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--text)]">
          Pro / Upgrade — как это работает
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Обновлено: 2026-07-19 · источник истины в коде, не подписка
        </p>
      </div>

      <div className="px-6 py-6 space-y-8 text-[var(--text)] text-sm leading-relaxed">
        {/* Info callout */}
        <div className="rounded-xl border border-[color-mix(in_srgb,#3b82f6_40%,var(--border))] bg-[color-mix(in_srgb,#3b82f6_12%,var(--card))] px-4 py-3">
          <div className="font-semibold">Важно</div>
          <p className="mt-1 text-[var(--muted)]">
            Отдельного статуса <span className="font-mono text-[var(--text)]">isPro</span> / подписки
            нет. «Upgrade» и «Pro» в продукте ={" "}
            <strong className="text-[var(--text)]">разовые пакеты кредитов через PayPal</strong>.
            Доступ к функциям определяется только балансом{" "}
            <span className="font-mono text-[var(--text)]">users/&#123;uid&#125;.credits</span>.
          </p>
        </div>

        {/* TOC */}
        <section>
          <h3 className="text-base font-semibold border-b border-[var(--border)] pb-2">
            Содержание
          </h3>
          <ol className="mt-3 list-decimal pl-5 space-y-1 text-[var(--muted)]">
            <li>Модель монетизации</li>
            <li>Пакеты кредитов</li>
            <li>Что списывается</li>
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
              Новый пользователь получает{" "}
              <strong className="text-[var(--text)]">10 welcome-кредитов</strong> (Cloud Function{" "}
              <span className="font-mono text-[var(--text)]">grantWelcomeCredits</span>).
            </li>
            <li>
              Покупка — one-time packs на{" "}
              <span className="font-mono text-[var(--text)]">/app/upgrade</span> и в профиле («Buy
              credits»).
            </li>
            <li>Провайдер: только PayPal (Stripe / subscription нет).</li>
            <li>
              Free vs Paid = «есть кредиты» vs «закончились»; feature-flags по Pro отсутствуют.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-base font-semibold border-b border-[var(--border)] pb-2">
            2. Пакеты кредитов
          </h3>
          <p className="mt-3 text-[var(--muted)]">
            Source of truth:{" "}
            <span className="font-mono text-[var(--text)]">lib/credits/packs.ts</span>
          </p>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_6%,transparent)] text-left">
                  <th className="p-3 font-semibold">Pack ID</th>
                  <th className="p-3 font-semibold">Кредиты</th>
                  <th className="p-3 font-semibold">Цена</th>
                  <th className="p-3 font-semibold">Заметка</th>
                </tr>
              </thead>
              <tbody>
                {PACKS.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3 font-mono text-xs">{p.id}</td>
                    <td className="p-3">{p.credits}</td>
                    <td className="p-3">{p.price} USD</td>
                    <td className="p-3 text-[var(--muted)]">
                      {"note" in p ? p.note : "—"}
                    </td>
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
          <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_6%,transparent)] text-left">
                  <th className="p-3 font-semibold">Действие</th>
                  <th className="p-3 font-semibold">Стоимость</th>
                  <th className="p-3 font-semibold">Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {ACTIONS.map((a) => (
                  <tr key={a.action} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3">{a.action}</td>
                    <td className="p-3 font-semibold">{a.cost}</td>
                    <td className="p-3 text-[var(--muted)]">{a.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-[var(--muted)]">
            При ошибке после списания — refund (+1 / +2) через Firestore transaction в{" "}
            <span className="font-mono text-[var(--text)]">app/app/dreams/page.tsx</span>.
          </p>
        </section>

        <section>
          <h3 className="text-base font-semibold border-b border-[var(--border)] pb-2">
            4. Платёжный flow (PayPal)
          </h3>
          <ol className="mt-3 list-decimal pl-5 space-y-2 text-[var(--muted)]">
            <li>
              UI выбирает <span className="font-mono text-[var(--text)]">packId</span> →{" "}
              <span className="font-mono text-[var(--text)]">POST /api/paypal/create-order</span>
              (сумма ставится на сервере из packs).
            </li>
            <li>PayPal Buttons → пользователь approve.</li>
            <li>
              <span className="font-mono text-[var(--text)]">POST /api/paypal/capture-order</span>{" "}
              с <span className="font-mono text-[var(--text)]">&#123; orderID, idToken &#125;</span>
              :
              <ul className="mt-1 list-disc pl-5 space-y-1">
                <li>проверка Firebase ID token;</li>
                <li>capture в PayPal;</li>
                <li>
                  идемпотентность:{" "}
                  <span className="font-mono text-[var(--text)]">transactions/&#123;orderID&#125;</span>
                  ;
                </li>
                <li>
                  <span className="font-mono text-[var(--text)]">credits += pack.credits</span>,{" "}
                  <span className="font-mono text-[var(--text)]">totalPurchasedCredits += …</span>
                </li>
              </ul>
            </li>
          </ol>
          <p className="mt-3 text-[var(--muted)]">
            Env:{" "}
            <span className="font-mono text-[var(--text)]">NEXT_PUBLIC_PAYPAL_CLIENT_ID</span>,{" "}
            <span className="font-mono text-[var(--text)]">PAYPAL_CLIENT_ID</span>,{" "}
            <span className="font-mono text-[var(--text)]">PAYPAL_CLIENT_SECRET</span>,{" "}
            <span className="font-mono text-[var(--text)]">PAYPAL_ENV</span> (sandbox / live).
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
                  <span className="font-mono text-[var(--text)]">credits</span> — баланс
                </li>
                <li>
                  <span className="font-mono text-[var(--text)]">creditsUpdatedAt</span>
                </li>
                <li>
                  <span className="font-mono text-[var(--text)]">welcomeBonusGranted</span>
                </li>
                <li>
                  <span className="font-mono text-[var(--text)]">totalPurchasedCredits</span> — сумма
                  купленных
                </li>
              </ul>
            </div>
            <div>
              <div className="font-semibold text-[var(--text)]">
                users/&#123;uid&#125;/creditLedger/welcome_bonus
              </div>
              <p className="mt-1">
                Запись welcome:{" "}
                <span className="font-mono text-[var(--text)]">
                  &#123; type: &quot;welcome_bonus&quot;, delta: 10 &#125;
                </span>
              </p>
            </div>
            <div>
              <div className="font-semibold text-[var(--text)]">transactions/&#123;orderID&#125;</div>
              <p className="mt-1">
                PayPal capture: packId, creditsAdded, amount, status COMPLETED, raw…
              </p>
            </div>
            <div>
              <div className="font-semibold text-[var(--text)]">RTDB analytics</div>
              <p className="mt-1 font-mono text-xs text-[var(--text)]">
                analytics/dreamly_upgrade/&#123;uid&#125;/visits|packClicks|…
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-base font-semibold border-b border-[var(--border)] pb-2">
            6. Ключевые файлы
          </h3>
          <ul className="mt-3 list-disc pl-5 space-y-1.5 font-mono text-xs text-[var(--muted)]">
            <li className="text-[var(--text)]">lib/credits/packs.ts</li>
            <li className="text-[var(--text)]">app/app/upgrade/UpgradeClient.tsx</li>
            <li className="text-[var(--text)]">app/app/profile/page.tsx</li>
            <li className="text-[var(--text)]">app/api/paypal/create-order/route.ts</li>
            <li className="text-[var(--text)]">app/api/paypal/capture-order/route.ts</li>
            <li className="text-[var(--text)]">app/app/dreams/page.tsx</li>
            <li className="text-[var(--text)]">functions/src/index.ts (welcome credits)</li>
            <li className="text-[var(--text)]">lib/paypal/server.ts</li>
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

        <div className="rounded-xl border border-[var(--border)] px-4 py-3 text-xs text-[var(--muted)]">
          Эта страница — внутренняя документация в админке (Confluence-style). При изменении
          цен/стоимости действий обновляй{" "}
          <span className="font-mono text-[var(--text)]">lib/credits/packs.ts</span> и этот блок.
        </div>
      </div>
    </article>
  );
}
