// TeacherNominationBox — sidebar nominate CTA for Teacher of the Month.
// Navy bg with red glow + gold glow, apple watermark, red button. Per
// the mockup, replaces the generic NominateCTA "article" variant when
// rendered on a Teacher feature article.

import Link from 'next/link'
import { Apple, ArrowRight } from 'lucide-react'

interface Props {
  /** Destination URL for the nominate flow — usually /nominate/teacher. */
  href: string
}

export function TeacherNominationBox({ href }: Props) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-[#08264A] p-6 text-white shadow-[0_16px_38px_rgba(8,38,74,0.24)]">
      {/* Decorative glow blobs */}
      <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[#E4312B]/20 blur-2xl" />
      <div className="absolute -bottom-14 -left-14 h-40 w-40 rounded-full bg-[#D9A21B]/20 blur-2xl" />

      {/* Apple watermark */}
      <Apple
        className="pointer-events-none absolute bottom-4 right-5 h-24 w-24 text-white/[0.06]"
        strokeWidth={1.6}
      />

      <div className="relative flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-[#D9A21B]/60 bg-[#E4312B] text-white shadow-lg">
          <Apple className="h-7 w-7" strokeWidth={2.3} />
        </div>
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.16em] text-[#D9A21B]">
            Teacher of the Month
          </p>
          <h3 className="text-xl font-black leading-tight md:text-2xl">
            Know an outstanding teacher who deserves recognition?
          </h3>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/80">
            Nominate a local educator who inspires, encourages, and makes a difference every day.
          </p>
        </div>
      </div>

      <Link
        href={href}
        className="relative mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#E4312B] px-5 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-[0_10px_24px_rgba(228,49,43,0.28)] transition hover:bg-[#B91F1B] md:w-auto"
      >
        Nominate a Teacher Today
        <ArrowRight className="h-4 w-4" strokeWidth={2.5} />
      </Link>

      <p className="relative mt-4 font-serif text-lg italic text-[#D9A21B]">
        Thank you, teachers!
      </p>
    </section>
  )
}
