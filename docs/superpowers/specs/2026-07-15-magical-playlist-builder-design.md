# Magical Playlist Builder — Design Spec

**Date:** 2026-07-15
**Status:** Approved design, pending implementation plan
**Surface:** New admin screen `/admin/playlists` + one controller generation endpoint

## Problem

Operators are asking for a way to build and manage playlists. Today the only
playlist UI is a bare "Playlists" tab in `/admin/library`
(`web/components/admin/LibraryPlaylistsTab.tsx`) that can create, rename, delete,
and remove-a-track-by-position — no search-and-add, no reorder, no generation.
Meanwhile all the hard plumbing already exists but is unused for curation:

- **Write side:** `subsonic.createPlaylist / addToPlaylist / removeFromPlaylist /
  updatePlaylistMeta / deletePlaylist` (`controller/src/music/subsonic.ts:572`)
  behind admin routes in `controller/src/routes/playlists.ts`.
- **Search side:** deterministic text search (`subsonic.search`), mood/genre
  queries (`library.songsByMood`, `getSongsByGenre`), and semantic vector search
  (`searchByLyrics` theme embeddings, `searchBySound` CLAP timbre) exposed through
  `controller/src/llm/internal/tools/picker-tools.ts`.
- **Downstream:** shows already consume playlists as anchor pools via
  `show.playlistIds` (`controller/src/music/show-playlist.ts`), so a saved playlist
  affects the broadcast with zero new wiring.

The gap is the "magical" generation step plus a real curation UX that stitches
these together into one screen.

## Goals

1. Generate an ordered playlist from a **worded vibe + optional seed tracks +
   knobs**, using the existing vector/mood/similar-songs machinery.
2. Give the operator **full manual control** after generation — search, add,
   reorder, remove, replace-one, dedupe, rename.
3. Save to Navidrome so the playlist feeds **shows / the DJ pool** (existing
   `playlistIds` mechanism).
4. Reuse existing plumbing; add the minimum new surface.

## Non-goals (YAGNI)

- Listener-facing / public playlist building (deferred; single-stream station has
  no per-listener on-demand playback).
- "Air it now" live-queue takeover (explicitly out of scope).
- In-builder audio preview / snippet playback (no per-track playback on a radio;
  show cover art + metadata only).
- An MCP/agent tool for generation (operator UI only for v1).
- Scheduling a show directly from the builder (link out to `/admin/shows`).

## Follow-on specs (out of scope for v1, from Kate's feedback)

These are captured here so v1 leaves clean seams, but are **not built now**:

- **Phase 2 — Folder-based dynamic (smart) playlists + source weighting.** A
  rule-based source (`{ type:'folder', path, weight }`) that resolves *live* from
  the library (auto-updates as files are added/removed) and contributes to the
  **show pool** by weight. Distinct subsystem: Navidrome playlists are static
  song-id lists, so this is a SUB/WAVE-side smart-source model resolved against
  `library-db` paths, and it extends the show pool weighting — not just the
  builder. Its own spec.
