// Mid-list pull-quote that breaks up the card grid. Reduces banner-
// blindness, increases time-on-page, and reinforces the editor voice.
// Spans the full row width when injected.

import { Quote } from 'lucide-react'

const QUOTES = [
  {
    quote: 'The best birthday gift isn\'t the flashiest box — it\'s the one that\'s out of the toy chest a year later.',
    by:    'River Region Parents editorial team',
  },
  {
    quote: 'Parents-of-three rule: if it makes noise AND has 47 small pieces, you regifted it within a month.',
    by:    'Mom of 3, Prattville',
  },
  {
    quote: 'Experience gifts beat physical ones nine times out of ten. The kid still talks about the museum trip; they\'ve forgotten the LEGO set.',
    by:    'Mom of 2, Montgomery',
  },
] as const

export function GiftPullQuote({ accent }: { accent: string }) {
  // Pick deterministically based on accent so the same age always
  // shows the same quote (looks intentional, not random).
  const idx = (accent.charCodeAt(1) + accent.charCodeAt(4)) % QUOTES.length
  const q = QUOTES[idx]

  return (
    <div
      className="rounded-2xl p-6 md:p-8 relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${accent}14, ${accent}08)` }}
    >
      <Quote size={64} className="absolute top-3 left-3 opacity-15" style={{ color: accent }} />
      <div className="relative max-w-3xl mx-auto text-center">
        <p className="text-xl md:text-2xl font-bold text-slate-900 leading-snug mb-3">
          “{q.quote}”
        </p>
        <p className="text-[12px] font-bold uppercase tracking-widest text-slate-500">
          — {q.by}
        </p>
      </div>
    </div>
  )
}
