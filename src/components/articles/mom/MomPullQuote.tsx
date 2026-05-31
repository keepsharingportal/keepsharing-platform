// MomPullQuote — soft, editorial pull quote for Mom to Mom. Cream bg
// with a subtle blush wash, blush border, coral Quote mark, navy serif
// italic quote, sage leaf watermark. Used by the Mom feature treatment
// to render the first <blockquote> lifted out of the article body.

import { Quote, Leaf } from 'lucide-react'

interface Props {
  quote:        string
  attribution?: string
}

export function MomPullQuote({ quote, attribution }: Props) {
  return (
    <figure className="relative overflow-hidden rounded-2xl border border-[#E8C9C6] bg-[#FFFDF8] px-6 py-6 shadow-[0_14px_34px_rgba(8,38,74,0.08)] md:px-8 md:py-7">
      {/* Soft blush wash */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#FCF4F2] via-transparent to-white opacity-90" />

      {/* Faint sage leaf watermark */}
      <Leaf
        className="pointer-events-none absolute -bottom-6 right-8 h-32 w-32 rotate-[-18deg] text-[#7A8B68]/[0.10]"
        strokeWidth={1.5}
      />

      <div className="relative mb-4 flex items-center gap-3">
        <Quote className="h-9 w-9 text-[#C96F73]" strokeWidth={2.5} />
        <span className="h-px flex-1 bg-[#E8C9C6]" />
      </div>

      <blockquote className="relative max-w-3xl font-serif text-xl font-semibold italic leading-snug text-[#08264A] md:text-2xl">
        “{quote}”
      </blockquote>

      {attribution && (
        <figcaption className="relative mt-5 flex items-center gap-3 text-sm font-black uppercase tracking-[0.12em] text-[#C96F73]">
          <span className="h-px w-8 bg-[#E8C9C6]" />
          {attribution}
        </figcaption>
      )}
    </figure>
  )
}
