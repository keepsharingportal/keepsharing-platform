// Booking & Policies — deposit, lead time, cancellation terms.
// Pure body-content section with an info-card treatment.

import { Info } from 'lucide-react'
import type { ListingSection } from './types'

export function BookingNotesSection({ section }: { section: ListingSection }) {
  const body  = section.body_content
  const bits  = section.bullet_points ?? []
  if (!body && bits.length === 0) return null
  const title = section.headline || 'Booking & Policies'

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Info className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      </div>
      <div className="rounded-2xl border border-border/60 bg-muted/30 p-5 space-y-3">
        {body && (
          <p className="text-foreground/85 text-sm leading-relaxed whitespace-pre-wrap">{body}</p>
        )}
        {bits.length > 0 && (
          <ul className="space-y-1.5">
            {bits.map((bit, i) => (
              <li key={i} className="text-sm text-foreground/85 flex items-start gap-2 leading-snug">
                <span className="text-primary mt-0.5">•</span>
                <span>{bit}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
