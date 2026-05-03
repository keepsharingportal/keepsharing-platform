'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Share2, Link as LinkIcon, Bookmark } from 'lucide-react'
import { useState } from 'react'

interface Props {
  authorName: string
  authorRole?: string
  authorAvatarUrl?: string | null
  shareUrl: string
}

export function ArticleAuthorBlock({ authorName, authorRole, authorAvatarUrl, shareUrl }: Props) {
  const [copied, setCopied] = useState(false)

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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-8 border-b border-border/60">
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
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon" className="rounded-full bg-background" asChild>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share on Facebook"
          >
            <Share2 className="h-4 w-4" />
          </a>
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
        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-primary" aria-label="Bookmark">
          <Bookmark className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
