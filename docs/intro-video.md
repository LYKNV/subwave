# SUB/WAVE intro video — storyboard & shot list

## Context

A 20–30 second promo that lives in the **GitHub README** so contributors and homelabbers landing on the repo immediately get what SUB/WAVE is. Production is **screen-recording + edit** (real product, no AI b-roll), VO is **two distinct ElevenLabs voices**, and the vibe is **late-night pirate radio** — lo-fi, warm static, neon, dub bass.

The video has to read **muted** (README auto-plays muted, and most viewers won't unmute on a first scroll), so every beat needs a text overlay or a screen that explains itself. Audio is a bonus track, not the spine.

## Deliverables

- **`media/intro.mp4`** — H.264, 1280×720, ~25s, ≤ 8 MB so it embeds cleanly in README. GitHub renders mp4 in markdown via `<video>` or a `![]()` link.
- **`media/intro.gif`** — optional 8–10s highlight loop, ≤ 5 MB, as a fallback (some markdown renderers don't play mp4).
- README change: insert the video reference at the top of `README.md` under the H1.

## The script (final copy)

| # | Time | VO / SFX | On-screen caption (baked) |
|---|------|----------|---------------------------|
| 1 | 0:00–0:03 | Slow dub bass: *dum… dum… dum…*. Radio dial sweep — three fragments of bleed-through (talk, static, half a song) | — |
| 2 | 0:03–0:06 | Dial locks. Female DJ (ElevenLabs, smoky, mid-range): **"You're listening to SUB/WAVE."** | `SUB/WAVE` wordmark fades in |
| 3 | 0:06–0:08 | Beat drops — same "dum dum" pulse but doubled tempo + sub-bass kick. Cassette-tape thunk | — |
| 4 | 0:08–0:13 | Bed music continues, no VO | `One stream. Everyone listens together.` |
| 5 | 0:13–0:16 | Male DJ (ElevenLabs, brighter, faster cadence, different processing): **"Your music library — turned into a radio station."** | — |
| 6 | 0:16–0:22 | Bed continues. Three rapid hits (~2s each), each with its own caption | `personas` → `shows` → `skills` |
| 7 | 0:22–0:26 | Male DJ: **"And yeah — runs on local models. Easy."** | `Runs on your hardware.` |
| 8 | 0:26–0:28 | Bed tail-out. Vinyl crackle | `SUB/WAVE · github.com/…` |

Tagline lifted from the existing landing copy in `web/components/what/ArticleHead.jsx` ("One stream, an LLM behind the desk…") — we're not inventing new wording. The "music library turned into a radio station" line is a tight rewrite of `web/components/manual/Overview.jsx`.

## Shot list (what to actually screen-record)

All recordings on a 1440×900 viewport at 2× DPR for sharp downscale to 720p. Use macOS QuickTime or `cmd-shift-5`; for fluid 60fps motion, prefer a browser screencap tool like [Screen Studio](https://www.screen.studio/) or OBS.

| Beat | URL | What to capture | Notes |
|---|---|---|---|
| 1 | — | Pure black frame + static overlay (added in edit) | No recording needed |
| 2 | `/listen` | First-paint "TUNE IN" overlay state | Reload to get the overlay; freeze on it |
| 4 | `/listen` | Player in motion: track art, scrolling waveform, DJ booth ticker rolling | Record ~15s, pick the cleanest 5s where the ticker is mid-sentence |
| 6a | `/admin/personas` | Pan across persona cards (3–4 visible) | Use mouse-driven smooth scroll |
| 6b | `/admin/shows` | Weekly schedule grid — color-coded cells visible | Hold static for 1.5s, then a faint hover highlight |
| 6c | `/admin/skills` | Toggle cards (weather/news/traffic). Animate one toggle flipping on | The toggle animation is the visual hook |
| 7 | `/admin/settings` | LLM section showing "Ollama" provider selected, model field visible | Crop to that section — don't show the whole settings page |
| 8 | — | Wordmark + repo URL on black | After Effects / CapCut title card |

Use the **dark theme** throughout — the "late-night pirate radio" vibe needs neon-on-black, and the theme toggle on `/listen` is in the top bar.

## Audio production

- **Bed track**: a 25s loop-friendly dub instrumental at ~70 BPM for beats 1–3, snapping to ~140 BPM at beat 3 (the "drop"). Source from a royalty-free library (Pixabay Music, Uppbeat, or YouTube Audio Library — search "dub", "lo-fi dub", "trip-hop"). Pick something with a clean kick on every beat so the captions can cut on it.
- **SFX**: radio-tuning sweep (freesound.org tag `radio-tuning`), vinyl crackle (`vinyl-loop`), cassette thunk (`tape-mechanism`).
- **VOs**: ElevenLabs, two distinct voices. Suggested presets:
  - DJ #1 (female, beat 2): "Rachel" or "Sarah" with stability ~50, style ~30.
  - DJ #2 (male, beats 5 + 7): "Adam" or "Antoni" with stability ~40, style ~50 — more energy than DJ #1.
  Add a touch of plate reverb + a high-pass at 200 Hz on both to sit them in the broadcast bed.

## Visual treatment

- **Aspect**: 16:9, 1280×720. README-friendly.
- **Captions**: bottom-third, baked in, serif display font matching the broadsheet UI (the admin/manual already use this — see `web/app/manual/`). White on a soft drop-shadow, no caption background bar.
- **Transitions**: hard cuts on the kick of the bed, except beat 1→2 which is a quick film-burn/flash to sell the "dial locks" moment.
- **Grain + glow**: light film grain (5–10%) and a subtle CRT-style chromatic aberration on UI shots to lean into the pirate-radio vibe without obscuring the actual product.

## Verification

- Open the final mp4 **muted** end-to-end — every beat still reads. If a beat is silent + has no caption, fix it.
- Drop the mp4 into a draft README change locally and preview with `gh markdown-preview` or by pushing to a draft branch and viewing on github.com. Confirm it autoplays and the controls don't cover the captions.
- Check file size: under 10 MB for mp4, under 5 MB for the optional gif. Re-encode with `ffmpeg -crf 28 -preset slow` if over.
- Test on mobile GitHub (iOS Safari + Android Chrome) — the README is mobile-viewed more than people think.
