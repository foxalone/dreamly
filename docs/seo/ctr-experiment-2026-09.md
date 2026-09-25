# CTR experiment — dream page SEO titles/descriptions (2026-09)

Status: **IMPLEMENTED IN CODE, NOT DEPLOYED (2026-09-25).** Old titles/descriptions and the "Verified" column were filled from the code during implementation (see "Implementation" and "Validation" at the end).

- Primary KPI: Google Search CTR of the 27 changed URLs vs the control group.
- Guardrails: impressions and average position must not materially decline; indexing unaffected; zero visible UI change.
- Scope: only the Google-facing `<title>` and `meta description`. No H1, sections, FAQ, OG/Twitter image, JSON-LD, canonical, robots, hreflang or sitemap changes.
- Change date: `YYYY-MM-DD` (fill in on deploy). Compare 28 days before vs 28 days after, same weekdays, excluding the first 7 days after deploy (recrawl lag).

## Baseline source and its limitations

- File: `dreamly_art-data-2026-09-25.xlsx` (GSC export, 2026-06-27 … 2026-09-24).
- Sheet "GSC Daily" (site total): 106,972 impressions, 981 clicks, CTR 0.92%, avg position ~8. Last 28 days: 78,513 impressions, 733 clicks, CTR 0.93%, avg pos 8.3.
- Sheets "GSC Pages" / "GSC Queries" were exported with Country × Device dimensions. They sum to only **13,330 impressions / 50 clicks (~12% of site impressions)** because GSC drops anonymized and low-volume rows at that granularity. Page-level numbers below are a **partial slice**, useful to compare pages with each other, not as absolute totals.
- The export has no page↔query join. Queries were assigned to pages by keyword matching.
- Many localized pages first appeared in results on 2026-09-13; their positions were still settling at baseline time, and site impressions roughly tripled between 2026-09-12 and 2026-09-20. Before/after on its own is therefore confounded; compare against the control group.
- Per-page volumes are small (most localized pages: 20–60 impressions). Judge the group as a whole; only work, elephant-chasing-you, luxury-hotel, flying and es/heights have enough volume to read individually.
- CTR by position bucket (page slice, homepage excluded): pos 1–5 5.4%; 5–8 1.1%; **8–11 0.2%** (3,423 impr., 7 clicks); 11–15 0.3%.
- For the after-measurement, export Pages **without** Country/Device (or use the GSC API with page+query) to get full numbers; re-pull the "before" window the same way for a like-for-like comparison.

## How the old metadata was produced (from code)

- Symbol pages (`/dreams/{slug}` and `/{locale}/dreams/{slug}`) get their metadata from `dreamSymbolMetadata()` in `app/dreams/DreamSymbolView.tsx`, which reads `entry.seoTitle` / `entry.seoDescription` from `getLocalizedEntry(slug, locale)`.
- English `seoTitle`/`seoDescription` come from `makeSeoTitle()` / `makeSeoDescription()` templates in `lib/dream-dictionary.ts` (`"{Name} Dream Meaning: {hook}"` / `"Dreams about {name} often point to … — not a prediction. Psychological, spiritual, Islamic, and biblical readings."`), optionally replaced by `META_OVERRIDES` — but overrides pass through `polishSeoTitle()` / `polishSeoDescription()`, which **rewrite or discard** copy: a title starting with `Biblical|Spiritual|Islamic Meaning`, containing `| Dream Dictionary`, `: What … Means`, `(And More)` or `(Including Islamic Views)` is dropped in favour of the template (this is why `work` and `tunnel` already have `META_OVERRIDES` entries — "Spiritual Meaning of Dreaming About Work", "Biblical Meaning of Dreaming of a Tunnel" — that never reach the page), and every description not starting with `Dreams about/of…` gets `Dreams about {name}: ` prepended and is clipped to 160.
- Localized `seoTitle`/`seoDescription` come from `localizedSeoTitle()` / `localizedSeoDescription()` in `lib/i18n/templates.ts`, unless `lib/i18n/entry-overrides/{locale}.ts` sets them. The localized description template clips at 168 characters with an ellipsis, so every localized "old description" below is truncated mid-sentence — a baseline defect of its own.
- No title template: `app/layout.tsx` sets `title` as a plain string (no `title.template`), and neither `app/dreams/layout.tsx` nor `app/[locale]/layout.tsx` adds one, so **no `| Dreamly` suffix** is appended. The `<title>` is exactly the string below.
- `entry.seoTitle` / `entry.seoDescription` are also used for OpenGraph (`openGraph.title/description`), Twitter (`twitter.title/description`), the Article JSON-LD `description` (in `DreamSymbolView`), and the IndexNow change fingerprint (`lib/indexnow.ts`). Changing them through `META_OVERRIDES` / `entry-overrides` would therefore have changed OG, Twitter and JSON-LD too. They are not shown anywhere on the page itself (H1 uses `entry.title`, cards use `entry.title` / `entry.shortMeaning`).

