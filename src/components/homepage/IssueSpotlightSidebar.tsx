import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BookOpen } from 'lucide-react'

interface Props {
  coverImageUrl: string
  issueLabel:    string
  issueTagline:  string
  issuuUrl:      string
  /**
   * Optional Issuu embed URL (https://e.issuu.com/embed.html?d=…&u=…).
   * When provided, the cover thumbnail is replaced with an interactive
   * flipbook embed so readers can browse the issue inline. Falls back to
   * the static cover image when null/undefined.
   */
  embedUrl?:     string | null
}

export function IssueSpotlightSidebar({ coverImageUrl, issueLabel, issueTagline, issuuUrl, embedUrl }: Props) {
  return (
    <Card className="overflow-hidden border-border shadow-sm">
      {/* Visual area — interactive embed when we have an embed URL, otherwise
          the static cover. The embed uses Issuu's responsive padding-top
          pattern: 60% aspect ratio with a 326px minimum so the reader is
          legible even in a narrow sidebar. */}
      <div className="p-5 pb-0">
        {embedUrl ? (
          <div className="relative" style={{ paddingTop: 'max(60%, 326px)', height: 0, width: '100%' }}>
            <iframe
              title={`${issueLabel} digital edition`}
              src={embedUrl}
              loading="lazy"
              allow="clipboard-write; autoplay; encrypted-media; fullscreen; picture-in-picture"
              sandbox="allow-top-navigation allow-top-navigation-by-user-activation allow-downloads allow-scripts allow-same-origin allow-popups allow-modals allow-popups-to-escape-sandbox allow-forms"
              allowFullScreen
              className="absolute inset-0 w-full h-full rounded-xl bg-muted"
              style={{ border: 'none' }}
            />
            <div className="absolute top-3 left-3 z-10">
              <Badge className="bg-primary text-primary-foreground shadow-sm">
                {issueLabel}
              </Badge>
            </div>
          </div>
        ) : (
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
        )}
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
          {embedUrl
            ? 'Flip through the full digital edition above, or open it in a new tab.'
            : 'Read every story, photo, and advertiser in the digital edition.'}
        </p>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="w-full rounded-full bg-white hover:bg-muted/50 border-border"
        >
          <a href={issuuUrl} target="_blank" rel="noopener noreferrer">
            {embedUrl ? 'Open in New Tab' : 'Read Digital Edition'}
          </a>
        </Button>
      </CardContent>
    </Card>
  )
}
