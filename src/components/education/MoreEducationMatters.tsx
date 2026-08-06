// Sidebar module — cross-links to the LATEST article from each of the
// other three Education Matters districts. Renders on every Education
// Matters article page as a "peer district" jump-off. If a district has
// no articles yet, that row still shows so the layout stays even and
// readers know the other districts are part of the same series.

import Link from 'next/link'
import { ShieldCheck, ArrowRight } from 'lucide-react'

import { EDUCATION_DISTRICTS, districtColumnUrl, type DistrictConfig } from '@/lib/education-matters/districts'

export interface DistrictSeriesItem {
  slug:  string    // district column_slug
  href:  string    // link target for that row
  label: string    // "Read latest message" / "No message yet"
}

interface Props {
  /** Current article's district slug — that row is skipped since the
   *  reader is already on it. */
  activeSlug:  string
  items:       DistrictSeriesItem[]
}

export function MoreEducationMatters({ activeSlug, items }: Props) {
  const byslug = new Map(items.map(i => [i.slug, i]))
  const districts = EDUCATION_DISTRICTS.filter(d => d.slug !== activeSlug)

  return (
    <aside className="rounded-2xl border border-[#D8E5E5] bg-white p-4 shadow-[0_8px_24px_rgba(8,38,74,0.06)]">
      <p className="mb-3 text-[11px] font-black uppercase tracking-[0.16em] text-[#138F8F]">
        More Education Matters
      </p>
      <ul className="space-y-2.5">
        {districts.map(d => {
          const item = byslug.get(d.slug)
          const href = item?.href ?? districtColumnUrl(d)
          const label = item?.label ?? 'View all messages'
          return <DistrictRow key={d.slug} district={d} href={href} label={label} />
        })}
      </ul>
      <div className="mt-4 border-t border-[#EEF2F5] pt-3">
        <Link
          href="/columns/education-matters"
          className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-[#138F8F] hover:text-[#0F7373]"
        >
          View all Education Matters
          <ArrowRight className="h-3 w-3" strokeWidth={2.4} />
        </Link>
      </div>
    </aside>
  )
}

function DistrictRow({ district, href, label }: { district: DistrictConfig; href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group flex items-center gap-3 rounded-lg p-2 transition hover:bg-[#F8FAFC]"
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white"
          style={{ backgroundColor: district.accent }}
        >
          <ShieldCheck className="h-4 w-4" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold leading-tight text-[#08264A] truncate">
            {district.fullName}
          </p>
          <p className="text-[11px] text-slate-500 leading-tight mt-0.5">{label}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-[#138F8F] group-hover:translate-x-0.5 transition" strokeWidth={2.3} />
      </Link>
    </li>
  )
}
