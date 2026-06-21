// Best For — badge row indicating who/what the vendor is best suited
// for ("Active kids", "Princess parties", "Quiet venues", etc.).
// Reads bullet_points.

import { Heart } from 'lucide-react'
import type { ListingSection } from './types'

export function BestForSection({ section }: { section: ListingSection }) {
  const bits = section.bullet_points ?? []
  if (bits.length === 0) return null
  const title = section.headline || 'Best For'

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <Heart className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      </div>
      {section.subheadline && (
        <p className="text-muted-foreground text-sm leading-relaxed">{section.subheadline}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {bits.map((bit, i) => (
          <span
            key={i}
            className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold bg-primary/10 text-primary border border-primary/20"
          >
            {bit}
          </span>
        ))}
      </div>
    </section>
  )
}
