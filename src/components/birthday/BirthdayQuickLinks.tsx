// Quick-action tiles row right after the hero. Lets a mom jump
// straight to the search/finder/deals/sponsor flows without
// scrolling the whole portal.

import Link from 'next/link'
import { Search, Tag, ClipboardCheck, Camera, ArrowRight } from 'lucide-react'

const LINKS = [
  { href: '/birthday-party-guide/finder',     icon: Search,         label: 'Party Finder',   sub: 'Filter 89 vendors' },
  { href: '/birthday-party-guide/deals',      icon: Tag,            label: 'Birthday Deals', sub: 'Limited-time offers' },
  { href: '#timeline',                        icon: ClipboardCheck, label: 'Planning Timeline', sub: 'Free PDF checklist' },
  { href: '/birthday-party-guide/share-yours', icon: Camera,         label: 'Share Your Party',  sub: 'Photos + tips' },
]

export function BirthdayQuickLinks() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {LINKS.map(l => {
        const Icon = l.icon
        return (
          <Link key={l.href} href={l.href}
            className="bg-white rounded-xl border border-black/5 shadow-sm p-3 sm:p-4 flex items-center gap-3 hover:shadow-md hover:border-[#ff7a59]/40 transition-all group">
            <div className="w-9 h-9 rounded-lg bg-[#fff0eb] text-[#ff7a59] flex items-center justify-center shrink-0">
              <Icon size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] sm:text-[13px] font-bold text-slate-900 leading-tight group-hover:text-[#ff7a59] truncate">{l.label}</div>
              <div className="text-[10px] sm:text-[11px] text-slate-500 truncate">{l.sub}</div>
            </div>
            <ArrowRight size={12} className="text-slate-300 group-hover:text-[#ff7a59] shrink-0" />
          </Link>
        )
      })}
    </div>
  )
}
