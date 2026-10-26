# Analysis attempt diagnostics

The Dreams tab in the admin dashboard includes an Analysis attempts panel when
Only Shared is off. Its authenticated admin API lists the 150 most recently
updated records. Completed readings are included by default; refresh and search
apply to this panel independently of the dream list.

`analysis_attempts` is private server-written diagnostic data, not public dream
sharing or a map pin. Existing Firestore default-deny rules block direct client
access. Only the existing `requireAdmin` API can list it. No new index or client
Firestore permission is needed.

A valid, submitted `/api/dreams/analyze` request records text, account/guest ID,
UI language, lens, request count, server timestamps and its last known outcome.
New submissions also record IP-derived city, region and country using the same
resolver as ordinary dreams (Vercel headers first, then an IP lookup capped at
1.5 seconds). Country-only headers are retained when a city cannot be resolved.
Missing locations are shown explicitly; older attempts are not retroactively
geolocated. The data includes the submitted source (homepage, guest journal,
dictionary search, symbol prompt or signed-in journal), journal dream ID when
available, word/character counts and a bounded browser user-agent string.
The final server result records HTTP status, request duration and, on success,
analysis text, model, emoji model and emojis. A retry clears the previous result
while preserving the original creation time and incrementing the request count.
Location and source are searchable; technical details and analysis expand in the
admin card. All new labels are available in the six UI languages.
Retries with the same guest/account, text, language, lens and UTC date reuse one
record. An existing guest cookie keeps that record associated through sign-in.
The record does not store auth tokens, raw IP addresses or provider error messages.
Logging failures are caught so diagnostics cannot fail an otherwise valid reading.

The ad page can report a timeout, failed reward confirmation, failed Google
sign-in (including unauthorized domains), or Back. The update endpoint only
accepts enumerated events against an existing record owned by the current guest
cookie or verified account. Browser events are marked as client-reported and
cannot change a successful server result. Back preserves the last failure reason.

These are last-known outcomes, not proof that a user abandoned a flow or saw
an answer. An uncompleted request may reflect a timeout, disconnect, closed tab,
or a request still running. An ad timeout does not identify whether the cause
was blocked scripts, configuration, network, or no available ad. The panel says
no completion was recorded rather than inventing a cause.

Tracking starts with this release. Text only typed or saved locally without an
analysis API submission is not uploaded. Historical local-only attempts cannot
be reconstructed. Browser reports are best-effort; the server records still
show the original analysis outcome if no later browser event arrives.


The admin card now also shows sign-in evidence and a bounded history of the last
80 browser events, timestamped when the server receives them. It records opening
the ad page, appearance of the ad overlay (not proof of an available rewarded ad),
availability of the fallback sign-in button, opening the sign-in dialog, Google
or email submission, account creation, reset requests, cancellation, success and
allowlisted failure categories. Passwords, email form values, auth tokens and raw
provider errors are never included. Sign-in success is browser-reported and does
not mean an analysis completed. The server's successful analysis remains protected
from late browser events. History survives retries, unlike the last known reason.
The sign-in flow captures the attempt ID before clearing/importing the pending
dream, so subsequent events still refer to that attempt. Standalone sign-in is
correlated only when opened for the guest analysis limit. Missing events mean
unknown, not that the user never clicked sign-in. Past interactions without these
events cannot be reconstructed. Browser delivery remains best-effort.


## Complete flow for new activity

New server events record submission/retry, guest daily free-slot reservation or
ad-credit use, access granted by the reward endpoint, and the final HTTP outcome.
Server and browser events share a transactional history capped at 80 entries;
retries retain the history. Each new entry identifies its source. Opening the ad
overlay alone still does not prove a video was completed: the server access event
means the reward endpoint accepted the grant under the existing reward model.

