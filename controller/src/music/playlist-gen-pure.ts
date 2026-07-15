// Pure, side-effect-free helpers for the magical playlist builder
// (music/playlist-gen.ts). Kept import-free so it's the unit-test seam
// (scripts/playlist-gen-pure.test.ts) AND the deterministic fallback the engine
// drops to when embeddings are absent or the LLM curation call fails — the same
// pure/impure split the LLM strategy layer uses (core/pure.ts).
//
// Nothing here touches Subsonic, the DB, or the network. Everything operates on
// already-materialised PoolTrack rows.

export type ArcShape = 'flat' | 'build' | 'peak-then-cool' | 'wind-down';

export const ARC_SHAPES: ArcShape[] = ['flat', 'build', 'peak-then-cool', 'wind-down'];

// A candidate track inside the generation pool. Superset of what any single
// source returns — buildCandidatePool normalises Subsonic songs and library
// slim-tracks into this one shape before curation.
export interface PoolTrack {
  id: string;
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  albumId?: string | null;
  durationSec?: number | null;
  year?: number | string | null;
  genre?: string | null;
  moods?: string[];
  energy?: string | null;            // 'low' | 'medium' | 'high' | null
  instrumental?: boolean | null;     // true = no vocals, false = vocals, null = un-analysed
  // Relevance/similarity in [0..1]-ish; higher is better. Deterministic ranking
  // and cap keep the highest-scoring rows.
  score?: number;
  // Which sources contributed this row (debug/telemetry only).
  sources?: string[];
}

// The lean shape returned to the builder UI.
export interface DraftTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSec: number;
  year: number | null;
  genre: string | null;
  energy: string | null;
  moods: string[];
  instrumental: boolean | null;
}

// low → 0, medium → 1, high → 2. Unknown energy sorts as medium so an
// un-analysed track doesn't get shoved to an arc extreme it may not belong at.
export function energyRank(energy: string | null | undefined): number {
  if (energy === 'low') return 0;
  if (energy === 'high') return 2;
  return 1;
}

// Merge duplicate ids across sources: keep the max score, union the source tags,
// and prefer the first-seen non-empty metadata for each field (later sources
// like random filler often carry thinner rows). Stable in first-seen order.
export function dedupeById(tracks: PoolTrack[]): PoolTrack[] {
  const byId = new Map<string, PoolTrack>();
  for (const t of tracks) {
    if (!t || !t.id) continue;
    const existing = byId.get(t.id);
    if (!existing) {
      byId.set(t.id, { ...t, sources: t.sources ? [...t.sources] : [] });
      continue;
    }
    existing.score = Math.max(existing.score ?? 0, t.score ?? 0);
    for (const s of t.sources || []) {
      if (!existing.sources!.includes(s)) existing.sources!.push(s);
    }
    // Backfill any field the first-seen row left empty.
    for (const k of ['title', 'artist', 'album', 'albumId', 'durationSec', 'year', 'genre', 'energy'] as const) {
      if (existing[k] == null && t[k] != null) (existing as any)[k] = t[k];
    }
    if ((existing.moods == null || existing.moods.length === 0) && t.moods?.length) existing.moods = t.moods;
    if (existing.instrumental == null && t.instrumental != null) existing.instrumental = t.instrumental;
  }
  return [...byId.values()];
}

export function mergePools(pools: PoolTrack[][]): PoolTrack[] {
  return dedupeById(pools.flat());
}

// Highest-scoring `cap` rows. Stable for equal scores (preserves input order),
// so source order acts as the tiebreak.
export function capPool(tracks: PoolTrack[], cap: number): PoolTrack[] {
  if (cap <= 0 || tracks.length <= cap) return [...tracks];
  return tracks
    .map((t, i) => ({ t, i }))
    .sort((a, b) => (b.t.score ?? 0) - (a.t.score ?? 0) || a.i - b.i)
    .slice(0, cap)
    .map((x) => x.t);
}

