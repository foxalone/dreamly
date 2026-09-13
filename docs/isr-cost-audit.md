# Dreamly ISR audit — 2026-09-13

## Evidence before deployment

Vercel production Observability, rolling six-hour window around 09:46–15:46
Asia/Jerusalem: **89K Write Units, 26K Read Units, 2.6K time-based
revalidations, 0 tag revalidations**. At 15:53 the rolling window showed 80K
writes and 25K reads; this is a moving baseline, not savings from this change.
The earlier reported 97K / 2.5K was not reused as a current measurement.

The Paths breakdown showed /pt/gallery (131 units), /pt/dreams/why-we-dream
(124), /sitemap.xml (118), several Portuguese guides (108 each), /de/gallery
(93), /ar/gallery (87), and /de/dreams/house (81). The Routes view also exposed
Next.js `.segments/.../__PAGE__.segment`, `_head.segment`, and `_tree.segment`
writes. These are framework cache artifacts, not unknown public URLs. The
visible table is limited and its rows do not reconcile the entire usage graph;
we cannot attribute all 89K billed units to a single cause.

Read-only Firestore inspection: **49 image assignments**, 0 assigned in the last
six hours, 4 in the last 24 hours; most recent assignment
2026-09-13T06:43:26.363Z. Dictionary text, translations and guides are repository
modules and only change through a deployment. Nevertheless both dictionary
route families (including localized guides) regenerated every hour. Metadata
and page rendering already share `React.cache(getDreamPageImage)` within the
render; no extra persistent data-cache layer was added.

The image worker assigns a finished image, then the wait/schedule workflow can
assign the same job again. Previously each assignment replaced `assignedAt`.
This unnecessarily changes gallery ordering/props even without a new image.
This is a confirmed code path; production duplicate-invalidation volume was
not separately measured.

## Change and publication paths

- Dictionary routes: 3600 → **86400 seconds**, including all prefixed locales.
  Daily revalidation is a conservative failure fallback for rare changes to
  database image assignments; text changes already require a deploy.
- Gallery and sitemap stay at **3600 seconds**. The gallery includes heart
  counts (also refreshed by its existing client API); sitemap's measured writes
  were small. Their freshness is not traded for a longer timer.
- Admin image PUT/DELETE: after a successful actual mutation, invalidate only
  the affected symbol in six locales, the six galleries, and sitemap. Record
  the acknowledged source fingerprint so the next scheduled check is a no-op.
- `GET /api/cron/dream-page-images`, every **five minutes**, uses the existing
  `requireCronSecret` authentication. It compares the source collection with
  fingerprints in `cache_revalidation/dreamPageImages`. This covers both known
  writers (admin, image worker, auto-content wait/schedule), old running worker
  processes, and external scripts/direct Firestore changes, including deletion.
  It never interprets a failed source read as deletion. Failed invalidations
  don't advance the acknowledgement. Concurrent changes are detected next tick.
- Dictionary image reads propagate backend failures so ISR retains the last good
  HTML/metadata instead of caching an artificial missing image for 24 hours.
- Shared transactional image save avoids resetting assignment time for identical
  imageJobId/imageUrl/subject, including worker/wait/schedule retries.
- A batch invalidates each gallery and sitemap only once. An unchanged scan
  neither invalidates paths nor writes the fingerprint document. First run
  establishes the baseline by refreshing the existing assigned-image pages
  only (49 × 6 + 7 = 301 paths at audit time), not the whole site.

The scanner adds approximately **14,400 Firestore document reads/day** with the
current 49 images plus one state document per five-minute check, excluding
admin calls and retries. This is an explicit tradeoff for covering external
writers without new credentials, Firestore triggers or an unreliable webhook.
Measure total platform costs alongside ISR; do not claim a fixed saving.

## Freshness and unchanged behavior

- New, edited or removed **text/symbols/guides**: available when their successful
  production deployment becomes current, exactly as before. `dynamicParams =
  false` and the generated slug inventory remain unchanged; new symbols must
  ship in all six source locales and in a build. Cache invalidation cannot
  publish code that has not been deployed.
- Admin image publication/replacement/removal: marked for regeneration in the
  successful request; next server visit receives the refreshed route.
- Worker/external image changes: normally discovered within **5 minutes**, then
  regenerated on the next visit. Images use new storage URLs/tokens; no storage
  or browser cache policy was changed. Directly overwriting bytes at an unchanged
  URL remains subject to the existing Storage/browser TTL and should use a new
  versioned URL for prompt publication.
- Missed/failed scheduled checks: dictionary **24 hours**, gallery/sitemap
  **1 hour**, plus the next request and regeneration. ISR is demand-driven, so
  these are eligibility intervals, not absolute wall-clock guarantees; repeated
  backend failures can extend staleness. Already open browser tabs refresh by
  the site's existing client behavior.
- URL structure, canonical, hreflang, robots, admin authentication and public
  cacheability are unchanged. No root/layout/global tag invalidation, SSR
  conversion, query stripping, unknown-path rewrite or cache disabling.

Unknown symbols are still rejected with 404 (`fallback: false` in the built
manifest). Six locale HTTP checks with and without `utm_source` and `q` returned
identical HTML and cache HITs. Available Vercel path detail did not confirm a
separate unknown-URL/query-string write problem. No speculative fix was applied.

## Validation

- Production build completed: **5653/5653** static outputs; build manifest
  confirms 86400 for dictionary routes and 3600 for galleries/sitemap.
- TypeScript passes; changed-file ESLint has no errors (one existing unused
  import warning in autoContent.ts).
- Eight new fixture tests pass: publication, image replacement, external edit,
  deletion, all locales, repeated save/scan deduplication, failure/retry behavior,
  batch path scope, and the complete localized dictionary/sitemap inventory.
- Local production HTTP: six symbol pages and six galleries return 200;
  canonical/hreflang and query cache identity pass; English/Russian unknown
  symbols return 404. Sitemap parses as XML: 5574 URLs and 294 image entries.
- Full tests: 113/114 library tests and 9/9 scheduler script tests pass. Existing
  `adminAutoSlots.test.ts` test “keeps a two-day horizon with four 05:00/15:00
  slots” expects September 13/14 from a September 9 reference date while only
  September 12 is occupied; implementation returns September 10/11. Both files
  are unchanged by this work. This unrelated failure is not hidden or altered.
- Initial sandbox build couldn't fetch Google Fonts; the production build with
  network access passed. A pre-existing dangling `.next-vm` link was resolved
  by creating its empty temporary target; no tracked configuration change.
- No real materials were created, edited or deleted for tests.

## Follow-up after 24–48 hours

Compare equal production windows, excluding deployment/initial baseline warmup:

1. ISR Write Units and actual write count/bytes, separately from Read Units.
2. Time-based vs on-demand revalidation counts and `.segments` artifacts by
   route/path/locale; dictionary vs galleries vs sitemap.
3. Writes per 1000 requests, traffic mix and cache HIT/MISS/STALE ratios, so
   crawler changes aren't misreported as savings.
4. New cron's success/error rate, changed/path counts (response JSON), duration,
   and state-document updates; unchanged ticks should return 0/0.
5. Image publication lag (body, OG/Twitter/JSON-LD, gallery and sitemap), 404s,
   page latency, and Firestore reads/total cost.

References: [Next.js ISR](https://nextjs.org/docs/app/guides/incremental-static-regeneration)
and [targeted revalidatePath](https://nextjs.org/docs/app/api-reference/functions/revalidatePath).
No numeric saving is promised before measurement.
