'use client';

const SEGMENTS = 16;

export default function VUMeter({ value, onChange, label = 'Volume' }) {
  const pct = Math.max(0, Math.min(1, value));
  const filled = Math.round(pct * SEGMENTS);
  const db = Math.round(20 * Math.log10(Math.max(0.0001, pct)));

  return (
    <div className="flex items-center gap-3 flex-1">
      <div className="relative flex-1 h-6 select-none">
        {/* segments */}
        <div className="absolute inset-0 flex items-center gap-[3px]">
          {Array.from({ length: SEGMENTS }).map((_, i) => {
            const lit = i < filled;
            const isHot = i >= SEGMENTS - 3;
            const color = !lit
              ? 'bg-amber-950/50'
              : isHot
                ? 'bg-red-500/90 shadow-[0_0_4px_rgba(239,68,68,0.6)]'
                : i >= SEGMENTS - 6
                  ? 'bg-amber-400 shadow-[0_0_4px_rgba(245,158,11,0.55)]'
                  : 'bg-amber-500/80';
            return (
              <span
                key={i}
                className={`flex-1 h-full ${color}`}
                style={{ clipPath: 'polygon(0 20%, 100% 0, 100% 80%, 0 100%)' }}
              />
            );
          })}
        </div>
        {/* invisible native slider on top for interaction + a11y */}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-label={label}
          className="sw-slider absolute inset-0 w-full h-full opacity-0"
        />
      </div>
      <span className="text-[10px] text-amber-500/60 tabular-nums w-12 text-right">
        {pct === 0 ? '−∞ dB' : `${db} dB`}
      </span>
    </div>
  );
}
