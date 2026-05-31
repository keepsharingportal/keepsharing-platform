'use client'

// Minimal share-buttons row used on the Grands byline line. Renders to
// the right of the author/date/read time row. Matches the standard site
// share affordances (Facebook, X, copy link) without the heavier
// ArticleAuthorBlock chrome that doesn't fit the magazine feature header.

import { useState } from 'react'
import { Link as LinkIcon } from 'lucide-react'

interface Props {
  shareUrl: string
}

export function SocialShareButtons({ shareUrl }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard not available */ }
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <button
        type="button"
        onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer')}
        aria-label="Share on Facebook"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-[#6F2C8F] hover:text-[#6F2C8F]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}`, '_blank', 'noopener,noreferrer')}
        aria-label="Share on X"
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-[#6F2C8F] hover:text-[#6F2C8F]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Link copied' : 'Copy link'}
        title={copied ? 'Copied!' : 'Copy link'}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:border-[#6F2C8F] hover:text-[#6F2C8F]"
      >
        <LinkIcon className="h-4 w-4" />
      </button>
    </div>
  )
}
