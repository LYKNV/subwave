'use client';

import { useEffect, useRef, useState } from 'react';

const BAR_COUNT = 24;
const IDLE_CLASSES = ['animate-bar-1','animate-bar-2','animate-bar-3','animate-bar-4','animate-bar-5','animate-bar-6'];

export default function EQVisualizer({ audioRef, active }) {
  const containerRef = useRef(null);
  const rafRef = useRef(null);
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    if (!active || !audioRef?.current) {
      setLive(false);
      cleanup();
      return;
    }

    let cancelled = false;
    const tryAttach = async () => {
      try {
        if (!ctxRef.current) {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return;
          ctxRef.current = new AC();
        }
        if (ctxRef.current.state === 'suspended') {
          await ctxRef.current.resume();
        }
        if (!sourceRef.current) {
          sourceRef.current = ctxRef.current.createMediaElementSource(audioRef.current);
          analyserRef.current = ctxRef.current.createAnalyser();
          analyserRef.current.fftSize = 64;
          analyserRef.current.smoothingTimeConstant = 0.78;
          sourceRef.current.connect(analyserRef.current);
          analyserRef.current.connect(ctxRef.current.destination);
        }
        if (cancelled) return;
        setLive(true);
        runLoop();
      } catch {
        // CORS or other failure — stay in idle mode
        setLive(false);
      }
    };
    tryAttach();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function runLoop() {
    const analyser = analyserRef.current;
    const container = containerRef.current;
    if (!analyser || !container) return;
    const bins = new Uint8Array(analyser.frequencyBinCount);
    const bars = container.querySelectorAll('[data-bar]');
    const step = Math.max(1, Math.floor(bins.length / BAR_COUNT));
    const tick = () => {
      analyser.getByteFrequencyData(bins);
      for (let i = 0; i < bars.length; i++) {
        const v = bins[Math.min(bins.length - 1, i * step)] / 255;
        const h = Math.max(4, v * 100);
        bars[i].style.height = `${h}%`;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }

  function cleanup() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    // keep AudioContext alive across tune-in/out cycles; just stop the RAF
  }

  useEffect(() => () => cleanup(), []);

  return (
    <div
      ref={containerRef}
      className="flex items-end gap-[3px] h-12 w-full"
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const idleClass = IDLE_CLASSES[i % IDLE_CLASSES.length];
        return (
          <span
            key={i}
            data-bar
            className={`flex-1 bg-gradient-to-t from-amber-700/40 via-amber-500/80 to-amber-300 ${live ? '' : idleClass}`}
            style={live ? { height: '4%', transition: 'height 60ms linear' } : undefined}
          />
        );
      })}
    </div>
  );
}
