// Seasonal Summer Fun homepage block.
// Server component. Queries live camp/activity counts. Always shows category tiles.

import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@supabase/supabase-js'
import { Sun, ArrowRight, Calendar } from 'lucide-react'

const HERO_PHOTO = 'https://images.unsplash.com/photo-1527090526205-beaac8dc3c62?w=1400&q=80&auto=format&fit=crop'

const SUMMER_TILES = [
  { label: 'Summer Camps',    href: '/summer-camp-guide',           emoji: '⛺', hue: 'bg-orange-50  border-orange-200  hover:bg-orange-100  text-orange-700'  },
  { label: 'Splash Pads',     href: '/summer-fun-guide#splash-pads',emoji: '💦', hue: 'bg-blue-50    border-blue-200    hover:bg-blue-100    text-blue-700'    },
  { label: 'Day Trips',       href: '/summer-fun-guide#day-trips',  emoji: '🚗', hue: 'bg-green-50   border-green-200   hover:bg-green-100   text-green-700'   },
  { label: 'Free Activities', href: '/summer-fun-guide#free',       emoji: '🎉', hue: 'bg-purple-50  border-purple-200  hover:bg-purple-100  text-purple-700'  },
  { label: 'Pools & Swim',    href: '/summer-fun-guide#pools',      emoji: '🏊', hue: 'bg-cyan-50    border-cyan-200    hover:bg-cyan-100    text-cyan-700'    },
  { label: 'Bucket List',     href: '/summer-fun-guide',            emoji: '📋', hue: 'bg-yellow-50  border-yellow-200  hover:bg-yellow-100  text-yellow-700'  },
]

async function getSummerCounts(): Promise<{ camps: number; listings: number }> {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    )
    const [campsRes, sfgRes] = await Promise.all([
      supabase.from('guide_listings').select('id', { count: 'exact', head: true }).eq('guide_type_slug', 'summer-camp-guide'),
      supabase.from('guide_listings').select('id', { count: 'exact', head: true }).eq('guide_type_slug', 'summer-fun-guide'),
    ])
    return { camps: campsRes.count ?? 0, listings: sfgRes.count ?? 0 }
  } catch {
    return { camps: 0, listings: 0 }
  }
}

export async function SummerFunBlock() {
  const { camps, listings } = await getSummerCounts()
  const hasData = camps > 0 || listings > 0

  const subline = hasData
    ? [
        camps    > 0 ? `${camps}+ summer camps`   : '',
        listings > 0 ? `${listings}+ activities`  : '',
      ].filter(Boolean).join(' · ') + ' for River Region families'
    : 'Camps, splash pads, day trips, and free activities for River Region families'

  return (
    <section className="relative rounded-3xl overflow-hidden">
      {/* Photo background */}
      <div className="absolute inset-0">
        <Image src={HERO_PHOTO} alt="Summer fun" fill style={{ objectFit: 'cover', objectPosition: 'center 40%' }} sizes="100vw" unoptimized />
        <div className="absolute inset-0 bg-gradient-to-br from-amber-950/75 via-orange-900/60 to-amber-800/50" />
      </div>

      <div className="relative p-6 md:p-8 lg:p-10 z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sun className="h-4 w-4 text-amber-300" />
              <span className="text-xs font-bold uppercase tracking-widest text-amber-300">Summer 2026</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-black text-white leading-tight">Summer Fun Guide</h2>
            <p className="text-sm text-white/75 mt-1.5 max-w-lg">{subline}</p>
          </div>
          <Link
            href="/summer-fun-guide"
            className="shrink-0 flex items-center gap-1.5 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-amber-950 text-sm font-bold rounded-full transition-colors whitespace-nowrap shadow-sm"
          >
            View All <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Category tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {SUMMER_TILES.map(tile => (
            <Link
              key={tile.label}
              href={tile.href}
              className={`flex flex-col items-center gap-1.5 px-3 py-3 rounded-2xl border bg-white/90 backdrop-blur-sm ${tile.hue} transition-all hover:shadow-md hover:scale-[1.02] text-center`}
            >
              <span className="text-2xl">{tile.emoji}</span>
              <span className="text-xs font-bold leading-tight">{tile.label}</span>
            </Link>
          ))}
        </div>

        {/* Bottom CTA row */}
        <div className="mt-5 flex flex-wrap items-center gap-4">
          <Link href="/summer-camp-guide" className="flex items-center gap-1.5 text-sm font-semibold text-amber-200 hover:text-white transition-colors">
            Browse Summer Camps <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <span className="text-white/20">·</span>
          <Link href="/calendar" className="flex items-center gap-1.5 text-sm font-semibold text-amber-200 hover:text-white transition-colors">
            <Calendar className="h-3.5 w-3.5" /> Summer Events Calendar
          </Link>
          <span className="text-white/20">·</span>
          <Link href="/summer-fun-guide#splash-pads" className="text-sm font-semibold text-amber-200 hover:text-white transition-colors">
            Splash Pads Near You →
          </Link>
        </div>
      </div>
    </section>
  )
}
