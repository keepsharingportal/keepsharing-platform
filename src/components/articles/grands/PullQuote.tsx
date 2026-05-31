// PullQuote — designed purple feature block per the Grands spec. Rich
// gradient bg, large quote icon, white serif italic, attribution, soft
// glow blobs, faint heart icon in the corner.

import { Quote, Heart } from 'lucide-react'

interface Props {
  quote:       string
  attribution: string
}

export function PullQuote({ quote, attribution }: Props) {
  return (
    <figure className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#6F2C8F] via-[#5C2479] to-[#3E145C] p-6 text-white shadow-[0_18px_45px_rgba(75,23,104,0.30)] md:p-8">
      {/* Soft glow blobs */}
      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-black/10 blur-2xl pointer-events-none" />

      <Quote className="relative mb-3 h-9 w-9 text-white/55" strokeWidth={2} />

      {/* Softer weight — was font-semibold and reading as too heavy/strong.
          Now font-normal italic with a slight letter-spacing for the
          elegant magazine vibe. */}
      <blockquote className="relative max-w-3xl font-serif text-xl font-normal italic leading-snug tracking-tight md:text-2xl">
        “{quote}”
      </blockquote>

      <figcaption className="relative mt-4 text-sm font-medium text-white/85">
        — {attribution}
      </figcaption>

      <Heart className="absolute bottom-5 right-6 h-12 w-12 rotate-[-8deg] text-white/15 pointer-events-none" />
    </figure>
  )
}
