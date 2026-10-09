# Dreamly rewarded-ad audit — 2026-10-07

## Production Offerwall check — 2026-10-09

- The published AdSense Offerwall targets only `dreamly.art/ad/unlock`, shows
  after 0 page views, and grants 1 page view after a completed rewarded ad.
  Auto ads remain off. The app sends users to the dedicated page from an
  existing blocked action, such as translation, analysis, or saving a dream.
- The message previously promised site-wide access for 24 hours. Its published
  copy now says one ad unlocks one selected action in English, Spanish,
  Arabic, Brazilian Portuguese, German, and Russian. This copy lives in
  AdSense, not in the repository. Google can take up to 10 minutes to serve
  message edits.
- The AdSense report for October 9 showed one `Display • Offerwall` ad
  impression and estimated earnings of ₪0.02. This confirms that a shown ad
  can monetize; merely showing the Offerwall prompt is not an ad impression.
- The choice screen belongs to AdSense Offerwall. The website cannot make
  its "View a short ad" selection for the visitor. Eligible paywalls now
  navigate directly to that screen, so the visitor's first ad-specific click
  is Google's choice. Prices are linked separately from `/ad/unlock`. The real
  Dreamly direct GPT slot returned no fill in the comparison below; AdSense
  backfill being enabled on the unit has not supplied an eligible ad. No
  direct GAM line items were visible in the account on October 9.
- The current Offerwall client infers completion from the Google overlay
  disappearing; AdSense does not provide the app a documented ad-completion
  callback. This is a weaker signal than the direct GPT `rewardedSlotGranted`
  event. Do not treat the Offerwall path as server-verified proof of a paid ad.

## A. Root cause and observed evidence

The actual path is already `/23382781832/dreamly_rewarded`. This is a WEB
REWARDED out-of-page slot, not a banner.

A live Chrome comparison used a temporary top-level localhost page, the official
GPT script, the real Dreamly unit, and Google's sample unit. No ad was shown and
no credit endpoint was called. Observed:

| Signal | Dreamly unit | Google `/22639388115/rewarded_web_example` |
|---|---|---|
| GPT command queue ready | yes | yes |
| Non-null rewarded slot | yes | yes |
| `slotResponseReceived` | yes | yes |
| `slotRenderEnded.isEmpty` | **true** | **false** |
| `rewardedSlotReady` | **not received before the empty slot was replaced** | **received** |

This establishes no-fill for the real unit in this test; the same browser supports
WEB rewarded and can obtain a ready ad. It does NOT establish the exact GAM
auction rejection or prove that production-origin traffic has the same result.
An empty slot does not indicate a backend credit failure.

The supplied GAM configuration has no direct line items and no Ad Exchange.
Google documents reservation/video line items and Ad Exchange demand for WEB
rewarded. Active inventory, a reward amount, and the AdSense backfill checkbox
alone do not demonstrate an eligible rewarded campaign. Missing eligible demand
is the leading explanation, to confirm with GAM delivery diagnostics. No GAM
account settings were independently inspected or changed.

## B. Files inspected

- `lib/rewardedAd.ts`, `lib/rewardedAd.test.ts` (already untracked at audit start)
- `app/components/RewardedAdButton.tsx`, `PaywallHost.tsx`,
  `GuestAnalysisLimitModal.tsx`, `PlansModal.tsx`
- `app/api/dreams/ad-reward/route.ts`, `guest-ad-reward/route.ts`
- `app/api/dreams/_lib/subscription.ts`, `guestQuota.ts`, `requireUser.ts`
- `lib/subscriptions/plans.ts`, `status.ts`
- `app/layout.tsx`, `next.config.ts`, `firestore.rules`, `public/ads.txt`
- `app/app/dreams/page.tsx` credit/snapshot references
- Six `lib/i18n/messages/{en,es,ar,pt,de,ru}.ts` status messages
- `AGENTS.md`, `docs/i18n.md`, `package.json`

Searches also covered GPT, reward events, credits, consent/CMP and CSP references
across app/lib/functions. The existing working-tree rewarded refactor was
preserved, not attributed to this audit. It had already moved persistence from
close to granted and introduced cleanup tests.

## C. Files changed

- `lib/rewardedAd.ts`, `lib/rewardedAd.test.ts`
- `lib/rewardedReceipt.ts`, `lib/rewardedReceipt.test.ts` (new)
- Four components: RewardedAdButton, PaywallHost, GuestAnalysisLimitModal, PlansModal
- Both reward API routes and both subscription/guestQuota helpers above
- This report and `scripts/push-rewarded-audit.sh`

## D. Exact issues

1. The 10-second slot timeout started before GPT finished loading. GPT load time
   consumed the ad response budget; late ready events were discarded after cleanup.
2. The ad was prefetched when the component mounted, before Watch ad was clicked.
   Prefetch itself is supported by Google's sample, but differed from the requested flow.
3. Signed-in POSTs incremented a credit on every call until the daily cap.
   Guest logic reused an unspent credit but could grant again on replay after spending it.
4. No stage diagnostics distinguished script failure, unsupported format, no-fill,
   readiness timeout, display failure, or backend failure.
5. A late paywall eligibility read could enable ads for a newer request. Reusing the
   component across requests could retain the previous ad session.

The starting working-tree implementation did NOT grant on click, ready, open,
or close without a granted event. No new fallback rewards were introduced.

## E. Fix and security boundaries

