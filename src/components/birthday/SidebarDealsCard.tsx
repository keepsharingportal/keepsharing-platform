// Sidebar deals card — shows up to 2 active deals + link to all.

import Link from 'next/link'
import { Tag, ArrowRight } from 'lucide-react'

interface Deal {
  id:            string
  business_name: string
  headline:      string
  offer:         string
  image_url:     string | null
  link_url:      string | null
}

export function SidebarDealsCard({ deals }: { deals: Array<Record<string, unknown>> }) {
  const items: Deal[] = deals.map(d => ({
    id:            d.id as string,
    business_name: d.business_name as string,
    headline:      d.headline as string,
    offer:         d.offer as string,
    image_url:     d.image_url as string | null,
    link_url:      d.link_url as string | null,
  }))
  if (items.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-amber-200 shadow-sm overflow-hidden">
      <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-[10px] font-bold uppercase tracking-wider text-amber-700 inline-flex items-center gap-1">
        <Tag size={11} /> Birthday deals
      </div>
      <div className="divide-y divide-slate-100">
        {items.map(d => (
          <a key={d.id} href={d.link_url ?? '/birthday-party-guide/deals'} target={d.link_url ? '_blank' : undefined} rel="noopener noreferrer"
            className="block p-3 hover:bg-amber-50/50 transition-colors">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700">{d.business_name}</div>
            <div className="text-[13px] font-bold text-slate-900 mt-0.5 leading-snug">{d.headline}</div>
            <p className="text-[11px] text-slate-600 mt-1 line-clamp-2">{d.offer}</p>
          </a>
        ))}
      </div>
      <Link href="/birthday-party-guide/deals" className="block px-4 py-2 text-[11px] font-bold text-amber-700 hover:bg-amber-50/50 border-t border-amber-100 text-center">
        See all deals <ArrowRight size={10} className="inline" />
      </Link>
    </div>
  )
}
