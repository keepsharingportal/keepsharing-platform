// Party Hours — day-by-day open/close grid.
// Expected items shape: { day, open?, close?, closed?: boolean }

import { Clock } from 'lucide-react'
import type { ListingSection } from './types'

interface HourRow {
  day?:    string
  open?:   string
  close?:  string
  closed?: boolean
  note?:   string
}

export function PartyHoursSection({ section }: { section: ListingSection }) {
  const items = (section.items ?? []) as HourRow[]
  if (items.length === 0) return null
  const title = section.headline || 'Party Hours'

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      </div>
      {section.subheadline && (
        <p className="text-muted-foreground text-sm leading-relaxed">{section.subheadline}</p>
      )}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden">
        {items.map((row, i) => {
          const display = row.closed
            ? 'Closed'
            : row.open && row.close
              ? `${row.open} – ${row.close}`
              : row.open || '—'
          return (
            <div key={i}
              className={`flex items-center justify-between px-5 py-3 text-sm ${
                i < items.length - 1 ? 'border-b border-border/40' : ''
              }`}
            >
              <span className="font-semibold text-foreground capitalize">{row.day ?? '—'}</span>
              <span className={`tabular-nums ${row.closed ? 'text-muted-foreground italic' : 'font-bold text-foreground'}`}>
                {display}
              </span>
            </div>
          )
        })}
      </div>
      {section.body_content && (
        <p className="text-xs text-muted-foreground leading-relaxed">{section.body_content}</p>
      )}
    </section>
  )
}
