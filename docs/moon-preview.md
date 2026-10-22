# Moon preview

Standalone routes: `/moon` and `/{es,ar,pt,de,ru}/moon`.
Local preview: `http://127.0.0.1:3001/moon`.

The Moon uses the same AppHeader/PrimaryNav as the rest of the app; its Map
link returns to Earth in the current locale. The globe fits the remaining
viewport height beneath the measured header.

The Earth map now includes a rotating lunar portal with decorative flying emoji
creatures. On the first visit, clicking opens an accessible modal; returning residents
are checked against their saved server membership and enter directly without
reopening the welcome message. Direct Moon visits also wait for the access check
before showing a welcome dialog, preventing a flash for returning residents.
The Moon requires Firebase sign-in
and at least five distinct, currently published dreams (not stories or deleted
shells). The same server check protects the direct Moon URL and every character
request. All six routes remain noindex and omitted from the public sitemap as
account-gated experiences.

POST /api/moon accepts an ID token, `join` and `pins`. The user's explicit first
entry creates `moon_residents/{uid}` in a Firestore transaction, with a server-
random permanent lng/lat. Retrying or concurrent first entries cannot move it.
Existing Firestore rules deny client access to this new collection by default;
no rules deployment is required. No migration or writes to Earth data are needed.

On entry and every 60 seconds while visible, each resident is represented by
exactly one current sharing-level character (using shareBadgeFor, as elsewhere
in Dreamly). A small badge beside the character shows the current number of published dreams.
Its marker sits at the original permanent lng/lat, including for
existing residents. Changes in sharing level update the character, never the
location. Dream symbols are no longer displayed or read from private diaries.
Clicking a character opens a separate panel beside the globe (a bottom panel
on phones). The map viewport shrinks to keep both the Moon and card visible.
The panel scrolls independently and closes via its button or Escape. It shows the localized character name, actual lunar join date, public
publication count, up to three frequent public emoji images, and a short excerpt
of the latest public dream. The owner's own card also shows progress to the next
sharing level. Its button opens an accessible dialog listing that resident's
public dreams. POST /api/moon with `resident` resolves the opaque resident ID,
checks the viewer's usual eligibility/membership, and returns only allowlisted
public dream fields (no owner IDs, names, emails or private diary data). Counts are derived from
currently published dreams, with concurrency six across residents. No private
text, profile names, real coordinates or user IDs are returned.

The existing Mapbox GL renderer wraps local lunar raster imagery onto its globe
projection. There is no Earth basemap, geolocation, scale bar or distance readout:
the renderer's Earth distance assumptions must not be presented as lunar units.
This is a visual surface atlas, not a topographic/elevation model. Zoom is limited
to suit the 2K source texture. It requires WebGL and the existing Mapbox token.

NASA's equirectangular color texture is reprojected to Web Mercator raster tiles
with `node scripts/build-moon-tiles.mjs`. The 85 local WebP tiles cover zooms 0–3.
Imagery attribution, source URL and limitations are in `public/moon/CREDITS.md`.
The texture/source assets total about 1.2 MB; no new runtime library was added.

All page copy, controls and error/loading messages are in `lib/i18n/moon.ts`.
