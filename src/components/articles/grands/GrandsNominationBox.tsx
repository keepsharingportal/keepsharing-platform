// GrandsNominationBox — under-article nominate CTA for Grands. Soft
// lavender bg, purple heart disc, purple button. Replaces the generic
// NominateCTA "article" variant on Grands feature pages so the closing
// CTA matches the magazine spec instead of reading as a flat banner.

import Link from 'next/link'
import { ArrowRight, Heart } from 'lucide-react'

interface Props {
  /** Nominate flow destination — typically /submit/grands-are-the-greatest. */
  href: string
}

export function GrandsNominationBox({ href }: Props) {
  return (
    <section className="relative mt-10 overflow-hidden rounded-3xl border border-[#E6D3EC] bg-[#FAF6FC] p-7 text-center shadow-[0_14px_34px_rgba(75,23,104,0.08)]">
      <Heart
        className="pointer-events-none absolute -bottom-5 -right-4 h-28 w-28 text-[#6F2C8F]/[0.10]"
        strokeWidth={1.8}
      />

      <div className="relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#6F2C8F] ring-1 ring-[#E6D3EC]">
        <Heart className="h-6 w-6" strokeWidth={2.4} />
      </div>

      <p className="relative mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#6F2C8F]">
        Grands Are The Greatest
      </p>

      <h3 className="relative font-serif text-2xl font-bold leading-tight text-[#08264A]">
        Celebrate a grandparent whose love leaves a legacy.
      </h3>

      <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-700">
        Honor a grandparent who brings joy, wisdom, and unforgettable memories to your family.
      </p>

      <Link
        href={href}
        className="relative mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-[#6F2C8F] px-6 py-3 text-sm font-black text-white shadow-[0_10px_24px_rgba(111,44,143,0.24)] transition hover:bg-[#4B1768]"
      >
        Nominate Grandparents
        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
      </Link>
    </section>
  )
}
