import { ReactNode } from 'react'
import sanitizeHtml from 'sanitize-html'
import { markdownToHtml } from '@/lib/markdown-to-html'

// NOTE: This component is a server component, which means the sanitizer
// runs in Node. isomorphic-dompurify pulls in jsdom, and jsdom transitively
// requires html-encoding-sniffer → @exodus/bytes/encoding-lite, which is an
// ESM module that html-encoding-sniffer tries to require() — Vercel's
// Node runtime rejects this with ERR_REQUIRE_ESM and the whole article
// page 500s.
//
// sanitize-html is a pure-Node allowlist sanitizer with the same shape,
// no jsdom dependency. Same DOMPurify-style ALLOWED_TAGS / ALLOWED_ATTR
// model, just spelled allowedTags / allowedAttributes.

interface Props {
  body: string
  pullQuotes?: string[]
  inlineAd?: ReactNode
  inlineCta?: ReactNode
}

function isHtml(s: string) { return /<[a-z][\s\S]*>/i.test(s) }

export function ArticleBody({ body, pullQuotes = [], inlineAd, inlineCta }: Props) {
  // Imported articles may have markdown body until edited in the rich editor.
  // Convert to HTML so they render correctly on the public site.
  const rawHtml = isHtml(body) ? body : markdownToHtml(body)

  // Allowlist of tags + attributes — same set the old DOMPurify config used.
  // sanitize-html is more granular than DOMPurify on attributes (per-tag
  // allowlists), but '*' applies the list to every tag — matches DOMPurify's
  // global ALLOWED_ATTR behavior.
  const cleanHtml = sanitizeHtml(rawHtml, {
    allowedTags: [
      'p', 'br', 'span', 'div',
      'h2', 'h3', 'h4',
      'strong', 'em', 'b', 'i', 'u', 's',
      'a',
      'ul', 'ol', 'li',
      'blockquote',
      'figure', 'figcaption', 'img',
      'code', 'pre',
      'hr',
    ],
    allowedAttributes: {
      '*': ['class', 'style', 'data-align', 'data-caption'],
      a:   ['href', 'title', 'target', 'rel'],
      img: ['src', 'alt', 'title'],
    },
    // Only permit safe URL schemes — covers the ALLOWED_URI_REGEXP we had
    // before. http(s), mailto, tel, and protocol-relative.
    allowedSchemes:           ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag:      { a: ['http', 'https', 'mailto', 'tel'], img: ['http', 'https', 'data'] },
    allowProtocolRelative:    true,
    // Editors emit inline styles (font, color, text-align, image alignment).
    // Allow a conservative whitelist of CSS properties + values; reject
    // anything that smells like script injection.
    allowedStyles: {
      '*': {
        'color':            [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/, /^rgba\(/, /^hsl\(/, /^[a-z]+$/i],
        'background-color': [/^#(0x)?[0-9a-f]+$/i, /^rgb\(/, /^rgba\(/, /^hsl\(/, /^[a-z]+$/i],
        'text-align':       [/^left$/, /^right$/, /^center$/, /^justify$/],
        'font-family':      [/^[\w\s"',\-]+$/],
        'font-size':        [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
        'font-weight':      [/^(?:bold|normal|\d{3})$/],
        'font-style':       [/^(?:italic|normal)$/],
        'float':            [/^(?:left|right|none)$/],
        'margin':           [/^[\d.\spx%emrem]+$/i],
        'max-width':        [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
        'width':            [/^\d+(?:\.\d+)?(?:px|em|rem|%)$/],
      },
    },
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

  // ── Lead pull-quote consolidation ──────────────────────────────────────
  // Real-world editor content is messy: writers type blockquotes, leave
  // stray quote marks in their own paragraphs, sometimes both. We scan the
  // first few chunks, collect anything that looks "quote-like" into a
  // single magazine-style pull quote, and skip those chunks in the main
  // render. The first paragraph AFTER the leading quotes gets the drop cap.
  let firstBodyIdx = 0
  const leadingQuoteParts: string[] = []
  const SCAN = Math.min(3, chunks.length)
  for (let i = 0; i < SCAN; i++) {
    const ch    = chunks[i]
    const plain = ch.replace(/<[^>]+>/g, '').trim()
    const isBlockquote   = /^<blockquote/i.test(ch)
    const isQuotedPara   = /^<p[\s>]/i.test(ch) && /^["“'].*["”']$/.test(plain) && plain.length < 280
    const isOrphanQuote  = /^<p[\s>]/i.test(ch) && /^["“'”]{1,2}$/.test(plain)

    if (isBlockquote || isQuotedPara || isOrphanQuote) {
      // Strip any surrounding quote characters and add the content
      const stripped = plain.replace(/^["“'”]+|["“'”]+$/g, '').trim()
      if (stripped.length > 0) leadingQuoteParts.push(stripped)
      firstBodyIdx = i + 1
    } else {
      break
    }
  }

  if (leadingQuoteParts.length > 0) {
    const quoteText = leadingQuoteParts.join(' ')
    elements.push(
      <blockquote
        key="lead-quote"
        className="relative pl-14 md:pl-16 pr-4 md:pr-6 py-6 md:py-8 mt-2 mb-12 italic font-medium text-xl md:text-2xl text-foreground bg-primary/5 border-l-4 border-primary rounded-r-xl leading-snug"
      >
        <span
          aria-hidden="true"
          className="absolute left-3 md:left-5 -top-2 md:-top-3 text-[4rem] md:text-[5rem] font-black not-italic leading-none text-primary"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          &ldquo;
        </span>
        {quoteText}
      </blockquote>
    )
  }

  let dropCapApplied = false

  chunks.slice(firstBodyIdx).forEach((chunk, j) => {
    const i = j + firstBodyIdx
    // First body paragraph gets lede styling + drop cap
    const isLede = !dropCapApplied && /^<p[\s>]/i.test(chunk)
    if (isLede) dropCapApplied = true

    elements.push(
      <div
        key={`c-${i}`}
        className={isLede ? 'article-lede article-dropcap' : 'article-chunk'}
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
          className="relative pl-14 md:pl-16 pr-4 md:pr-6 py-6 md:py-8 my-12 italic font-bold text-2xl md:text-3xl text-foreground bg-primary/5 border-l-4 border-primary rounded-r-xl leading-snug"
        >
          {/* Decorative oversized coral quote mark */}
          <span
            aria-hidden="true"
            className="absolute left-3 md:left-5 -top-2 md:-top-3 text-[4rem] md:text-[5rem] font-black not-italic leading-none text-primary"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            &ldquo;
          </span>
          {pullQuotes[quoteIndex]}
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
          font-size: 1rem;
          line-height: 1.75;
          margin-bottom: 1.125rem;
        }
        @media (min-width: 640px) {
          .article-body .article-chunk p {
            font-size: 1.125rem;
            line-height: 1.7;
            margin-bottom: 1.25rem;
          }
        }
        .article-body .article-lede p {
          color: hsl(var(--foreground));
          font-size: 1.125rem;
          font-weight: 500;
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }
        @media (min-width: 640px) {
          .article-body .article-lede p {
            font-size: 1.25rem;
            line-height: 1.55;
          }
        }
        @media (min-width: 1024px) {
          .article-body .article-lede p {
            font-size: 1.375rem;
            line-height: 1.5;
          }
        }
        /* Drop cap — classic magazine flourish on the first letter of the
           opening paragraph. Deep navy to match the spotlight color story,
           floated left so body text wraps around it. Generous spacing so
           the body text doesn't crowd the cap. */
        .article-body .article-dropcap p:first-of-type {
          color: #1a2744;
          font-weight: 500;
        }
        .article-body .article-dropcap p:first-of-type::first-letter {
          float: left;
          font-family: Georgia, 'Times New Roman', serif;
          font-size: 4.5rem;
          font-weight: 900;
          line-height: 0.85;
          padding: 0.35rem 0.85rem 0 0;
          margin: 0.4rem 0 0 0;
          color: #1a2744;
        }
        @media (min-width: 768px) {
          .article-body .article-dropcap p:first-of-type::first-letter {
            font-size: 5.5rem;
            padding: 0.4rem 1rem 0 0;
            margin: 0.5rem 0 0 0;
          }
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
        /* Magazine-style pull quote — heavy italic, oversized, decorative
           coral quote marks at the start and end. Same treatment whether
           the quote comes from inline body HTML or the pull_quotes array. */
        .article-body .article-chunk blockquote {
          position: relative;
          padding: 1.5rem 1rem 1.5rem 3.5rem;
          margin: 3rem 0;
          font-style: italic;
          font-weight: 700;
          font-size: 1.5rem;
          line-height: 1.4;
          color: hsl(var(--foreground));
          background: hsl(var(--primary) / 0.04);
          border-left: 4px solid hsl(var(--primary));
          border-radius: 0 0.75rem 0.75rem 0;
        }
        .article-body .article-chunk blockquote::before {
          content: '\\201C';
          position: absolute;
          top: -0.5rem;
          left: 1rem;
          font-size: 4rem;
          font-style: normal;
          font-weight: 900;
          line-height: 1;
          color: hsl(var(--primary));
          font-family: Georgia, 'Times New Roman', serif;
        }
        .article-body .article-chunk blockquote p {
          margin: 0;
          font-size: inherit;
          font-style: inherit;
          font-weight: inherit;
          color: inherit;
          line-height: inherit;
        }
        @media (min-width: 768px) {
          .article-body .article-chunk blockquote {
            font-size: 1.75rem;
            padding: 2rem 1.5rem 2rem 4rem;
          }
          .article-body .article-chunk blockquote::before {
            font-size: 5rem;
            top: -0.5rem;
            left: 1.25rem;
          }
        }
        /* ── Images and figures ─────────────────────────────────── */
        .article-body img {
          max-width: 100%;
          height: auto;
          border-radius: 0.75rem;
          display: block;
          margin: 1.75rem auto;
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }
        /* Tiptap data-align attribute (editor-inserted images) */
        .article-body img[data-align="full"] {
          width: 100%;
          margin: 1.75rem 0;
        }
        .article-body img[data-align="center"] {
          max-width: 78%;
          margin: 1.75rem auto;
        }
        .article-body img[data-align="left"] {
          float: left;
          margin: 0.5rem 1.75rem 1rem 0;
          max-width: 45%;
        }
        .article-body img[data-align="right"] {
          float: right;
          margin: 0.5rem 0 1rem 1.75rem;
          max-width: 45%;
        }
        /* WordPress legacy alignment classes */
        .article-body figure.alignleft, .article-body img.alignleft {
          float: left;
          margin: 0.5rem 1.5rem 1rem 0;
          max-width: 45%;
          border-radius: 0.75rem;
        }
        .article-body figure.alignright, .article-body img.alignright {
          float: right;
          margin: 0.5rem 0 1rem 1.5rem;
          max-width: 45%;
          border-radius: 0.75rem;
        }
        .article-body figure.aligncenter, .article-body img.aligncenter {
          margin-left: auto;
          margin-right: auto;
          display: block;
        }
        /* Figures with captions */
        .article-body figure { margin: 1.75rem 0; }
        .article-body figure img { margin: 0; }
        .article-body figcaption, .article-body figure figcaption {
          font-size: 0.825rem;
          color: hsl(var(--muted-foreground));
          font-style: italic;
          margin-top: 0.5rem;
          text-align: center;
          line-height: 1.5;
        }
        /* ── Inline code + preformatted ────────────────────── */
        .article-body code {
          font-family: ui-monospace, 'Cascadia Code', monospace;
          font-size: 0.875em;
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
          padding: 0.15em 0.4em;
          border-radius: 0.3rem;
        }
        .article-body pre {
          background: hsl(var(--muted));
          padding: 1rem 1.25rem;
          border-radius: 0.75rem;
          overflow-x: auto;
          margin: 1.5rem 0;
          font-size: 0.875rem;
          line-height: 1.6;
        }
        .article-body pre code {
          background: none;
          padding: 0;
          font-size: inherit;
        }
        /* ── Strikethrough ──────────────────────────────────── */
        .article-body s { text-decoration: line-through; opacity: 0.6; }
        /* ── Horizontal rule ────────────────────────────────── */
        .article-body hr {
          border: none;
          border-top: 2px solid hsl(var(--border));
          margin: 2.5rem 0;
        }
        /* Italic paragraph after image = Tiptap caption */
        .article-body img + p > em:only-child {
          font-size: 0.825rem;
          color: hsl(var(--muted-foreground));
          display: block;
          text-align: center;
          margin-top: -1.25rem;
          margin-bottom: 1.5rem;
        }
        /* Mobile — collapse all floats. !important wins against any
           editor-emitted inline style="float: left; ..." on the image. */
        @media (max-width: 640px) {
          .article-body img[data-align="left"],
          .article-body img[data-align="right"],
          .article-body figure.alignleft,
          .article-body figure.alignright,
          .article-body img.alignleft,
          .article-body img.alignright {
            float: none !important;
            max-width: 100% !important;
            margin: 1.5rem auto !important;
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