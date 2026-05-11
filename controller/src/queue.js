// Queue manager — keeps the in-memory queue and writes track URIs
// to the file Liquidsoap watches.

import { writeFile, readFile } from 'node:fs/promises';
import { config } from './config.js';
import * as subsonic from './subsonic.js';
import { speak } from './piper.js';

class Queue {
  constructor() {
    this.upcoming = [];      // [{track, requestedBy, intent, introScript}]
    this.current = null;     // currently-playing request item (null if auto-playlist)
    this.history = [];       // last 50 finished tracks (current → history on rotation)
    this.djLog = [];         // controller-level events for the web UI
  }

  log(kind, message, meta = {}) {
    const entry = { id: Date.now() + Math.random(), kind, message, meta, t: new Date().toISOString() };
    this.djLog.unshift(entry);
    this.djLog = this.djLog.slice(0, 200);
    console.log(`[${kind}] ${message}`);
  }

  // Add a track to the queue and let Liquidsoap know
  async push({ track, requestedBy = null, intent = null, introScript = null }) {
    this.upcoming.push({ track, requestedBy, intent, introScript });

    // If Liquidsoap is asking for the next thing, hand it over
    await this.serveNext();

    this.log('queued', `${track.title} — ${track.artist}`, { requestedBy, queueLength: this.upcoming.length });
    return this.upcoming.length;
  }

  // Write the next item to the file Liquidsoap watches.
  // Liquidsoap is responsible for pacing — this only writes when triggered.
  async serveNext() {
    if (this.upcoming.length === 0) return null;

    const item = this.upcoming.shift();
    const uri = subsonic.getAnnotatedUri(item.track);

    // If there's a DJ intro, generate the WAV and queue it FIRST
    if (item.introScript) {
      try {
        const wavPath = await speak(item.introScript);
        await writeFile(config.liquidsoap.sayFile, wavPath);
        this.log('dj-speak', item.introScript, { duration: 'pending' });
        // Small delay so Liquidsoap picks up the voice file before the track
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        this.log('error', `TTS failed: ${err.message}`);
      }
    }

    await writeFile(config.liquidsoap.queueFile, uri);

    // Rotate: previous "current" becomes history, new item becomes current
    if (this.current) {
      this.history.unshift({ ...this.current, t: new Date().toISOString() });
      this.history = this.history.slice(0, 50);
    }
    this.current = item;

    this.log('playing', `${item.track.title} — ${item.track.artist}`, { requestedBy: item.requestedBy });
    return item;
  }

  // Speak something without queueing a track — for time checks, weather, station IDs
  async announce(text, kind = 'announcement') {
    if (!text || !text.trim()) return;
    try {
      const wavPath = await speak(text);
      await writeFile(config.liquidsoap.sayFile, wavPath);
      this.log(kind, text);
    } catch (err) {
      this.log('error', `Announce failed: ${err.message}`);
    }
  }

  snapshot() {
    return {
      upcoming: this.upcoming.map(i => ({
        title: i.track.title,
        artist: i.track.artist,
        album: i.track.album,
        requestedBy: i.requestedBy,
      })),
      history: this.history.map(i => ({
        title: i.track.title,
        artist: i.track.artist,
        album: i.track.album,
        requestedBy: i.requestedBy,
        t: i.t,
      })),
      djLog: this.djLog.slice(0, 50),
    };
  }

  // Read the now-playing JSON Liquidsoap writes
  async getNowPlaying() {
    try {
      const raw = await readFile(config.liquidsoap.nowPlayingFile, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}

export const queue = new Queue();
