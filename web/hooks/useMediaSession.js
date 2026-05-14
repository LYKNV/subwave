'use client';

import { useEffect } from 'react';

// Wires the browser's Media Session API to the controller's now-playing feed.
// Effect: track + artist + album show on the OS lock screen, in the
// notification shade (Android), in Control Centre (iOS / macOS), and on
// Bluetooth headsets / car displays. Hardware play/pause/headphone buttons
// also route through these handlers.
//
// Tied to the same <audio> element that usePlayer owns, so:
//   • The system "playback state" reflects whether we're tuned in.
//   • Play / pause / stop actions go through usePlayer.tune() so all UI
//     state stays consistent (volume, waveform, transport bar label).
//
// "seekto" / "seekbackward" / "seekforward" are intentionally NOT wired —
// this is a live stream, you can't scrub. Leaving them unset removes the
// scrubber from the lock screen rather than showing a broken one.
//
// Skipping `nexttrack` would be wrong: a listener pressing "next" on their
// headphones expects to skip the *song they're hearing*, which on this
// station means asking the controller to advance. POST /skip does exactly
// that — but we gate it on the skipFn callback so consumers can opt out
// (e.g. an unauthenticated public listener page that shouldn't expose skip).
export function useMediaSession({ tunedIn, nowPlaying, audioRef, onTune, onSkip }) {
  // Reflect tune-in / out into the system playback state. The browser uses
  // this to render the play/pause glyph on the lock screen correctly even
  // if the <audio> readyState is still loading.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = tunedIn ? 'playing' : 'paused';
  }, [tunedIn]);

  // Push current track metadata. Artwork falls back to the app icon at three
  // sizes so the OS can pick whichever fits its surface (notification, lock
  // screen, Bluetooth display).
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
    if (!('MediaMetadata' in window)) return;

    const title = nowPlaying?.title || 'SUB/WAVE';
    const artist = nowPlaying?.artist || 'Live broadcast';
    const album = nowPlaying?.album || 'SUB/WAVE';

    navigator.mediaSession.metadata = new window.MediaMetadata({
      title,
      artist,
      album,
      artwork: [
        { src: '/icons/192', sizes: '192x192', type: 'image/png' },
        { src: '/icons/512', sizes: '512x512', type: 'image/png' },
      ],
    });
  }, [nowPlaying?.title, nowPlaying?.artist, nowPlaying?.album]);

  // Action handlers. These are bound once per change to the dependencies so
  // they always close over the latest tune / skip callbacks.
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;

    const session = navigator.mediaSession;

    const handlePlay = () => {
      if (!tunedIn) onTune?.();
      else audioRef.current?.play().catch(() => {});
    };
    const handlePause = () => {
      if (tunedIn) onTune?.();
      else audioRef.current?.pause();
    };
    const handleStop = () => {
      if (tunedIn) onTune?.();
    };
    const handleNext = () => {
      onSkip?.();
    };

    try {
      session.setActionHandler('play', handlePlay);
      session.setActionHandler('pause', handlePause);
      session.setActionHandler('stop', handleStop);
      session.setActionHandler('nexttrack', onSkip ? handleNext : null);
      // Explicitly null out actions we don't support so the UI hides them
      // rather than showing greyed-out buttons.
      session.setActionHandler('previoustrack', null);
      session.setActionHandler('seekto', null);
      session.setActionHandler('seekbackward', null);
      session.setActionHandler('seekforward', null);
    } catch {
      // Older Safari throws on unsupported action types — swallow and carry
      // on; the supported subset is still registered.
    }

    return () => {
      try {
        session.setActionHandler('play', null);
        session.setActionHandler('pause', null);
        session.setActionHandler('stop', null);
        session.setActionHandler('nexttrack', null);
      } catch {}
    };
  }, [tunedIn, onTune, onSkip, audioRef]);
}
