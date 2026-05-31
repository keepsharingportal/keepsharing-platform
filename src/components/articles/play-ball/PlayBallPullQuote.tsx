// PlayBallPullQuote — cream/gold magazine pull quote per the Play Ball
// spec. Subtle dotted background texture + trophy watermark + gold-star
// accent rule above the quote. Navy serif italic quote text + gold
// attribution. Used by the Play Ball feature treatment to render the
// first <blockquote> lifted out of the article body.

import { Quote, Trophy, Star } from 'lucide-react'

interface Props {
  quote:        string
  attribution?: string
}

export function PlayBallPullQuote({ quote, attribution }: Props) {
  return (
    <figure className="relative overflow-hidden rounded-2xl border border-[#D9A21B]/70 bg-[#FFFDF8] p-5 shadow-[0_14px_34px_rgba(8,38,74,0.12)] md:p-6">
      {/* Subtle dotted background texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_12px_12px,rgba(8,38,74,0.045)_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />

      {/* Trophy watermark */}
      <Trophy
        className="pointer-events-none absolute -bottom-7 right-8 h-36 w-36 text-[#08264A]/[0.06]"
        strokeWidth={1.8}
      />

      {/* Top star accent */}
      <div className="relative mb-4 flex items-center justify-center gap-3">
        <span className="h-px w-20 bg-[#D9A21B]" />
        <Star className="h-4 w-4 fill-[#D9A21B] text-[#D9A21B]" />
        <span className="h-px w-20 bg-[#D9A21B]" />
      </div>

      <div className="relative flex gap-4">
        <Quote
          className="mt-1 h-10 w-10 shrink-0 text-[#08264A]"
          strokeWidth={2.5}
        />

        <div>
          <blockquote className="font-serif text-xl font-bold italic leading-snug text-[#08264A] md:text-2xl">
            “{quote}”
          </blockquote>

          {attribution && (
            <figcaption className="mt-4 text-sm font-black uppercase tracking-[0.14em] text-[#B98200]">
              — {attribution}
            </figcaption>
          )}
        </div>
      </div>
    </figure>
  )
}
