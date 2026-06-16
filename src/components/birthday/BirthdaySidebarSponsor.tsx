// Sidebar sponsor slot. When no advertiser has booked, renders the
// "Claim This Spot" CTA. When booked (Phase 2), pulls from
// ad_placements with placement_context = 'birthday-sidebar'.

import Link from 'next/link'
import { Crown, ArrowRight } from 'lucide-react'

export function BirthdaySidebarSponsor({ brand }: { brand: string }) {
  // Placeholder version — sponsor sold flips this to a live advertiser
  // card. The TODO is wiring the ad_placements query into the page
  // loader so this component just receives a row.
  return (
    <div className="bg-slate-900 text-white rounded-2xl overflow-hidden">
      <div className="px-4 py-2 bg-amber-500/20 border-b border-amber-400/30 text-[10px] font-bold uppercase tracking-wider text-amber-200 inline-flex items-center gap-1">
        <Crown size={11} /> Spot available
      </div>
      <div className="p-5">
        <h3 className="text-[16px] font-bold leading-tight">Own the Birthday Bash</h3>
        <p className="text-[12px] text-slate-300 mt-1 leading-relaxed">
          Be the sponsor every {brand} mom sees while planning. One sponsor per page, per year.
        </p>
        <ul className="mt-3 space-y-1.5 text-[11px] text-slate-300">
          <li className="flex items-start gap-1.5">
            <span className="text-[#ff7a59] mt-0.5">●</span>
            Sidebar logo + 3-line pitch on every page load
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-[#ff7a59] mt-0.5">●</span>
            Featured in monthly Birthday Insider email
          </li>
          <li className="flex items-start gap-1.5">
            <span className="text-[#ff7a59] mt-0.5">●</span>
            First spot in the &quot;Cakes&quot; and category pages of choice
          </li>
        </ul>
        <Link
          href="/advertise?placement=birthday-bash"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-bold text-slate-900 bg-[#ff7a59] hover:bg-[#ff6a44] rounded-lg w-full justify-center"
        >
          Claim this spot <ArrowRight size={11} />
        </Link>
      </div>
    </div>
  )
}
