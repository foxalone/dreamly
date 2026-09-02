# Prompt: add "publish now or schedule" to a multi-channel publishing dashboard

Copy everything below the line into a fresh session in the target repo. It is written
as a brief for an agent, and it carries the traps that cost us time the first time —
they are not hypothetical, every one of them actually happened.

---

## What to build

A publishing dashboard has a list of finished assets (videos, images, posts). Each
card has one button per connected network plus an **All** button that fans the asset
out to every network at once, immediately.

Change **All** so it no longer publishes on click. It opens a small sheet with two
ways out:

1. **Publish now** — the current behaviour, unchanged.
2. **Pick a date and time** — one moment, applied to every network that is still
   pending for this asset.

While a schedule is pending, the card shows it: an amber badge with the time, amber
platform icons for the queued networks, and the **All** button turns amber. Opening
the sheet again offers **Cancel schedule**. A network that is already published, or
already queued, is not offered again.

## How scheduling actually works

Split the networks in two groups, because they are not equivalent:

**Networks with native scheduling.** YouTube is the archetype: you upload the file as
private now and hand the API a `publishAt`, and the platform releases it itself. Use
it whenever it exists — it survives your own infrastructure being down, and it needs
no worker. The catch is that you cannot cancel it from your side afterwards; say so in
the UI rather than pretending the cancel button covers it.

**Everything else** (TikTok, Instagram, Facebook, Threads…). No native scheduling,
so you need a queue and a worker. Pinterest stays outside the batch until its
production connection is enabled.

### The queue

Store the batch on the asset document itself — do not build a separate collection, it
buys nothing and doubles the bookkeeping:

- `socialScheduledAt` — ISO timestamp, the single moment shared by the whole batch
- `socialScheduledPlatforms` — string array of the queued networks
- `socialScheduleStatus` — `pending | running | done | failed`
- `socialScheduleStartedAt` — when a worker claimed it
- `socialScheduleError` — per-platform failure text, kept for the card

### The worker

One endpoint, `POST /api/cron/social-publish`, guarded by a shared secret in an
`Authorization: Bearer` header. It:

1. Queries assets where `socialScheduledAt <= now`.
2. Claims each one in a transaction: re-read, verify it is still due and still
   `pending`, then set `running` with a start timestamp. A `running` claim older than
   ~20 minutes is treated as a crashed run and may be retaken.
3. Publishes the queued networks **sequentially**, each in its own try/catch, so one
   failure never stops the others.
4. Writes the outcome: `done`, or `failed` with the collected per-platform errors.

Four things that will bite you:

- **Clear the due field with a real field delete, never with an empty string.** An
  empty string still satisfies `socialScheduledAt <= now` lexicographically, and the
  job loops forever.
- **Keep the query single-field** (one range filter plus an order-by on the same
  field) and filter status in code. That way the datastore's automatic index covers
  it and you do not have to deploy a composite index.
- **Publish sequentially, not in parallel.** Each publish downloads and re-uploads the
  asset, and the providers rate-limit bursts from one account.
- **Cap the batch per tick** so a backlog drains over several runs instead of blowing
  the function timeout.

### What triggers the worker

A scheduled cloud function that calls the endpoint every 5 minutes with the shared
secret. Prefer this over the hosting platform's own cron if that cron's minimum
frequency depends on the billing plan.

If it is the project's first 2nd-generation function, the very first deploy may fail
with an internal error about creating the Cloud Run service. That is the service
agents still provisioning — retry a minute later, do not go rewriting the function.

Smoke-test it without waiting for the schedule:

```
curl -X POST -H "Authorization: Bearer $SECRET" https://<host>/api/cron/social-publish
```

`401` means the secret differs between the function and the site. A "not configured"
error means the site has no secret at all. Both are worth checking before blaming code.

## The publishing journal

If publishes are mirrored into a journal or calendar, the schedule has to reach it at
the moment it is made, not when it goes out — the whole point is seeing the plan.

- On scheduling: one row per network, status `Scheduled`, dated at the planned moment.
- On the real publish: the same row key, status `Published`, with the actual time.
- On cancelling: the same key, status `Cancelled`. "Skipped" reads as "we decided not
  to post this" and is the wrong word.

Key the rows per asset **and** per network (`<project>:<kind>:<assetId>:<platform>`)
so an update is an upsert and never a duplicate.

Two failures we hit here, worth checking for in any journal you write to:

- **A status the journal rewrites.** Ours forced `Scheduled` to `Published` for every
  network except YouTube — a rule from when YouTube was the only one that could
  schedule anything. Once every network can be scheduled, that rule silently corrupts
  the data, and it corrupted it on write, so the rows did not heal after the fix.
- **Read-modify-write ingest.** Ours read the whole store, mutated it and wrote it
  back, with no locking. Five parallel single-row posts overwrote each other and most
  rows vanished. Fix both ends: send a batch as **one request**, and serialize writes
  on the receiving side.

## Failure reporting

A scheduled publish runs when nobody is watching the dashboard, so a failure has to
come and find the operator. Send a message (Telegram, Slack, email — whatever the
project already uses) naming the asset, which networks did go out, which did not, and
the error for each. Stay silent on a clean run. Make the notifier a no-op when it is
not configured, so nothing depends on it existing.

Be honest about what this does not cover: if the scheduler itself never runs, or the
endpoint rejects the secret, nothing publishes and nothing reports. That needs either
an alerting policy on the function's errors, or the function itself reporting a failed
HTTP call.

## Acceptance criteria

- Clicking **All** on an unscheduled asset offers "now" and "pick a time"; both work.
- A scheduled asset shows the time on the card and offers cancel.
- Networks with native scheduling use it; the rest go through the queue.
- One network failing at the scheduled moment does not stop the others, and its error
  is visible on the card afterwards.
- The queue never publishes the same asset twice, even if two worker runs overlap.
- The journal shows the plan before it happens and the result after it, in the same row.
- A failed batch produces a notification; a clean one does not.
