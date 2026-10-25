# Daily Horoscope

The free `/horoscope` landing page and twelve permanent `/horoscope/{sign}` pages use the existing six UI locales: `en`, `es`, `ar`, `pt`, `de`, `ru`. English is unprefixed. Arabic is RTL. Hebrew is currently supported only by the dream-analysis API; the site has no Hebrew UI, translations or routes. This feature does not add a seventh site locale.

## Files and integration

- `lib/horoscope/model.ts`: signs, dates, output schema, runtime content validation.
- `lib/horoscope/astronomy.ts`: Astronomy Engine calculations, zodiac boundaries, aspects, Moon and retrograde rules.
- `lib/horoscope/cache.ts`, `store.ts`: complete-publication validation, dated fallback and shared Next cache.
- `lib/horoscope/generate.ts`: daily Firestore lease, AI requests, resumable locale checkpoints and atomic publication.
- `lib/i18n/horoscope.ts`: all six native UI translations, zodiac/planet/aspect/phase labels, UTC date formatting.
- `app/horoscope/{page.tsx,[sign]/page.tsx,HoroscopeView.tsx,HoroscopeClient.tsx,horoscope.css}` and `app/[locale]/horoscope/{page.tsx,[sign]/page.tsx}`: server-rendered pages, SEO, responsive UI and preferences.
- `app/api/cron/horoscope/route.ts`: existing `requireCronSecret` authentication pattern; 300-second maximum duration.
- `app/components/DreamMapGlobe.{tsx,module.css}`: lightweight CSS globe reusing `public/game/earth-surface.svg`, with green continents, blue oceans and a 48-second texture rotation beneath stationary spherical shading, localized tooltip and reduced-motion support. Uses the existing `dreamly:building-placed` event for Map celebrations. Hidden on Map, Moon, game, chat, sign-in, checkout, upgrade and admin experiences. Hidden only when it overlaps a focused editor, or behind a visible dialog, overlapping install/language banner or browser full-screen experience. Left positioning deliberately stays on the physical left in RTL; the catcher stays on the physical right in both directions so the controls never share a corner. Earth and Moon share a 64px mobile / 88px desktop diameter and align their centers with the catcher using the floating-control variables in `app/globals.css`. The Moon uses the Map-specific catcher row. Earth also emits six decorative creatures using the existing Moon particle animation and reduced-motion rules; their pointer events are disabled and they drift inward from the left edge.
- Modified integrations: `app/app/PrimaryNav.tsx`, `app/app/profile/page.tsx`, `app/layout.tsx`, `app/components/InstallPwaBanner.tsx`, `lib/i18n/BrowserLanguageSuggestion.tsx`, `app/dreams/DictionaryFooter.tsx`, `lib/i18n/messages/{types,en,es,ar,pt,de,ru}.ts`, `lib/aiModels.ts`, `lib/publicPages.ts`, `package.json`, `package-lock.json`, `vercel.json`.
- Verification: `lib/horoscope.test.ts` and `scripts/check-horoscope-routes.ts`.
- Delivery: `scripts/push-horoscope.sh` selectively stages horoscope translations without including the existing unrelated game translations.

## Astronomy rules

Dependency: `astronomy-engine` 2.1.19 (MIT), the sole new dependency.

At **12:00:00 UTC on the forecast date**, `GeoVector(body, date, true)` calculates geocentric J2000 equatorial vectors with light-time/aberration correction. `Ecliptic(vector).elon` converts to true ecliptic longitude/equinox of date. Do not replace this with `EclipticLongitude`, which is heliocentric. Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune and Pluto are included.

Longitudes normalize to `[0,360)`. Tropical signs are twelve equal 30° sectors starting at the March equinox: Aries `[0,30)`, Taurus `[30,60)`, etc. These are not the unequal astronomical constellations. Exact boundaries belong to the next sign.

Aspects use shortest angular separation, the five major angles (0°, 60°, 90°, 120°, 180°), and a uniform inclusive 6° orb. Listed aspects are ordered by smallest orb. This is an explicitly chosen astrological convention. Retrograde is a negative signed change in longitude from 00:00 UTC to 00:00 UTC the following day, centered on the reference noon. Near a station this daily average need not match instantaneous motion. `MoonPhase` supplies phase angle; eight phase names use nearest-45° bins. `Illumination(Body.Moon).phase_fraction` supplies actual illumination.

