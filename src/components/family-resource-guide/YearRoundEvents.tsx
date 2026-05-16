// YearRoundEvents — the seasonal rhythm of River Region family life.
// Hand-curated for SEO ("things to do in Montgomery in October") and for
// new families who want to know what to look forward to.

import Link from 'next/link'
import { ArrowRight, Sun } from 'lucide-react'
import { SectionHeader } from '@/components/theme'
import { Button } from '@/components/ui/button'

interface SeasonBlock {
  label:     string
  accent:    string
  highlights: string[]
}

const SEASONS: SeasonBlock[] = [
  {
    label:  'SPRING',
    accent: 'bg-green-50 border-green-200 text-green-900',
    highlights: [
      'Wetumpka Jubilee Fest',
      'Montgomery School Choice Fair',
      'Easter egg hunts (all 5 towns)',
      'Spring break day camps',
      'Earth Day at the Nature Center',
    ],
  },
  {
    label:  'SUMMER',
    accent: 'bg-amber-50 border-amber-200 text-amber-900',
    highlights: [
      'Splash pads open',
      'Summer camps (June–Aug)',
      'MMFA outdoor concerts',
      'Library reading programs',
      'July 4th fireworks',
    ],
  },
  {
    label:  'FALL',
    accent: 'bg-orange-50 border-orange-200 text-orange-900',
    highlights: [
      'School open houses',
      'Friday night football',
      'Fall festivals + pumpkin patches',
      'Wetumpka Antique Festival',
      'Halloween events',
    ],
  },
  {
    label:  'WINTER',
    accent: 'bg-blue-50 border-blue-200 text-blue-900',
    highlights: [
      'Holiday parades (Mont., Prattville, Pratt.)',
      'Tree lightings + Christmas markets',
      'Polar Express train rides',
      'Family New Year events',
      'Mardi Gras (late winter)',
    ],
  },
]

export function YearRoundEvents() {
  return (
    <section id="seasons" className="scroll-mt-24">
      <SectionHeader
        title="What to Look Forward To"
        icon={Sun}
        iconColor="primary"
        action={
          <Button asChild variant="ghost" size="sm" className="hidden sm:flex">
            <Link href="/calendar">Live Calendar</Link>
          </Button>
        }
      />
      <p className="text-sm text-muted-foreground -mt-3 mb-5">River Region family life by the season.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {SEASONS.map(s => (
          <div key={s.label} className={`rounded-2xl border p-4 ${s.accent}`}>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] mb-3">{s.label}</p>
            <ul className="space-y-1.5">
              {s.highlights.map(h => (
                <li key={h} className="text-xs leading-relaxed flex gap-1.5">
                  <span className="opacity-60 shrink-0">•</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground mt-3 inline-flex items-center gap-1">
        <ArrowRight className="h-3 w-3" />
        Want something added? Submit an event — we curate these quarterly.
      </p>
    </section>
  )
}
