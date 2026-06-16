// Mom-to-Mom Tips — 3-card grid of short quoted advice. Sourced from
// birthday_mom_tips (editor-curated). Defaults render when empty so
// the section never blanks.

import { SectionHeader } from './BudgetTiers'
import { Quote, Send } from 'lucide-react'

const DEFAULTS = [
  { tip: 'Skip the party favors and do one nicer take-home gift instead. Moms thanked me — it was less landfill, less hassle.', mom_name: 'Sarah, Pike Road mom of 3', topic: 'goody-bags' },
  { tip: 'Order the cake on the smaller side. Kids never finish what\'s served. Save $20 and zero regret.', mom_name: 'Whitney, Wetumpka mom of 2', topic: 'budget' },
  { tip: 'Invite the WHOLE class if your kid is in K-2. Excluding one child is the kind of memory that lasts. The chaos is worth it.', mom_name: 'Erica, Montgomery mom of 4', topic: 'guest-list' },
]

interface Tip {
  tip:      string
  mom_name: string
  topic?:   string | null
}

export function MomToMomTips({ tips, brandSlug: _brandSlug }: { tips: Array<Record<string, unknown>>; brandSlug: string }) {
  const useTips: Tip[] = tips.length > 0
    ? tips.slice(0, 3).map(t => ({
        tip:      t.tip as string,
        mom_name: t.mom_name as string,
        topic:    t.topic as string | null,
      }))
    : DEFAULTS

  return (
    <div>
      <SectionHeader
        eyebrow="Wisdom"
        title="Mom-to-mom tips"
        kicker="The kind of advice you only get in the carpool line. From local moms who&apos;ve hosted the bash."
      />
      <div className="grid sm:grid-cols-3 gap-4">
        {useTips.map((t, i) => (
          <div key={i} className="bg-white rounded-2xl border border-black/5 shadow-sm p-5">
            <Quote size={18} className="text-[#ff7a59] mb-2" />
            <p className="text-[13px] text-slate-800 leading-relaxed">&ldquo;{t.tip}&rdquo;</p>
            <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] font-bold text-slate-600">
              — {t.mom_name}
            </div>
          </div>
        ))}
      </div>
      <a
        href="/birthday-party-guide/share-tip"
        className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-bold text-[#ff7a59] hover:underline"
      >
        <Send size={12} />
        Share your tip — we&apos;ll feature it
      </a>
    </div>
  )
}
