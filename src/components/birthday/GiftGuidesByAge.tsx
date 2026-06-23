// Gift Guides by Age — 5 age-bucket cards. Each card teases a
// curated guide of 15 gift ideas at /birthday-party-guide/gifts/[slug].
// Data lives in lib/birthday/gift-guides so the portal card and the
// full guide page always agree.

import Link from 'next/link'
import { SectionHeader } from './BudgetTiers'
import { Gift, ArrowRight } from 'lucide-react'
import { AGE_BUCKETS } from '@/lib/birthday/gift-guides'

export function GiftGuidesByAge() {
  return (
    <div>
      <SectionHeader
        eyebrow="Gift inspiration"
        title="Gift guides by age"
        kicker="Picked by River Region moms — gifts kids actually use, not just unwrap. 15 picks per age."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {AGE_BUCKETS.map(b => (
          <Link
            key={b.slug}
            href={`/birthday-party-guide/gifts/${b.slug}`}
            className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
          >
            <div
              className="aspect-square flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${b.color}1a, ${b.color}33)` }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: b.color }}
              >
                <Gift size={26} className="text-white" />
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: b.color }}>
                Ages {b.range}
              </div>
              <div className="text-[14px] font-bold text-slate-900 mt-0.5">{b.label}</div>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">{b.pitch}</p>
              <div className="text-[10px] font-bold mt-2 inline-flex items-center gap-0.5 group-hover:gap-1 transition-all" style={{ color: b.color }}>
                {b.ideas.length} picks <ArrowRight size={10} />
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Link
        href="/birthday-party-guide/gifts"
        className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#ff7a59] hover:underline"
      >
        All gift guides <ArrowRight size={12} />
      </Link>
    </div>
  )
}
