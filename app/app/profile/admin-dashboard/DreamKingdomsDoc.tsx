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
  {
    rule: "Прогресс гостя",
    value: "хранится в браузере → переносится в аккаунт",
    note: "При регистрации существа гостя переходят в аккаунт. Призыв: «Зарегистрируйся, чтобы не потерять N существ и получать 5 вместо 3».",
    decided: "2026-10-03",
  },
  {
    rule: "Постройки гостя на карте",
    value: "первая — без входа, дальше — только с входом",
    note: "Гость может поставить одно (первое) здание на карту без регистрации. Второе и следующие — только залогиненным.",
    decided: "2026-10-03",
  },
  {
    rule: "«Твой дворец обогнали»",
    value: "уведомление на сайте",
    note: "Не email (нет подходящей интеграции) — in-site notification.",
    decided: "2026-10-03",
  },
  {
    rule: "Экран возвращения",
    value: "да",
    note: "«Пока ты спал, твои существа нашли N» — показывать при возврате.",
    decided: "2026-10-03",
  },
  {
    rule: "Защита от скриптов (гости)",
    value: "да",
    note: "Rate-limit тапов по IP / guest-id + серверный потолок тапов/сек.",
    decided: "2026-10-03",
  },
  {
    rule: "Этап 1 — максимально просто",
    value: "тап + постройка на карте",
    note: "Сначала только тап и возможность поставить здание на карту. Усложняем со временем.",
    decided: "2026-10-03",
  },
  {
    rule: "Первое здание",
    value: "строится очень быстро",
    note: "Цена первого здания — всего несколько тапов, чтобы юзер сразу поставил его на карту. Предложение: 15 существ (3 тапа юзера / 5 тапов гостя).",
    decided: "2026-10-03",
  },
  {
    rule: "Пассивный доход здания",
    value: "1 существо в минуту",
    note: "С момента постройки здание приносит 1 существо в минуту — в том числе когда юзер не на сайте (считается на сервере от времени последнего визита, работает и для гостя). ≈ 1 440 в сутки.",
    decided: "2026-10-03",
  },
  {
    rule: "Шкала зданий (этап 1)",
    value: "10 зданий: 15 → 1/мин … 4 000 000 → 200/мин",
    note: "Первые три утверждены (15→1, 200→3, 1 000→5). Здания 4–10 — черновой баланс, полная таблица и симуляция — в разделе 2. Доход суммируется. Цена растёт быстрее дохода, поэтому каждое следующее здание занимает больше времени: regular-юзер доходит до 10-го примерно за месяц.",
    decided: "2026-10-03",
  },
  {
    rule: "Лимит офлайн-накопления",
    value: "есть потолок + нужно зайти и «Собрать»",
    note: "Здания копят существ в «хранилище» до потолка, потом останавливаются. Чтобы забрать — зайти на сайт и нажать «Собрать». Не должно быть «не заходил месяц — миллион существ». Потолок: 8 часов («одна ночь»). Позже Pro может увеличивать потолок.",
    decided: "2026-10-03",
  },
  {
    rule: "Существо → символ в словаре",
    value: "входит в этап 1",
    note: "Нажатие на существо открывает карточку «🐍 Змея во сне означает…» со ссылкой на страницу символа в словаре.",
    decided: "2026-10-03",
  },
  {
    rule: "Сохранение прогресса гостя",
    value: "браузер + копия на сервере по guest-id",
    note: "Выход и возврат в том же браузере — всё на месте. Другое устройство / инкогнито / очистка данных — прогресс гостя теряется; у залогиненного всё на сервере, на любом устройстве.",
    decided: "2026-10-03",
  },
];

/** Шкала 10 зданий — черновой баланс (симуляция 2026-10-03). Хранилище = 8 часов.
 *  Дни = в какой день юзер строит здание. Casual: 1 визит/день, 20 тапов. Regular: 2 визита/день, 60 тапов. Active: 3+ визита, 200 тапов. */
