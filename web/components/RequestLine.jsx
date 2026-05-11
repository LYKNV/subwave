'use client';

import { Send, Loader2 } from 'lucide-react';

const MOODS = [
  'something for late-night driving',
  'more like this one',
  'something punjabi',
  'surprise me',
];

export default function RequestLine({
  requesterName,
  setRequesterName,
  requestText,
  setRequestText,
  isSubmitting,
  submitMessage,
  onSubmit,
}) {
  return (
    <section className="border border-amber-900/40 bg-stone-900/30">
      <div className="px-5 py-2 border-b border-amber-900/40 bg-amber-950/20">
        <span className="text-[10px] tracking-[0.3em] text-amber-500/80 uppercase">Request Line</span>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setRequestText(m)}
              className="text-[10px] tracking-widest uppercase border border-amber-900/40 text-amber-200/70 hover:border-amber-500/70 hover:text-amber-200 px-2 py-1 transition-colors sw-focus"
            >
              {m}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="your name (optional)"
          value={requesterName}
          onChange={(e) => setRequesterName(e.target.value)}
          aria-label="Your name"
          className="w-full bg-stone-950/80 border border-amber-900/40 focus:border-amber-500 outline-none px-3 py-2 text-sm placeholder:text-amber-200/30 text-amber-100"
        />

        <div className="flex gap-2">
          <input
            type="text"
            placeholder='"something for late-night driving" or "more sidhu"'
            value={requestText}
            onChange={(e) => setRequestText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            disabled={isSubmitting}
            aria-label="Request"
            className="flex-1 bg-stone-950/80 border border-amber-900/40 focus:border-amber-500 outline-none px-3 py-2.5 text-sm placeholder:text-amber-200/30 text-amber-100 disabled:opacity-50"
          />
          <button
            onClick={onSubmit}
            disabled={isSubmitting || !requestText.trim()}
            aria-label="Send request"
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:bg-amber-900/40 disabled:cursor-not-allowed text-stone-950 px-4 text-xs font-bold tracking-widest uppercase transition-colors sw-focus"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send
          </button>
        </div>

        {submitMessage && (
          <div
            className={`text-xs px-3 py-2 border ${
              submitMessage.kind === 'ok'
                ? 'border-emerald-700/40 text-emerald-300/90 bg-emerald-950/20'
                : submitMessage.kind === 'miss'
                  ? 'border-amber-700/40 text-amber-300/90 bg-amber-950/20'
                  : 'border-red-700/40 text-red-300/90 bg-red-950/20'
            }`}
            role="status"
          >
            {submitMessage.text}
          </div>
        )}

        <div className="text-[10px] text-amber-500/40 tracking-wider flex items-center justify-between">
          <span>Your request goes through Ollama → matched to the library → DJ acknowledges you on-air</span>
          <span className="hidden sm:inline text-amber-500/60">↵ Enter to send</span>
        </div>
      </div>
    </section>
  );
}
