# SUB/WAVE Admin Console — Operator Manual

The admin console is the operator's control surface for the station. It lets
you step into the autonomous booth, shape what the DJ plays and says, programme
the week, and inspect the running system.

It is reached at **`/admin`** on the station host (e.g. `https://your-station/admin`).
`/admin` redirects to the **Dash** page.

---

## Signing in

The console is gated by a single sign-in. The controller protects every admin
endpoint with HTTP Basic auth using the `ADMIN_USER` / `ADMIN_PASS` credentials
set in `controller/.env`.

- Enter the username and password on the sign-in screen.
- Credentials are verified against the controller before being accepted — a
  wrong password is rejected immediately rather than failing silently later.
- On success the token is cached in this browser's `localStorage`
  (`subwave_admin_auth`). You stay signed in across visits until you sign out.
- **Sign out** (top-right of the header) clears the cached token.
- If the controller revokes or rotates credentials, the next admin request
  surfaces the sign-in screen again automatically.

> In production the auth gate is **mandatory** — the controller refuses to
> start if `ADMIN_USER` / `ADMIN_PASS` are unset.

---

## Layout

Every page shares the newsprint shell:

- **Header** — the `SUB / WAVE · admin` wordmark, a breadcrumb of the current
  page, and (when signed in) a live strip showing **on air / off air**, the
  current listener count, a link back to the player, and **sign out**.
- **Left navigation** — the seven pages below. The current page is highlighted.

## The seven pages

| Page | What it's for |
|------|---------------|
| [**Dash**](./dash.md) | DJ command center — speak on air, fire segments, flip autonomous toggles, watch the live booth. |
| [**Library**](./library.md) | Search Navidrome and queue tracks directly; run the mood tagger. |
| [**Personas**](./personas.md) | The roster of DJ identities — name, soul, voice, talk frequency, skills. |
| [**Skills**](./skills.md) | The autonomous between-track segments (weather, news, etc.) the station can run. |
| [**Shows**](./shows.md) | The weekly schedule grid — assign shows to hours of the week. |
| [**Settings**](./settings.md) | Station config — TTS engine, LLM provider, mixer, jingles, and the danger zone. |
| [**Debug**](./debug.md) | Read-only system inspector — health, logs, LLM calls, state files. |

---

## How changes apply

Most changes apply **live** with no interruption to the broadcast:

- **Apply on the next spoken line / next pick** — Personas, Skills, Shows, the
  LLM provider, the station location, and the TTS fallback engine.
- **Require a mixer restart** — crossfade duration and jingle ratio. The console
  flags these and offers a **Restart mixer** action in the Settings danger zone.
  A mixer restart drops the broadcast for roughly 3–5 seconds.
- **Disruptive, one-off actions** — skipping the current track and stopping the
  stream affect every listener and are always behind a confirmation dialog.
