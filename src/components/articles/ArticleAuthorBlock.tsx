'use client'

import { Button } from '@/components/ui/button'
import { CalendarDays, Clock, Link as LinkIcon, Bookmark, User } from 'lucide-react'
import { useState } from 'react'

interface Props {
  authorName?:     string | null
  publishedDate?:  string
  readTimeMinutes?: number
  shareUrl:        string
}

// Renders a single horizontal "meta row" that sits between the article title
// and the hero image: date · read time · author on the left, share/bookmark
// buttons on the right. Replaces the older avatar-style author block.
export function ArticleAuthorBlock({ authorName, publishedDate, readTimeMinutes, shareUrl }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-border/40">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
        {publishedDate && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            <span>{publishedDate}</span>
          </span>
        )}
        {publishedDate && readTimeMinutes !== undefined && <span className="text-muted-foreground/40">·</span>}
        {readTimeMinutes !== undefined && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            <span>{readTimeMinutes} min read</span>
          </span>
        )}
        {(publishedDate || readTimeMinutes !== undefined) && authorName && <span className="text-muted-foreground/40">·</span>}
        {authorName && (
          <span className="inline-flex items-center gap-1.5">
            <User className="h-4 w-4" />
            <span>by <span className="text-foreground font-semibold">{authorName}</span></span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-background"
          onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer')}
          aria-label="Share on Facebook"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
          </svg>
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-background"
          onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer')}
          aria-label="Share on Twitter"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </Button>

        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-background"
          onClick={handleCopy}
          aria-label={copied ? 'Link copied!' : 'Copy link'}
          title={copied ? 'Copied!' : 'Copy link'}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-6 bg-border mx-1" />

        <Button
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground hover:text-primary"
          aria-label="Bookmark"
        >
          <Bookmark className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
