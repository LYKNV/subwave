// Scheduler — drives autonomous behaviour:
//   - refreshes the auto-playlist file Liquidsoap falls back to
//   - schedules DJ talk segments between tracks
//   - hourly time/weather checks
//   - station IDs

import cron from 'node-cron';
import { writeFile } from 'node:fs/promises';
import { config } from './config.js';
import * as subsonic from './subsonic.js';
import * as ollama from './ollama.js';
import { getFullContext } from './context.js';
import { queue } from './queue.js';
import { cleanupOldVoices } from './piper.js';

// ---------------------------------------------------------------------------
// AUTO-PLAYLIST REFRESH
// Writes an M3U with mood-appropriate tracks for Liquidsoap's fallback source.
// ---------------------------------------------------------------------------

async function refreshAutoPlaylist() {
  const ctx = await getFullContext();
  queue.log('scheduler', `Refreshing auto-playlist for mood: ${ctx.dominantMood}`);

  // Pull tracks tagged with this mood, falling back to random if library
  // doesn't have enough mood-tagged tracks.
  let tracks = [];

  // Try mood-as-genre first (some libraries tag this way)
  try {
    if (ctx.dominantMood) {
      tracks = await subsonic.getSongsByGenre(ctx.dominantMood, { count: 30 });
    }
  } catch (err) {
    queue.log('error', `Genre fetch failed: ${err.message}`);
  }

  // Top up with random
  if (tracks.length < 20) {
    const random = await subsonic.getRandomSongs({ size: 30 });
    tracks = [...tracks, ...random];
  }

  // De-dup
  const seen = new Set();
  const unique = tracks.filter(t => {
    if (seen.has(t.id)) return false;
    seen.add(t.id);
    return true;
  });

  // Write M3U — annotate URIs so Liquidsoap sees real metadata up front
  const lines = ['#EXTM3U', ...unique.map(t => subsonic.getAnnotatedUri(t))];
  await writeFile(config.liquidsoap.autoPlaylist, lines.join('\n'));
  queue.log('scheduler', `Auto-playlist refreshed: ${unique.length} tracks`);
}

// ---------------------------------------------------------------------------
// HOURLY TIME CHECK
// At the top of every hour, the DJ checks in.
// ---------------------------------------------------------------------------

async function hourlyCheck() {
  const ctx = await getFullContext();
  try {
    const script = await ollama.generateHourlyTime(ctx.time, ctx.weather);
    await queue.announce(script, 'hourly-check');
  } catch (err) {
    queue.log('error', `Hourly check failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// WEATHER UPDATE
// Less frequent than hourly — only when significant changes
// ---------------------------------------------------------------------------

let lastWeatherCondition = null;

async function maybeWeatherUpdate() {
  const ctx = await getFullContext();
  if (!ctx.weather.condition || ctx.weather.condition === 'unknown') return;
  if (ctx.weather.condition === lastWeatherCondition) return;

  lastWeatherCondition = ctx.weather.condition;
  try {
    const script = await ollama.generateWeatherSegment(ctx.weather, ctx.time);
    await queue.announce(script, 'weather');
  } catch (err) {
    queue.log('error', `Weather update failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// STATION ID
// Random ident every ~45 mins
// ---------------------------------------------------------------------------

async function stationId() {
  try {
    const script = await ollama.generateStationId();
    await queue.announce(script, 'station-id');
  } catch (err) {
    queue.log('error', `Station ID failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// CLEAN UP — old voice WAVs
// ---------------------------------------------------------------------------

async function cleanup() {
  try {
    await cleanupOldVoices();
  } catch (err) {
    queue.log('error', `Cleanup failed: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// START
// ---------------------------------------------------------------------------

export function startScheduler() {
  // Initial run
  refreshAutoPlaylist().catch(err => queue.log('error', `Initial playlist failed: ${err.message}`));

  // Auto-playlist refresh every 10 minutes
  cron.schedule(`*/${config.show.autoQueueRefreshMinutes} * * * *`, refreshAutoPlaylist);

  // Top of every hour
  cron.schedule('0 * * * *', hourlyCheck);

  // Weather check every 30 minutes
  cron.schedule('*/30 * * * *', maybeWeatherUpdate);

  // Station ID at :15 and :45
  cron.schedule('15,45 * * * *', stationId);

  // Cleanup every hour
  cron.schedule('0 * * * *', cleanup);

  queue.log('scheduler', 'Scheduler started');
}