The analysis response ID is carried through the local queue and journal import.
Guest full-dream Offerwall sessions also keep a session receipt tied to the selected
dream and pending action timestamp. A new Google entitlement can complete the
session even if the Funding Choices wrapper remains in the DOM. On pagehide and
return/pageshow, the receipt preserves completion across Safari navigation and
cache restoration; the ad page reuses the original reward ID when booking access.
A recorded successful grant routes back to the journal without another grant.
Merely leaving the page, elapsed time, or an unchanged prior entitlement does not
complete a session. No completion is inferred for ordinary interstitial ads.
An explicit retry ID is reused only for its owning guest/account and matching
text, language and lens, including across UTC midnight. Changed content or an
unowned ID cannot attach a request to that history.

A browser display event is sent only when the answer element intersects the
viewport in a visible tab, on home/journal results, inline prompts, guest cards
and the signed-in analysis dialog. The server accepts it only after a successful
analysis, deduplicates repeated displays, and retains the successful server result
if a later browser error arrives. The admin card distinguishes a prepared answer
from confirmed browser display. This is evidence of display, not proof of reading;
missing browser events remain unknown. Browser events are best-effort.
Historical activity is not backfilled.

## Guest daily allowance

Guests share one free AI analysis per IP per UTC day across full-dream and
AI quick-symbol requests. Guest lifetime usage is diagnostic, not a lifetime
limit. The IP counter is reserved transactionally, so a fresh cookie does not
provide another free slot. The free slot is spent before earned ad credits.
Further requests offer sign-in or a video ad. Errors refund the exact balance
and original UTC day that were charged. Dictionary matches remain free.

### Explicit quota explanations (2026-10-26)

Guest analysis HTTP 401 responses retain the existing `GUEST_LIMIT_REACHED` code
and `reason` contract. Diagnostics now preserve `ip_limit` as
`network_free_limit` and `guest_limit` as `guest_free_limit`, instead of losing
them under the general ad/sign-in requirement. These limits apply to the free
fallback; an available ad credit still takes precedence. Historical records
without the reason cannot establish whether the IP limit was reached.

The ad page shows the daily visitor/network ad limit for an `AD_DAILY_LIMIT`
rejection. After three minutes with an overlay still open it displays an
explicit incomplete-ad message and return/sign-in controls, while continuing
to monitor for a late completion. Timeout alone never grants a credit. All
messages are provided in the six UI languages. Google may cover these controls
with its own overlay; the application cannot diagnose a Google frequency cap
from an overlay appearing or the browser leaving the page.

### Preserve the analysis retry until the reward is booked

An analysis pending action now has a `ready` flag. Only a successful reward
response or allowed first-free fallback sets it. Returning to a source form
cannot consume an unconfirmed action before `AdUnlockRecovery` checks the
entitlement and books the same reward receipt. The quick-symbol form follows
the same rule. Recovery polls for a late entitlement after pageshow/focus, and
restored guest cards poll for a newly ready action so a cached document can
resume without a second ad. A completed-but-unbooked ad remains pending; a
reload reuses the receipt. These are browser recovery fixes, not evidence that
the historical attempts completed their ads. Live AdSense completion and
production delivery must still be checked after deployment.

Overlay DOM mutations are checked synchronously rather than via a deferred
animation frame. `pagehide` also captures an already-disappeared overlay before
leaving, using the same close heuristic as the live flow. This preserves a
completed session when navigation beats the next poll/cookie update. An overlay
that is still visible, an unseen overlay, or departure alone does not complete
the session. Offerwall close remains a browser heuristic, not Google SSV.

### Always show interpretation in Dreams

Full-dream forms queue text, language, lens and sharing preference and navigate
to the localized `/app/dreams` before analysis starts. Guest cards claim that
request once; signed-in imports use their existing automatic analysis handoff.
The ad URL, ad page and recovered session all force analysis returns to that
same journal. Signed-in ad actions retain the document ID and resume that exact
dream. AI results from the short-symbol form are also handed into Dreams.

A head script suppresses only a repeat Offerwall on `/ad/unlock` when restoring
a matching completed/granted receipt or server-confirmed ready action. It runs
before AdSense and uses Google's documented `controlledMessagingFunction` and
message-type filtering, leaving consent messages enabled.
Reference: https://developers.google.com/funding-choices/fc-api-docs
