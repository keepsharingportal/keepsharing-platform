// Birthday Map sidebar widget. v1 is a "coming soon" placeholder
// with a vendor count; full Google-Maps integration follows the
// existing GuideMapCard pattern in a Phase B sprint.

import Link from 'next/link'
import { MapPin } from 'lucide-react'

export function BirthdayMap() {
  return (
    <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
      <div className="aspect-square bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 relative flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-white shadow-md items-center justify-center text-emerald-600 mb-2">
            <MapPin size={22} />
          </div>
          <div className="text-[15px] font-bold text-slate-900">Birthday Map</div>
          <div className="text-[11px] text-slate-600 mt-0.5">All 89 vendors plotted</div>
        </div>
      </div>
      <div className="p-3 text-center">
        <Link
          href="/birthday-party-guide/map"
          className="text-[12px] font-bold text-emerald-700 hover:underline"
        >
          Open map view →
        </Link>
        <div className="text-[10px] text-slate-500 mt-1">Coming soon — filter by category, distance, and ages</div>
      </div>
    </div>
  )
}
