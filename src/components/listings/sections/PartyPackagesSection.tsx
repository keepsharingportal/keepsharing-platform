// Party Packages — list of bookable packages each with name, price,
// duration, and an "Includes:" bullet list. Used for birthday-party
// listings and any future guide that books packaged services.
//
// Expected items shape (each entry):
//   { name: string, price?: string, duration?: string, includes?: string[], note?: string }

import { Check, Star } from 'lucide-react'
import type { ListingSection } from './types'

interface Pkg {
  name?:     string
  price?:    string
  duration?: string
  includes?: string[]
  note?:     string
  featured?: boolean
}

export function PartyPackagesSection({ section }: { section: ListingSection }) {
  const items = (section.items ?? []) as Pkg[]
  if (items.length === 0) return null
  const title = section.headline || 'Party Packages'

  return (
    <section className="space-y-5">
      <h2 className="text-3xl font-bold text-foreground">{title}</h2>
      {section.subheadline && (
        <p className="text-muted-foreground text-base leading-relaxed">{section.subheadline}</p>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((p, i) => (
          <article
            key={i}
            className={`relative rounded-2xl border bg-card p-6 shadow-sm flex flex-col gap-4 ${
              p.featured ? 'border-accent/50 ring-1 ring-accent/20' : 'border-border/60'
            }`}
          >
            {p.featured && (
              <span className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-white bg-accent rounded-full">
                <Star size={9} className="fill-current" /> Most Popular
              </span>
            )}
            <header>
              <h3 className="text-lg font-bold text-foreground leading-tight">{p.name ?? 'Package'}</h3>
              <div className="flex items-baseline gap-2 mt-1">
                {p.price && (
                  <span className="text-2xl font-black text-primary">{p.price}</span>
                )}
                {p.duration && (
                  <span className="text-sm text-muted-foreground">· {p.duration}</span>
                )}
              </div>
            </header>
            {Array.isArray(p.includes) && p.includes.length > 0 && (
              <ul className="space-y-1.5">
                {p.includes.map((bit, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-foreground/85 leading-snug">
                    <Check size={14} className="text-primary shrink-0 mt-0.5" />
                    <span>{bit}</span>
                  </li>
                ))}
              </ul>
            )}
            {p.note && (
              <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">{p.note}</p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
