// MomNominationBox — under-article nominate CTA for Mom to Mom. Soft
// blush bg with a coral heart disc, coral button. Replaces the generic
// NominateCTA "article" variant on Mom feature pages so the style stays
// in the Mom palette.

import Link from 'next/link'
import { ArrowRight, Heart } from 'lucide-react'

interface Props {
  /** Nominate flow destination — typically /submit/mom-to-mom. */
  href: string
}

export function MomNominationBox({ href }: Props) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#E8C9C6] bg-[#FCF4F2] p-6 text-center shadow-[0_12px_30px_rgba(8,38,74,0.08)]">
      <Heart
        className="pointer-events-none absolute -bottom-5 -right-4 h-28 w-28 text-[#C96F73]/[0.12]"
        strokeWidth={1.7}
      />

      <div className="relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#C96F73] ring-1 ring-[#E8C9C6]">
        <Heart className="h-6 w-6" strokeWidth={2.4} />
      </div>

      <h3 className="relative font-serif text-2xl font-bold leading-tight text-[#08264A]">
        Know a local mom with a story worth sharing?
      </h3>

      <p className="relative mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-700">
        Nominate a mom for an upcoming Mom to Mom feature.
      </p>

      <Link
        href={href}
        className="relative mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#C96F73] px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(201,111,115,0.26)] transition hover:bg-[#A84E55]"
      >
        Nominate a Mom
        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
      </Link>
    </section>
  )
}
