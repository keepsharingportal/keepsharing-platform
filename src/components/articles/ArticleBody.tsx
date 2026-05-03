import { ReactNode } from 'react'

interface Props {
  body: string
  pullQuotes?: string[]  // plain strings from pull_quotes JSONB column
  inlineAd?: ReactNode
  inlineCta?: ReactNode
}

function isHeader(line: string): boolean {
  const words = line.split(/\s+/)
  if (words.length > 8) return false
  return /^[A-Z0-9 ',!?:&\-—.]+$/.test(line) && /[A-Z]/.test(line)
}

/**
 * Parse plain-text body into structured prose with pull-quote and ad
 * insertions at strategic positions.
 *
 * Paragraphs separated by \n\n. ALL-CAPS short lines become h2 headers.
 * pull_quotes is an array of strings stored in the DB (migration 018 format).
 */
export function ArticleBody({ body, pullQuotes = [], inlineAd, inlineCta }: Props) {
  const paragraphs = body.split(/\n\n+/).map((p) => p.trim()).filter(Boolean)

  const inlineCtaIndex  = inlineCta ? Math.floor(paragraphs.length * 0.3) : -1
  const inlineAdIndex   = inlineAd  ? Math.floor(paragraphs.length * 0.55) : -1

  // Space pull-quotes evenly through the article body
  const quoteIndices = pullQuotes.map((_, i) =>
    Math.floor(paragraphs.length * ((i + 1) / (pullQuotes.length + 1)))
  )

  const elements: ReactNode[] = []

  paragraphs.forEach((p, i) => {
    if (isHeader(p)) {
      elements.push(
        <h2 key={`h-${i}`} className="text-2xl md:text-3xl font-bold text-foreground mt-10 mb-4">
          {p}
        </h2>
      )
    } else if (i === 0) {
      elements.push(
        <p key={`p-${i}`} className="text-xl md:text-2xl font-medium text-foreground mb-6 leading-snug">
          {p}
        </p>
      )
    } else {
      elements.push(
        <p key={`p-${i}`} className="text-muted-foreground leading-relaxed mb-4">
          {p}
        </p>
      )
    }

    if (i === inlineCtaIndex && inlineCta) {
      elements.push(<div key={`cta-${i}`}>{inlineCta}</div>)
    }
    if (i === inlineAdIndex && inlineAd) {
      elements.push(<div key={`ad-${i}`}>{inlineAd}</div>)
    }

    const quoteIndex = quoteIndices.indexOf(i)
    if (quoteIndex !== -1 && pullQuotes[quoteIndex]) {
      elements.push(
        <blockquote
          key={`q-${i}`}
          className="border-l-4 border-primary pl-6 my-10 py-2 italic text-2xl text-foreground font-medium bg-primary/5 rounded-r-xl"
        >
          &ldquo;{pullQuotes[quoteIndex]}&rdquo;
        </blockquote>
      )
    }
  })

  return <div className="prose prose-lg max-w-none">{elements}</div>
}
