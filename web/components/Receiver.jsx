'use client';

import { Play, Pause } from 'lucide-react';
import Vinyl from './Vinyl';
import EQVisualizer from './EQVisualizer';
import VUMeter from './VUMeter';

export default function Receiver({
  nowPlaying,
  tunedIn,
  volume,
  setVolume,
  onTune,
  audioRef,
  streamUrl,
}) {
  return (
    <section className="border border-amber-900/40 bg-stone-900/30">
      <div className="flex items-center justify-between px-5 py-2 border-b border-amber-900/40 bg-amber-950/20">
        <span className="text-[10px] tracking-[0.3em] text-amber-500/80 uppercase">Receiver</span>
        <span className="flex items-center gap-2 text-[10px] tracking-widest">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              tunedIn ? 'bg-red-500 animate-pulse' : 'bg-stone-700'
            }`}
          />
          <span className={tunedIn ? 'text-red-400' : 'text-stone-500'}>
            {tunedIn ? 'ON AIR' : 'OFF AIR'}
          </span>
        </span>
      </div>

      <div className="p-6 lg:p-8">
        <div className="flex gap-6 items-start">
          <Vinyl spinning={tunedIn} label={nowPlaying?.artist} />

          <div className="flex-1 min-w-0">
            {nowPlaying ? (
              <>
                <div className="text-[10px] text-amber-500/60 tracking-widest uppercase mb-2">
                  On air now
                </div>
                <h2 className="text-3xl lg:text-5xl font-black tracking-tight leading-[1.05] truncate">
                  {nowPlaying.title || '—'}
                </h2>
                <div className="text-amber-200/75 text-lg lg:text-xl mt-1.5 truncate">
                  {nowPlaying.artist || '—'}
                </div>
                {nowPlaying.album && (
                  <div className="text-[10px] text-amber-200/40 mt-1 tracking-[0.25em] uppercase truncate">
                    {nowPlaying.album}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="text-[10px] text-amber-500/60 tracking-widest uppercase mb-2">
                  Standby
                </div>
                <div className="text-amber-200/50 text-lg italic">
                  scanning the dial
                  <span className="inline-block w-2 h-4 bg-amber-400/70 ml-1 align-middle animate-caret-blink" />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-6">
          <EQVisualizer audioRef={audioRef} active={tunedIn} />
        </div>

        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={onTune}
            aria-label={tunedIn ? 'Tune out' : 'Tune in'}
            className={`flex items-center gap-2 px-5 py-2.5 font-bold text-sm tracking-widest uppercase transition-colors sw-focus ${
              tunedIn
                ? 'bg-red-500/90 hover:bg-red-400 text-stone-950'
                : 'bg-amber-500 hover:bg-amber-400 text-stone-950 animate-pulse-halo'
            }`}
          >
            {tunedIn ? (
              <>
                <Pause className="w-4 h-4" /> Tune Out
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Tune In
              </>
            )}
          </button>
          <VUMeter value={volume} onChange={setVolume} />
        </div>

        <div className="mt-3 text-[10px] text-amber-500/40 tracking-widest">
          Stream: {streamUrl.replace(/^https?:\/\//, '')}
        </div>
      </div>
    </section>
  );
}
