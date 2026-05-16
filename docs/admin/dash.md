# Dash — DJ Command Center

**Path:** `/admin/dash` (also the default landing page for `/admin`)

The Dash is the live operating surface. It lets you step into the autonomous
booth: speak custom words on air, fire any DJ segment on demand, flip the
autonomous toggles, and watch on-air status and the booth log in real time.

The page polls `/now-playing` and `/state` every **3 seconds**.

---

## On air hero

The large panel at the top shows what is playing right now:

- **Track title, artist, album** — pulled from `now-playing.json`. Reads
  *"nothing reported playing"* if the stream hasn't reported a track yet.
- **auto-pick / auto-link** status line — a quick read of the two autonomous
  toggles.
- **Skip track** button — see *Skip* below.

### Status strip

A six-cell strip beneath the hero:

| Cell | Meaning |
|------|---------|
| **dj on air** | Name of the persona currently on air. |
| **show** | The active scheduled show, or the current time-of-day period if none. |
| **mood** | The dominant mood driving track selection (festival > weather > time). |
| **listeners** | Current listener count, with peak shown below. |
| **weather** | Current condition and temperature at the station location. |
| **picker** | `thinking` while the next-track picker is running, otherwise `idle`. |

---

## Manual voice DJ

Type words and send them straight to air. The DJ speaks within seconds (bounded
by Liquidsoap's 0.5s voice-file poll).

- **Text box** — up to 500 characters.
- **mode**
  - **Raw** — the DJ speaks your text *verbatim*.
  - **Styled** — your text is treated as an instruction or topic; the DJ
    rewrites it in the on-air persona's voice before speaking.
- **duck** — how the music behaves underneath the voice:
  - **Solo** — heavy duck (the music drops well back; for station IDs, notices).
  - **Over** — light duck (the music stays audible underneath, like a between-track link).
- **Send to air →** — queues the line. The feedback strip confirms what went out.

---

## DJ segments

Fire a single autonomous-style segment immediately, on demand:

- **Station ID** — a station ident.
- **Time check** — the hourly time announcement.
- **Track link** — a between-track DJ link.

Each button reports `firing…` while it runs. This bypasses the frequency gate
and cooldowns — it is an operator override.

---

## Broadcast toggles

- **Auto-pick** — when on, the controller picks the next track whenever the
  request queue runs dry. When off, the station falls back to the Liquidsoap
  auto-playlist.
- **Auto-link** — when on, the DJ talks between auto-played tracks.
- **Auto-playlist → Refresh** — rebuilds the Liquidsoap fallback playlist
  (`auto.m3u`) for the current mood right now, instead of waiting for the
  scheduled refresh.

---

## Queue and Booth log

- **Queue** — the upcoming tracks (up to 8 shown). Listener-requested tracks are
  tagged with the requester's name. An empty queue falls back to the
  auto-playlist.
- **Booth log** — a live tail of recent DJ activity (plays, spoken segments,
  errors), newest first.

---

## Skip track

**Skip** cuts the current track for **every listener** — everyone tuned in jumps
straight to the next track. Because it is disruptive, the button opens a
confirmation dialog; the skip only runs after you accept.

There is no general `/skip` for pacing — track-end is the normal transition.
Skip is a deliberate operator intervention.
