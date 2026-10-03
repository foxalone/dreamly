/**
 * Admin / Game — дизайн-док «Dream Kingdoms» (кликер + постройки на карте).
 * Статус: идея / брейншторм. Ничего из этого ещё не реализовано в продукте.
 * RULES — решения, принятые владельцем. Всё остальное — предложения на обсуждение.
 */

type Rule = { rule: string; value: string; note: string; decided: string };

/** Принятые правила — source of truth для будущей реализации. */
const RULES: Rule[] = [
  {
    rule: "Тап — гость (не залогинен)",
    value: "3 существа за тап",
    note: "Гости могут играть. Меньше, чем у залогиненного, — стимул зарегистрироваться.",
    decided: "2026-10-03",
  },
  {
    rule: "Тап — залогиненный юзер",
    value: "5 существ за тап",
    note: "Базовое значение до бустов и апгрейдов.",
    decided: "2026-10-03",
  },
  {
    rule: "Какие существа выпадают",
    value: "случайно",
    note: "Полностью рандомно на каждый тап.",
    decided: "2026-10-03",
  },
  {
    rule: "Постройки",
    value: "дом → дом больше → дворец → …",
    note: "Покупаются за существ и ставятся на карту (отдельный слой).",
    decided: "2026-10-03",
  },
  {
    rule: "Соревнование",
    value: "у кого больше дом / дворец",
    note: "Сравнение с другими игроками на карте.",
    decided: "2026-10-03",
  },
];

const BUILDINGS = [
  { name: "Шалаш", cost: "50", prod: "0.2 / сек" },
  { name: "Домик", cost: "500", prod: "2 / сек" },
  { name: "Башня", cost: "5 000", prod: "20 / сек" },
  { name: "Замок", cost: "50 000", prod: "200 / сек" },
  { name: "Дворец", cost: "500 000", prod: "2 000 / сек" },
  { name: "Небесная цитадель", cost: "5 000 000", prod: "20 000 / сек" },
  { name: "Дворец Онейроса", cost: "50 000 000", prod: "200 000 / сек" },
] as const;

const RARITY = [
  { tier: "Обычное", chance: "~80%", note: "основная масса" },
  { tier: "Редкое", chance: "~15%", note: "" },
  { tier: "Эпическое", chance: "~4.5%", note: "" },
  { tier: "Легендарное", chance: "~0.5%", note: "азарт коллекционера, повод тапать дальше" },
] as const;

const DREAM_HOOKS = [
  { action: "Записал сон", reward: "«Ночной урожай» + гарантированное редкое существо — из эмодзи этого сна (приснился кит → кит в деревне)" },
  { action: "Поделился анонимно", reward: "Бейдж-существо (Единорог → … → Онейрос) = «герой» деревни с постоянным множителем производства" },
  { action: "Серия дней подряд со снами", reward: "Растущий бонус-множитель" },
  { action: "Пригласил друга", reward: "Легендарное существо обоим" },
] as const;

const MONEY = [
  { what: "Pro-подписка (главное)", how: "x2 пассивное производство, офлайн-накопление 24ч вместо 2ч, доп. слот здания, эксклюзивный скин замка" },
  { what: "Косметика", how: "Скины замков, флаги, подсветка на карте, «вечный монумент» в городе — статус, который видят другие" },
  { what: "Бусты", how: "x3 на час, мгновенная постройка. НЕ влияют на сезонный рейтинг (или дневной лимит), иначе рейтинг покупается" },
  { what: "Сезонный пасс", how: "Бесплатная дорожка + платная с косметикой, каждый сезон" },
  { what: "Вирусность (косвенно)", how: "OG-картинка «Мой дворец №1 в Хайфе» для шеринга, реферальные награды" },
] as const;

const IDEAS = [
  "Прогресс гостя хранится локально и переносится в аккаунт при регистрации — «Зарегистрируйся, чтобы не потерять 230 существ и получать 5 вместо 3».",
  "Гость может тапать, но поставить замок на карту — только после регистрации.",
  "Экран возвращения: «Пока ты спал, твои существа нашли 1 340 друзей».",
  "Уведомление «Твой дворец обогнали в Тель-Авиве» — сильнейший триггер возврата (email / push).",
  "Бестиарий: коллекция всех существ, не найденные — серыми силуэтами (как таймлайн бейджей).",
  "Слияние: 3 одинаковых → 1 следующей редкости. Сток для лишних существ, держит экономику.",
  "Каждое существо ведёт на страницу символа в словаре (🐍 → значение змеи во сне) — внутренние ссылки для SEO.",
  "Ивенты: Хэллоуин (31 октября) — «кошмарные» существа ограниченное время.",
  "Город против города — коллективный рейтинг, зовёт друзей «за свой город».",
  "Сезоны раз в месяц: рейтинг обнуляется, остаётся трофей — новички могут догнать.",
];

