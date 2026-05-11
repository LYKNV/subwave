'use client';

import { useEffect, useRef, useState } from 'react';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'dj', label: 'DJ' },
  { id: 'system', label: 'System' },
];

const DJ_KINDS = new Set(['dj-speak', 'station-id', 'weather', 'hourly-check', 'request']);

export default function BoothFeed({ entries }) {
  const [filter, setFilter] = useState('all');
  const scrollRef = useRef(null);
  const stickyRef = useRef(true);

  const filtered = entries.filter((e) => {
    if (filter === 'all') return true;
    const isDj = DJ_KINDS.has(e.kind);
    return filter === 'dj' ? isDj : !isDj;
  });

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !stickyRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [filtered.length]);

  function onScroll(e) {
    const el = e.currentTarget;
    const atBottom = el.scrollHeight - (el.scrollTop + el.clientHeight) < 32;
    stickyRef.current = atBottom;
  }

  return (
    <section className="border border-amber-900/40 bg-stone-900/30">
      <div className="flex items-center justify-between px-5 py-2 border-b border-amber-900/40 bg-amber-950/20">
        <span className="text-[10px] tracking-[0.3em] text-amber-500/80 uppercase">Booth Feed</span>
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`text-[10px] tracking-widest uppercase px-2 py-0.5 border transition-colors sw-focus ${
                filter === f.id
                  ? 'border-amber-500/70 text-amber-200 bg-amber-500/10'
                  : 'border-amber-900/40 text-amber-200/50 hover:text-amber-200/80'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="p-5 space-y-1.5 max-h-[28rem] overflow-y-auto sw-scroll"
      >
        {filtered.length === 0 && (
          <div className="text-amber-200/30 text-xs italic">awaiting transmission…</div>
        )}
        {filtered.map((entry) => {
          const isQuote = entry.kind === 'dj-speak' || entry.kind === 'station-id';
          if (isQuote) {
            return (
              <div key={entry.id} className="flex gap-3 text-xs leading-relaxed border-l-2 border-amber-500/60 pl-3 py-1 my-1">
                <span className="text-amber-500/40 tabular-nums shrink-0">
                  {new Date(entry.t).toLocaleTimeString('en-GB', { hour12: false })}
                </span>
                <span className={`shrink-0 w-24 text-[10px] tracking-widest uppercase ${kindColor(entry.kind)}`}>
                  [{entry.kind}]
                </span>
                <span className="text-amber-100/95 italic font-serif text-[13px] leading-snug">
                  {entry.message}
                </span>
              </div>
            );
          }
          return (
            <div key={entry.id} className="flex gap-3 text-xs leading-relaxed">
              <span className="text-amber-500/40 tabular-nums shrink-0">
                {new Date(entry.t).toLocaleTimeString('en-GB', { hour12: false })}
              </span>
              <span className={`shrink-0 w-24 text-[10px] tracking-widest uppercase ${kindColor(entry.kind)}`}>
                [{entry.kind}]
              </span>
              <span className="text-amber-100/90">{entry.message}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function kindColor(k) {
  switch (k) {
    case 'playing': return 'text-emerald-400';
    case 'queued': return 'text-amber-200/60';
    case 'request': return 'text-cyan-400';
    case 'dj-speak':
    case 'hourly-check':
    case 'weather':
    case 'station-id': return 'text-amber-400';
    case 'error':
    case 'miss': return 'text-red-400';
    default: return 'text-amber-200/60';
  }
}
