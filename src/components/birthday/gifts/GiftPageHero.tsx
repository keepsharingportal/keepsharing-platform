// GiftPageHero — magazine-style page hero for an age bucket guide.
// Bucket color drives the gradient; copy is intro + count + reading time.

import { Gift, ArrowLeft, Clock } from 'lucide-react'
import Link from 'next/link'
import type { AgeBucket } from '@/lib/birthday/gift-guides'

export function GiftPageHero({ bucket }: { bucket: AgeBucket }) {
  const minutes = Math.max(3, Math.ceil(bucket.ideas.length * 0.4))
  return (
    <header
      className="relative overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${bucket.color}26, ${bucket.color}14 60%, transparent)` }}
    >
      <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full opacity-20"
        style={{ backgroundColor: bucket.color }} />
      <div className="container py-12 md:py-16 relative">
        <Link href="/birthday-party-guide/gifts"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 mb-4">
          <ArrowLeft size={12} /> All gift guides
        </Link>

        <div className="flex flex-col md:flex-row md:items-end gap-6 md:gap-8">
          <div
            className="w-20 h-20 md:w-24 md:h-24 rounded-3xl flex items-center justify-center shrink-0 shadow-lg"
            style={{ backgroundColor: bucket.color }}
          >
            <Gift size={36} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-2" style={{ color: bucket.color }}>
              Ages {bucket.range} · {bucket.label}
            </p>
            <h1 className="text-3xl md:text-5xl font-black text-slate-900 leading-[1.1] mb-3">
              {bucket.ideas.length} birthday gifts River Region parents stand behind
            </h1>
            <p className="text-base md:text-lg text-slate-700 max-w-3xl leading-relaxed">
              {bucket.intro}
            </p>
            <div className="mt-4 flex items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5 font-semibold">
                <Clock size={12} /> {minutes}-min read
              </span>
              <span className="text-slate-300">·</span>
              <span className="font-semibold">Editor-curated, not sponsored</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