- **Phase 3 — "New track spotlight" DJ skill.** A between-track `skills/` segment
  that announces recently-added tracks on air ("here's a new track we just
  added…"). Belongs with the segment/skill system, separate from the builder.

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Audience | Operator (admin screen), new `/admin/playlists` |
| Generation input | Unified: prompt AND/OR seeds AND/OR knobs |
| Engine | **A** — build a candidate pool, then one structured `djObject` call to select + order |
| Downstream | Save to Navidrome; feed shows / DJ pool via `playlistIds`. No live queue, no bare export. |
| Existing bare Playlists tab | Replaced by a thin "Open the Playlist Builder →" pointer; new screen is the single home |

## Architecture

### Data model

No new persistent store. Navidrome playlists remain the source of truth. A
generated/edited playlist is an **in-memory client draft** until Save:

```
Draft = {
  id?: string,              // set only when editing an existing Navidrome playlist
  name: string,
  tracks: DraftTrack[],     // ordered
}
DraftTrack = {
  id: string,               // subsonic song id
  title, artist, album: string,
  duration: number,         // seconds
  coverArt?: string,        // subsonic cover id -> /cover/:id proxy
  moods?: string[],         // for the UI chips (best-effort)
  energy?: number
}
```

### Controller

**New: `controller/src/music/playlist-gen.ts`** — two stages.

1. `buildCandidatePool({ prompt, seeds, knobs }): Promise<PoolTrack[]>`
   Merges, dedupes (by song id), and caps (~120) candidates from:
   - `searchBySound(prompt)` — CLAP timbre, only if the text tower is available.
   - `searchByLyrics(prompt)` — theme embeddings, only if text embeddings exist.
   - `getSimilarSongs(seedId)` + audio-KNN for each seed track/artist.
   - `library.songsByMood(mood)` / `getSongsByGenre(genre)` for knob moods/genres.
   - `starred` + `recentlyAdded` as filler when the pool is thin.
   - **Recently-added as a first-class source** (Kate #2a): when
     `sources.recentlyAdded` is on, seed the pool primarily from
     `getRecentlyAddedAlbums` → their tracks, so the operator can build a "just
     landed" set. Standalone: with no prompt/seeds and this toggle on, the whole
     pool is recent arrivals.
   Then filters `isStationArchive`, applies **hard** filters (era / genre / energy /
   exclude-artist), and — when `knobs.instrumentalOnly` (Kate #3) — keeps only
   **instrumental** tracks: prefer analyzer vocal-range data (low/no vocal
   presence) where present, else fall back to genre/mood tags
   (`instrumental` / `ambient` / `score` / `classical`). Caps the result. Returns
   `{ degraded, reasons }` so the UI can say which search modes / instrumental
   signal were unavailable.

2. `curatePlaylist(pool, { prompt, knobs }): Promise<CuratedResult>`
   **One `djObject` call** (Zod-validated, mirroring the pool picker in
   `music/picker.ts`). System prompt: select N tracks from the pool, order them to
   honor the requested **energy arc**, keep **artist spacing**, no duplicates,
   optionally propose a `name` + `description`. Returned ids are validated against
   the pool (drop unknowns). Returns `{ ids, name?, description? }`.

**New: `controller/src/music/playlist-gen-pure.ts`** — side-effect-free helpers,
the unit-test seam AND the degradation fallback:
- `dedupeById`, `mergePools`, `capPool`
- `spaceArtists(tracks, minGap)`
- `arrangeArc(tracks, arc)` — flat / build / peak-then-cool / wind-down using the
  `energy` (and where present `audioMoods`) fields
- `pickDeterministic(pool, knobs)` — the no-LLM fallback: rank by vector relevance
  score (carried on `PoolTrack`) then `arrangeArc`. Used when embeddings are
  absent for ranking AND when the `djObject` call fails/times out. Never returns
  empty if the pool is non-empty.

**Extend: `controller/src/routes/playlists.ts`**
- `POST /playlists/generate` (`requireAdmin`) — body `{ prompt?, seedTrackIds?,
  seedArtist?, knobs, sources?, excludeTrackIds? }` → `{ tracks: DraftTrack[],
  name?, description?, degraded, reasons }`. **Unsaved.** `excludeTrackIds` powers
  "Regenerate" / "Add more" by re-running with the current set excluded.
- Save/update reuse the **existing** `POST /playlists` (create) and mutation
  routes.

**Extend: `controller/src/music/subsonic.ts`**
- `createPlaylist` gains an optional `playlistId` param. Subsonic's `createPlaylist`
  with `playlistId` overwrites an existing playlist's song list wholesale — exactly
  what a reordered builder needs, avoiding index-based `removeFromPlaylist` churn.
  Save-over-existing = `createPlaylist(existingId, orderedIds)` + `updatePlaylistMeta`
  for the name if renamed.

**Knobs schema** (Zod, route-local; vocab reused from `SHOW_MOODS` / show eras /
genres / energies in `settings.ts`):
```
knobs = {
  targetCount?: number,        // 10..60, default 25  (mutually exclusive-ish with targetMinutes)
  targetMinutes?: number,      // optional length target
  energyArc?: 'flat'|'build'|'peak-then-cool'|'wind-down',   // default 'flat'
  eras?: string[], genres?: string[], moods?: string[], energies?: string[],
  artistSpacing?: number,      // min tracks between same artist, default 2
  excludeRecentlyPlayed?: boolean,
  instrumentalOnly?: boolean,  // Kate #3 — vocal-range data, fallback genre/mood tags
  maxTrackSeconds?: number     // only include tracks ≤ this long (0/undefined = no cap); soft (keeps unknown-duration rows, relaxes if it starves)
}
sources = {
  recentlyAdded?: boolean      // Kate #2a — seed pool from new arrivals
}
```

### Web UI

`web/app/admin/playlists/page.tsx` (server component, metadata) →
`web/components/admin/PlaylistBuilderPanel.tsx` (`'use client'`, uses
`useAdminAuth().adminFetch`, primitives from `components/admin/ui.tsx`).

**UI/UX direction (must feel crafted, not a templated admin form).** The screen
is the marquee feature — treat it like a mini studio, not a settings page. Guiding
ideas (final look decided during build with the `frontend-design` skill):
- A **"prompt console"** as the hero — a large, inviting vibe input with the seed
  chips and knobs arranged like a tactile control surface (think the studio feel of
  the existing skins), not a stack of form rows.
- **Generation as a moment** — a satisfying pending state (the pool assembling /
  curating), then the ordered list animating in. The energy arc shown as a small
  **sparkline/curve** over the track list so "warms up halfway" is visible.
- The track list reads like a **deck/tracklist**: cover thumbs, drag handles,
  running time + count as a live "tape counter," dupe/instrumental badges.
- Honors the admin theme tokens; co-located styles; responsive; accessible
  (keyboard reorder + labels), never a horizontal-scrolling body.

Layout:
- **Generator panel** — prompt textarea; seed search (reuse `/dj/search`) + chips;
  a **"Recently added" source toggle** and an **"instrumental only"** knob;
  knobs (count/minutes, energy arc, era/genre/mood/energy multiselects, artist
  spacing, exclude-recent toggle); **Generate**. Plus "New empty playlist" and
  "Open existing" (loads a Navidrome playlist into the draft to edit).
- **Track list** — ordered, editable: drag-reorder, remove, replace-one-slot
  (re-pick from the last pool / a fresh mini-generate), inline add via `/dj/search`,
  duplicate indicator, running count + total duration, per-row cover / artist /
  mood chips.
- **Toolbar** — name field; **Save** (create) / **Update** (overwrite existing via
  `playlistId`); **Regenerate** (same params, exclude current); **Add more**
  (append via `excludeTrackIds`). After save: toast + "Pin to a show →" link to
  `/admin/shows`.
- **Nav** — add a `NavItem` to `AdminShell` `NAV_SECTIONS` (icon e.g. `ListMusic`
  or `Sparkles`, href `/admin/playlists`).
- **Old tab** — `LibraryPlaylistsTab` body replaced by a short card linking to
  `/admin/playlists`; remove it from the library tab bar so there's one editor.

### Data flow

1. Operator opens `/admin/playlists`, enters vibe + seeds + knobs, hits Generate.
2. `adminFetch('/playlists/generate', { method:'POST', body })` → controller builds
   pool → `djObject` curate → returns ordered unsaved tracks + `degraded` flag.
3. UI renders the editable list; operator reorders / removes / adds / swaps, edits
   the name.
4. Save → `POST /playlists` (create) or `createPlaylist(playlistId, ids)` (overwrite)
   → Navidrome.
5. Playlist appears in the Shows playlist picker (already wired); the DJ curates
   from it when that show airs.

### Error handling & degradation

- **No CLAP text tower / no text embeddings** → pool falls back to
  mood/genre/similar/starred; response carries `degraded:true` + `reasons` and the
  UI shows a subtle "semantic search unavailable — used mood/genre" note.
- **LLM failure/timeout** → `pickDeterministic` fallback (arc arrange the pool).
  Never returns empty when the pool is non-empty.
- **Empty pool** (tiny library / over-tight filters) → `{ tracks: [], message }`;
  UI suggests loosening filters or removing seeds.
- **Save >100 tracks** → existing chunked `createPlaylist`/`addToPlaylist` handles it.

### Testing

- **Pure unit tests** for `playlist-gen-pure.ts` (`controller/scripts/playlist-gen.test.ts`,
  wired like the existing `scripts/programme.test.ts` / `npm run test:llm`
  pattern): dedupe, merge/cap, `spaceArtists`, `arrangeArc`, `pickDeterministic`
  never-empty invariant.
- The `djObject` LLM call itself is **not** unit-tested (matches codebase norm).
- **Lint/type gate** (merge gate): `eslint . && tsc --noEmit` in `controller/` and
  `web/`.
- **Manual verify** via the `verify` skill / admin Playwright pattern: generate →
  edit → save → confirm the playlist shows in `/admin/shows` picker.

## Files touched (summary)

New:
- `controller/src/music/playlist-gen.ts`
- `controller/src/music/playlist-gen-pure.ts`
- `controller/scripts/playlist-gen.test.ts`
- `web/app/admin/playlists/page.tsx`
- `web/components/admin/PlaylistBuilderPanel.tsx`

Modified:
- `controller/src/routes/playlists.ts` (add `POST /playlists/generate`)
- `controller/src/music/subsonic.ts` (`createPlaylist` optional `playlistId`)
- `web/components/admin/AdminShell.tsx` (nav item)
- `web/components/admin/LibraryPlaylistsTab.tsx` (→ pointer to new screen) and its
  tab registration in `/admin/library`

## Open implementation details (resolve during planning)

- Confirm Navidrome honours `createPlaylist` with `playlistId` for full overwrite
  (fallback: `updatePlaylistMeta` + reconcile). Verify against the running instance.
- Exact `djObject` schema + prompt for `curatePlaylist` (arc, spacing, naming).
- Pool size / per-source quotas tuning (start ~120 cap, ~select 25).
- Whether "replace-one-slot" re-picks from the retained pool (cheap) or issues a
  scoped mini-generate (fresher). Default: retained pool, fall back to mini-generate
  when the pool is exhausted.
