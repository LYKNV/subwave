# Skills — What the DJ Does Between Tracks

**Path:** `/admin/skills`

A skill is an autonomous DJ segment — the kinds of thing the station says
between tracks (weather, news, traffic, random facts, and so on). This page
toggles each skill on or off **station-wide**.

---

## When a skill fires

A skill fires autonomously only when **both** conditions hold:

1. It is **enabled** here, station-wide.
2. It is **assigned** to the persona currently on air (set per-persona on the
   [Personas](./personas.md) page).

Beyond that, the persona's talk **frequency** and each skill's **cooldown**
govern timing.

---

## The skill list

Each skill is a card showing:

- **Name** and **kind**.
- **Description** — what the segment does.
- **Cooldown** — the minimum gap between autonomous firings of this skill.
- **Enable toggle** — flips the skill on/off station-wide. The pill reads
  `enabled` / `disabled`.

The hero strip summarises the total skill count and how many are enabled.

---

## Run now

**Run now** fires the skill's segment **immediately**. It is an operator
override and **bypasses everything** — the enable toggle, the persona
assignment, the frequency gate, and the cooldown. Use it to test a skill or to
deliberately trigger a segment on demand.

A toast confirms what went to air.
