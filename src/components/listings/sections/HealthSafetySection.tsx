// Health & Safety — certifications, allergy accommodations, insurance,
// staff training. Body text on top, optional bullet list of specifics.

import { ShieldCheck } from 'lucide-react'
import type { ListingSection } from './types'

export function HealthSafetySection({ section }: { section: ListingSection }) {
  const body  = section.body_content
  const bits  = section.bullet_points ?? []
  if (!body && bits.length === 0) return null
  const title = section.headline || 'Health & Safety'

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-5 w-5 text-emerald-700" />
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      </div>
      {body && (
        <p className="text-muted-foreground text-base leading-relaxed">{body}</p>
      )}
      {bits.length > 0 && (
        <ul className="grid sm:grid-cols-2 gap-2">
          {bits.map((bit, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-foreground/90">
              <ShieldCheck size={14} className="text-emerald-700 shrink-0 mt-0.5" />
              <span>{bit}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
