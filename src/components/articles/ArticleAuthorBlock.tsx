'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Link as LinkIcon, Bookmark, BookOpen } from 'lucide-react'
import { useState } from 'react'

interface Props {
  authorName: string
  authorRole?: string
  authorAvatarUrl?: string | null
  shareUrl: string
}

const PUBLICATION_NAMES = ['River Region Parents', 'RRP Editorial', 'Editorial']

export function ArticleAuthorBlock({ authorName, authorRole, authorAvatarUrl, shareUrl }: Props) {
  const [copied, setCopied] = useState(false)
  const isPublication = PUBLICATION_NAMES.includes(authorName)

  const initials = authorName
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-6 border-b border-border/60">
      <div className="flex items-center gap-3">
        {isPublication ? (
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary/20">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-0.5">
                {authorRole === 'Mom to Mom' ? 'Interview by' : 'By'}
              </p>
              <p className="font-semibold text-foreground">{authorName}</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border-2 border-primary/20">
              {authorAvatarUrl ? <AvatarImage src={authorAvatarUrl} alt={authorName} /> : null}
              <AvatarFallback>{initials || 'RR'}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground">{authorName}</p>
              {authorRole && <p className="text-sm text-muted-foreground">{authorRole}</p>}
            </div>
          </div>
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

        <div className="w-px h-6 bg-border mx-2" />

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