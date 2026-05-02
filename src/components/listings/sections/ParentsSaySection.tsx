import { Card, CardContent } from '@/components/ui/card'
import type { ListingSection } from './types'

export function ParentsSaySection({ section }: { section: ListingSection }) {
  const testimonials = section.items ?? []
  if (!section.headline && testimonials.length === 0) return null
  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        {section.headline && (
          <h3 className="text-xl font-bold text-foreground mb-4">{section.headline}</h3>
        )}
        {testimonials.length > 0 && (
          <div className="space-y-4">
            {testimonials.map((t, i) => (
              <div key={i} className="relative bg-primary/5 border border-primary/10 rounded-2xl p-5">
                <span className="absolute top-3 left-4 text-4xl text-primary/20 font-serif leading-none select-none">
                  &ldquo;
                </span>
                {t.quote && (
                  <p className="text-muted-foreground leading-relaxed italic pt-4 pb-1">
                    {t.quote}
                  </p>
                )}
                {t.parent_name && (
                  <p className="text-sm font-semibold text-foreground mt-2">
                    — {t.parent_name}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
