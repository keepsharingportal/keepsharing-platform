import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tag } from 'lucide-react'
import type { ListingSection } from './types'

export function SpecialOfferSection({ section }: { section: ListingSection }) {
  if (!section.offer_text) return null
  return (
    <Card className="border-accent/40 bg-accent/5 overflow-hidden">
      <CardContent className="p-6 md:p-8">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="h-4 w-4 text-accent" />
          <p className="text-xs font-bold uppercase tracking-wider text-accent">Special Offer</p>
        </div>
        {section.headline && (
          <h3 className="text-xl font-bold text-foreground mb-2">{section.headline}</h3>
        )}
        <p className="text-muted-foreground leading-relaxed mb-4">{section.offer_text}</p>
        {section.offer_expiration && (
          <p className="text-xs text-muted-foreground mb-3">
            Expires: {section.offer_expiration}
          </p>
        )}
        {section.offer_cta_label && section.offer_cta_url && (
          <Button asChild className="rounded-full">
            <a href={section.offer_cta_url} target="_blank" rel="noopener noreferrer">
              {section.offer_cta_label}
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
