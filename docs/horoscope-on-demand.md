# On-demand horoscope generation — 2026-10-25

This is the current generation architecture. It supersedes the earlier bulk-generation sections and recovery instructions in `docs/horoscope.md`.

## Visitor flow and SEO

A normal page request, metadata render, crawler visit or status GET only reads storage. If the requested current-UTC-day combination exists, its headline, paragraphs, advice and existing insight fields render in the initial server HTML. Canonicals, hreflang, sitemap and permanent routes are unchanged. No yesterday fallback or English-as-localized fallback is used.

When missing, the existing forecast card offers a localized **Click here to get your forecast** button. This explicit interaction addresses the requirement that crawlers must not initiate expensive generation; simply opening a page does not incur OpenAI costs. The button POSTs only `{sign, locale}` to `/api/horoscope/request`. The server selects the UTC date and persists deterministic job IDs. All six existing locales are supported, including Arabic RTL; Hebrew routes are not added.

The client checks status every four seconds without overlap, at most 45 times. GET polling never creates or retries jobs. Completion or UTC rollover triggers `router.refresh()`, which retrieves the stored content through the server. Leaving the page aborts polling, not the durable job. After the bounded wait, a localized message explains that background processing continues. Failures, rate limits and temporary unavailability have localized messages; retries retain all attempt/cooldown limits. The idle card shows only the action button, without loading bars or an anticipation heading. Skeleton bars appear only after a request is queued or processing, with the existing reduced-motion override.

## Background execution and recovery

