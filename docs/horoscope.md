# Daily Horoscope

**Current generation architecture:** [On-demand horoscope generation](horoscope-on-demand.md). Generation occurs only after an explicit visitor request; historical bulk-generation notes below are superseded by that document.

The free `/horoscope` landing page and twelve permanent `/horoscope/{sign}` pages use the existing six UI locales: `en`, `es`, `ar`, `pt`, `de`, `ru`. English is unprefixed. Arabic is RTL. Hebrew is currently supported only by the dream-analysis API; the site has no Hebrew UI, translations or routes. This feature does not add a seventh site locale.

## Files and integration

- `lib/horoscope/model.ts`: signs, dates, output schema, runtime content validation.
- `lib/horoscope/astronomy.ts`: Astronomy Engine calculations, zodiac boundaries, aspects, Moon and retrograde rules.
- `lib/horoscope/cache.ts`, `store.ts`: complete-publication validation, same-day selection and request-deduplicated stored reads.
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

Today's Moon uses today's noon snapshot. Only same-day stored forecasts are selected, so forecast prose and its planetary influences share the displayed UTC date. Astronomy is calculated; the Sun-sign/solar whole-sign interpretation is traditional symbolism written by AI. No birth data, paid API, credits or subscriptions are involved.

API references: https://github.com/cosinekitty/astronomy/tree/master/source/js and https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat

## On-demand jobs and persistence

See [the on-demand implementation and operations report](horoscope-on-demand.md) for the current architecture, storage paths, worker, security limits and verification.

The old `/api/cron/horoscope` bulk schedule is removed and its authenticated route returns HTTP 410. `/api/cron/horoscope-worker` runs every five minutes and processes only existing, visitor-requested Firestore jobs. It never creates new sign/language combinations. The normal visitor flow starts through an explicit button, stores a durable job, then uses supported Next.js `after()` execution. Recovery does not depend on the browser staying open.

Both masters and requested translations use `gpt-5-mini`. Only a requested sign is generated; a translation reuses that sign’s English master. Current records are stored separately per sign/language under `daily_horoscopes/{day}/signs/{sign}/readings/{locale}`; historical daily documents remain readable. Public rendering is read-only and server-rendered. No cross-request pending-state cache needs invalidation.

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

The focused tests cover all zodiac boundaries and wraparound, UTC date validation, equinox/phase consistency, direct/retrograde Mercury, all ten positions, aspect orbs, same-day cache selection, invalid publications, locale coverage, sitemap/canonical/hreflang inventory, secret authentication, concurrent job leases, retries, resumable checkpoints, expired leases and monotonic publication. The route script checks all 78 actual HTTP pages, SSR content and metadata, RTL, invalid-sign 404s and unauthenticated cron rejection. Browser review covers desktop, 390px Arabic RTL, preference selection and banner collision handling. No live AI calls, production writes, deployment or push are needed to run these tests.

Browser console inspection also observed the existing root-head hydration warning involving AdSense-injected scripts and the PWA launch script. No horoscope component was identified in that mismatch. This shared advertising integration was left outside this feature's scope. Authenticated profile synchronization and live AI/editorial output were not exercised against production accounts.


## Premium presentation

`HoroscopeContent.tsx` renders the complete reading hierarchy on the server, independently of data loading in `HoroscopeView.tsx`. The stored headline, general paragraphs and explanation form the main editorial forecast; love/career/money/energy are separate cards; tip becomes a highlighted quote. The schema accepts historical seven-field readings and requires a headline for newly generated content. Existing shorter readings are displayed as supplied, never padded with invented prose. The first-publication state uses decorative skeleton bars, a preparation message and a refresh button; refresh reads persistent storage on a new server request and never invokes generation.

`ZodiacArt.tsx` draws twelve distinct stylized asterisms defined in `lib/horoscope/presentation.ts`. They are deliberately illustrative, not accurate RA/Dec sky maps or tropical sign boundaries. CSS animates only opacity with reduced-motion support. No additional font, artwork service, AI calls or dependency is required.

`MoonVisual.tsx` reuses the local lunar texture under an orthographic spherical terminator mask. The mask's illuminated projected area equals Astronomy Engine's illumination fraction. Waxing is illuminated on the right, waning on the left in a north-up view; the local horizon orientation can differ. This convention is described in the expandable methodology. Eight phase themes and four traditional element themes use real calculated phase/sign data and are explicitly identified as traditional astrology.

