# Analysis attempt diagnostics

The Dreams tab in the admin dashboard includes an Analysis attempts panel when
Only Shared is off. Its authenticated admin API lists the 150 most recently
updated records. Completed readings are hidden by default; refresh and search
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