Today's Moon always uses today's noon snapshot, even when a forecast is stale. The forecast's planetary influences retain its own sky date. Visible dates make that distinction explicit. Astronomy is calculated; the Sun-sign/solar whole-sign interpretation is traditional symbolism written by AI. No birth data, paid API, credits or subscriptions are involved.

API references: https://github.com/cosinekitty/astronomy/tree/master/source/js and https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat

## Daily job and persistence

Vercel Cron: **`5 0 * * *` (00:05 UTC every day)**, `GET /api/cron/horoscope`.

Existing environment configuration is reused; no new variable names:

- `CRON_SECRET`: required, sent as `Authorization: Bearer ...` by Vercel.
- `ONEIRO_OPENAI_API_KEY` (existing `OPENAI_API_KEY` fallback accepted).
- Existing Firebase Admin service account configuration (`FIREBASE_SERVICE_ACCOUNT_JSON` or the other forms accepted by `lib/firebaseServiceAccount.ts`).

The hosting plan must support a 300-second Node function. The job has one English generation request using `HOROSCOPE_MODEL` (the existing dream-analysis model), then five concurrent natural-language translations using `TRANSLATE_MODEL`. Thus **six calls on normal days**, shared by all visitors and all 12 signs. No page request invokes AI. Each provider/validation failure gets one immediate retry within the invocation. Refusals, truncated JSON, missing/duplicate signs, missing/empty/oversized fields, markup and repeated general readings are rejected.

`daily_horoscopes/{YYYY-MM-DD}` holds a ten-minute transaction lease and per-language checkpoints. Concurrent jobs skip an active lease. Successful locales survive failed attempts; a retry makes calls only for missing/invalid languages. A failed invocation clears its lease; a terminated function's lease expires after ten minutes. Firestore transactions ensure only the owning invocation publishes. A completed date is immutable to reruns, and an older retry cannot roll back `horoscope_publication/latest`. Both collections are server-only under the existing default-deny Firestore rules: no rule deployment or new index is required.

Only all-six-language validated editions publish. `horoscope_publication/latest` retains the last complete edition on generation failure. Its **actual UTC forecast date** is displayed with a stale notice; yesterday is never relabeled today. Pages read a shared five-minute Next cache, keyed by UTC day and invalidated after successful publication. If no publication exists, pages show real sky data plus a localized preparation message and `noindex,follow`. A database outage on a cache miss can show this unavailable state; this is not an offline replica of Firestore.

### Bootstrap and retry

After review, before promoting the feature publicly, invoke the authenticated job once against an environment with the existing keys. This writes the first full daily edition to Firestore and incurs the six AI calls. No live generation was invoked during implementation verification.

From a terminal with `CRON_SECRET` already set and the server running:

```sh
curl --fail-with-body --max-time 300 \
  -H "Authorization: Bearer ${CRON_SECRET:?Set CRON_SECRET}" \
  http://localhost:3107/api/cron/horoscope
```

Use the deployment origin when operating the deployed job. The same request retries an unsuccessful edition. If the invocation timed out, wait for the ten-minute lease to expire. Vercel runs the next scheduled job the following day; it does not automatically invoke a separate recovery schedule. Review the first generated edition in all six languages before release. Automated validation enforces structure and completeness, not a human editorial review or a guarantee of language quality.

## SEO, preferences and analytics

All 78 routes have locale-aware titles, descriptions, canonicals and hreflang through existing helpers. `lib/publicPages.ts` adds all routes to the sitemap with daily frequency; it does not change unrelated last-modified dates. Complete editions include valid `WebPage` JSON-LD and visible publication/update times. Sign previews and full readings render on the server. No date-specific URL is created. Dictionary footer and the existing primary navigation supply internal links.

Anonymous choices use `dreamly_zodiac_sign` in local storage. Signed-in choices also merge `preferredZodiacSign` into the existing `users/{uid}` profile. Reads use Firebase Auth and the existing profile collection; no new account flow or birth fields. A sync failure leaves local selection usable and shows a translated status. First-time visitors select a sign on the landing page. Once a sign is selected, the horoscope page hides its preference form; changes are made in the personal profile. Exploring other zodiac readings does not overwrite the saved preference. Repeat visits to the landing page open the saved sign once preferences load. The same preference component remains available in the personal profile. Profile usage does not emit horoscope page-view or exit events.

The existing `FirebaseAnalytics` remains the only source of `page_view`. Feature events are `horoscope_landing_view`, `horoscope_sign_view`, `horoscope_zodiac_select`, `horoscope_return_visit` (first visit on a different UTC day), `horoscope_exit`, `map_globe_click`. These send locale, sign and bounded destination sections; no birth data or dream content. Compare return visits and downstream engagement with the dated baseline in `MEMORY.md`, preserving its reporting-period limitations.