const DONTS = [
  "Не продавать случайных существ за деньги (лутбоксы) — в ряде стран регулируется как азартные игры. Рандом только в бесплатном тапе.",
  "Без PvP-разрушения замков в первой версии — ломает атмосферу сайта о снах. Лучше визиты и подарки.",
  "Никаких точных координат: замок ставится на уровне города, со смещением.",
  "Не писать каждый тап в Firestore — батч раз в 10–20 сек.",
];

const TECH = [
  "Тапы копятся на клиенте, на сервер уходят пачкой; сервер проверяет лимит (≈15 тапов/сек), иначе рейтинг заберут автокликеры.",
  "Пассивный доход считается на сервере формулой от lastSeen — без постоянных записей.",
  "Баланс и покупки зданий — только на сервере (иначе взлом через DevTools за вечер).",
  "Гости: rate-limit по IP / guest-id, чтобы 3 за тап не фармили скриптами.",
  "Карта: при отдалении — только самый большой дворец города, при приближении — все (кластеризация). Новый слой рядом с текущим city_emoji_stats.",
  "Цена N-го одинакового здания = base × 1.15^N (классическая формула кликеров).",
];

const MVP = [
  "Тап + существа с редкостью (гость 3 / юзер 5)",
  "4 постройки",
  "Бонус за записанный сон",
  "Замок на карте + рейтинг города",
  "Без монетизации — 2–3 недели смотреть метрики",
];

const METRICS = [
  "Возврат D1 / D7",
  "Записанных снов на юзера — главный: если выросло, развиваем; если только кликают — игра отвлекает, урезаем",
  "Шеры снов",
  "Конверсия гость → регистрация после тапа",
];

const th = "p-3 font-semibold";
const thead = "border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--text)_6%,transparent)] text-left";
const tr = "border-b border-[var(--border)] last:border-0";
const h3 = "text-base font-semibold border-b border-[var(--border)] pb-2";
const ul = "mt-3 list-disc pl-5 space-y-1.5 text-[var(--muted)]";

