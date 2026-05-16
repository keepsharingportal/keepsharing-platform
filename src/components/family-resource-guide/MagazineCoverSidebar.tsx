// MagazineCoverSidebar — sidebar-shaped version of the print-edition
// spotlight, matching the home page's IssueSpotlightSidebar treatment:
// 3:4 cover image on top with badge overlay, then label + tagline +
// Read Digital Edition button. Renders null if no cover and no Issuu
// URL — the spot just disappears until the admin uploads either.

import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Newspaper } from 'lucide-react'

interface Props {
  printCoverUrl: string | null
  issuuUrl:      string | null
  issueLabel?:   string
  tagline?:      string
}

export function MagazineCoverSidebar({
  printCoverUrl,
  issuuUrl,
  issueLabel = 'Current Edition',
  tagline    = 'Read every story, photo, and advertiser in the digital edition.',
}: Props) {
  if (!printCoverUrl && !issuuUrl) return null

  return (
    <Card className="overflow-hidden border-border shadow-sm">
      <div className="p-5 pb-0">
        <div className="relative aspect-[3/4] bg-muted rounded-xl overflow-hidden">
          {printCoverUrl ? (
            <Image
              src={printCoverUrl}
              alt={`${issueLabel} cover`}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 1024px) 100vw, 280px"
              unoptimized
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/5">
              <Newspaper className="h-14 w-14 text-primary/30" />
            </div>
          )}
          <div className="absolute top-3 left-3">
            <Badge className="bg-primary text-primary-foreground shadow-sm">
              {issueLabel}
            </Badge>
          </div>
        </div>
      </div>

      <CardContent className="p-5 bg-card">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
            From the Magazine
          </span>
        </div>
        <h3 className="text-base font-bold text-foreground leading-tight mb-2">
          {tagline}
        </h3>
        {issuuUrl && (
          <Button asChild size="sm" variant="outline" className="w-full rounded-full bg-white hover:bg-muted/50 border-border">
            <a href={issuuUrl} target="_blank" rel="noopener noreferrer">
              Read Digital Edition
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