The public POST commits jobs before returning and registers an awaited Next.js `after()` callback with a 240-second route duration. This is the supported serverless lifecycle hook, not an unawaited promise. See [Next.js after documentation](https://nextjs.org/docs/app/api-reference/functions/after).

Firestore is the durable queue. If the callback is terminated or unavailable, the authenticated `/api/cron/horoscope-worker` drains pending requests every five minutes. It processes English masters before translations and checks an invocation deadline before starting bounded provider calls. There are no AI calls when the queue is empty. Its day-only query uses the standard single-field `day` index; no composite index is needed. Confirm that index remains enabled in the deployed Firestore project.

The previous `/api/cron/horoscope` schedule and 15-minute bulk retries are removed. That route is retained as a secret-protected HTTP 410 response so old invocations cannot create bulk content. All unrelated cron definitions are preserved. Firebase Functions and external image/video workers are unchanged.

Recovery runs independently of visitors and never invents demand: only previously requested jobs can run. A job queued just before midnight is not newly started after UTC rollover. An already running provider call may finish, but writes only to its original date. Historical jobs and readings are retained.

## Persistence and distributed locking

- `daily_horoscopes/{YYYY-MM-DD}/signs/{sign}/readings/en`: immutable English master, computed astronomy snapshot, actual generation timestamp, master content hash.
- `daily_horoscopes/{YYYY-MM-DD}/signs/{sign}/readings/{locale}`: requested translation, same astronomy snapshot, generation timestamp and source master hash.
- `horoscope_jobs/{day}_{sign}_{locale}`: requested day/sign/locale, status, attempts, owner token, lease expiration, cooldown, timestamps, sanitized error metadata and provider token usage.
- `horoscope_usage/{day}`: atomic provider-attempt totals, split into master and translation attempts.
- `horoscope_request_limits/{day}_{HMAC bucket}`: admission rate counts; no raw network address or user identity. `expiresAt` is metadata, not an automatically configured TTL policy; optional Firestore TTL/retention can be configured operationally.

One reading per document avoids the old all-sign/all-language document growing toward Firestore’s size limit. Existing `daily_horoscopes/{day}.locales[locale][sign]` records, including valid seven-field historical readings and valid partial checkpoints, remain readable without migration or regeneration. Existing publication/latest data is left intact. No old document is deleted or overwritten.

A Firestore transaction atomically claims each unique job, reserves one daily provider attempt, increments its attempt count and assigns a random owner with a 150-second lease. After storage checks, the same owner renews its still-active lease transactionally immediately before the provider call; an expired owner cannot revive its lease. A remaining-time guard reserves at least 75 seconds before calling the provider. The request times out after 65 seconds with SDK retries disabled, within the renewed 150-second lease. Transactions do not stay open across provider calls. Completion writes the reading and job status atomically only if the same owner still has an unexpired lease, and preserves an already valid output. A stale worker cannot overwrite a newer completed record. The next worker invocation recovers expired leases.

There is one active worker per master or translation across instances. Exactly-once billing across process crashes is not promised: if a provider returns successfully but the function dies before the atomic Firestore commit, a later bounded retry may make another provider call. Failed commits and crashes remain subject to job and global attempt caps. This is a limitation of calling an external AI service without a shared transactional commit, not an in-memory-lock workaround.

## AI and cost controls

Both master generation and translation use the existing OpenAI infrastructure with `gpt-5-mini`, via horoscope-specific model constants. The unrelated shared-dream `TRANSLATE_MODEL` remains `gpt-5-nano`.

Each provider request concerns exactly one sign. English generation receives the actual Astronomy Engine snapshot for noon UTC on that date. Translation receives the persisted English master, never an independent horoscope prompt. Strict JSON schema and runtime validation enforce requested sign, required fields, headline, safe prose and 100–160 general words. Script, native-word and source-copy checks reject obvious wrong-language content; these checks do not prove perfect translation fidelity or substitute for native editorial review. Refusal, truncation and malformed output fail without fabricated fallback prose.

Per job: at most three automatic provider attempts, with persisted exponential cooldowns of one minute, then two minutes (terminal after attempt three). The worker runs at five-minute intervals, so actual recovery may be later than the minimum cooldown. Public retry does not reset attempts or cooldown. After diagnosis, a secret-authenticated operator may grant one additional attempt to an exhausted current-day job, once only, within the same global daily cap; the historical attempt count is never reset. English survives a translation failure.

Global: at most 96 provider attempts per UTC day, including failures/crashes, with at most 5,000 completion tokens per call (including reasoning). This bounds the completion-token ceiling at 480,000 per day; actual usage is logged and normally much smaller. The counter is reserved before each provider call and is deliberately conservative if a worker crashes or finds cached content. Jobs blocked by a spent daily cap become terminal rather than retrying indefinitely.

Sparse demand costs one successful English call per requested sign and one successful translation per requested non-English language. For 100 Russian Sagittarius visitors, normal successful processing makes two AI calls total; an unused Leo sign makes none. Full 12-sign/six-language demand can make 72 successful single-combination calls, with more per-call prompt overhead than the earlier 24 batched calls. GPT-5 mini translations also have a different unit cost from nano. No dollar estimate is asserted; use recorded token usage and current provider pricing. Structured logs cover cache hits/misses, claims, retries, successful master/translation generations, usage and failures, without user identities or generated text.

## Security and operations

Public initiation requires same-origin POST, a custom request header, an allowlisted sign/locale and a small fixed-shape body. Arbitrary prompts, dates, unsupported languages and extra fields are rejected. Generation is never triggered by a GET or user-agent classification. Existing completed content is served identically to humans and crawlers.

Admission is limited transactionally to 30 requests per minute and 200 per UTC day per HMAC network bucket. On Vercel the bucket uses its platform-set `x-vercel-forwarded-for` header; self-hosted/local deployments conservatively share one bucket instead of trusting arbitrary forwarding headers. This is abuse mitigation, not proof that every caller is human; the global provider-attempt ceiling bounds AI exposure even under distributed automation.

Worker GET and manual recovery POST use the existing `requireCronSecret` pattern. Public clients cannot access provider keys or worker credentials. Firestore collections remain server-only under the existing default-deny rules.

Required environment variables are unchanged: `CRON_SECRET`, existing OpenAI key (`ONEIRO_OPENAI_API_KEY`, fallback `OPENAI_API_KEY`), and existing Firebase Admin credentials. `CRON_SECRET` also HMACs network buckets; when absent, initiation and worker access fail closed. A random local-only value is now configured in the ignored `.env.local` for local testing; its value is not logged or committed. Production must retain its own correctly configured secret. Doing so uses the configured database and incurs real OpenAI costs if the button is pressed; use a development Firebase project for manual generation tests.

Deployment must apply `vercel.json`, enable the five-minute recovery cron, and support the configured 240/300-second durations and Next.js background lifecycle. Confirm actual Vercel executions after deployment. No new paid queue or package is introduced. The route cron is retained only for queue recovery, not scheduled bulk content creation.

Authenticated manual recovery (same daily cap, no attempt-count reset; at most one extra attempt for an exhausted job):

```sh
curl --fail-with-body --max-time 300 \
  -H "Authorization: Bearer ${CRON_SECRET:?Set CRON_SECRET}" \
  -H 'Content-Type: application/json' \
  --data '{"jobId":"2026-10-25_leo_ru"}' \
  https://dreamly.art/api/cron/horoscope-worker
```

Only a failed or exhausted, previously requested current-day job can be recovered. Replace the sample ID with a real current-day job. For normal recovery, authenticated GET drains due requested jobs without resetting cooldowns. Exhausted jobs require operator diagnosis and can receive at most one extra authenticated attempt; public users cannot reopen them. The job records retain enough metadata to inspect missing configuration, failures, attempts and usage.

## Verification and production status

Focused tests use an atomic serialized Firestore fake and mocked OpenAI responses; they do not write production data or incur AI costs. Coverage includes first/duplicate requests, 20 concurrent workers, 100 Russian visitors, independent Spanish translation reuse, unrequested signs/languages, legacy data, active/expired leases, stale workers, provider and Firestore failures, bounded retries, global caps, UTC rollover, read-only polling, explicit initiation, rate limiting, worker authentication, SSR, six locales, RTL and disabled bulk cron. Polling tests cover completion, bounded waits, unmount, network failure and UTC rollover.

No commit, push, deployment, live AI call or production horoscope-data write has been performed. A local-only secret was configured in the ignored `.env.local` after diagnosing the local preview failure. Production operation remains unverified until deployment, worker configuration and a requested edition are checked.

## Exact changed files

Paths below are relative to `/Users/dimab/Documents/oneiro-web`. The list includes the preceding uncommitted forecast fix that this refactor builds on; the delivery script stages these paths only.

- `app/api/cron/horoscope/route.ts`
- `app/api/cron/horoscope-worker/route.ts`
- `app/api/horoscope/request/route.ts`
- `app/horoscope/CosmicForecast.tsx`
- `app/horoscope/HoroscopeActions.tsx`
- `app/horoscope/HoroscopeContent.tsx`
- `app/horoscope/HoroscopeView.tsx`
- `app/horoscope/horoscope.css`
- `docs/horoscope.md`
- `docs/horoscope-on-demand.md`
- `lib/aiModels.ts`
- `lib/horoscope.test.ts`
- `lib/horoscopeSSR.test.ts`
- `lib/horoscopePolling.test.ts`
- `lib/horoscope/cache.ts`
- `lib/horoscope/generate.ts`
- `lib/horoscope/jobs.ts`
- `lib/horoscope/model.ts`
- `lib/horoscope/persistence.ts`
- `lib/horoscope/polling.ts`
- `lib/horoscope/security.ts`
- `lib/horoscope/store.ts`
- `lib/i18n/horoscope.ts`
- `lib/i18n/horoscope-jobs.ts`
- `vercel.json`
- `scripts/check-horoscope-routes.ts`
- `scripts/push-horoscope-forecast-fix.sh`

Final local verification: TypeScript passed, scoped ESLint passed without warnings, `git diff --check` and delivery-script syntax checks passed. All **382 repository tests** passed (359 TypeScript tests plus 23 script tests), including **37 focused horoscope tests**. All **78 localized HTTP pages** passed SSR/canonical/hreflang/RTL checks; invalid signs returned 404, invalid public API input returned 400, cross-origin initiation returned 403, and unauthenticated worker requests failed closed. Browser inspection confirmed the Russian forecast displays the localized explicit initiation button after its read-only availability check. No job was initiated against the real database during verification.

Local preview correction: compare browser Origin to the incoming HTTP Host rather than Next dev’s normalized internal URL (`localhost` versus `127.0.0.1`). A regression test covers accepted same-origin and rejected mismatched-origin requests. Local configuration is loaded after server restart; public validation can be checked without creating jobs using a deliberately invalid extra date field.

Initial-card clarity refinement: the call to action now says “Click here to get your forecast” in all six locales. The untouched card has only the action button, with no repeated instruction, skeleton bars or ambiguous preparation message. TypeScript, scoped ESLint and nine SSR/polling tests passed; local initial HTML and browser inspection confirmed the new label and absence of loading bars, without initiating generation.

## Local failure investigation and recovery — 2026-10-25

The first live Cancer English attempt failed and stored only generic `Error` / `GENERATION_FAILED`; its precise cause cannot be reconstructed. A controlled second attempt through the existing job succeeded and stored the Cancer English master (1,139 input tokens, 843 output tokens). The local server renders that stored content. An earlier user-requested Sagittarius English master had also succeeded. No unused signs or languages were generated by this recovery; no deployment was performed. Earlier statements about no live generation describe the earlier implementation checks, not this later requested recovery.

Typed `HoroscopeValidationError` diagnostics now preserve safe validation reasons (such as a field or word count) in job metadata and logs, while arbitrary provider messages and response prose remain excluded.

Vercel cron does not run on `next dev`. An optional local recovery process is prepared in `scripts/horoscope-worker.ts` (`npm run horoscope-worker`). It awaits the same durable queue drain every thirty seconds, never enqueues signs/languages and respects owner leases, cooldowns and cost caps. SIGINT/SIGTERM stop subsequent polling and allow an active drain to finish. Automatic approval review initially rejected persistent execution because the diagnostic question did not authorize ongoing processing. The user then explicitly approved bounded OpenAI calls and Firestore writes for already requested jobs, and the local worker was started with `npm run horoscope-worker` on 2026-10-25. Production continues using its authenticated five-minute worker schedule after deployment.

Additional delivery files: `package.json` and `scripts/horoscope-worker.ts`.

Retry-state copy now asks the visitor to wait before retrying instead of promising a scheduled retry on a local server where no recovery scheduler may be running. Safe validation diagnostics and provider-message redaction passed regression tests; 37 targeted generation/SSR/polling tests passed.


## Daily sign access and rewarded ads — 2026-10-25

The latest user-approved policy supersedes the public forecast rendering described above:

| Visitor | Free distinct signs per UTC day | Additional signs |
| --- | --- | --- |
| Guest | 0; show sign-in and watch-ad choices | One rewarded ad per sign |
| Signed-in member | 1 | One rewarded ad per sign |
| Active subscriber (including existing paid-access/trial rules) | 3 | One rewarded ad per sign |

An unlocked sign can be reread throughout that UTC day in every supported language. Refreshes, polling and generation retries do not consume another slot. Access information GET is read-only except restoring the browser capability cookie and establishing an anonymous visitor cookie; only explicit POST books a free sign. Signing in offers the member allowance before ads. Subscription eligibility uses the existing server-owned billing fields. These counters do not affect dream interpretation, saving or translation quotas.

Firestore transactions atomically book `horoscope_access/{hashed subject}/days/{day}/signs/{sign}` and the day's free usage. Ad challenges bind one identity, sign and UTC date, expire within ten minutes (or midnight), are idempotent, and have bounded network admission. New collections are covered by the existing default-deny Firestore rules. No client Firestore write is authorized. The HttpOnly HMAC-signed browser capability includes only unlocked signs and expires at UTC midnight; server rendering checks it before loading prose. It is a browser access capability, not a private user document. Auth changes recheck the current account's ledger and remove an incompatible capability. The landing page no longer exposes forecast previews, and neither public status nor generation APIs can be used without sign access. Metadata contains public zodiac descriptions, not the gated forecast.

Ads reuse the site's AdSense Offerwall at `/ad/unlock?kind=horoscope`. The new branch requires an observed overlay followed by its disappearance with the Offerwall FCOEC entitlement present, then submits the server-created challenge. Both the client and API reject a missing entitlement. There is no horoscope no-fill fallback and no grant merely for initiating an ad. The existing analysis/save/translation branches remain unchanged. After successful completion the requested forecast is queued/reused and the visitor returns to the localized sign page.

**Provider trust limitation:** the existing Offerwall integration supplies a browser cookie rather than a cryptographically signed server-to-server completion callback. FCOEC can be forged by a caller controlling their own HTTP requests. Challenges prevent cross-user/cross-sign replay and the signed access cookie protects subsequent reads, but they cannot prove that Google actually served a completed ad. A tamper-resistant ad requirement needs a provider-supported signed completion integration. No unverified SSV API was invented here. Actual ad fill/completion must be tested manually on the configured published domain; no real ad impressions or rewards were generated by automated verification.

Additional delivery files:
- `app/api/horoscope/access/route.ts`
- `app/api/horoscope/ad/route.ts`
- `app/ad/unlock/AdUnlockClient.tsx`
- `app/horoscope/HoroscopeAccess.tsx`
- `lib/horoscope/access.ts`
- `lib/horoscope/access-cookie.ts`
- `lib/horoscope/access-http.ts`
- `lib/horoscopeAccess.test.ts`
- `lib/i18n/horoscope-access.ts`

Verification: 392 repository tests passed (369 TypeScript tests and 23 script tests), including 44 targeted horoscope tests. Concurrent distinct-sign requests enforce the one/three limits, existing access stays free, UTC rollover resets allowances, subscription expiry changes eligibility, and challenges reject wrong identities, expiration and replay misuse. Signed-cookie tampering and wrong sign/day fail closed. All 78 localized HTTP pages passed SSR/canonical/hreflang/RTL checks and contained no gated prose; unauthenticated request/status APIs returned 402 even for an already cached Cancer forecast. Browser inspection confirmed the Russian guest sees enabled sign-in/watch-ad choices. Tests use in-memory access ledgers; no production account quota or advertising reward was booked. TypeScript and scoped ESLint passed. Changes remain local until the provided delivery script is run.


## Visible planetary positions — 2026-10-25

Moved the existing ten-body position grid out of the collapsed technical section and into an always-visible panel before sharing. The panel shows the Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune and Pluto, with their calculated tropical sign, degree and direct/retrograde status. Its heading is native in all six site languages (`lib/i18n/horoscope-design.ts`, added to the delivery file list). Positions use the existing sky snapshot and calculation timestamp; no AI call or additional access charge is involved. The short Sun/Moon/aspect interpretation remains separate; expanded details retain aspects and methodology. Positions are not repeated in the collapsed section.


Added the shared localized `ArticleAdBanner` between the visible planetary positions and sharing panels. It reuses the configured article slot (and existing default), renders the normal preview in development, and requests a standard display ad in production. This placement is separate from the rewarded sign-unlock flow.
