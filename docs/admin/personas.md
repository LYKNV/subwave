# Personas — The Voices on Your Station

**Path:** `/admin/personas`

A persona is a DJ identity. The station keeps a roster of 1–12 personas, and
**one is on air at a time**. A scheduled [Show](./shows.md) can hand its hour to
a different persona. Each persona owns its name, tagline, talk frequency, soul,
voice, and the set of skills it may run.

Every change here POSTs to `/settings` and **applies live** — it takes effect on
the next spoken line, with no mixer restart.

---

## Layout

- **Hero** — a headline, the **System prompt** toggle, and **+ Add persona**.
- **Active strip** — shows which persona is currently on air, its tagline,
  frequency, and voice.
- **Roster** (left) — every persona as a card. Click one to edit it. The card
  shows the persona's frequency, engine, voice, skill count, and an
  *incomplete* badge if a field is invalid. The on-air persona is marked.
- **Editor** (right) — the editing panes for the focused persona.

---

## Editing a persona

### Identity

- **On-air name** *(required, ≤40 chars)* — shown in the player and injected
  into every prompt as `{name}`.
- **Tagline** *(optional, ≤80 chars)* — a short line shown alongside the persona.

### Soul

- **Soul** *(required, ≤400 chars)* — one short personality sketch (e.g. *"warm
  and dry, never corny — observant, favours one good image over a list"*).
  Injected into the prompt as `{soul}`.

### Talk frequency

How often this persona speaks and runs idents:

| Frequency | Behaviour |
|-----------|-----------|
| **Quiet** | Talks every 8–20 tracks · station ID once an hour · weather hourly on change. |
| **Moderate** | Talks every 1–9 tracks · station IDs at :15 and :45 · weather every 30 min on change. |
| **Aggressive** | Talks every 1–3 tracks · station IDs four times an hour · weather every 15 min on change. |

### Voice

The text-to-speech engine for this persona:

- **Piper** — local and fast, keyless, uses its built-in voice. No voice
  selection needed.
- **Kokoro** — more natural but slower. Pick a Kokoro voice id from the dropdown.
- **Cloud** — routes to OpenAI or ElevenLabs. Pick a **cloud provider** and a
  **cloud voice** (a curated voice, or *Custom voice id…* for any other).
  Uses the shared API key and model configured under [Settings → TTS](./settings.md).

### Skills

Tick the autonomous segments this persona is allowed to run. A skill fires
autonomously only when it is **both** ticked here **and** enabled station-wide
on the [Skills](./skills.md) page.

---

## Setting the on-air persona

In the editor header, **Set on air** makes the focused persona the active one.
The currently-active persona shows an *on air* badge instead.

---

## System prompt

The **System prompt** button (in the hero) reveals a single global template
wrapped around every DJ generation, shared by all personas. Most stations never
touch this.

- **Built-in default** — the shipped template.
- **Custom** — your own template. It must be 50–4000 characters and **must
  include the `{name}` placeholder** — the save is refused otherwise, so the DJ
  can never become anonymous.
- Placeholders available: `{name}`, `{soul}`, `{station}`, `{location}`.

---

## Saving

The save bar reports validation status. **Save persona** is disabled until
every persona in the roster is valid, the active persona exists, and any custom
prompt is valid. **Discard** reloads from the controller, dropping unsaved edits.
