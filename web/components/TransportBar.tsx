'use client';

import { useEffect, useRef } from 'react';
import { animate as motionAnimate, m, useAnimate } from 'motion/react';
import { buildTagline } from '@/lib/tagline';
import { cn } from '@/lib/cn';
import { Slider } from './ui/slider';
import type { NowPlayingTrack, StationContext } from '@/lib/types';
import type { PlayerStatus } from '@/hooks/usePlayer';

export interface TransportBarProps {
  tunedIn: boolean;
  status?: PlayerStatus;
  onTune: () => void;
  offline?: boolean;
  volume: number;
  setVolume: (v: number) => void;
  /** Increments on keyboard-only volume adjusts; slider drags don't tick it. */
  volumePulse?: number;
  nowPlaying: NowPlayingTrack | null;
  elapsed: number;
  context: StationContext | null;
}

const VOLUME_CELLS = 12;

export default function TransportBar({
  tunedIn,
  status = 'idle',
  onTune,
  offline = false,
  volume,
  setVolume,
  volumePulse,
  nowPlaying,
  elapsed,
  context,
}: TransportBarProps) {
  // The window between the tune-in gesture and the first audible frame —
  // surfaced on the button so the player doesn't claim to play while silent.
  const connecting = status === 'connecting';
  const duration = nowPlaying?.duration ?? 0;
  const progress = duration > 0 ? Math.min(1, elapsed / duration) : 0;
  const lit = Math.round(volume * VOLUME_CELLS);

  // Track info lives in the CenterStage on desktop, so the footer's centre
  // slot stays empty there. On mobile it carries the context tagline (the
  // vibe/weather line the header hides below md).
  const tagline = buildTagline(context);

  // Pulse all volume cells on keyboard-driven adjusts. Imperative motion
  // animate is the cleanest fit here — re-keying every cell on each tick
  // would remount the DOM unnecessarily.
  const cellsRef = useRef<(HTMLSpanElement | null)[]>([]);
  const prevLitRef = useRef(lit);
  const firstPulseRef = useRef(true);
  const lastVibrateRef = useRef(0);
  useEffect(() => {
    if (firstPulseRef.current) {
      // Skip the initial mount tick — we only want to pulse on real adjusts.
      firstPulseRef.current = false;
      return;
    }
    if (volumePulse == null) return;
    const els = cellsRef.current.filter((el): el is HTMLSpanElement => el != null);
    if (els.length === 0) return;
    motionAnimate(els, { scale: [1, 1.18, 1] }, { duration: 0.11, ease: [0.2, 0.7, 0.2, 1] });
    // Keep prevLit in sync so the per-cell effect below doesn't double-pulse
    // the topmost cell when keyboard adjusts already triggered the full flash.
    prevLitRef.current = lit;
  }, [volumePulse, lit]);

  // Per-cell tactile feedback for drag / click — pulse the cell that just
  // toggled, plus a throttled haptic tick. Keyboard adjusts go through the
  // all-cells flash above (and reset prevLit so this effect bails).
  useEffect(() => {
    const prev = prevLitRef.current;
    if (prev === lit) return;
    prevLitRef.current = lit;
    const idx = lit > prev ? lit - 1 : prev - 1;
    const el = cellsRef.current[idx];
    if (el) motionAnimate(el, { scale: [1, 1.22, 1] }, { duration: 0.13, ease: [0.2, 0.7, 0.2, 1] });
    const now = Date.now();
    if (now - lastVibrateRef.current > 70 && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(4);
      lastVibrateRef.current = now;
    }
  }, [lit]);

  // One-shot scale pulse when tunedIn flips, so the button visibly "engages"
  // even if the user triggered tune via keyboard / media keys.
  const [tuneScope, animateTune] = useAnimate<HTMLButtonElement>();
  const prevTunedInRef = useRef(tunedIn);
  useEffect(() => {
    if (prevTunedInRef.current === tunedIn) return;
    prevTunedInRef.current = tunedIn;
    if (!tuneScope.current) return;
    animateTune(tuneScope.current, { scale: [1, 1.03, 1] }, { duration: 0.25, ease: [0.2, 0.7, 0.2, 1] });
  }, [tunedIn, animateTune, tuneScope]);

  const handleTune = () => {
    if (offline) return;
    // Real haptic on phones; browsers without vibration silently no-op.
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(8);
    }
    onTune();
  };

  return (
    <div className="absolute right-0 bottom-0 left-0 z-20 bg-bg [border-top:none] sm:[border-top:1px_solid_var(--ink)]">
      {/* Hairline progress along the top edge of the bar. */}
      {duration > 0 && (
        <div
          className="pointer-events-none absolute -top-px left-0 h-0.5 w-[var(--progress)] bg-vermilion"
          data-progress={`${progress * 100}%`}
          ref={(el) => { if (el) el.style.setProperty('--progress', `${progress * 100}%`); }}
          aria-hidden="true"
        />
      )}

      <div
        // Bottom inset keeps the Tune In / volume row clear of the iPhone
        // home indicator when installed (viewport-fit=cover). Side insets
        // matter for landscape on notched phones; top stays fixed so the
        // hairline progress bar above this row sits flush.
        className="flex items-center gap-3 pt-3
          pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(env(safe-area-inset-bottom)_+_0.75rem)]
          pl-[max(1rem,env(safe-area-inset-left))] sm:gap-6
          sm:pt-5 sm:pr-[max(2rem,env(safe-area-inset-right))]
          sm:pb-[calc(env(safe-area-inset-bottom)_+_1.25rem)] sm:pl-[max(2rem,env(safe-area-inset-left))]"
      >
        <m.button
          ref={tuneScope}
          onClick={offline ? undefined : handleTune}
          disabled={offline}
          aria-disabled={offline}
          title={offline ? 'The station is currently off air' : undefined}
          whileTap={offline ? undefined : { scale: 0.97, y: 1 }}
          transition={{ duration: 0.09, ease: [0.2, 0.7, 0.2, 1] }}
          className={cn(
            'v3-eyebrow v3-focus flex shrink-0 items-center gap-[10px] px-4 py-3 transition-shadow duration-150 sm:px-7 sm:py-[14px]',
            offline
              ? 'cursor-not-allowed border border-muted bg-bg text-muted'
              : 'cursor-pointer border-0 bg-ink text-bg [@media(hover:hover)]:hover:shadow-[inset_0_0_0_2px_var(--bg)]',
          )}
        >
          <span
            className={cn(
              'inline-block h-2 w-2 rounded-full',
              connecting && 'v3-connecting-pulse',
              offline
                ? 'bg-muted'
                : tunedIn
                  ? 'bg-vermilion'
                  : 'bg-[#5a5048]',
            )}
          />
          {offline ? 'Stream Offline' : connecting ? 'Connecting…' : tunedIn ? 'Tune Out' : 'Tune In'}
        </m.button>

        {/* Centre slot — empty spacer on desktop, context tagline on mobile. */}
        <div
          className="v3-caption flex min-w-0 flex-1 items-center truncate text-muted"
          title={tagline ?? ''}
        >
          {tagline && <span className="truncate sm:hidden">{tagline}</span>}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:gap-[10px]">
          <span className="v3-caption hidden text-muted sm:inline">Vol</span>
          <div className="relative flex h-[18px] w-[52px] items-center gap-0.5 sm:w-20">
            {Array.from({ length: VOLUME_CELLS }).map((_, i) => (
              <span
                key={i}
                ref={(el) => { cellsRef.current[i] = el; }}
                className={cn('h-full flex-1 border border-ink', i < lit ? 'bg-ink' : 'bg-transparent')}
              />
            ))}
            {/* Interaction layer only — the lit cells above are the visible
                control, so the Slider is overlaid invisibly. */}
            <Slider
              min={0}
              max={1}
              step={0.01}
              value={[volume]}
              onValueChange={([v]) => setVolume(v ?? 0)}
              aria-label="Volume"
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
