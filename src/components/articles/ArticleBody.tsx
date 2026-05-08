import { ReactNode } from 'react'
import DOMPurify from 'isomorphic-dompurify'

interface Props {
  body: string
  pullQuotes?: string[]
  inlineAd?: ReactNode
  inlineCta?: ReactNode
}

/**
 * Renders article body as sanitized HTML with magazine-style typography.
 *
 * Body is HTML (post migration 044). Supports paragraphs, h2/h3,
 * figures with captions and alignment, blockquotes, lists, and links.
 *
 * Pull quotes from pull_quotes JSONB are inserted at evenly-spaced positions.
 * Inline ad/CTA are inserted at strategic offsets.
 */
export function ArticleBody({ body, pullQuotes = [], inlineAd, inlineCta }: Props) {
  const cleanHtml = DOMPurify.sanitize(body, {
    ALLOWED_TAGS: [
      'p', 'br', 'span', 'div',
      'h2', 'h3', 'h4',
      'strong', 'em', 'b', 'i', 'u',
      'a',
      'ul', 'ol', 'li',
      'blockquote',
      'figure', 'figcaption', 'img',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  })

  // Split sanitized HTML at top-level block boundaries so we can
  // interleave pull quotes and ads at strategic positions.
  const chunks = cleanHtml.split(/(?=<(?:p|h2|h3|figure|blockquote|ul|ol)\b)/i).filter(c => c.trim())

  const inlineCtaIndex = inlineCta ? Math.floor(chunks.length * 0.3) : -1
  const inlineAdIndex  = inlineAd  ? Math.floor(chunks.length * 0.55) : -1
  const quoteIndices   = pullQuotes.map((_, i) =>
    Math.floor(chunks.length * ((i + 1) / (pullQuotes.length + 1)))
  )

  const elements: ReactNode[] = []

  chunks.forEach((chunk, i) => {
    // First chunk gets lede styling (larger, heavier)
    const isLede = i === 0
    elements.push(
      <div
        key={`c-${i}`}
        className={isLede ? 'article-lede' : 'article-chunk'}
        dangerouslySetInnerHTML={{ __html: chunk }}
      />
    )

    if (i === inlineCtaIndex && inlineCta) {
      elements.push(<div key={`cta-${i}`} className="my-10">{inlineCta}</div>)
    }
    if (i === inlineAdIndex && inlineAd) {
      elements.push(<div key={`ad-${i}`} className="my-10">{inlineAd}</div>)
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

  return (
    <div className="article-body max-w-none">
      {elements}
      <style>{`
        .article-body .article-chunk p {
          color: hsl(var(--foreground) / 0.85);
          font-size: 1.125rem;
          line-height: 1.7;
          margin-bottom: 1.25rem;
        }
        .article-body .article-lede p {
          color: hsl(var(--foreground));
          font-size: 1.375rem;
          font-weight: 500;
          line-height: 1.5;
          margin-bottom: 1.5rem;
        }
        .article-body h2 {
          font-size: 1.875rem;
          font-weight: 700;
          color: hsl(var(--foreground));
          margin-top: 2.5rem;
          margin-bottom: 1rem;
          line-height: 1.2;
        }
        .article-body h3 {
          font-size: 1.5rem;
          font-weight: 700;
          color: hsl(var(--foreground));
          margin-top: 2rem;
          margin-bottom: 0.75rem;
          line-height: 1.3;
        }
        .article-body a {
          color: hsl(var(--primary));
          text-decoration: underline;
          text-underline-offset: 2px;
        }
        .article-body a:hover {
          color: hsl(var(--primary) / 0.8);
        }
        .article-body strong, .article-body b { font-weight: 700; }
        .article-body em, .article-body i { font-style: italic; }
        .article-body ul, .article-body ol {
          margin: 1.25rem 0 1.25rem 1.5rem;
        }
        .article-body ul { list-style: disc; }
        .article-body ol { list-style: decimal; }
        .article-body li {
          color: hsl(var(--foreground) / 0.85);
          font-size: 1.125rem;
          line-height: 1.7;
          margin-bottom: 0.5rem;
        }
        /* Inline blockquotes coming from body HTML use same style as pull quotes */
        .article-body .article-chunk blockquote {
          border-left: 4px solid hsl(var(--primary));
          padding: 0.5rem 0 0.5rem 1.5rem;
          margin: 2.5rem 0;
          font-style: italic;
          font-size: 1.5rem;
          color: hsl(var(--foreground));
          background: hsl(var(--primary) / 0.05);
          border-radius: 0 0.75rem 0.75rem 0;
        }
        /* Figures (images with captions) */
        .article-body figure { margin: 2rem 0; }
        .article-body figure img {
          border-radius: 0.75rem;
          width: 100%;
          height: auto;
          display: block;
        }
        .article-body figure figcaption {
          font-size: 0.875rem;
          color: hsl(var(--muted-foreground));
          font-style: italic;
          margin-top: 0.5rem;
          text-align: center;
        }
        /* WordPress-style alignment classes */
        .article-body figure.alignleft,
        .article-body img.alignleft {
          float: left;
          margin: 0.5rem 1.5rem 1rem 0;
          max-width: 50%;
        }
        .article-body figure.alignright,
        .article-body img.alignright {
          float: right;
          margin: 0.5rem 0 1rem 1.5rem;
          max-width: 50%;
        }
        .article-body figure.aligncenter,
        .article-body img.aligncenter {
          margin-left: auto;
          margin-right: auto;
          display: block;
        }
        @media (max-width: 640px) {
          .article-body figure.alignleft,
          .article-body figure.alignright,
          .article-body img.alignleft,
          .article-body img.alignright {
            float: none;
            max-width: 100%;
            margin-left: auto;
            margin-right: auto;
          }
        }
        /* Clear floats at end */
        .article-body::after {
          content: '';
          display: table;
          clear: both;
        }
      `}</style>
    </div>
  )
}