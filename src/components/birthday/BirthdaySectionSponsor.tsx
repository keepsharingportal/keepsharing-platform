// Top section sponsor banner. When live, renders the advertiser's
// pitch. When empty, renders an inline "claim this spot" prompt that
// reinforces the sidebar sponsor offer.

import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'

interface SponsorRow {
  id:             string
  ad_headline?:   string | null
  ad_description?: string | null
  ad_link?:       string | null
  ad_image_url?:  string | null
  advertiser?:    { business_name?: string | null; slug?: string | null } | null
}

export function BirthdaySectionSponsor({ sponsor }: { sponsor: Record<string, unknown> | null }) {
  if (sponsor) {
    const s = sponsor as unknown as SponsorRow
    return (
      <Link
        href={s.ad_link ?? `/partners/${s.advertiser?.slug ?? ''}`}
        className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-center gap-4 hover:from-amber-100 hover:to-orange-100 transition-colors block"
      >
        {s.ad_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={s.ad_image_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-white shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-amber-700">Sponsored</div>
          <div className="text-[14px] font-bold text-slate-900">{s.ad_headline}</div>
          {s.ad_description && <div className="text-[12px] text-slate-700 mt-0.5 line-clamp-1">{s.ad_description}</div>}
        </div>
        <ArrowRight size={16} className="text-amber-700 shrink-0" />
      </Link>
    )
  }

  return (
    <div className="bg-gradient-to-r from-[#fff0eb] to-[#ffe6dd] border border-[#ff7a59]/20 rounded-2xl p-4 sm:p-5 flex items-center gap-3 flex-wrap">
      <div className="w-10 h-10 rounded-xl bg-white text-[#ff7a59] flex items-center justify-center shrink-0">
        <Sparkles size={18} />
      </div>
      <div className="flex-1 min-w-[200px]">
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#ff7a59]">Exclusive sponsorship available · 1 spot</div>
        <div className="text-[14px] font-bold text-slate-900">Be the sponsor of every River Region birthday plan</div>
      </div>
      <Link
        href="/advertise?placement=birthday-bash"
        className="px-4 py-2 text-[12px] font-bold text-white bg-[#ff7a59] rounded-lg hover:opacity-90"
      >
        Claim this spot →
      </Link>
    </div>
  )
}