Two calculated Sun/Moon positions and the tightest available aspect involving a personal body form the simplified influence list. It uses the selected same-day forecast’s calculated sky. Full positions, motion indicators and all aspects remain in native keyboard-accessible details. `HoroscopeActions.tsx` uses native sharing and clipboard fallback with the production canonical URL, actual forecast date, localized text and no duplicate pageviews. Failed clipboard access exposes a selectable link. `lib/i18n/horoscope-design.ts` supplies all new labels and editorial introductions in the existing six locales.

Presentation geometry and translation coverage tests live in `lib/horoscopePresentation.test.ts`. No daily schema, cron, generation or astronomy calculation logic changed during the redesign.

At viewport widths below 1280px the horoscope content scrolls in a viewport-sized reading area above a 104px safe-area-aware rail for the existing globe and catcher. The Earth creatures use a shorter flight within that rail. Wider layouts keep the reading column clear of the corner controls. Changing locale/sign resets the reading scroll region. This is scoped to horoscope pages; other Dreamly pages retain their existing scroll behavior.

The compact reading region is keyboard-focusable, allowing Page Down/Space scrolling without putting content beneath floating controls. Native select and details controls retain browser keyboard behavior. Scoped lint passes. Repository-wide lint (excluding generated preview directories) reports 213 pre-existing errors and 39 warnings outside the redesigned files. The full test suite passes 359 tests; the focused horoscope suite passes 14. Live generated text has not been bootstrapped or editorially reviewed; isolated labeled fixtures were used to inspect populated and pending reading layouts without Firebase writes.

The globe stays available across Dreams, Feed, Art, Dictionary, Horoscope and Profile. Autofocus alone does not hide it: the Dreams textarea is automatically focused on arrival, even without an open keyboard. The collision check hides the globe only when the focused field actually overlaps its bounds, and rechecks captured scroll events as well as focus/viewport changes. Existing full-screen route and modal exclusions remain in place.

## Forecast availability investigation — 2026-10-25

Read-only checks against the configured Firebase project `oneiro-11d15` confirmed that `daily_horoscopes/2026-10-25` and `horoscope_publication/latest` did not exist, and a limited `daily_horoscopes` collection query returned no documents. Reads succeeded, so the placeholder is explained by missing persisted content, not a client Firestore permission failure. Earlier implementation notes explicitly recorded that the first edition had not been bootstrapped. No production Vercel execution logs or environment inventory were available, so whether a deployed cron was invoked or rejected cannot be established. Local OpenAI and Firebase credentials are present; local `CRON_SECRET` is absent, which does not prove the production configuration. Public HTTP verification encountered a Vercel Security Checkpoint.

The changes have not been deployed and no live AI generation or production database write was performed during this fix. Production still needs the corrected deployment, confirmation of Vercel environment variables/schedule, and an authenticated bootstrap/retry using the existing cron endpoint above. Inspect Vercel logs and the daily Firestore document to confirm publication; do not claim the live page is repaired before that verification.

The user confirmed retaining the six existing public locales. Hebrew has no existing horoscope route; Arabic RTL remains supported. No canonical, hreflang, hero, Moon, influence, selector or footer design was changed.

Verification for this fix: TypeScript passed; scoped ESLint passed without warnings; 367 repository tests passed (344 TypeScript tests and 23 script tests), including 22 focused horoscope tests. All 78 local HTTP routes passed SSR/SEO/RTL checks, invalid signs returned 404, and the unauthenticated cron failed closed. The actual refresh button was clicked locally: it disabled with “Checking…” and returned to its ready state after a new server read. Populated headline/body SSR was verified with labeled test fixtures; no live provider generation or production-page content was verified.

### Files changed by this forecast fix

All paths are relative to `/Users/dimab/Documents/oneiro-web`:

- `app/api/cron/horoscope/route.ts` — job logging and stored-read cache integration.
- `app/horoscope/CosmicForecast.tsx` — testable server-rendered forecast section.
- `app/horoscope/HoroscopeContent.tsx` — render that section with the selected stored reading.
- `app/horoscope/horoscope.css` — headline styling within the existing design.
- `lib/horoscope/generate.ts` — bounded sign batches, resumable checkpoints, failure metadata.
- `lib/horoscope/model.ts` — headline, prose length, output and locale validation.
- `lib/horoscope/cache.ts` — same-day forecast selection.
- `lib/horoscope/store.ts` — fresh persistent availability on each server request.
- `lib/i18n/horoscope.ts` — localized pending copy in all six languages.
- `vercel.json` — recovery schedule.
- `lib/horoscope.test.ts` — generation, validation, retries, dates, signs and locales.
- `lib/horoscopeSSR.test.ts` — populated/pending SSR and read-only refresh contracts.
- `docs/horoscope.md` — investigation, operations and verification.
- `scripts/push-horoscope-forecast-fix.sh` — optional selective commit and push, never run automatically.
