// TeacherPullQuote — cream/white pull quote with red Quote mark, gold
// rule line, navy serif italic quote, and a faint apple watermark.
// Used by the Teacher of the Month feature treatment to render the
// first <blockquote> lifted out of the article body.

import { Apple, Quote } from 'lucide-react'

interface Props {
  quote:        string
  attribution?: string
}

export function TeacherPullQuote({ quote, attribution }: Props) {
  return (
    <figure className="relative overflow-hidden rounded-2xl border border-[#E4312B]/35 bg-[#FFFDF8] px-6 py-6 shadow-[0_14px_34px_rgba(8,38,74,0.10)] md:px-8 md:py-7">
      {/* Subtle school-paper horizontal rule texture */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(8,38,74,0.035)_1px,transparent_1px)] [background-size:100%_28px] opacity-45" />

      {/* Gold top rule */}
      <div className="absolute left-6 right-6 top-0 h-[3px] bg-[#D9A21B]" />

      {/* Apple watermark */}
      <Apple
        className="pointer-events-none absolute -bottom-7 right-8 h-36 w-36 text-[#E4312B]/[0.07]"
        strokeWidth={1.7}
      />

      <div className="relative mb-4 flex items-center gap-3">
        <Quote className="h-9 w-9 text-[#E4312B]" strokeWidth={2.5} />
        <span className="h-px flex-1 bg-[#D9A21B]/70" />
      </div>

      <blockquote className="relative max-w-3xl font-serif text-xl font-bold italic leading-snug text-[#08264A] md:text-2xl">
        “{quote}”
      </blockquote>

      {attribution && (
        <figcaption className="relative mt-5 flex items-center gap-3 text-sm font-black uppercase tracking-[0.14em] text-[#E4312B]">
          <span className="h-px w-8 bg-[#D9A21B]" />
          {attribution}
        </figcaption>
      )}
    </figure>
  )
}
