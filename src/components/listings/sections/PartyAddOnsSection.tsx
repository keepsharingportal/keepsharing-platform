// Party Add-Ons — optional extras a parent can tack onto a package.
// Expected items shape: { name, price?, note? }

import { Plus } from 'lucide-react'
import type { ListingSection } from './types'

interface AddOn {
  name?:  string
  price?: string
  note?:  string
}

export function PartyAddOnsSection({ section }: { section: ListingSection }) {
  const items = (section.items ?? []) as AddOn[]
  if (items.length === 0) return null
  const title = section.headline || 'Add-On Options'

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <Plus className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      </div>
      {section.subheadline && (
        <p className="text-muted-foreground text-sm leading-relaxed">{section.subheadline}</p>
      )}
      <div className="rounded-2xl border border-border/60 bg-card divide-y divide-border/40">
        {items.map((a, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <div className="font-semibold text-foreground text-sm">{a.name ?? '—'}</div>
              {a.note && <div className="text-xs text-muted-foreground mt-0.5">{a.note}</div>}
            </div>
            {a.price && <div className="text-sm font-bold text-primary tabular-nums shrink-0">{a.price}</div>}
          </div>
        ))}
      </div>
    </section>
  )
}
