# Debug — System Inspector

**Path:** `/admin/debug`

A read-only inspector for the running system. It makes no changes — it surfaces
health, logs, recent LLM activity, queue state, and state-directory contents.
The page polls `/debug` every **2 seconds**; **Pause** freezes the refresh.

---

## Health strip

Six cells across the top, each green (ok), grey (idle/off), or red (down):

| Cell | Shows |
|------|-------|
| **Icecast** | Listener count and peak. |
| **Liquidsoap** | Whether the mixer log is reporting. |
| **LLM** | The active model and provider. |
| **Picker** | Whether a request is being served or the auto-playlist is running, plus upcoming-queue length. |
| **DJ log** | Total DJ-log entry count. |
| **Tagger** | Tagged track count and last tag date. |

---

## Panels

- **Now playing** — the raw `now-playing.json` as a key/value table.
- **Icecast** — raw Icecast stats.
- **DJ context** — the time / weather / festival / dominant-mood context the DJ
  reasons from.
- **LLM recent calls** — a ring buffer of recent model calls. Each entry shows
  ok/fail, kind, latency in ms, and timestamp; expand one to see the user
  prompt, a system-prompt preview, the response, and any error.
- **Liquidsoap log** — the last 100 lines of the mixer log, with an
  **auto-scroll** toggle.
- **State dir** — files in the shared `/var/sub-wave` state directory, with
  sizes and modification times.
- **DJ voice WAVs** — the rendered voice files waiting to be played.
- **Library tags** — tag counts broken down by mood and by energy.
- **Queue** — the current served request, and the full upcoming queue
  (requested tracks tagged with the requester).
- **DJ log** — the recent DJ activity log (last 30 entries).
- **Config** — the controller's effective config, with secrets redacted.

---

## Use it for

- Confirming Icecast, Liquidsoap, and the LLM are all up.
- Checking why a DJ line or pick failed (LLM recent calls → expand the failed entry).
- Watching the Liquidsoap log during a crossfade or mixer-restart issue.
- Verifying state files (`next.txt`, `say.txt`, `auto.m3u`, jingles) are being written.