const BUILDINGS = [
  { n: 1, name: "🛖 Шалаш", cost: "15", rate: 1, total: 1, night: "480", payback: "15 мин", casual: 1, regular: 1, active: 1 },
  { n: 2, name: "🏠 Домик", cost: "200", rate: 3, total: 4, night: "1 920", payback: "1 ч", casual: 1, regular: 1, active: 1 },
  { n: 3, name: "🌬️ Мельница снов", cost: "1 000", rate: 5, total: 9, night: "4 320", payback: "3 ч", casual: 1, regular: 1, active: 1 },
  { n: 4, name: "🗼 Башня", cost: "5 000", rate: 10, total: 19, night: "9 120", payback: "8 ч", casual: 2, regular: 1, active: 1 },
  { n: 5, name: "🗽 Маяк", cost: "20 000", rate: 18, total: 37, night: "17 760", payback: "18 ч", casual: 5, regular: 2, active: 2 },
  { n: 6, name: "🏰 Замок", cost: "70 000", rate: 30, total: 67, night: "32 160", payback: "1.6 дня", casual: 9, regular: 4, active: 3 },
  { n: 7, name: "🏯 Дворец", cost: "200 000", rate: 50, total: 117, night: "56 160", payback: "2.8 дня", casual: 15, regular: 7, active: 5 },
  { n: 8, name: "☁️ Облачная цитадель", cost: "550 000", rate: 80, total: 197, night: "94 560", payback: "4.8 дня", casual: 25, regular: 12, active: 8 },
  { n: 9, name: "🌙 Лунный город", cost: "1 500 000", rate: 130, total: 327, night: "156 960", payback: "8 дней", casual: 40, regular: 20, active: 14 },
  { n: 10, name: "✨ Дворец Онейроса", cost: "4 000 000", rate: 200, total: 527, night: "252 960", payback: "14 дней", casual: 66, regular: 33, active: 22 },
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
  "Бестиарий: коллекция всех существ, не найденные — серыми силуэтами (как таймлайн бейджей).",
  "Слияние: 3 одинаковых → 1 следующей редкости. Сток для лишних существ, держит экономику.",
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
  "Тап → существа (гость 3 / юзер 5), прогресс гостя в браузере",
  "Постройка здания на карте (гость — только первое); первое здание — за несколько тапов",
  "Здание приносит 1 существо в минуту, и офлайн тоже",
  "Перенос прогресса гостя при регистрации",
  "Нажатие на существо → карточка символа + ссылка в словарь",
  "Защита от скриптов",
  "Без монетизации, без редкости, без апгрейдов — усложняем потом",
];

const METRICS = [
  "Возврат D1 / D7",
  "Записанных снов на юзера — главный: если выросло, развиваем; если только кликают — игра отвлекает, урезаем",
  "Шеры снов",
  "Конверсия гость → регистрация после тапа",
];

const PHASE1 = [
  { k: "Тап", v: "Случайные существа: гость — 3 за тап, залогиненный — 5." },
  { k: "Нажатие на существо", v: "Карточка «🐍 Змея во сне означает…» + ссылка на страницу символа в словаре." },
  { k: "Здания", v: "Шкала из 10 зданий: 15 → 1/мин, 200 → 3/мин, 1 000 → 5/мин … 4 000 000 → 200/мин (полная таблица в разделе 2). Доход суммируется, идёт и офлайн — но только до потолка хранилища." },
  { k: "Карта", v: "Новый слой «Королевства». Здание ставится в городе юзера — только уровень города, со смещением, без точного адреса." },
  { k: "Гость", v: "Может поставить только 1-е здание. 2-е и дальше — после регистрации. Призыв показываем, когда гость накопил 200 на 2-е здание." },
  { k: "Сохранение", v: "Гость: браузер + копия на сервере по guest-id (выход/возврат в том же браузере — всё на месте). Залогиненный: сервер, любое устройство. При регистрации прогресс гостя переходит в аккаунт: «Зарегистрируйся, чтобы не потерять N существ и получать 5 вместо 3»." },
  { k: "Хранилище и «Собрать»", v: "Офлайн-доход копится в хранилище до потолка (8 часов, «одна ночь»), потом здания стоят. Чтобы забрать — зайти и нажать «Собрать»." },
  { k: "Экран возвращения", v: "«Пока тебя не было, твои существа нашли N — Собрать». Если хранилище полное — «Хранилище полное, здания ждут тебя»." },
  { k: "«Твой дворец обогнали»", v: "Уведомление на сайте (не email), когда кто-то в твоём городе обогнал тебя." },
  { k: "Защита от скриптов", v: "Серверный потолок тапов/сек + rate-limit по IP / guest-id для гостей. Баланс и покупки — только на сервере." },
];

