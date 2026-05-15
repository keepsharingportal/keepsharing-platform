// Three big cards immediately below the hero. Each one anchor-scrolls
// to its section further down the page — the "choose your own adventure"
// moment that lets a social-ad visitor self-select their intent.

import Link from 'next/link'
import { MapPin, Star, ListChecks, ArrowRight } from 'lucide-react'

interface LaneStat {
  count?: number
  label?: string
}

interface Props {
  towns?:    LaneStat
  bestOf?:   LaneStat
  services?: LaneStat
}

export function SelfSelectLanes({ towns, bestOf, services }: Props) {
  const lanes = [
    {
      icon:    MapPin,
      eyebrow: 'COMMUNITIES',
      title:   'The 5 Towns',
      copy:    'Montgomery, Prattville, Wetumpka, Millbrook, Pike Road — find your fit.',
      href:    '#towns',
      stat:    towns?.count ? `${towns.count} towns` : '5 towns',
      accent:  'from-blue-50 via-white to-white border-blue-100 hover:border-blue-300',
      iconBg:  'bg-blue-100 text-blue-700',
    },
    {
      icon:    Star,
      eyebrow: 'CURATED LISTS',
      title:   'Best of the Region',
      copy:    'Parks, day trips, sweet treats, sports leagues — the lists moms actually share.',
      href:    '#best-of',
      stat:    bestOf?.count ? `${bestOf.count} lists` : 'New every month',
      accent:  'from-amber-50 via-white to-white border-amber-100 hover:border-amber-300',
      iconBg:  'bg-amber-100 text-amber-700',
    },
    {
      icon:    ListChecks,
      eyebrow: 'DIRECTORY',
      title:   'Find a Service',
      copy:    'Pediatricians, schools, dentists, counselors — filter by town and category.',
      href:    '#directory',
      stat:    services?.count ? `${services.count.toLocaleString()} listings` : 'Filterable',
      accent:  'from-rose-50 via-white to-white border-rose-100 hover:border-rose-300',
      iconBg:  'bg-rose-100 text-rose-700',
    },
  ]

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {lanes.map(lane => {
        const Icon = lane.icon
        return (
          <Link
            key={lane.title}
            href={lane.href}
            className={`group rounded-2xl border bg-gradient-to-br p-6 transition-all hover:shadow-md ${lane.accent}`}
          >
            <div className={`inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 ${lane.iconBg}`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500 mb-1">
              {lane.eyebrow}
            </p>
            <h3 className="text-xl font-bold text-gray-900 mb-2" style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)' }}>
              {lane.title}
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed mb-4">
              {lane.copy}
            </p>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">{lane.stat}</span>
              <span className="inline-flex items-center gap-1 font-bold text-gray-700 group-hover:gap-1.5 transition-all">
                Explore <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        )
      })}
    </section>
  )
}
