// Gift Guides by Age — 5 age-bucket cards linking to curated gift roundups.
// Affiliate revenue future-state lives here too.

import Link from 'next/link'
import { SectionHeader } from './BudgetTiers'
import { Gift, ArrowRight } from 'lucide-react'

const AGES = [
  { range: '1-2',   label: 'Toddler',     color: '#60a5fa', pitch: 'First-birthday must-haves and toys that grow with them' },
  { range: '3-4',   label: 'Preschool',   color: '#34d399', pitch: 'Imagination toys, building sets, and sensory wins' },
  { range: '5-7',   label: 'Early Elem.', color: '#a78bfa', pitch: 'Big-kid finds that don\'t bust the present budget' },
  { range: '8-10',  label: 'Big Kids',    color: '#fb923c', pitch: 'STEM kits, sports gear, and screen-free fun' },
  { range: '11-13', label: 'Tweens',      color: '#f472b6', pitch: 'Gifts that feel grown-up without crossing teen-only lines' },
]

export function GiftGuidesByAge() {
  return (
    <div>
      <SectionHeader
        eyebrow="Gift inspiration"
        title="Gift guides by age"
        kicker="Picked by River Region moms — gifts kids actually use, not just unwrap."
      />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {AGES.map(a => (
          <Link
            key={a.range}
            href={`/birthday-party-guide/gifts?ages=${a.range}`}
            className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden hover:shadow-md transition-shadow group"
          >
            <div
              className="aspect-square flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${a.color}1a, ${a.color}33)` }}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: a.color }}
              >
                <Gift size={26} className="text-white" />
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="text-[12px] font-bold uppercase tracking-wider" style={{ color: a.color }}>
                Ages {a.range}
              </div>
              <div className="text-[14px] font-bold text-slate-900 mt-0.5">{a.label}</div>
              <p className="text-[11px] text-slate-600 mt-1 leading-snug">{a.pitch}</p>
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