export default function DreamKingdomsDoc() {
  return (
    <article className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_85%,transparent)]">
        <div className="text-xs text-[var(--muted)]">
          Admin / Game / <span className="text-[var(--text)]">Dream Kingdoms</span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-[var(--text)]">
          Dream Kingdoms — кликер + королевства на карте
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Обновлено: 2026-10-03 · Статус: идея, ещё не реализовано
        </p>
      </div>

      <div className="px-6 py-6 space-y-8 text-[var(--text)] text-sm leading-relaxed">
        <div className="rounded-xl border border-[color-mix(in_srgb,#3b82f6_40%,var(--border))] bg-[color-mix(in_srgb,#3b82f6_12%,var(--card))] px-4 py-3">
          <div className="font-semibold">Главный принцип</div>
          <p className="mt-1 text-[var(--muted)]">
            Игра должна кормить основное действие — записать сон, поделиться, оформить Pro. Самый
            быстрый способ расти в игре — пользоваться дневником, а не кликать.
          </p>
        </div>

        <section>
          <h3 className={h3}>1. Rules — принятые решения</h3>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[color-mix(in_srgb,#22c55e_40%,var(--border))]">
            <table className="w-full text-sm">
              <thead>
                <tr className={thead}>
                  <th className={th}>Правило</th>
                  <th className={th}>Значение</th>
                  <th className={th}>Комментарий</th>
                  <th className={th}>Решено</th>
                </tr>
              </thead>
              <tbody>
                {RULES.map((r) => (
                  <tr key={r.rule} className={tr}>
                    <td className="p-3">{r.rule}</td>
                    <td className="p-3 font-semibold whitespace-nowrap">{r.value}</td>
                    <td className="p-3 text-[var(--muted)]">{r.note}</td>
                    <td className="p-3 font-mono text-xs whitespace-nowrap">{r.decided}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">Всё ниже — предложения на обсуждение, не решения.</p>
        </section>

        <section>
          <h3 className={h3}>2. Базовый цикл</h3>
          <ul className={ul}>
            <li>
              <strong className="text-[var(--text)]">Тап</strong> по луне / облаку / ловцу снов → вылетают
              существа из мира Dreamly (те же эмодзи, что AI достаёт из снов: 🐉🦋🌊🗝️).
            </li>
            <li>
              <strong className="text-[var(--text)]">Постройки</strong> производят существ сами, пока юзера
              нет (как бабушки в Cookie Clicker).
            </li>
            <li>
              <strong className="text-[var(--text)]">Апгрейды:</strong> «Ловец снов» (авто-тап), «Лунный
              колодец» (+50% к домикам), «Ночной урожай» (x2 ночью по часовому поясу юзера).
            </li>
          </ul>
          <h4 className="mt-5 text-sm font-semibold">Редкость существ</h4>
          <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className={thead}>
                  <th className={th}>Редкость</th>
                  <th className={th}>Шанс</th>
                  <th className={th}>Комментарий</th>
                </tr>
              </thead>
              <tbody>
                {RARITY.map((r) => (
                  <tr key={r.tier} className={tr}>
                    <td className="p-3">{r.tier}</td>
                    <td className="p-3 font-semibold">{r.chance}</td>
                    <td className="p-3 text-[var(--muted)]">{r.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h4 className="mt-5 text-sm font-semibold">Лестница построек (черновой баланс, ×10 за ступень)</h4>
          <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className={thead}>
                  <th className={th}>Здание</th>
                  <th className={th}>Цена (существ)</th>
                  <th className={th}>Производство</th>
                </tr>
              </thead>
              <tbody>
                {BUILDINGS.map((b) => (
                  <tr key={b.name} className={tr}>
                    <td className="p-3">{b.name}</td>
                    <td className="p-3 font-mono text-xs">{b.cost}</td>
                    <td className="p-3 text-[var(--muted)]">{b.prod}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className={h3}>3. Связка со снами</h3>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className={thead}>
                  <th className={th}>Действие</th>
                  <th className={th}>Награда в игре</th>
                </tr>
              </thead>
              <tbody>
                {DREAM_HOOKS.map((d) => (
                  <tr key={d.action} className={tr}>
                    <td className="p-3 whitespace-nowrap">{d.action}</td>
                    <td className="p-3 text-[var(--muted)]">{d.reward}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h3 className={h3}>4. Карта и соревнование</h3>
          <ul className={ul}>
            <li>Новый слой карты: «Сны» (как сейчас) / «Королевства».</li>
            <li>Замок ставится в городе юзера, только на уровне города, со смещением.</li>
            <li>Рядом с замком — бейдж-существо и никнейм, без настоящего имени.</li>
            <li>Рейтинги: мой город → страна → мир. «№1 в Хайфе» мотивирует сильнее, чем 48 392-е место в мире.</li>
            <li>Город против города — сумма силы всех королевств города.</li>
            <li>Сезоны (месяц): рейтинг обнуляется, остаётся косметический трофей.</li>
          </ul>
        </section>

        <section>
          <h3 className={h3}>5. Монетизация</h3>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className={thead}>
                  <th className={th}>Что</th>
                  <th className={th}>Как</th>
                </tr>
              </thead>
              <tbody>
                {MONEY.map((m) => (
                  <tr key={m.what} className={tr}>
                    <td className="p-3 whitespace-nowrap">{m.what}</td>
                    <td className="p-3 text-[var(--muted)]">{m.how}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Веб, не App Store: нет комиссии 30%, платежи через PayPal.
          </p>
        </section>

        <section>
          <h3 className={h3}>6. Чего не делаем</h3>
          <div className="mt-3 rounded-xl border border-[color-mix(in_srgb,#ef4444_40%,var(--border))] bg-[color-mix(in_srgb,#ef4444_10%,var(--card))] px-4 py-3">
            <ul className="list-disc pl-5 space-y-1.5 text-[var(--muted)]">
              {DONTS.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <h3 className={h3}>7. Техника и риски</h3>
          <ul className={ul}>
            {TECH.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className={h3}>8. Ещё идеи (на обсуждение)</h3>
          <ul className={ul}>
            {IDEAS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3 className={h3}>9. MVP и метрики</h3>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <h4 className="text-sm font-semibold">MVP</h4>
              <ol className="mt-2 list-decimal pl-5 space-y-1 text-[var(--muted)]">
                {MVP.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ol>
            </div>
            <div>
              <h4 className="text-sm font-semibold">Что измеряем</h4>
              <ul className="mt-2 list-disc pl-5 space-y-1 text-[var(--muted)]">
                {METRICS.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
