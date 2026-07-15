# Recipe-synced Playlists (append-only) — Design Spec

**Date:** 2026-07-15
**Status:** Approved design direction (Option 1), pending build
**Builds on:** the Magical Playlist Builder (`2026-07-15-magical-playlist-builder-design.md`, PR #1048)

## Problem

A playlist saved by the builder is a **static** Navidrome playlist — a frozen
list of song IDs. New music added to the library later never appears in it. Kate
asked for playlists that stay current as songs are added (her Phase-2 ask). This
spec is Option 1 from that discussion: persist each playlist's **recipe** and
**append** newly-matching library songs on a trigger.

## Decisions (locked)

| Decision | Choice |
| --- | --- |
| Sync style | **Append-only** — add new matches, never remove existing tracks |
| Match signal | **Knobs (hard filters) + vibe similarity** — reuse `buildCandidatePool`; when the recipe has a prompt, require the candidate to come from a vibe source (`theme`/`sound`/`seed`); degrades to knobs-only without embeddings |
| Trigger | **After library tagging** — when the background tagger finishes, sync all recipe-backed playlists. Plus a manual "Sync now". |
| Track store | Navidrome (unchanged). A side-file remembers recipes. |
| Curation on sync | **None** — deterministic append by score, no LLM call (cheap, predictable, runs unattended) |

## Non-goals (YAGNI)

- Removing tracks that no longer match (append-only by decision).
- Re-ordering the whole playlist on sync (only appends; existing order kept).
- A cron/daily job (trigger is tagging-completion + manual).
- Folder-path recipes and source weighting (still the broader Phase-2 spec).

## Architecture

### Data model — `music/playlist-recipes.ts` over `state/playlist-recipes.json`

```
interface PlaylistRecipeEntry {
  playlistId: string;          // the Navidrome playlist this recipe drives
  name: string;                // last-known name (for the admin list)
  recipe: {                    // exactly what /playlists/generate takes
    prompt?: string;
    seedTrackIds?: string[];
    seedArtist?: string;
    knobs: Knobs;
    sources: Sources;
  };
  perSyncCap: number;          // max tracks appended per sync (default 25)
  createdAt: string;           // ISO
  lastSyncedAt: string | null; // ISO; null until first sync
  lastResult: { added: number; at: string } | null;
}
interface RecipeStore { version: 1; recipes: PlaylistRecipeEntry[]; }
```

Module responsibilities (small, single-purpose):
- `load()` / `persist()` — read/write the JSON (atomic write), tolerate a missing
  file (empty store).
- `get(playlistId)`, `list()`, `upsert(entry)`, `remove(playlistId)`.
- All mutations persist immediately (mirrors how `settings.update()` writes).

### Sync engine — `music/playlist-sync.ts`

```
syncRecipe(entry): Promise<{ added: number; prunedMissing?: boolean }>
```
1. `members = getPlaylist(entry.playlistId)` ids. If the playlist 404s → return
   `{ added: 0, prunedMissing: true }` and the caller removes the entry.
2. `{ pool } = buildCandidatePool({ ...entry.recipe, excludeTrackIds: members })`
   — reuses the whole builder engine (knobs as hard filters, vibe vector + mood/
   genre/library sources). No `curatePlaylist` (no LLM).
3. Keep a candidate iff:
   - **new to the library since `lastSyncedAt`** — `addedAt` (library `taggedAt`)
     is after `lastSyncedAt`. First sync (`lastSyncedAt === null`) uses the
     `createdAt` of the entry as the cutoff, so an initial sync only pulls music
     added *after* the playlist was made. Rows with no `addedAt` (Subsonic-only)
     are treated as **not new** (never appended blind).
   - **vibe-matched** — when `recipe.prompt` is set, the candidate's `sources`
     must include a vibe source (`theme`, `sound`, `seed`, `seed-similar`). No
     prompt → this check is skipped (knob match is enough).
4. `additions = capPool(kept, entry.perSyncCap)` (top score first).
5. If `additions.length`: `addToPlaylist(playlistId, additions.map(id))`.
6. Stamp `lastSyncedAt = now`, `lastResult = { added, at: now }`; persist.

```
syncAll(): Promise<{ synced: number; added: number }>
```
- Iterate `recipes` sequentially; per-recipe try/catch (one bad recipe never
  sinks the batch). Prune entries whose playlist vanished. Log a one-line summary.

**PoolTrack gains `addedAt?: string | null`** — populated in `playlist-gen.ts`
`norm()` from library rows' `taggedAt` (Subsonic rows leave it null). This is the
only change to the existing engine; it's inert for normal generation.

### Trigger — tagging completion

`broadcast/tagger.ts` owns the background tagger child process. On a **clean exit**
of a tagging run, fire-and-forget `playlistSync.syncAll()` (guarded: skip when the
recipe store is empty). Errors are logged, never thrown into the tagger path.

### Routes — `routes/playlists.ts`

- `POST /playlists` — accept optional `recipe` (the generate body) and
  `keepInSync: boolean`. After the create/overwrite succeeds and we have a
  `playlistId`: `keepInSync` true → `recipes.upsert({ playlistId, name, recipe, … })`;
  false → `recipes.remove(playlistId)`.
- `POST /playlists/:id/sync` (`requireAdmin`) → `syncRecipe` for that entry →
  `{ added }` (404 if no recipe for the id).
- `GET /playlists` — enrich each row with `synced: boolean`, `lastSyncedAt`.
- `DELETE /playlists/:id` — also `recipes.remove(id)`.

### UI — `PlaylistBuilderPanel`

- **"Keep in sync"** toggle next to Save (KnobSwitch style): "auto-add new library
  songs that match this recipe as they're tagged." When on, Save's body includes
  `keepInSync: true` + `recipe: buildBody()` (prompt/seeds/knobs/sources).
- When editing an **existing synced** playlist: show a **"Sync now"** button +
  "Last synced · N added" line; the Open dialog shows a small **synced** badge and
  last-synced time per recipe-backed row.
- After "Sync now": toast `added N new tracks` and reload the deck.

### Error handling & degradation

- No embeddings / no prompt → knobs-only match (pool still built from mood/genre/
  library-filter sources). Documented in the toggle's helper text.
- No new tracks since last sync → `added: 0`, no write.
- Playlist deleted in Navidrome → entry pruned on next sync.
- Append-only invariant: sync **never** issues `removeFromPlaylist`.
- `perSyncCap` bounds growth so a broad recipe can't balloon a playlist in one run.

### Testing

- **Pure unit tests** (`playlist-gen-pure.test.ts` or a new `playlist-sync-pure.test.ts`):
  the append-selection helper — `selectAppendable(pool, { since, requireVibe, cap })`
  extracted as a pure function (new-since cutoff, vibe-source filter, cap, exclude
  already-members). Store round-trip (`upsert`/`get`/`remove`) if cheaply testable
  without disk (inject a path or keep pure the merge logic).
- Lint/type gate: `eslint . && tsc --noEmit` in `controller/` + `web/`.
- Manual: create a synced playlist, add a matching track to the library + tag it,
  confirm it appears after the tagger run / "Sync now".

## Files (summary)

New:
- `controller/src/music/playlist-recipes.ts` (store)
- `controller/src/music/playlist-sync.ts` (engine)
- tests

Modified:
- `controller/src/music/playlist-gen.ts` (`PoolTrack.addedAt` from `taggedAt`)
- `controller/src/music/playlist-gen-pure.ts` (pure `selectAppendable` helper)
- `controller/src/routes/playlists.ts` (recipe upsert on save, `/sync`, GET enrich, delete prune)
- `controller/src/broadcast/tagger.ts` (post-tag `syncAll` hook)
- `web/components/admin/PlaylistBuilderPanel.tsx` (keep-in-sync toggle, Sync now, badges)