## Changed URLs (27)
### 1. `/dreams/work`
- GSC (slice, 2026-06-27…09-24): clicks 1, impressions 742, CTR 0.1%, avg position 10.9
- Main queries: spiritual meaning of dreaming about work (247, п.5,9); why do i dream about work every night spiritual meaning (106); dreaming about work meaning
- Intent targeted: spiritual + повторяющийся сон
- Old title: `Work Dream Meaning: Duty, Identity & Performance`
- Old description: `Dreams about work: What dreaming about work — or a dream of working — means spiritually and psychologically: duty, identity, burnout, and balance between…`
- New title (50 chars, before any site suffix): Dreaming About Work Every Night? Spiritual Meaning
- New description (155 chars): Why work keeps coming back in your dreams: what it can say about pressure, duty and unfinished tasks, and how the spiritual reading of work dreams differs.
- Verified against page content: yes — hand-written intro ("the spiritual meaning of dreaming about work"), Spiritual section, FAQ "What is the spiritual meaning of dreaming about work?" and "Why do I keep dreaming about my job?" (recurring), scenarios Being Overwhelmed / An Angry Boss (pressure, duty), An Old Job (unfinished lessons).
### 2. `/dreams/elephant-chasing-you`
- GSC (slice, 2026-06-27…09-24): clicks 1, impressions 687, CTR 0.1%, avg position 8.5
- Main queries: elephant chasing in dream meaning (173); dream of elephant chasing me spiritual meaning (106); …biblical meaning (32, п.4,9)
- Intent targeted: meaning + spiritual
- Old title: `An Elephant Chasing You Dream Meaning`
- Old description: `Dreams about an elephant chasing you often point to a major issue you have been avoiding that now demands attention.`
- New title (50 chars, before any site suffix): Elephant Chasing You in a Dream: Spiritual Meaning
- New description (160 chars, adjusted): Being chased by an elephant in a dream can point to a major issue you keep avoiding that demands attention. What it means, plus the spiritual and biblical view.
- Verified against page content: yes — page focus "a major issue you have been avoiding that now demands attention"; Spiritual and Biblical sections present; FAQ "What is the spiritual meaning of an elephant chasing you?". Description reworded from "a big pressure or feeling you keep avoiding" to the page's own framing.
### 3. `/dreams/luxury-hotel`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 374, CTR 0.0%, avg position 8.8
- Main queries: hotel dream meaning (134); dream interpretation hotel (41); dream meaning hotel (37); luxury hotel dream meaning (32, п.5); biblical meaning of hotel in dream (22)
- Intent targeted: общий «hotel dream»
- Old title: `A Luxury Hotel Dream Meaning: Aspiration, Reward & Self-Worth`
- Old description: `Dreams about a luxury hotel often point to aspiration, reward, self-worth, or a wish for comfort and recognition.`
- New title (51 chars, adjusted): Dream Meaning of a Hotel: Staying in a Luxury Hotel
- New description (154 chars, adjusted): Dreamed you were staying in a hotel, especially a luxurious one? What hotel dreams can say about aspiration, reward, self-worth and a wish for recognition.
- Verified against page content: yes — page focus "aspiration, reward, self-worth, or a wish for comfort and recognition"; scenario "A Luxury Hotel after a major change". "Needing a break from everyday life" was dropped (not on the page). Title adjusted: the proposed "Hotel Dream Meaning: …" would have started with exactly the same head as the parent page `/dreams/hotel` ("Hotel Dream Meaning: Transition & Temporary Identity"); `/dreams/staying-in-hotel` also exists. Kept the generic-hotel intent with a different lead to avoid two near-identical titles.
### 4. `/dreams/flying`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 261, CTR 0.0%, avg position 14.9
- Main queries: what is the spiritual meaning of flying in a dream islam (80, п.8,1); dream of flying without wings biblical meaning (69, п.9,5); flying in a dream biblical meaning (26)
- Intent targeted: biblical + Islamic, «without wings»
- Old title: `Flying Dream Meaning: Freedom, Ambition & Lucid Flight`
- Old description: `Dreams about flying: Flying dreams are the nightmare's happy opposite: agency, escape, perspective. What struggling to stay airborne means — and how to have…`
- New title (56 chars, adjusted): Flying in a Dream: Biblical, Islamic & Spiritual Meaning
- New description (151 chars): Flying in a dream can reflect freedom, ambition or a wish to escape. See how psychology, the Bible and Islamic dream interpretation read flying dreams.
- Verified against page content: yes for biblical (hand-written: "soar on wings like eagles", Isaiah, Obadiah), Islamic (classical interpreters: flying with wings = travel, flying too high = vanity), spiritual (Plato, Sufi bird, FAQ "Is dreaming of flying spiritual?") and psychology (Adler, Freud, lucidity research). **"Without wings" is not addressed anywhere on the page** (the page only mentions flying *with* wings in the Islamic section), so it was removed from the title; "Spiritual" was added because the page's largest query family is spiritual.
### 5. `/dreams/falling-off-building`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 131, CTR 0.0%, avg position 8.2
- Main queries: falling off a building dream (20); falling from a building dream meaning (15); why do i dream about falling off a building (11)
- Intent targeted: meaning, «from/off a building»
- Old title: `Falling Off A Building Dream Meaning: Reputation & Plans`
- Old description: `Dreams about falling off a building often point to instability in a structured area of life such as work, reputation, plans, or achievement.`
- New title (48 chars, before any site suffix): Falling Off a Building in a Dream: What It Means
- New description (157 chars, adjusted): What it can mean to fall from a building in a dream: instability in work, reputation or plans, loss of control, and how the fear you felt shapes the reading.
- Verified against page content: yes — page focus "instability in a structured area of life such as work, reputation, plans, or achievement"; psychological section "loss of control"; scenario "Feeling afraid of falling off a building". The proposed "height, the fall and the landing … fear of failure" was not on the page and was replaced. Note: this exact title would have been *discarded* by `polishSeoTitle` (`: What … Means` rule) had it gone through `META_OVERRIDES`.
### 6. `/dreams/tunnel`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 125, CTR 0.0%, avg position 11.6
- Main queries: biblical meaning of dreaming of a tunnel (75, п.5,8); train in a tunnel dream meaning (12); traumdeutung tunnel (14)
- Intent targeted: biblical
- Old title: `Tunnel Dream Meaning: Passage, Transition & Unknown Ahead`
- Old description: `Dreams about tunnel: What a tunnel dream means biblically and psychologically — narrow passages, light at the end, and faithful next steps through a hard…`
- New title (57 chars, before any site suffix): Dreaming of a Tunnel: Biblical Meaning and Interpretation
- New description (155 chars): A tunnel in a dream is a passage from one place to another. What it can mean, whether you walk or ride through it, and how the biblical view reads tunnels.
- Verified against page content: yes — hand-written intro names "the biblical meaning of dreaming of a tunnel", Biblical section (Israel through the sea, Jonah, valley of the shadow, narrow gate), FAQ "What is the biblical meaning of dreaming of a tunnel?", scenario "Riding a Train Through a Tunnel" (ride), spiritual section "moving forward" (walk).
### 7. `/dreams/white-elephant`
- GSC (slice, 2026-06-27…09-24): clicks 1, impressions 54, CTR 1.9%, avg position 5.1
- Main queries: white elephant in dream meaning (27, п.5,4); white elephant dream meaning (11); seeing white elephant in dream
- Intent targeted: meaning / symbolism
- Old title: `A White Elephant Dream Meaning`
- Old description: `Dreams about a white elephant often point to a rare blessing or a burden disguised as a gift — something valuable but costly to keep.`
- New title (48 chars, before any site suffix): White Elephant in a Dream: Meaning and Symbolism
- New description (157 chars, adjusted): A white elephant in a dream is often read as a rare blessing, or a gift that is costly to keep. What seeing one may mean and which details change the reading.
- Verified against page content: yes — page focus "a rare blessing or a burden disguised as a gift — something valuable but costly to keep". "A rare, revered animal in many traditions" was not on the page and was replaced with the page's own reading.
### 8. `/dreams/being-ignored`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 26, CTR 0.0%, avg position 8.7
- Main queries: spiritual meaning of being ignored in a dream (24, п.8,2); …by someone you love
- Intent targeted: spiritual
- Old title: `Being Ignored Dream Meaning: Invisibility & Silence`
- Old description: `Dreams about being ignored track a voice that does not land — a friend, family, partner, or crowd that will not turn toward you.`
- New title (43 chars, before any site suffix): Being Ignored in a Dream: Spiritual Meaning
- New description (158 chars): Dreamed that people looked straight through you, or someone you love ignored you? What this dream can reflect about feeling unseen, and its spiritual meaning.
- Verified against page content: yes — Spiritual section and FAQ "What is the spiritual meaning of being ignored?"; scenarios "A Partner Ignoring You", "Being Ignored By Family", "Being Ignored By A Friend" (someone you love); focus "invisibility … withheld attention" (feeling unseen).
### 9. `/dreams/goat-attack`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 25, CTR 0.0%, avg position 5.6
- Main queries: what does it mean when you dream about a goat attacking you (23, п.5,6); …in islam (1)
- Intent targeted: вопрос «what does it mean»
- Old title: `A Goat Attacking You Dream Meaning: Stubborn Conflict`
- Old description: `Dreams about a goat attacking you often point to stubborn conflict, a head-on collision of wills, or being butted by a demand you dismissed.`
- New title (47 chars, before any site suffix): Dream About a Goat Attacking You? What It Means
- New description (152 chars, adjusted): A goat charging or butting you in a dream can point to stubborn conflict, a clash of wills or a demand you dismissed. What it may mean and what changes it.
- Verified against page content: yes — page focus "stubborn conflict, a head-on collision of wills, or being butted by a demand you dismissed". "Pressure from someone close" was not on the page and was replaced.
### 10. `/dreams/friendly-lion`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 20, CTR 0.0%, avg position 6.4
- Main queries: friendly lion dream meaning (20, п.6,4)
- Intent targeted: meaning
- Old title: `A Friendly Lion Dream Meaning: Confidence & Earned Respect`
- Old description: `Dreams about a friendly lion often point to confidence, earned respect, or a powerful ally supporting your leadership.`
- New title (48 chars, before any site suffix): Friendly Lion in a Dream: Meaning of a Calm Lion
- New description (156 chars, adjusted): A calm, friendly lion in a dream is often read as confidence, earned respect or a powerful ally on your side. What it may mean and what changes the reading.
- Verified against page content: yes — page focus "confidence, earned respect, or a powerful ally supporting your leadership"; scenario "Feeling calm around a friendly lion". "Strength you can trust, your own or someone's protection" was not the page's reading and was replaced.
### 11. `/es/dreams/heights`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 196, CTR 0.0%, avg position 7.9
- Main queries: soñar con alturas (51); qué significa soñar con alturas (51); soñar con altura (15)
- Intent targeted: значение + страх высоты
- Old title: `Significado de soñar con alturas: exposición`
- Old description: `Soñar con alturas suele apuntar a exposición, ambición, vértigo en un borde de la vida y el miedo o el vértigo de estar por encima de lo familiar — no es una predicció…`
- New title (49 chars, before any site suffix): Soñar con alturas: significado y por qué da miedo
- New description (159 chars): Soñar que estás en un lugar alto puede hablar de ambición, presión o miedo a perder el control. Qué significa según lo que sentías y lo que pasaba en el sueño.
- Verified against page content: yes — seed "exposición, ambición, vértigo … el miedo"; scenarios "Miedo En Un Puente Alto", "Estar En Una Gran Altura", "Un Borde Alto Sin Baranda"; psychological section "la pérdida de control".
### 12. `/es/dreams/deer`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 120, CTR 0.0%, avg position 10.4
- Main queries: soñar con venado (18); qué significa soñar con un venado (17); soñar con venados (13); …venado muerto (7)
- Intent targeted: «venado» (лат. Америка)
- Old title: `Significado de soñar con un venado: ternura`
- Old description: `Soñar con un venado suele apuntar a ternura, alerta, una belleza tímida y la parte de ti que se congela o huye al primer sonido equivocado — no es una predicción. Lect…`
- New title (35 chars, before any site suffix): ¿Qué significa soñar con un venado?
- New description (151 chars, adjusted): El venado o ciervo en sueños se asocia con la ternura, la alerta y una belleza tímida. Qué significa soñar con venados según lo que hacían en tu sueño.
- Verified against page content: yes — seed "ternura, alerta, una belleza tímida"; scenarios "Un Venado Que Huye", "Un Venado Herido", "Un Venado Muerto", "Un Ciervo Con Astas" (ciervo). "Sensibilidad, intuición y calma" was not on the page and was replaced.
### 13. `/es/dreams/tsunami-and-family`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 67, CTR 0.0%, avg position 8.1
- Main queries: soñar con tsunami y mi familia (27); qué significa soñar con tsunami y familia (14); dream about tsunami and family (13)
- Intent targeted: tsunami + «mi familia»
- Old title: `Significado de soñar con un tsunami con la familia cerca`
- Old description: `Soñar con un tsunami con la familia cerca suele apuntar a afán de proteger bajo la saturación o una crisis compartida en los vínculos cercanos — no es una predicción.…`
- New title (46 chars, before any site suffix): Soñar con un tsunami y tu familia: significado
- New description (157 chars, adjusted): Un tsunami que amenaza a tu familia en un sueño suele reflejar el afán de protegerlos cuando todo desborda, o una crisis compartida en tus vínculos cercanos.
- Verified against page content: yes — seed "afán de proteger bajo la saturación o una crisis compartida en los vínculos cercanos". "Preocupación por los tuyos o cambios fuera de control" was replaced with the page's own framing.
### 14. `/es/dreams/debt`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 48, CTR 0.0%, avg position 5.9
- Main queries: qué significa soñar con deudas (15); …deudas de dinero (13); soñar con deudas (10)
- Intent targeted: значение, «deudas de dinero»
- Old title: `Significado de soñar con deudas: obligación`
- Old description: `Soñar con deudas suele apuntar a obligación, el peso de lo que se debe, ansiedad por pagar e intercambios que se desbalancearon — no es una predicción. Lecturas psicol…`
- New title (44 chars, before any site suffix): Soñar con deudas de dinero: qué quiere decir
- New description (149 chars): Soñar que debes dinero o que te cobran una deuda puede reflejar obligaciones pendientes, culpa o presión. Qué significa según los detalles del sueño.
- Verified against page content: yes — seed "obligación, el peso de lo que se debe, ansiedad por pagar"; scenarios "Cobradores" (te cobran, presión), "Una Deuda Oculta" (culpa), "No Poder Pagar Una Deuda" (una cuenta — literal).
### 15. `/es/dreams/earthquake-at-home`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 34, CTR 0.0%, avg position 10.5
- Main queries: soñar con un terremoto en casa (14); soñar con terremoto en casa (9); …terremoto y familia (5)
- Intent targeted: значение
- Old title: `Significado de soñar con terremoto en casa: inestabilidad familiar`
- Old description: `Soñar con terremoto en casa suele apuntar a inestabilidad familiar, conflicto doméstico o inseguridad en tus cimientos más personales — no es una predicción. Lecturas…`
- New title (45 chars, before any site suffix): Soñar con un terremoto en casa: qué significa
- New description (156 chars): Un terremoto en tu casa en un sueño apunta a sacudidas en lo más cercano: familia, hogar, seguridad. Qué puede significar y qué detalles cambian la lectura.
- Verified against page content: yes — seed "inestabilidad familiar, conflicto doméstico o inseguridad en tus cimientos más personales".
### 16. `/es/dreams/arguing-with-mother`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 32, CTR 0.0%, avg position 8.6
- Main queries: qué significa soñar que discutes con tu mamá (11); soñar que discutes con tu mamá (6); …con tu madre (5)
- Intent targeted: «mamá», а не «madre»
- Old title: `Significado de soñar con discutir con tu madre`
- Old description: `Soñar con discutir con tu madre suele apuntar a conflicto por autonomía, patrones familiares viejos o un choque interno con valores heredados — no es una predicción. L…`
- New title (46 chars, before any site suffix): ¿Qué significa soñar que discutes con tu mamá?
- New description (160 chars, adjusted): Pelear con tu mamá en un sueño no anuncia necesariamente una pelea real. Suele hablar de autonomía, patrones familiares viejos o valores heredados. Cómo leerlo.
- Verified against page content: yes — seed "conflicto por autonomía, patrones familiares viejos o un choque interno con valores heredados"; FAQ "no predice un suceso". The page says "madre" (title uses the synonym "mamá" — same subject). "Límites, expectativas o algo que no has dicho" was not on the page and was replaced.
### 17. `/es/dreams/escaping-prison`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 27, CTR 0.0%, avg position 8.7
- Main queries: qué significa soñar que estoy preso y me escapo (21); soñar con escapar de la cárcel (4)
- Intent targeted: «estoy preso y me escapo»
- Old title: `Significado de soñar con escapar de la cárcel: deseo de libertad`
- Old description: `Soñar con escapar de la cárcel suele apuntar a deseo de libertad, romper una limitación o recuperar el control sobre una situación restrictiva — no es una predicción.…`
- New title (47 chars, before any site suffix): Soñar que estás preso y te escapas: significado
- New description (156 chars, adjusted): Estar preso en un sueño y escapar suele hablar de deseo de libertad, de romper una limitación o de recuperar el control. Qué significa escapar de la cárcel.
- Verified against page content: yes — seed "deseo de libertad, romper una limitación o recuperar el control sobre una situación restrictiva". "Sentirte atrapado y buscar una salida" was replaced with the page's own framing ("preso" is a synonym for the page's "cárcel" subject).
### 18. `/de/dreams/miscarriage`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 60, CTR 0.0%, avg position 9.8
- Main queries: Traumdeutung Fehlgeburt (39); Traum Fehlgeburt (5); … ohne Schwangerschaft (1)
- Intent targeted: «Traumdeutung X»
- Old title: `Traumdeutung: Fehlgeburt: Trauer`
- Old description: `Träume von Fehlgeburt deuten oft auf Trauer, Angst vor verlorenem Potenzial, unterbrochene Pläne oder die unmittelbare Verarbeitung einer zutiefst persönlichen Erfahru…`
- New title (52 chars, before any site suffix): Traumdeutung Fehlgeburt: Was der Traum bedeuten kann
- New description (154 chars, adjusted): Ein Traum von einer Fehlgeburt ist belastend. So liest die Traumdeutung ihn: als Bild für Trauer, Angst vor verlorenem Potenzial oder unterbrochene Pläne.
- Verified against page content: yes — seed "Trauer, Angst vor verlorenem Potenzial, unterbrochene Pläne". "Verlust, Sorge oder ein Vorhaben, das nicht weitergehen konnte" was replaced with the page's wording.
### 19. `/de/dreams/funeral`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 41, CTR 0.0%, avg position 11.0
- Main queries: Traumdeutung Beerdigung (28); Beerdigung Traumdeutung (5); Traumdeutung Begräbnis (4)
- Intent targeted: «Traumdeutung X»
- Old title: `Traumdeutung: Beerdigung: ein Ende anerkennen`
- Old description: `Träume von Beerdigung deuten oft auf ein Ende anerkennen, würdigen, was vorbei ist, und den Prozess des Loslassens beginnen — keine Vorhersage. Psychologische, spiritu…`
- New title (47 chars, before any site suffix): Traumdeutung Beerdigung: Was der Traum bedeutet
- New description (156 chars, adjusted): Eine Beerdigung im Traum steht in der Traumdeutung meist für ein anerkanntes Ende und für Loslassen – nicht für einen echten Todesfall. Was der Traum verrät.
- Verified against page content: yes — seed "ein Ende anerkennen, würdigen, was vorbei ist, und den Prozess des Loslassens beginnen"; FAQ "sagt kein Ereignis zuverlässig voraus" (nicht für einen echten Todesfall). "Abschied und Abschluss" replaced with the page's wording.
### 20. `/de/dreams/goat`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 29, CTR 0.0%, avg position 11.0
- Main queries: Traumdeutung Ziege (22); Ziege Traumdeutung (4); Traumdeutung Ziegen (3)
- Intent targeted: «Traumdeutung X»
- Old title: `Traumdeutung: Eine Ziege: störrischer Aufstieg`
- Old description: `Träume von eine Ziege deuten oft auf störrischer Aufstieg, Appetit, Sündenbock und ein trittsicherer Wille, der nicht um Erlaubnis fragt — keine Vorhersage. Psychologi…`
- New title (53 chars, before any site suffix): Traumdeutung Ziege: Was bedeutet eine Ziege im Traum?
- New description (154 chars, adjusted): Die Ziege im Traum steht für störrischen Aufstieg, Appetit und einen Willen, der nicht um Erlaubnis fragt. Was sie bedeutet und was die Deutung verändert.
- Verified against page content: yes — seed "störrischer Aufstieg, Appetit, Sündenbock und ein trittsicherer Wille, der nicht um Erlaubnis fragt"; five behaviour scenarios (kletternde, angreifende, weiße, Herde, tote Ziege). "Eigensinn, Genügsamkeit und Lebenskraft" was not on the page and was replaced.
### 21. `/ru/dreams/wedding-and-death`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 41, CTR 0.0%, avg position 6.1
- Main queries: свадьба снится к смерти (41, п.6,1)
- Intent targeted: ответ на примету
- Old title: `К чему снятся свадьба и смерть`
- Old description: `К чему снятся свадьба и смерть: чаще всего это обещание и конец в одном сне: прежняя жизнь закрывается, пока начинается новая, связывающая глава. Психологическое, духо…`
- New title (50 chars, before any site suffix): Правда ли, что свадьба снится к смерти? Толкование
- New description (159 chars, adjusted): Народная примета связывает свадьбу во сне со смертью. Как такой сон толкуют на самом деле: не как предсказание, а как конец прежней жизни и начало новой главы.
- Verified against page content: yes — seed "прежняя жизнь закрывается, пока начинается новая, связывающая глава"; FAQ "Если снятся свадьба и смерть — это плохой знак? Нет … не предсказывает событий" answers the title's question. The page does not itself mention the folk omen; the description states it as the searcher's premise and then gives the page's answer.
### 22. `/ru/dreams/arguing-with-father`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 61, CTR 0.0%, avg position 11.6
- Main queries: к чему снится ссора с отцом (14); …ругаться с отцом (9); сонник ругаться с отцом (6)
- Intent targeted: «ссора» / «ругаться»
- Old title: `К чему снится ссора с отцом — спор с авторитетом`
- Old description: `К чему снится ссора с отцом: чаще всего это спор с авторитетом, борьба за одобрение или внутреннее столкновение с ожиданиями, доставшимися от семьи. Психологическое, д…`
- New title (43 chars, before any site suffix): К чему снится ссора с отцом: толкование сна
- New description (151 chars, adjusted): Ругаться с отцом во сне — не обязательно к реальному конфликту. Чаще такой сон говорит о споре с авторитетом, борьбе за одобрение и семейных ожиданиях.
- Verified against page content: yes — seed "спор с авторитетом, борьба за одобрение или внутреннее столкновение с ожиданиями, доставшимися от семьи"; FAQ "не предсказывает событий". "О границах, ожиданиях и самостоятельности" replaced with the page's wording.
### 23. `/ru/dreams/stag-with-antlers`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 45, CTR 0.0%, avg position 11.1
- Main queries: сонник олень с рогами (12); к чему снится олень с рогами (9); …с большими рогами (7)
- Intent targeted: «с большими рогами»
- Old title: `К чему снится олень с рогами — кроткая сила, ставшая зримой`
- Old description: `К чему снится олень с рогами: чаще всего это кроткая сила, ставшая зримой, достоинство или сезонная мощь, которую ты отращиваешь и сбрасываешь. Психологическое, духовн…`
- New title (37 chars, before any site suffix): К чему снится олень с большими рогами
- New description (149 chars, adjusted): Олень с рогами во сне связан с кроткой силой, достоинством и мощью, которая приходит и уходит. Что значит такой сон и какие детали меняют толкование.
- Verified against page content: yes for the reading (seed "кроткая сила, ставшая зримой, достоинство или сезонная мощь, которую ты отращиваешь и сбрасываешь"). The page does not discuss antler *size*; "размер рогов, поведение оленя" was removed from the description. The title keeps "с большими рогами" as the query phrasing — the page's subject (a stag with antlers) covers it, but note it is not a distinct section.
### 24. `/ru/dreams/dead-cat`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 40, CTR 0.0%, avg position 10.9
- Main queries: к чему снится мёртвая/мертвая кошка (22+)
- Intent targeted: значение
- Old title: `К чему снится мёртвая кошка — утраченная независимость`
- Old description: `К чему снится мёртвая кошка: чаще всего это утраченная независимость, неуслышанная интуиция, горе или конец закрытой, оборонительной поры. Психологическое, духовное, и…`
- New title (43 chars, before any site suffix): К чему снится мёртвая кошка: толкование сна
- New description (150 chars, adjusted): Мёртвая кошка во сне пугает, но обычно говорит об утраченной независимости, неуслышанной интуиции или конце оборонительной поры. Что значит такой сон.
- Verified against page content: yes — seed "утраченная независимость, неуслышанная интуиция, горе или конец закрытой, оборонительной поры". "Завершении чего-то … скрытой тревоге" replaced with the page's wording.
### 25. `/ru/dreams/losing-money`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 35, CTR 0.0%, avg position 9.3
- Main queries: потерять деньги во сне (9); во сне потерять деньги к чему это (5); к чему снится потерять деньги (4)
- Intent targeted: «потерять деньги во сне»
- Old title: `К чему снится потерять деньги — неуверенность, упущенный шанс`
- Old description: `К чему снится потерять деньги: чаще всего это неуверенность, упущенный шанс, растраченные силы или тревога о собственной ценности и достатке. Психологическое, духовное…`
- New title (42 chars, before any site suffix): Потерять деньги во сне — к чему это снится
- New description (155 chars, adjusted): Если во сне вы теряете деньги, речь обычно идёт о неуверенности, упущенном шансе, растраченных силах или тревоге о достатке. К чему это снится и что важно.
- Verified against page content: yes — seed "неуверенность, упущенный шанс, растраченные силы или тревога о собственной ценности и достатке". "Страхе потерять контроль" replaced with the page's wording.
### 26. `/pt/dreams/big-fish`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 62, CTR 0.0%, avg position 11.3
- Main queries: sonhar com peixe grande (16); sonha com peixe grande o que significa (13); sonhei com peixe grande (8)
- Intent targeted: значение
- Old title: `Significado de sonhar com um peixe grande: uma oportunidade grande`
- Old description: `Sonhar com um peixe grande costuma apontar para uma oportunidade grande, uma ambição importante ou um recurso emocional que parece grande demais para ignorar — não é p…`
- New title (41 chars, before any site suffix): Sonhar com peixe grande: o que significa?
- New description (157 chars, adjusted): Um peixe grande no sonho costuma ser ligado a uma oportunidade grande, uma ambição importante ou uma emoção grande demais para ignorar. Veja o que significa.
- Verified against page content: yes — seed "uma oportunidade grande, uma ambição importante ou um recurso emocional que parece grande demais para ignorar". "Abundância e algo importante vindo à tona" was not on the page and was replaced.
### 27. `/pt/dreams/colorful-fish`
- GSC (slice, 2026-06-27…09-24): clicks 0, impressions 44, CTR 0.0%, avg position 10.5
- Main queries: sonhar com peixe colorido o que significa (14); sonhar com peixe colorido (11)
- Intent targeted: значение
- Old title: `Significado de sonhar com um peixe colorido: emoção viva`
- Old description: `Sonhar com um peixe colorido costuma apontar para emoção viva, potencial criativo ou uma oportunidade atraente que se destaca — não é previsão. Leituras psicológica, e…`
- New title (49 chars, before any site suffix): Peixe colorido no sonho: significado e simbolismo
- New description (156 chars, adjusted): Peixes coloridos no sonho estão ligados a emoção viva, potencial criativo e uma oportunidade que se destaca. Veja o que significa sonhar com peixe colorido.
- Verified against page content: yes — seed "emoção viva, potencial criativo ou uma oportunidade atraente que se destaca". "Alegria, criatividade" replaced with the page's wording.