// Order a set to trace an energy arc. `flat` keeps the incoming (relevance)
// order untouched; the others sort by energy. peak-then-cool builds a mountain:
// lowest energy at both ends, highest in the middle.
export function arrangeArc(tracks: PoolTrack[], arc: ArcShape): PoolTrack[] {
  if (arc === 'flat' || tracks.length < 3) return [...tracks];
  const asc = [...tracks]
    .map((t, i) => ({ t, i }))
    .sort((a, b) => energyRank(a.t.energy) - energyRank(b.t.energy) || a.i - b.i)
    .map((x) => x.t);
  if (arc === 'build') return asc;
  if (arc === 'wind-down') return asc.reverse();
  // peak-then-cool: place ascending-energy tracks alternately at the outside
  // edges working inward, so the highest-energy tracks land in the middle.
  const n = asc.length;
  const res: PoolTrack[] = new Array(n);
  let lo = 0;
  let hi = n - 1;
  for (let i = 0; i < n; i++) {
    if (i % 2 === 0) res[lo++] = asc[i]!;
    else res[hi--] = asc[i]!;
  }
  return res;
}

// Reorder so the same artist is at least `minGap` tracks apart, disturbing the
// input order as little as possible: at each slot take the earliest track whose
// artist hasn't appeared in the last `minGap` outputs, else relax and take the
// next one. Greedy and deterministic.
export function spaceArtists(tracks: PoolTrack[], minGap: number): PoolTrack[] {
  if (minGap <= 0 || tracks.length < 2) return [...tracks];
  const pending = [...tracks];
  const result: PoolTrack[] = [];
  const artistKey = (t: PoolTrack) => (t.artist || '').trim().toLowerCase();
  while (pending.length) {
    const recent = new Set(result.slice(-minGap).map(artistKey));
    let idx = pending.findIndex((t) => !recent.has(artistKey(t)) || artistKey(t) === '');
    if (idx === -1) idx = 0; // every remaining candidate clashes — relax
    result.push(pending.splice(idx, 1)[0]!);
  }
  return result;
}

// The no-LLM fallback: take the top-scoring `targetCount`, arrange the arc, then
// space artists. Never returns empty when the pool is non-empty. This is exactly
// the path the engine uses when the djObject curation call fails or times out.
export function pickDeterministic(
  pool: PoolTrack[],
  opts: { targetCount: number; energyArc: ArcShape; artistSpacing: number },
): PoolTrack[] {
  const top = capPool(pool, Math.max(1, opts.targetCount));
  const arced = arrangeArc(top, opts.energyArc);
  return spaceArtists(arced, opts.artistSpacing);
}

// Resolve an LLM-returned id list against the pool: map to real rows, drop
// unknown/hallucinated ids, dedupe while preserving the model's chosen order.
export function orderByIds(ids: string[], pool: PoolTrack[]): PoolTrack[] {
  const byId = new Map(pool.map((t) => [t.id, t]));
  const seen = new Set<string>();
  const out: PoolTrack[] = [];
  for (const id of ids) {
    if (typeof id !== 'string') continue;
    const t = byId.get(id);
    if (!t || seen.has(id)) continue;
    seen.add(id);
    out.push(t);
  }
  return out;
}

// Trim/pad a curated selection to honour a target length. If the model returned
// fewer than the target, top up from the remaining pool (highest score first);
// if more, keep the model's leading choices.
export function fitToCount(
  selected: PoolTrack[],
  pool: PoolTrack[],
  targetCount: number,
): PoolTrack[] {
  if (targetCount <= 0) return selected;
  if (selected.length >= targetCount) return selected.slice(0, targetCount);
  const chosen = new Set(selected.map((t) => t.id));
  const filler = capPool(pool.filter((t) => !chosen.has(t.id)), targetCount - selected.length);
  return [...selected, ...filler];
}

// Running total in seconds — drives the builder's live "tape counter".
export function totalDurationSec(tracks: Array<{ durationSec?: number | null }>): number {
  return tracks.reduce((sum, t) => sum + (t.durationSec ?? 0), 0);
}