## Verification

```sh
npm run typecheck
npx tsx --test lib/horoscope.test.ts
npm test
npm run build
# While a local server is running:
npx tsx scripts/check-horoscope-routes.ts http://localhost:3107
```

The focused tests cover all zodiac boundaries and wraparound, UTC date validation, equinox/phase consistency, direct/retrograde Mercury, all ten positions, aspect orbs, dated cache fallback, invalid publications, locale coverage, sitemap/canonical/hreflang inventory, secret authentication, concurrent job leases, retries, resumable checkpoints, expired leases and monotonic publication. The route script checks all 78 actual HTTP pages, SSR content and metadata, RTL, invalid-sign 404s and unauthenticated cron rejection. Browser review covers desktop, 390px Arabic RTL, preference selection and banner collision handling. No live AI calls, production writes, deployment or push are needed to run these tests.

Browser console inspection also observed the existing root-head hydration warning involving AdSense-injected scripts and the PWA launch script. No horoscope component was identified in that mismatch. This shared advertising integration was left outside this feature's scope. Authenticated profile synchronization and live AI/editorial output were not exercised against production accounts.


## Premium presentation

`HoroscopeContent.tsx` renders the complete reading hierarchy on the server, independently of data loading in `HoroscopeView.tsx`. General and explanation fields form the main editorial forecast; love/career/money/energy are separate cards; tip becomes a highlighted quote. The existing schema is unchanged. Existing shorter readings are displayed as supplied, never padded with invented prose. The first-publication state uses decorative skeleton bars, a preparation message and a refresh button; refresh only reads the existing cache and never invokes generation. The shared cache can take up to five minutes to reflect external changes.

`ZodiacArt.tsx` draws twelve distinct stylized asterisms defined in `lib/horoscope/presentation.ts`. They are deliberately illustrative, not accurate RA/Dec sky maps or tropical sign boundaries. CSS animates only opacity with reduced-motion support. No additional font, artwork service, AI calls or dependency is required.

`MoonVisual.tsx` reuses the local lunar texture under an orthographic spherical terminator mask. The mask's illuminated projected area equals Astronomy Engine's illumination fraction. Waxing is illuminated on the right, waning on the left in a north-up view; the local horizon orientation can differ. This convention is described in the expandable methodology. Eight phase themes and four traditional element themes use real calculated phase/sign data and are explicitly identified as traditional astrology.

Two calculated Sun/Moon positions and the tightest available aspect involving a personal body form the simplified influence list. It uses the forecast's own dated sky when a forecast is stale. Full positions, motion indicators and all aspects remain in native keyboard-accessible details. `HoroscopeActions.tsx` uses native sharing and clipboard fallback with the production canonical URL, actual forecast date, localized text and no duplicate pageviews. Failed clipboard access exposes a selectable link. `lib/i18n/horoscope-design.ts` supplies all new labels and editorial introductions in the existing six locales.

Presentation geometry and translation coverage tests live in `lib/horoscopePresentation.test.ts`. No daily schema, cron, generation or astronomy calculation logic changed during the redesign.

At viewport widths below 1280px the horoscope content scrolls in a viewport-sized reading area above a 104px safe-area-aware rail for the existing globe and catcher. The Earth creatures use a shorter flight within that rail. Wider layouts keep the reading column clear of the corner controls. Changing locale/sign resets the reading scroll region. This is scoped to horoscope pages; other Dreamly pages retain their existing scroll behavior.

The compact reading region is keyboard-focusable, allowing Page Down/Space scrolling without putting content beneath floating controls. Native select and details controls retain browser keyboard behavior. Scoped lint passes. Repository-wide lint (excluding generated preview directories) reports 213 pre-existing errors and 39 warnings outside the redesigned files. The full test suite passes 359 tests; the focused horoscope suite passes 14. Live generated text has not been bootstrapped or editorially reviewed; isolated labeled fixtures were used to inspect populated and stale reading layouts without Firebase writes.

The globe stays available across Dreams, Feed, Art, Dictionary, Horoscope and Profile. Autofocus alone does not hide it: the Dreams textarea is automatically focused on arrival, even without an open keyboard. The collision check hides the globe only when the focused field actually overlaps its bounds, and rechecks captured scroll events as well as focus/viewport changes. Existing full-screen route and modal exclusions remain in place.
