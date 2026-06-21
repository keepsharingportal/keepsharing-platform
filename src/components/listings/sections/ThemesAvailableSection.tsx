// Themes Available — chip grid of party themes the vendor supports.
// Reads bullet_points; each is rendered as a card.

import { Sparkles } from 'lucide-react'
import type { ListingSection } from './types'

export function ThemesAvailableSection({ section }: { section: ListingSection }) {
  const themes = section.bullet_points ?? []
  if (themes.length === 0) return null
  const title = section.headline || 'Themes Available'

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      </div>
      {section.subheadline && (
        <p className="text-muted-foreground text-sm leading-relaxed">{section.subheadline}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
        {themes.map((theme, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/60 bg-card px-4 py-3 text-center text-sm font-semibold text-foreground hover:border-primary/40 transition-colors"
          >
            {theme}
          </div>
        ))}
      </div>
    </section>
  )
}
