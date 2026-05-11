# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

SUB/WAVE is a personal internet radio station: one Icecast stream, all listeners hear the same broadcast, AI DJ picks tracks and reads scripts between them. See `README.md` for the architecture diagram and rationale.

## Common commands

```bash
# Boot the radio (Icecast + Liquidsoap + Controller)
cd docker && docker compose up -d
docker compose logs -f controller        # or liquidsoap / icecast

# Controller dev loop (Node.js, ESM, --watch)
cd controller && npm install && npm run dev

# Web UI dev (Next.js 15 + React 19)
cd web && npm install && npm run dev     # :3000

# Web build / prod
cd web && npm run build && npm start

# One-time host setup: creates /var/sub-wave dirs and emergency.mp3
./scripts/setup.sh

# Manual skip (for the host, not exposed in the UI)
curl -X POST http://localhost:4000/skip
```

No test runner, linter, or formatter is configured.

## Architecture

Four cooperating processes with **file-based IPC** through a shared `state/` directory (mounted at `/var/sub-wave` in containers). This is the load-bearing fact about how the system works:

- **Controller → Liquidsoap**:
  - `next.txt` — controller writes one annotated track URI; Liquidsoap polls every 1.0s, drains, and `request.queue.push`es it (`liquidsoap/radio.liq`).
  - `say.txt` — controller writes a WAV path; Liquidsoap polls every 0.5s and feeds it through a voice queue that's `smooth_add`ed over music with sidechain ducking.
  - `auto.m3u` — fallback playlist the controller rewrites every 10 minutes for the current mood; Liquidsoap reloads it on file change (`reload_mode="watch"`).
- **Liquidsoap → Controller / UI**:
  - `now-playing.json` — written from `music.on_track(on_track_change)`. Hook is on `music` (not the final `radio` source) so metadata is fresh, before crossfade/rotate/fallback layers.
- **Controller → Web UI**: HTTP. Web polls `/now-playing` and `/state` every 5s (`web/app/page.js`).
- **Browsers → Icecast**: direct `<audio src="…/stream.mp3">`.

Anything that needs to flow between the controller and Liquidsoap must go through one of these files — there is no socket or RPC channel.

### Controller (`controller/src/`, ESM Node.js)

- `server.js` — Express API: `GET /now-playing`, `GET /state`, `POST /request`, `POST /skip`, `GET /health`. CORS is wide open by design (`*`).
- `queue.js` — in-memory `upcoming`/`history`/`djLog` + `serveNext()` which is the one place that actually writes `next.txt`/`say.txt`. **All track playback goes through `queue.push()` or `queue.announce()`.** TTS is generated and `say.txt` is written *before* the track URI, with a 200 ms gap so Liquidsoap picks up the voice file first.
- `ollama.js` — two distinct LLM modes against the same model:
  1. `matchRequest` uses `format: 'json'` with a strict schema (`search_terms`, `mood`, `intent`, `ack`) at low temperature.
  2. `generate*` (intro, weather, station ID, hourly) is free-text under a DJ persona system prompt ("BBC 6 Music" tone). Hard rules in that prompt — don't loosen them without reason.
- `subsonic.js` — Navidrome client using proper Subsonic salt+token MD5 auth (never plaintext). `getAnnotatedUri(song)` wraps the URI in `annotate:title="…",artist="…",…:<uri>` so Liquidsoap reports real metadata immediately instead of waiting on stream ID3. If `MUSIC_LIBRARY_PATH` env is set, `getPlayableUri` returns a local file path; otherwise the Subsonic stream URL.
- `context.js` — `getFullContext()` returns `{ time, weather, festival, dominantMood }`. **Priority for `dominantMood` is festival > weather > time** — this is what `refreshAutoPlaylist` keys off. Open-Meteo is cached 30 min; festivals are a hardcoded list keyed to the operator's calendar.
- `scheduler.js` — node-cron driver: auto-playlist refresh every `config.show.autoQueueRefreshMinutes`, hourly time check, weather check every 30 min (only announces on condition change), station IDs at `:15`/`:45`, voice-WAV cleanup hourly.
- `piper.js` — spawns Piper CLI, writes WAV to `config.piper.outDir`, returns the path. Cleans files older than 1 h.
- `config.js` — single source of truth for env-derived config. Default URLs point at Tailscale hostnames (`ronin.tail.ts.net`, `x1pro.tail.ts.net`).

### Liquidsoap (`liquidsoap/radio.liq`)

Pipeline: `dj_queue` (controller-fed) **fallback→** `auto_playlist` → `crossfade(smart, 4s)` → `smooth_add` voice over music → `rotate` jingles 1-in-30 → `fallback` to `emergency.mp3` → `blank.skip(5s)` → `normalize(-14 LUFS)` → `output.icecast` + `output.file` archive. The two `output.*` calls broadcast and write hourly archive files at `/var/sub-wave/archive/%Y-%m-%d/%H-00.mp3`.

### Web UI (`web/`)

Next.js 15 App Router. `app/page.js` is the only page; components in `web/components/`. Tailwind. Polls the controller every 5s. Stream URL and API base are public env (`NEXT_PUBLIC_STREAM_URL`, `NEXT_PUBLIC_API_URL`) — both must point at a host reachable from listener browsers (Tailscale hostnames by default).

### Docker layout (`docker/docker-compose.yml`)

This file is labelled "Mac local smoke-test variant" — it runs Icecast + Liquidsoap + Controller in containers, expects Ollama on the **host** (`host.docker.internal`), and Navidrome remote (Tailscale). The web UI is **not** in compose — run it separately. Shared volume mapping: repo `state/` → `/var/sub-wave` in both Liquidsoap and Controller containers; this is what makes the file-based IPC work.

## Working on this codebase

- Touching the queue/playback path: keep the invariant that `queue.serveNext()` is the single writer of `next.txt`/`say.txt`, and that voice file is written ~200 ms before the track URI. Liquidsoap's polling intervals (1.0s for queue, 0.5s for voice) are the upper bound on perceived latency.
- Touching `radio.liq`: the `on_track_change` hook must stay attached to the `music` source, not to a downstream stage — moving it loses metadata fidelity.
- Touching Subsonic: keep using `getAnnotatedUri` for anything going to Liquidsoap. Raw stream URLs work but lose metadata until ID3 arrives.
- LLM responses are not retried; `matchRequest` does best-effort `{…}` recovery via regex if JSON parsing fails. Don't add aggressive retry without considering that Ollama on a homelab box may be slow but is reliable.
- Festivals in `context.js` are hand-curated for the operator (Sikh/UK calendar). Adding/removing them changes what the autonomous DJ plays around those dates.
