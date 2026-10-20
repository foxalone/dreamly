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