const PHASE1_NOT = "Не в этапе 1: редкость, апгрейды, монетизация, бестиарий, слияние, рейтинги/сезоны, ивенты.";

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
          Обновлено: 2026-10-03 · Статус: идея, ещё не реализовано · Этап 1: тап + постройка на карте
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
          <h3 className={h3}>Этап 1 — итог (решено 2026-10-03)</h3>
          <div className="mt-3 overflow-x-auto rounded-xl border border-[color-mix(in_srgb,#22c55e_40%,var(--border))] bg-[color-mix(in_srgb,#22c55e_6%,var(--card))]">
            <table className="w-full text-sm">
              <tbody>
                {PHASE1.map((r) => (
                  <tr key={r.k} className={tr}>
                    <td className="p-3 font-semibold whitespace-nowrap align-top">{r.k}</td>
                    <td className="p-3 text-[var(--muted)]">{r.v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">{PHASE1_NOT}</p>
        </section>

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
          <h4 className="mt-5 text-sm font-semibold">Шкала 10 зданий — экономика (черновой баланс, на утверждение)</h4>
          <p className="mt-1 text-xs text-[var(--muted)]">
            «Всего/мин» — доход всех зданий до этого включительно. «За ночь» — полное хранилище (8 ч) при этом наборе зданий.
            «Окупаемость» — за сколько здание отбивает свою цену. Последние три колонки — в какой день юзер строит здание
            (симуляция): casual — 1 визит/день и 20 тапов, regular — 2 визита и 60 тапов, active — 3+ визита и 200 тапов.
          </p>
          <div className="mt-2 overflow-x-auto rounded-xl border border-[var(--border)]">
            <table className="w-full text-sm">
              <thead>
                <tr className={thead}>
                  <th className={th}>#</th>
                  <th className={th}>Здание</th>
                  <th className={th}>Цена</th>
                  <th className={th}>/мин</th>
                  <th className={th}>Всего/мин</th>
                  <th className={th}>За ночь</th>
                  <th className={th}>Окупаемость</th>
                  <th className={th}>Casual</th>
                  <th className={th}>Regular</th>
                  <th className={th}>Active</th>
                </tr>
              </thead>
              <tbody>
                {BUILDINGS.map((b) => (
                  <tr key={b.n} className={tr}>
                    <td className="p-3 font-mono text-xs">{b.n}</td>
                    <td className="p-3 whitespace-nowrap">{b.name}</td>
                    <td className="p-3 font-mono text-xs whitespace-nowrap">{b.cost}</td>
                    <td className="p-3 font-semibold">{b.rate}</td>
                    <td className="p-3">{b.total}</td>
                    <td className="p-3 font-mono text-xs whitespace-nowrap">{b.night}</td>
                    <td className="p-3 text-[var(--muted)] whitespace-nowrap">{b.payback}</td>
                    <td className="p-3 text-[var(--muted)] whitespace-nowrap">день {b.casual}</td>
                    <td className="p-3 text-[var(--muted)] whitespace-nowrap">день {b.regular}</td>
                    <td className="p-3 text-[var(--muted)] whitespace-nowrap">день {b.active}</td>
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
          <h3 className={h3}>8. Ещё идеи (на потом, не в этапе 1)</h3>
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
              <h4 className="text-sm font-semibold">Этап 1 (решено: максимально просто)</h4>
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
