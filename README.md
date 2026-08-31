This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Admin video studios

The admin dashboard contains five separate studios: Free Video, Free Mix, Sora 2 Slow, Combined, and Video · Veo. Free Mix alternates free Pexels and Pixabay footage and keeps a local recent-use ledger to reduce repeated clips. Sora 2 Slow submits every Sora render through the OpenAI Batch API. Combined generates one 8-second Sora scene through Batch and downloads three free Pexels scenes. Video · Veo generates four 8-second portrait clips with `veo-3.1-lite-generate-001` on Vertex AI, with native audio disabled so the clips use the same narration, subtitle, editing, storage, and Telegram pipeline. Paid jobs are backed by `adminAiVideoJobs`, a transactionally reserved daily budget, and a resumable local worker. Generated content is English-only. Provider credentials and cost controls remain server-side.

Copy the AI video values from `.env.example` into `.env.local`. Keep `AI_VIDEO_PAID_GENERATION_ENABLED=false` until paid generation is intentionally enabled. Combined also needs `PEXELS_API_KEY`; when it is omitted, the worker safely reuses the existing key from `MONEYPRINTERTURBO_ROOT/config.toml`. Free Mix needs both Pexels and Pixabay keys and can reuse either key from the same MoneyPrinterTurbo config when the matching environment value is omitted. Video · Veo uses the Firebase service account by default and its project ID unless `VEO_PROJECT_ID` is set; that account must be allowed to call Vertex AI, and the Vertex AI API must be enabled. Veo scenes omit `storageUri` and receive `bytesBase64Encoded` from Vertex so generation does not depend on Vertex service-agent access to the Firebase bucket (which otherwise fails with “Service agents are being provisioned” on fresh projects). The worker also needs `ffmpeg` and `ffprobe` on `PATH` (or explicit binary paths).

Start the web app and worker in separate terminals:

```bash
cd /Users/dimab/Documents/oneiro-web
npm run dev
```

```bash
cd /Users/dimab/Documents/oneiro-web
npm run ai-video-worker
```

Safe validation commands never call the paid Videos endpoint:

```bash
npm run ai-video-check
npm run ai-video-synthetic-test
```

At the default Sora Batch price of $0.05/second, Preview reserves $0.20, Standard reserves $1.60, and Combined reserves $0.40. At the default Veo 3.1 Lite video-only 720p price of $0.03/second, Video · Veo reserves $0.96. The authenticated enqueue API derives pricing and durations from server configuration, requires explicit `costConfirmed=true`, rejects requests while paid generation is disabled, and reserves both dollars and the daily job count in one Firestore transaction. The worker saves OpenAI Batch IDs and Vertex AI operation names before polling so a restart resumes the same paid submission.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Admin image studios

The admin dashboard also has Image · Sora, Image · Veo, and All Images. These reuse the same OpenAI key and Vertex service account as the video studios, but they call cheaper still-image models (`gpt-image-1-mini` and `gemini-3.1-flash-image`) instead of Sora/Veo video. After each job finishes, the card and Telegram caption show the approximate cost from provider usage. Start the image worker in a separate terminal:

```bash
npm run ai-image-worker
```

## Scheduled social publishing

The `All` button on a video card opens a sheet with two ways out: publish to every
connected network right away, or pick one moment for all of them. YouTube takes the
scheduled moment natively — the file is uploaded private and YouTube flips it public
at `status.publishAt`. TikTok, Instagram, Facebook, Threads and Pinterest have no
native scheduling, so the batch is stored on the video document
for the dashboard and canonically in RTDB under
`social_scheduled_assets/<id>/socialSchedule`. The RTDB queue is indexed by
`socialSchedule/scheduledAt` and published by `/api/cron/social-publish`.

That endpoint is driven by the Firebase scheduled function `socialPublishTick`
(`every 5 minutes`, region `europe-west1`, time zone `Asia/Jerusalem`), which calls
it with `SOCIAL_PUBLISH_CRON_SECRET` as a bearer token. Store the same value in
Secret Manager and the Vercel production environment. `SOCIAL_PUBLISH_ENDPOINT`
holds the protected production URL in Secret Manager.

If a scheduled batch fails at its moment, the worker sends a Telegram message naming
the video, what did go out and what did not — `TELEGRAM_BOT_TOKEN` and
`TELEGRAM_PERSONAL_CHAT_ID` have to be set on Vercel for that, and without them the
failure is still visible on the video card. A successful batch stays silent.

Positioner is told about a schedule the moment it is made: every scheduled platform
gets a row with the status `Запланировано` and the planned date. The real publish
later reuses the same key and updates the row to `Опубликовано` with the actual time,
and cancelling a schedule marks it `Отменено`.
