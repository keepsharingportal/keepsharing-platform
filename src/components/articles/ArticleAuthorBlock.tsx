'use client'

import { Button } from '@/components/ui/button'
import { CalendarDays, Clock, Link as LinkIcon, Bookmark, User } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import Link from 'next/link'
import { authorNameToSlug } from '@/lib/seo/author-slug'

interface Props {
  authorName?:     string | null
  publishedDate?:  string
  readTimeMinutes?: number
  shareUrl:        string
  /**
   * Optional slot for a per-article CTA — e.g. the NominateCTA pill on
   * community-spotlight articles. Renders inline between the meta info and
   * the share buttons on desktop; stacks full-width on mobile.
   */
  nominate?: ReactNode
}

// Renders a single horizontal "meta row" that sits between the article title
// and the hero image: date · read time · author on the left, share/bookmark
// buttons on the right. Replaces the older avatar-style author block.
export function ArticleAuthorBlock({ authorName, publishedDate, readTimeMinutes, shareUrl, nominate }: Props) {
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
    <div className="flex flex-wrap items-center gap-3 mb-5 pb-4 border-b border-border/40">
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
        {authorName && (() => {
          // Author name links to /authors/[slug] when we can derive a
          // slug from the name. This visible link mirrors the Person
          // @id reference in NewsArticle JSON-LD — crawlers follow the
          // structured @id, humans follow the link.
          const authorSlug = authorNameToSlug(authorName)
          const inner = <>by <span className="text-foreground font-semibold">{authorName}</span></>
          return (
            <span className="inline-flex items-center gap-1.5">
              <User className="h-4 w-4" />
              {authorSlug ? (
                <Link href={`/authors/${authorSlug}`} className="hover:text-foreground transition-colors">
                  {inner}
                </Link>
              ) : (
                <span>{inner}</span>
              )}
            </span>
          )
        })()}
      </div>

      {/* Nominate slot — placed in the middle/right of the meta row on
          desktop, full-width on its own row on mobile. Order: meta first,
          share buttons next-to-meta on mobile (with ml-auto), pill drops
          below as a full-width row. On desktop, pill sits between meta and
          share with sm:ml-auto pushing it to the right of meta. */}
      {nominate && (
        <div className="w-full sm:w-auto sm:ml-auto order-3 sm:order-2">
          {nominate}
        </div>
      )}

      <div className="flex items-center gap-1.5 sm:gap-2 ml-auto sm:ml-0 order-2 sm:order-3">
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
