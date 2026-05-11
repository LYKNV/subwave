// Controller HTTP API.
// The Next.js web UI hits this for: now-playing, queue state, request submission.

import express from 'express';
import { config } from './config.js';
import * as subsonic from './subsonic.js';
import * as ollama from './ollama.js';
import { getFullContext } from './context.js';
import { queue } from './queue.js';
import { startScheduler } from './scheduler.js';

const app = express();
app.use(express.json());

// CORS for the Next.js frontend
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// ---------------------------------------------------------------------------
// GET /now-playing — current track + context snapshot
// ---------------------------------------------------------------------------
app.get('/now-playing', async (req, res) => {
  try {
    const [nowPlaying, ctx] = await Promise.all([
      queue.getNowPlaying(),
      getFullContext(),
    ]);
    res.json({ nowPlaying, context: ctx });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /state — queue + history + DJ log
// ---------------------------------------------------------------------------
app.get('/state', (req, res) => {
  res.json(queue.snapshot());
});

// ---------------------------------------------------------------------------
// POST /request — listener submits a request
// ---------------------------------------------------------------------------
app.post('/request', async (req, res) => {
  const { text, name } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Empty request' });
  }
  const requester = (name || '').trim() || 'anon';

  try {
    queue.log('request', `${requester}: "${text}"`);

    // 1. LLM matches intent
    const matched = await ollama.matchRequest(text, { listenerName: requester });

    // 2. Search Navidrome
    let candidates = [];
    for (const term of matched.search_terms || []) {
      const r = await subsonic.search(term, { songCount: 5 });
      candidates = [...candidates, ...r];
    }

    // De-dup
    const seen = new Set();
    const unique = candidates.filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    let pick = unique[0];

    // If no direct match but we have a mood, fall back to mood-based
    if (!pick && matched.mood) {
      const moodPool = await subsonic.getRandomSongs({ size: 10, genre: matched.mood });
      pick = moodPool[0];
    }

    if (!pick) {
      queue.log('miss', `Nothing matched "${text}"`);
      return res.json({
        success: false,
        message: `Sorry ${requester}, nothing in the crates matched that.`,
      });
    }

    // 3. Generate DJ intro that mentions the request
    const ctx = await getFullContext();
    const introScript = await ollama.generateIntro({
      track: pick,
      context: ctx,
      requestedBy: requester,
    });

    // 4. Add to queue (will trigger Liquidsoap via the queue manager)
    await queue.push({
      track: pick,
      requestedBy: requester,
      intent: matched.intent,
      introScript,
    });

    res.json({
      success: true,
      ack: matched.ack,
      track: { title: pick.title, artist: pick.artist },
      queuePosition: queue.upcoming.length,
    });
  } catch (err) {
    queue.log('error', `Request handling failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /skip — manual skip (for the host, not listeners)
// ---------------------------------------------------------------------------
app.post('/skip', async (req, res) => {
  await queue.serveNext();
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// GET /health
// ---------------------------------------------------------------------------
app.get('/health', (req, res) => res.json({ status: 'on-air' }));

// ---------------------------------------------------------------------------
// START
// ---------------------------------------------------------------------------
app.listen(config.server.port, () => {
  console.log(`SUB/WAVE controller on :${config.server.port}`);
  startScheduler();
});
