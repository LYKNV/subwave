# Shows — The Weekly Schedule

**Path:** `/admin/shows`

A show is a reusable programme definition: a name, a topic, an owning persona,
and a music mood. The weekly grid assigns shows to one-hour cells across Mon–Sun.

When the current hour has a show scheduled:

- its **persona** goes on air,
- its **mood** overrides the autonomous mood,
- its **topic** is fed to the DJ as the show theme.

An **empty hour** = the station runs autonomously, as it does without any
schedule. Changes POST to `/settings` and **apply live** — the current hour
takes effect on the next pick.

> Shows need at least one [persona](./personas.md) to exist first.

---

## On air / Up next / After that

The strip below the hero shows the show on air right now, plus the next two
scheduled changes — each with its persona and mood, or *"(no show —
autonomous)"* for empty hours.

---

## The weekly grid

A 7-day × 24-hour grid. The cell for the current hour is ringed in vermilion and
labelled *now*.

### Painting the schedule

1. **Pick a brush** — click a show in the brush row to arm it (or **Erase**).
2. **Paint** — click or click-drag across grid cells to assign the brushed show.
3. Painting over a cell that already holds the brushed show **clears** it.

Shortcuts:

- Click a **day name** to fill (or clear) that whole day with the brush.
- Click an **hour header** to fill (or clear) that hour across all seven days.
- **Clear week** empties the entire grid.

A colour legend below the grid maps each show to its colour.

---

## Show definitions

Each show is listed as a card showing its persona, mood, topic, and how many
hours per week it occupies (`Nh / week`, or `unscheduled`). An *incomplete*
badge flags a show missing a required field.

- **+ New show** / **+ Add show** — opens the show modal.
- **Edit** — opens the modal for an existing show.
- **✕** — removes the show and clears it from every grid cell.

### The show modal

- **show name** *(required, ≤60 chars)*
- **persona owner** *(required)* — which persona runs the show.
- **music mood** *(required)* — the mood the show forces while it's on air.
- **topic** *(optional, ≤500 chars)* — fed to the DJ as the show's theme.

---

## Saving

**Save schedule** writes both the show definitions and the weekly grid. It is
disabled until every show has a name, a persona, and a mood.
