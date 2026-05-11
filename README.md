# SUB/WAVE

A real internet radio station. Single Icecast stream, all listeners hear the same broadcast. AI DJ that picks tracks based on time/weather/festivals, takes natural-language requests via Ollama, and talks between tracks using Piper TTS.

```
                    ┌─────────────────────────────────────────┐
                    │           Listeners (browsers)          │
                    │      <audio src="…/stream.mp3">         │
                    └────────────────────┬────────────────────┘
                                         │ HTTP audio
                    ┌────────────────────▼────────────────────┐
                    │              ICECAST                    │
                    │       (broadcast endpoint)              │
                    └────────────────────▲────────────────────┘
                                         │ source connection
                    ┌────────────────────┴────────────────────┐
                    │           LIQUIDSOAP                    │
                    │  • reads request queue (JSON file)      │
                    │  • crossfades                           │
                    │  • ducks DJ voice over intros           │
                    │  • falls back to autonomous playlist    │
                    └────────────────────▲────────────────────┘
                                         │ writes queue file +
                                         │ generates voice WAVs
                    ┌────────────────────┴────────────────────┐
                    │         CONTROLLER (Node.js)            │
                    │  • REST API for web UI                  │
                    │  • Ollama → request matching            │
                    │  • Subsonic → track lookup              │
                    │  • Piper TTS → DJ voice                 │
                    │  • Scheduler → hourly segments,         │
                    │    weather updates, show clocks         │
                    └─┬──────────┬──────────┬──────────────┬──┘
                      │          │          │              │
                  ┌───▼───┐  ┌───▼────┐ ┌───▼────┐  ┌──────▼──────┐
                  │Ollama │  │Navidrm │ │ Piper  │  │ Open-Meteo  │
                  │(Qwen) │  │Subsonic│ │  TTS   │  │  (weather)  │
                  └───────┘  └────────┘ └────────┘  └─────────────┘

                    ┌─────────────────────────────────────────┐
                    │          NEXT.JS WEB UI                 │
                    │  • request box                          │
                    │  • now-playing display                  │
                    │  • <audio> element pulling Icecast      │
                    └─────────────────────────────────────────┘
```

## Why this architecture

Real radio = one stream, synced listeners. That requires a server-side audio mixer. Liquidsoap is the standard tool — it's what college radio, Lainchan radio, every small internet station uses. Icecast is the broadcast layer that listeners connect to.

The controller is the only piece that's bespoke. Liquidsoap and Icecast just do their well-understood jobs.

## What runs where (homelab layout)

Aimed at your existing setup:

- **Ronin (Ryzen 5 7430U)** — Icecast, Liquidsoap, Controller, Web UI. Containerised with Docker Compose.
- **X1 Pro** — Ollama (Qwen 2.5 7B). Already running, just point at it.
- **Navidrome** — wherever you have it. Controller talks to it over Subsonic API.
- **Piper** — same container as the controller. Lightweight, CPU-only is fine.

## Directory layout

```
sub-wave/
├── controller/         # Node.js brain
│   ├── src/
│   │   ├── server.js         # Express API
│   │   ├── subsonic.js       # Navidrome client
│   │   ├── ollama.js         # LLM request matching + DJ scripts
│   │   ├── piper.js          # TTS wrapper
│   │   ├── scheduler.js      # Autonomous DJ + hourly segments
│   │   ├── queue.js          # Queue state + Liquidsoap handoff
│   │   ├── context.js        # Time / weather / festival
│   │   └── config.js
│   └── package.json
├── web/                # Next.js listener UI
│   ├── app/
│   │   ├── page.js           # Main listener page
│   │   ├── api/
│   │   │   ├── now-playing/route.js
│   │   │   ├── request/route.js
│   │   │   └── queue/route.js
│   └── package.json
├── liquidsoap/
│   └── radio.liq             # Liquidsoap script
├── docker/
│   ├── docker-compose.yml
│   ├── icecast.xml
│   └── Dockerfile.controller
└── README.md
```

## Quick start

```bash
# 1. Configure
cp controller/.env.example controller/.env
# Edit: NAVIDROME_URL, NAVIDROME_USER, NAVIDROME_PASS, OLLAMA_URL

# 2. Generate Piper voice (one-time)
./scripts/setup-piper.sh

# 3. Build and launch
cd docker && docker compose up -d

# 4. Tune in
open http://ronin.tail.ts.net:3000
```

The Icecast stream is at `http://ronin.tail.ts.net:8000/stream.mp3` — works in any browser, VLC, mpv, or your phone's stock music player.