## Selected but not modified

None — all 27 pages were changed. Two proposals were **adjusted** rather than dropped (see #3 luxury-hotel and #4 flying above); 18 descriptions were reworded so that every claim is backed by the page's own text; none of the 27 titles is longer than 57 characters and none of the descriptions longer than 160.

## Deliberately excluded from this iteration (for reference)

- `/dreams/dog-and-snake` — 151 of 226 impressions come from one Chinese query; the English query already ranks ~2.
- `/dreams/ex-family` (CTR 2.9%), `/dreams/blood-on-the-floor` (CTR 6.9%) — already performing.
- `/de/dreams/meeting-your-twin` — queries are about having twins ("Zwillinge bekommen"), the page is about meeting one's double; a matching title would misrepresent the page.
- `/de/dreams/dead-tree` — only query is unrelated ("beendetes Wachstum").
- Reserve for a second wave: `/dreams/heights`, `/dreams/mirror`, `/dreams/car-accident` (avg position 17–35, but spiritual/biblical/Islamic queries at ~8–9).

## Control group (unchanged pages, similar position and volume)

| URL | Clicks | Impr. | CTR | Pos. |
|---|---|---|---|---|
| `/de/dreams/train-station` | 0 | 25 | 0.0% | 8.7 |
| `/es/dreams/thunder-and-lightning` | 0 | 25 | 0.0% | 10.7 |
| `/pt/dreams/baby-tiger` | 0 | 25 | 0.0% | 9.8 |
| `/ru/dreams/new-car` | 0 | 22 | 0.0% | 9.2 |
| `/pt/dreams/falling-tree` | 0 | 22 | 0.0% | 10.3 |
| `/de/dreams/black-cat` | 0 | 21 | 0.0% | 9.2 |
| `/pt/dreams/fighting-family` | 0 | 21 | 0.0% | 10.8 |
| `/pt/dreams/snake-and-water` | 0 | 21 | 0.0% | 11.0 |
| `/de/dreams/hotel` | 0 | 20 | 0.0% | 9.9 |
| `/de/dreams/seeing-your-own-grave` | 0 | 20 | 0.0% | 9.3 |
| `/ru/dreams/stolen-car` | 0 | 20 | 0.0% | 10.4 |
| `/ru/dreams/brake-failure` | 0 | 28 | 0.0% | 12.1 |
| `/dreams/tsunami-and-family` | 0 | 16 | 0.0% | 8.1 |
| `/de/dreams/mirror-in-dark-room` | 0 | 15 | 0.0% | 8.0 |
| `/es/dreams/fire-and-water` | 0 | 15 | 0.0% | 9.3 |
| `/es/dreams/snake-and-water` | 0 | 15 | 0.0% | 8.3 |
| `/ru/dreams/debt-collectors` | 0 | 15 | 0.0% | 6.7 |
| `/ru/dreams/losing-a-ring` | 0 | 15 | 0.0% | 9.4 |
| `/de/dreams/finding-something-on-beach` | 0 | 16 | 0.0% | 10.0 |
| `/ru/dreams/white-cow` | 0 | 18 | 0.0% | 7.3 |
| `/dreams/turbulence-on-plane` | 0 | 19 | 0.0% | 9.7 |
| `/dreams/black-lion` | 1 | 20 | 5.0% | 7.0 |

Control total (slice): 1 clicks / 434 impressions. Test total (slice): 3 clicks / 3427 impressions.

## Implementation (2026-09-25, not deployed, not committed)

**Why not `META_OVERRIDES` / localized `seoTitle`:** the audit above showed that (a) `META_OVERRIDES` is rewritten by `polishSeoTitle` / `polishSeoDescription` — three of the proposed titles would have been silently replaced by the template and every description would have been prefixed with `Dreams about {name}:` and clipped; (b) `entry.seoTitle` / `entry.seoDescription` also drive OpenGraph, Twitter, the Article JSON-LD `description` and the IndexNow fingerprint, which the experiment scope excludes. The localized `entry-overrides` fields have the same reach (and sit next to `sections`, which *is* visible content). So a separate, metadata-only layer was added:

- **New** `lib/seo/ctr-experiment.ts` — `CTR_EXPERIMENT_META` (locale → slug → `{ title, description }`, exactly the 27 pages) and `getCtrExperimentMeta(slug, locale)`. Delete an entry (or the file's contents) to roll a page back; nothing else references it.
- **Changed** `app/dreams/DreamSymbolView.tsx` — `dreamSymbolMetadata()` now returns `title: experiment?.title ?? entry.seoTitle` and `description: experiment?.description ?? entry.seoDescription`. The `openGraph`, `twitter`, `alternates` (canonical + hreflang) blocks and the page body/JSON-LD are untouched and still read `entry.seoTitle` / `entry.seoDescription`. Both routes (`app/dreams/[symbol]/page.tsx` and `app/[locale]/dreams/[symbol]/page.tsx`) call this function, so English and localized pages are covered by the same 5-line change.
- **New** `lib/ctrExperiment.test.ts` — asserts exactly 27 rows, every slug is a dictionary entry (not a guide) with a localized entry, titles ≤ 60 and descriptions 120–160 chars, every row differs from the generated copy, and `getCtrExperimentMeta` returns nothing for non-experiment pages.
- Not touched: `lib/dream-dictionary.ts`, `lib/i18n/**`, `app/sitemap.ts`, `app/robots.ts`, `lib/publicPages.ts`, `lib/indexnow.ts`, any layout, any client component, any style.
- Side effect to be aware of: because the IndexNow fingerprint still hashes `entry.seoTitle`/`seoDescription`, the deploy will **not** trigger an IndexNow resubmission for these URLs (Bing/Yandex). Google does not use IndexNow anyway; use GSC "Request indexing" on the 27 URLs after deploy if a faster recrawl is wanted, or add `getCtrExperimentMeta` to `indexNowFingerprint` in a follow-up.

## Validation (2026-09-25)

- `tsc --noEmit --incremental false` — clean. `eslint` on the three touched files — clean.
- Tests (run with `node --experimental-strip-types --test` on a scratch copy of `lib/`, since `tsx` does not run in the Cowork VM): `lib/ctrExperiment.test.ts` 3/3 pass; `entryOverrides`, `guideLinks`, `leadSentences`, `searchMatching`, `dream-lenses` all pass; `lib/indexnow.test.ts` fails to *load* in that harness both before and after the change (it imports `app/api/admin/_lib/*` and `firebase-admin`), which is the known environment limitation, not a regression.
- BEFORE → AFTER: `dreamSymbolMetadata()` and the server-rendered `DreamSymbolView` were executed for all 27 test pages and all 22 control pages from `git archive HEAD` and from the working tree (client-only widgets — image frame, inline prompt, jump nav, FAB — stubbed identically in both runs):
  - all 27 test pages: `title` and `description` changed to the values above; `alternates.canonical`, `alternates.languages` (hreflang), `openGraph.*` and `twitter.*` byte-identical to HEAD;
  - all 22 control pages: the whole metadata object byte-identical to HEAD;
  - rendered HTML (H1, breadcrumbs, sections, FAQ, all three JSON-LD blocks) byte-identical to HEAD for all 49 pages;
  - `getLocalizedEntries()` for all six locales (903 entries each) serialised and compared: identical to HEAD, i.e. no dictionary content changed for any page.
- Not verified here: a production `next build` (does not run in the Cowork VM). Run `npm run build` before deploy; the change is type-checked and only touches a metadata function that was already exercised by both routes.

## After deploy

1. Fill in the change date above and note the deploy commit.
2. `curl -s https://dreamly.art/dreams/work | grep -o '<title>[^<]*'` for a few of the 27 URLs (and one control) to confirm the live `<title>` / `meta name="description"` and that `og:title` still shows the old copy.
3. GSC → URL inspection → Request indexing for the 27 URLs (optional, speeds up the recrawl).
4. Measurement per the header: 28 days before vs 28 days after, excluding the first 7 days, test group vs control group, Pages export without Country/Device.