- Request only after Watch ad opt-in, then call `makeRewardedVisible` at readiness.
- Keep a separate 10-second GPT load deadline and 30-second post-GPT ad deadline.
- Use the exact existing path, `defineOutOfPageSlot(..., REWARDED)`, `addService`,
  `enableServices`, and `display(slot)`. GPT load is shared, script duplication is
  avoided, and command queue readiness is awaited. Effects run client-side only.
- Filter every event by slot; guard repeat show/grant; remove listeners and destroy
  slots on close/disposal/failure. Pending persistence survives component disposal.
- Call the backend only from granted; wait for persistence and close before retrying
  the original Dreamly action. Existing credit fields and caps remain unchanged.
- Pass one UUID per ad attempt. In a single Firestore transaction read its receipt,
  increment exactly one credit, and create the receipt. Duplicate requests return
  current balance without another increment, even after the credit was spent.
  Signed-in receipts also bind the reward kind. Receipt subcollections are denied
  to clients by the existing catch-all Firestore rule.
- Preserve Firebase ID-token authentication. Preserve the existing guest-cookie/IP
  flow: **guests are not Firebase-authenticated**; requiring that would change the
  existing product/auth architecture. A guest cookie is not signed proof of identity.
- Protect eligibility reads with a request version and reset each modal session.
- Reuse existing no-fill/failure copy in all six languages; no UI redesign.

**Security limit:** UUID receipts provide idempotency, not proof of ad completion.
An attacker can submit fresh IDs directly to the endpoint, up to existing caps.
Google explicitly says server-side verification is unavailable for WEB rewarded.
Thus the app honors the real granted event in its normal flow, but this cannot be
represented as cryptographically verified completion. This limitation remains.

## F. Local verification

```sh
node --import tsx --test lib/rewardedAd.test.ts lib/rewardedReceipt.test.ts
npm run typecheck
npm run dev
```

14 targeted tests pass, covering grant-only credit, duplicate events, failed display,
no-fill, timeout, disposal, GPT retry, opt-in auto-display, separate time budgets,
receipt replay, guest replay after spending, and failed transaction persistence.
TypeScript and targeted ESLint pass. Firestore tests use an in-memory transactional
fixture, not a deployed database or emulator; live atomic contention was not tested.

Open localhost top-level (not an embedded preview), open an eligible paywall, and
click Watch ad with Console/Network recording. No-fill must show the localized
message and make no reward POST. Slow or blocked GPT must not award anything.
Use Google test demand only in an isolated diagnostic page with no credit endpoint;
never replace the production unit or mint test rewards against production data.

## G. Production verification / GAM action

Deploy frontend and backend together; old cached clients without `rewardId` receive
400 and must reload. Use an eligible non-subscriber and actual remaining quota.
Record the real production request and console events on desktop and mobile,
with the page top-level and neutral zoom. Verify the request contains the exact
unit path. Check Network errors for blocking/CSP and inspect the GPT Publisher
Console and GAM delivery tools for the exact no-fill reason.

In GAM, verify eligible rewarded demand: a targeted reservation Video/audio line
item with 1x1v creative, or correctly connected Ad Exchange demand (Display 1x1).
Check targeting, campaign dates, creative approval, floors, and the “Block
non-instream video ads” protection. Inventory Active alone is insufficient.

For a completed real ad, check one POST following granted and a +1 change in the
appropriate `adAnalysisCredits`, `adSaveCredits`, or `adTranslateCredits` field
(guest: `adAnalysisCredits`). The immediately retried action may spend that credit,
so a net unchanged balance can be correct. Replay the same request only on a test
account/database: no second increment. Closing without earning must send no POST.

No repository CSP was found restricting GPT; hosting/CDN response headers and
browser extensions remain production checks. No explicit CMP/TCF integration was
found in application code; Google-hosted consent configuration was not inspected.
The globally loaded AdSense script is separate from GPT, not duplicate GPT setup.
Consent as the production blocker is unproven. The localhost sample succeeds in
this browser; other devices, regional consent states, iframe contexts, and production
headers can still differ. Slot-null and ready-timeout diagnostics expose these cases
without mislabeling every timeout as no-fill.

## H. Expected console output

Filter `[Dreamly rewarded]`:

```text
GPT loaded
Rewarded slot path { path: '/23382781832/dreamly_rewarded' }
Rewarded slot created
Rewarded request started
slotRenderEnded { 'slotRenderEnded.isEmpty': false }
rewardedSlotReady
Rewarded ad opened
rewardedSlotGranted
credit grant request started
credit grant succeeded     (or credit grant failed)
rewardedSlotClosed
```

The server response and close can occur in either order. No-fill instead logs
`slotRenderEnded.isEmpty: true`; no granted event or credit POST follows. Other
explicit outcomes: `GPT load failed`, `Rewarded format unsupported`,
`rewardedSlotReady timeout { readyReceived: false }`, `Rewarded display rejected`.
Diagnostics are temporary console logs and contain no tokens or user identifiers.

## I. Classification

- **Observed:** no-fill for Dreamly in isolated live GPT testing.
- **Leading configuration explanation:** no demonstrated eligible rewarded demand
  in the supplied GAM setup; confirm with GAM delivery diagnostics.
- **Confirmed code defects fixed:** timeout budget, replay protection, missing
  diagnostics, stale paywall/session handling. Click-first flow implemented.
- **Not established:** production-origin fill, exact auction rejection, regional
  consent failure, CSP/ad-blocker failure, or a device limitation for affected users.
- **Still inherent:** client-reported web reward completion, without Google SSV.

Sources:
- https://support.google.com/admanager/answer/9116812?hl=en
- https://developers.google.com/publisher-tag/samples/display-rewarded-ad
