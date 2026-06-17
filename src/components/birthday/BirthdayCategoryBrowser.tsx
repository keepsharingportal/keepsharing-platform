// Birthday Category Browser — surfaces the 16-category vendor guide
// (89 listings) inside the portal layout. Top categories shown as
// big tiles; rest collapse under "all categories" link to the
// existing /birthday-party-guide?category=X filter route.

import Link from 'next/link'
import { SectionHeader } from './BudgetTiers'
import { ArrowRight, MapPin, Music, Cake, Sparkles, Trophy, Camera, Calendar, Gift } from 'lucide-react'

const CATEGORY_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  'Places to Party - Miscellaneous':            MapPin,
  'Places to Party - Cheer/Gymnastics/Dance':   Trophy,
  'Places to Party - Martial Arts':             Trophy,
  'Places to Party - Bowling':                  Trophy,
  'Places to Party - Skating':                  Trophy,
  'Places to Party - Outdoors':                 MapPin,
  'Places to Party - Parks':                    MapPin,
  'Places to Party - Restaurants':              Cake,
  'Places to Party - Artistic':                 Camera,
  'Entertainment':                              Music,
  'Cakes/Finger Foods':                         Cake,
  'Equipment/Games Rentals':                    Calendar,
  'Paper Goods/Decoration/Invitations':         Sparkles,
  'Printed Invitations':                        Sparkles,
  'Party Planners':                             Calendar,
  'Unique Gifts for Kids and Adults':           Gift,
}

export function BirthdayCategoryBrowser({ topCategories, totalListings }: {
  topCategories: Array<{ cat: string; count: number }>
  totalListings: number
}) {
  return (
    <div>
      <SectionHeader
        eyebrow="89 vendors"
        title="Browse the full birthday guide"
        kicker="Every vendor we list has been used by River Region families. Sponsored placement is editorially separate from the listings — paid badges call it out."
      />
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {topCategories.slice(0, 8).map(({ cat, count }) => {
          const Icon = CATEGORY_ICON[cat] ?? MapPin
          const short = cat.replace('Places to Party - ', '')
          return (
            <Link
              key={cat}
              href={`/birthday-party-guide?category=${encodeURIComponent(cat)}`}
              className="bg-white rounded-xl border border-black/5 shadow-sm p-4 hover:shadow-md hover:border-[#ff7a59]/30 transition-all group"
            >
              <div className="w-9 h-9 rounded-lg bg-[#fff0eb] text-[#ff7a59] flex items-center justify-center mb-2">
                <Icon size={16} />
              </div>
              <div className="text-[13px] font-bold text-slate-900 leading-snug group-hover:text-[#ff7a59] transition-colors">{short}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{count} {count === 1 ? 'listing' : 'listings'}</div>
            </Link>
          )
        })}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Link
          href="/birthday-party-guide/finder"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-bold text-white bg-[#ff7a59] rounded-lg hover:opacity-90"
        >
          Filter all {totalListings} vendors <ArrowRight size={12} />
        </Link>
        <Link
          href="/birthday-party-guide/deals"
          className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#ff7a59] hover:underline"
        >
          See current deals
        </Link>
      </div>
    </div>
  )
}
