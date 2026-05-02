import { Card, CardContent } from '@/components/ui/card'
import type { ListingSection } from './types'

export function WhatsDifferentSection({ section }: { section: ListingSection }) {
  const bullets = section.bullet_points ?? []
  if (!section.headline && bullets.length === 0) return null
  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        {section.headline && (
          <h3 className="text-xl font-bold text-foreground mb-4">{section.headline}</h3>
        )}
        {section.subheadline && (
          <p className="text-muted-foreground mb-4">{section.subheadline}</p>
        )}
        {bullets.length > 0 && (
          <ul className="space-y-3">
            {bullets.map((pt, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                  <span className="text-primary text-xs font-bold">✓</span>
                </span>
                <span className="text-muted-foreground leading-relaxed">{pt}</span>
              </li>
            ))}
          </ul>
        )}
        {section.body_content && (
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line mt-4">
            {section.body_content}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
