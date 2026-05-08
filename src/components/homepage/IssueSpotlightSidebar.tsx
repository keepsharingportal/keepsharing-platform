import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen } from 'lucide-react'

interface Props {
  coverImageUrl: string
  issueLabel: string
  issueTagline: string
  issuuUrl: string
}

export function IssueSpotlightSidebar({ coverImageUrl, issueLabel, issueTagline, issuuUrl }: Props) {
  return (
    <Card className="overflow-hidden border-border shadow-sm">
      {/* Cover image with padding around it */}
      <div className="p-5 pb-0">
        <div className="relative aspect-[3/4] bg-muted rounded-xl overflow-hidden">
          <Image
            src={coverImageUrl}
            alt={`${issueLabel} cover`}
            fill
            style={{ objectFit: 'cover' }}
            sizes="(max-width: 1024px) 100vw, 280px"
            unoptimized
          />
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
            This Month&apos;s Issue
          </span>
        </div>
        <h3 className="text-base font-bold text-foreground leading-tight mb-2">
          {issueTagline}
        </h3>
        <p className="text-xs text-muted-foreground leading-relaxed mb-4">
          Read every story, photo, and advertiser in the digital edition.
        </p>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="w-full rounded-full bg-white hover:bg-muted/50 border-border"
        >
          <a href={issuuUrl} target="_blank" rel="noopener noreferrer">
            Read Digital Edition
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}