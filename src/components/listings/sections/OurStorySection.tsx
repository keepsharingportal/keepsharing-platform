import { Card, CardContent } from '@/components/ui/card'
import type { ListingSection } from './types'

export function OurStorySection({ section }: { section: ListingSection }) {
  if (!section.headline && !section.body_content) return null
  return (
    <Card>
      <CardContent className="p-6 md:p-8">
        {section.headline && (
          <h3 className="text-xl font-bold text-foreground mb-3">{section.headline}</h3>
        )}
        {section.subheadline && (
          <p className="text-muted-foreground font-medium mb-3">{section.subheadline}</p>
        )}
        {section.body_content && (
          <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
            {section.body_content}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
