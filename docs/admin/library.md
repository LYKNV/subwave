# Library — Search & Queue

**Path:** `/admin/library`

The Library page is the operator's direct line into the Navidrome music
library. It is an admin-grade version of the listener request flow — you search
by exact terms and queue a track yourself, with none of the LLM matching
guesswork. It also runs the mood tagger that classifies your library.

---

## Search

- Type any **artist, title, or album** into the search box and hit **Search**.
- Results are listed with track number, title, artist, album, and duration.
- **Queue** on any row pushes that track into the queue immediately. The
  feedback line confirms the queued title and its queue position.
- **Clear** empties the box and the results.

The **filter** and **energy** segmented controls are search-term shortcuts —
clicking e.g. *Ambient* or *Slow* seeds that word into the query.

---

## Recently added

A list of the most recently added tracks in the library, for one-click queuing
without searching. **Refresh** reloads it.

---

## Sidebar

- **Browse** — a quick count summary: search results, recently added, tracks
  tagged, moods classified.
- **By mood** — every mood the tagger has classified, with track counts. Click
  a mood to seed it as a search query.
- **Mood tagger** — see below.

---

## Mood tagger

The tagger walks the Navidrome library album by album and classifies each track
(mood + energy) via the LLM. It is **resumable** — already-tagged tracks are
skipped, so it is safe to stop and restart.

- **limit** — how many tracks to process in this run. Leave it to tag a batch
  at a time; a large library is best tagged in several runs.
- **Start tagging** — launches the tagger as a background process on the
  controller. While it runs the button reads `Running…` and shows the process
  id and start time.
- **tagger log** — expand to see the last lines of the tagger's output. Useful
  for watching progress and spotting errors.

Library stats and tagger progress are polled every 3 seconds, so an in-flight
run reports live without a manual refresh. The classified moods feed the
auto-DJ picker and the mood-tagged library on the [Debug](./debug.md) page.
