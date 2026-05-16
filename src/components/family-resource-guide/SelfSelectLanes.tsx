// Three big cards immediately below the hero. Each one anchor-scrolls
// to its section further down the page — the "choose your own adventure"
// moment that lets a social-ad visitor self-select their intent.

import Link from 'next/link'
import { CalendarDays, Star, ListChecks, ArrowRight } from 'lucide-react'

interface LaneStat {
  count?: number
  label?: string
}

interface Props {
  bestOf?:   LaneStat
  services?: LaneStat
}

export function SelfSelectLanes({ bestOf, services }: Props) {
  const lanes = [
    {
      icon:    Star,
      eyebrow: 'CURATED LISTS',
      title:   'Best of the Region',
      copy:    'Parks, day trips, sweet treats, sports leagues — the lists moms actually share.',
      href:    '#best-of',
      stat:    bestOf?.count ? `${bestOf.count} lists` : 'New every month',
    },
    {
      icon:    CalendarDays,
      eyebrow: "WHAT'S HAPPENING",
      title:   'The Calendar',
      copy:    'Festivals, school events, classes, playdates — see what\'s on this week.',
      href:    '/calendar',
      stat:    'Updated daily',
    },
    {
      icon:    ListChecks,
      eyebrow: 'DIRECTORY',
      title:   'Find a Service',
      copy:    'Pediatricians, schools, dentists, counselors — search by category.',
      href:    '#directory',
      stat:    services?.count ? `${services.count.toLocaleString()} listings` : 'Filterable',
    },
  ]

  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {lanes.map(lane => {
        const Icon = lane.icon
        return (
          <Link
            key={lane.title}
            href={lane.href}
            className="group flex flex-col rounded-2xl border border-border/50 bg-card p-6 hover:border-primary/30 hover:shadow-md transition-all"
          >
            <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
              {lane.eyebrow}
            </p>
            <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors mb-2">
              {lane.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">
              {lane.copy}
            </p>
            <div className="flex items-center justify-between text-xs pt-3 border-t border-border/30 mt-auto">
              <span className="text-muted-foreground">{lane.stat}</span>
              <span className="inline-flex items-center gap-1 font-bold text-primary group-hover:gap-1.5 transition-all">
                Explore <ArrowRight className="h-3.5 w-3.5" />
              </span>
            </div>
          </Link>
        )
      })}
    </section>
  )
}
