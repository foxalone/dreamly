# Installed PWA welcome

Android/Chrome owns the first launch screen: the manifest controls its icon and
solid background (`#100d24`). The website cannot put rotating artwork on that
system screen. `PwaLaunch` provides the illustrated welcome immediately afterward.

- Only standalone/fullscreen installs (including iOS standalone) on `/`, `/app`,
  or `/app/dreams`, with the six existing locale prefixes.
- Query strings, fragments, auth/payment callbacks, and other deep links skip it.
- A head script selects the next artwork before paint; client navigation does not
  replay it. The browser may resume an existing PWA without a fresh document,
  in which case it does not replay either.
- Automatically dismisses by 2.8 seconds after the head script, or immediately
  through Enter / Escape. CSS also dismisses it if hydration fails. Background
  content is inert only while the hydrated welcome is active.
- Reduced-motion users get no zoom, entrance motion, or twinkling.
- Storage being unavailable does not prevent launch. Images failing leaves a
  violet backdrop and working controls. There is no network/API dependency for
  selecting art and no change to authentication or service-worker behavior.

## Artwork

`public/launch/{moon,forest,castle}.webp` are optimized 720px copies of existing
Dreamly Art illustrations assigned to `/dreams/moon`, `/dreams/forest`, and
`/dreams/castle` on 2026-10-05. Only the selected CSS background is downloaded
(approximately 64–148 KB). They are deliberately bundled rather than fetched
from Firestore at startup. To refresh the selection, replace these approved
public-art assets; do not include private dream content.

## Verification

`node --import tsx --test lib/pwaLaunch.test.ts` checks eligibility, locale routes,
rotation, callbacks, ordinary browser visits, and storage failures. Mobile Chrome
checks should also cover auto-dismiss, Enter/Escape, keyboard focus, RTL,
reduced motion, and a blocked Next.js bundle (CSS dismissal).

Installed Chrome PWAs refresh their manifest on the browser's schedule; the
system background may retain its old color until that refresh. The illustrated
welcome arrives with the website update.
