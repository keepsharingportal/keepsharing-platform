import { Card, CardContent } from '@/components/ui/card'
import type { ListingSection } from './types'

export function FeaturesBulletsSection({ section }: { section: ListingSection }) {
  const bullets = section.bullet_points ?? []
  if (!section.headline && bullets.length === 0) return null
  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        {section.headline && (
          <h3 className="text-xl font-bold text-foreground mb-4">{section.headline}</h3>
        )}
        {bullets.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-3">
            {bullets.map((pt, i) => (
              <div key={i} className="flex items-start gap-2 bg-muted/50 rounded-xl p-3">
                <span className="text-primary font-bold text-sm mt-0.5 shrink-0">✦</span>
                <span className="text-sm text-muted-foreground leading-relaxed">{pt}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
