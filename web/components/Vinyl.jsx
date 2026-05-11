'use client';

export default function Vinyl({ spinning, label }) {
  const initials = (label || 'SW').slice(0, 2).toUpperCase();
  return (
    <div
      className="relative shrink-0 w-32 h-32 lg:w-44 lg:h-44"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 rounded-full animate-spin-slow"
        style={{ animationPlayState: spinning ? 'running' : 'paused' }}
      >
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <defs>
            <radialGradient id="vinyl-disc" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1c1917" />
              <stop offset="70%" stopColor="#0c0a09" />
              <stop offset="100%" stopColor="#000" />
            </radialGradient>
            <radialGradient id="vinyl-label" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#78350f" />
            </radialGradient>
            <linearGradient id="vinyl-sheen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="rgba(245,158,11,0.18)" />
              <stop offset="50%" stopColor="rgba(245,158,11,0)" />
              <stop offset="100%" stopColor="rgba(245,158,11,0)" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="98" fill="url(#vinyl-disc)" />
          {Array.from({ length: 14 }).map((_, i) => (
            <circle
              key={i}
              cx="100"
              cy="100"
              r={42 + i * 4}
              fill="none"
              stroke="rgba(245,158,11,0.06)"
              strokeWidth="0.6"
            />
          ))}
          <circle cx="100" cy="100" r="98" fill="url(#vinyl-sheen)" />
          <circle cx="100" cy="100" r="34" fill="url(#vinyl-label)" stroke="rgba(0,0,0,0.4)" strokeWidth="0.5" />
          <text
            x="100"
            y="105"
            textAnchor="middle"
            fontSize="14"
            fontWeight="900"
            fill="#fef3c7"
            fontFamily="ui-monospace, monospace"
            letterSpacing="2"
          >
            {initials}
          </text>
          <circle cx="100" cy="100" r="3" fill="#0c0a09" />
        </svg>
      </div>
      {/* tonearm hint, fixed */}
      <div className="absolute -top-3 -right-3 w-14 h-14 pointer-events-none opacity-70">
        <svg viewBox="0 0 60 60" className="w-full h-full">
          <circle cx="50" cy="10" r="4" fill="#78350f" stroke="#b45309" strokeWidth="0.6" />
          <line
            x1="50" y1="10"
            x2={spinning ? 22 : 30}
            y2={spinning ? 38 : 30}
            stroke="#78350f"
            strokeWidth="2.2"
            strokeLinecap="round"
            style={{ transition: 'all 600ms cubic-bezier(.4,0,.2,1)' }}
          />
        </svg>
      </div>
    </div>
  );
}
