import { ReactNode } from 'react'
import sanitizeHtml from 'sanitize-html'
import { markdownToHtml } from '@/lib/markdown-to-html'
import { getColumnBrand } from '@/lib/articles/column-brand'
import { BrandWatermark } from '@/components/articles/BrandDecor'

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
  /** Single in-body ad (legacy single-slot). Renders ~55% through the article. */
  inlineAd?: ReactNode
  /** Multi-slot in-body ads. Renders at 30%, 55%, 80% (count depends on body length).
   *  Falls back to `inlineAd` when both are passed — the array wins. */
  inlineAds?: ReactNode[]
  inlineCta?: ReactNode
  /** Column slug — when set, enables column-branded Q&A + Rapid Fire styling. */
  columnSlug?: string | null
}

function isHtml(s: string) { return /<[a-z][\s\S]*>/i.test(s) }

// Tiny hex darkener — pushes a color toward black by `amount` (0..1).
// Used to build the gradient pull-quote shadow side without pulling in a
// full color utility.
function darken(hex: string, amount: number): string {
  const m = hex.match(/^#?([0-9a-f]{6})$/i)
  if (!m) return hex
  const n = parseInt(m[1], 16)
  const r = (n >> 16) & 0xff
  const g = (n >>  8) & 0xff
  const b =  n        & 0xff
  const mix = (c: number) => Math.max(0, Math.round(c * (1 - amount)))
  return `#${[mix(r), mix(g), mix(b)].map(x => x.toString(16).padStart(2, '0')).join('')}`
}

// Q&A detector: matches `<p>[<strong>]Name:[</strong>] text</p>`.
// Mom to Mom interviews use this pattern (RRP: question / Hayley: answer);
// pulls the speaker name and the answer body so we can style them apart.
//
// Returns null if the chunk isn't shaped like Q&A.

// Editorial labels that LOOK like a Q&A speaker (Name: text) but are
// actually just a single labeled paragraph (the print "Bio:" tag, photo
// captions, source attribution, etc). Render those as plain paragraphs
// so they don't get wrapped in the styled Q&A box.
const NON_SPEAKER_LABELS = new Set([
  'bio', 'note', 'update', 'source', 'photo', 'caption', 'editor', 'editor\'s note',
  'editors note', 'p.s', 'ps', 'sidebar', 'tip', 'pro tip',
  // Common sentence starters — added after a real article had "The direction is clear: lawmakers..."
  // mis-rendered as a Q&A row because the speaker regex doesn't care that
  // "The direction is clear" is plainly not a name.
  'the', 'a', 'an', 'this', 'that', 'these', 'those',
  'and', 'or', 'but', 'so', 'if', 'when', 'where', 'while',
  'why', 'how', 'what', 'who', 'which',
  'it', 'they', 'we', 'i', 'you', 'he', 'she',
  'one', 'two', 'three', 'first', 'second', 'finally',
  'remember', 'consider', 'here', 'there', 'now', 'today', 'yesterday',
])

// Sentence-shaped speaker labels — anything that looks like the start of
// a real sentence (multiple common words, contains a verb-ish word) should
// be treated as prose, not a Q&A speaker.
function looksLikeSentenceFragment(s: string): boolean {
  const words = s.toLowerCase().split(/\s+/).filter(Boolean)
  // Single-word labels (Mary, Jamie, Dr.) → not a sentence
  if (words.length === 1) return false
  // "Mary Beth", "Dr. Smith" → fine
  if (words.length === 2 && words.every(w => /^[a-z][a-z'.\-]{0,15}$/.test(w))) return false
  // 3+ words OR contains common stopwords beyond a name → likely a sentence
  const stopwords = new Set(['is','are','was','were','be','been','being','the','a','an','of','to','in','on','at','for','with','by','from','as','that','this','it','and','or','but','no','not','so','if','when','where','why','how'])
  const stopwordHits = words.filter(w => stopwords.has(w)).length
  if (stopwordHits >= 1) return true
  return words.length >= 3
}

function extractQA(chunk: string): { speaker: string; text: string } | null {
  // Permit <p> with attributes, optional <strong>, optional spaces around colon.
  const re = /^<p\b[^>]*>\s*(?:<strong\b[^>]*>)?\s*([A-Z][A-Za-z0-9 .'\-]{0,30}?)\s*:\s*(?:<\/strong>)?\s*([\s\S]+?)\s*<\/p>\s*$/i
  const m  = chunk.match(re)
  if (!m) return null
  const speaker = m[1].trim()
  const text    = m[2].trim()
  // Avoid false positives on URLs and very long "names"
  if (speaker.length < 1 || speaker.length > 30) return null
  if (/^https?$/i.test(speaker)) return null
  // Skip common editorial labels that aren't speakers — e.g. the magazine
  // "Bio:" footer that prints under a profile interview.
  if (NON_SPEAKER_LABELS.has(speaker.toLowerCase())) return null
  // Skip anything that looks like the start of a regular sentence
  // ("The direction is clear:" is not a Q&A speaker).
  if (looksLikeSentenceFragment(speaker)) return null
  return { speaker, text }
}

// Rapid Fire range detection — finds the chunk index of the "Rapid Fire"
// heading and the index where the rapid-fire content ends.
//
// Triggers on any of:
//   - <h2|h3> containing "rapid fire"     (preferred — editor used the H2 button)
//   - <p> whose entire text is "Rapid Fire (Questions)?" (editor typed it plain)
//
// The range ENDS at the first of:
//   - next <h1>/<h2> heading
//   - a long prose paragraph with no question mark (likely the bio paragraph
//     editors put right after the rapid fire section — common in Mom to Mom)
//
// Without the bio-bleed guard, the rapid fire box would swallow the bio
// paragraph since there's no heading between them.
function findRapidFireRange(chunks: string[]): { start: number; end: number } | null {
  const plainHeadingRe = /^rapid\s*fire(?:\s*questions?)?\s*[!.:?]?$/i
  let start = -1
  for (let i = 0; i < chunks.length; i++) {
    const ch = chunks[i]
    if (/<h(?:2|3)\b[^>]*>[^<]*rapid\s*fire/i.test(ch)) { start = i; break }
    const plainText = ch.replace(/<[^>]+>/g, '').trim()
    if (plainHeadingRe.test(plainText)) { start = i; break }
  }
  if (start === -1) return null
  let end = chunks.length
  for (let i = start + 1; i < chunks.length; i++) {
    const ch = chunks[i]
    if (/<h(?:1|2)\b/i.test(ch)) { end = i; break }
    const text = ch.replace(/<[^>]+>/g, '').trim()
    // Long paragraph without a question mark = probably the bio. Stop here.
    // Short paragraphs without a `?` are treated as continuations of the
    // previous answer (handled in parseRapidFireItems).
    if (text.length > 80 && !text.includes('?')) { end = i; break }
  }
  return { start, end }
}

// Parse the chunks inside a Rapid Fire range into Q/A items so we can
// render them structured (bold question, regular answer below). The
// editor's source typically looks like:
//
//   <p>1. Plan or wing it? Definitely plan.</p>
//   <p>2. Early bird or night owl? Neither, but I'm definitely up</p>
//   <p>later than I would like to be every night.</p>
//
// — numbered or not, with answers occasionally wrapping to a follow-on
// paragraph that has no `?`. Continuations are appended to the previous
// answer so the structure stays clean.
export interface RapidFireItem { question: string; answer: string }
function parseRapidFireItems(html: string): RapidFireItem[] {
  const paragraphMatches = html.match(/<p\b[^>]*>[\s\S]*?<\/p>/gi) ?? []
  const items: RapidFireItem[] = []

  for (const pHtml of paragraphMatches) {
    const raw     = pHtml.replace(/<[^>]+>/g, '').trim()
    if (!raw) continue
    const cleaned = raw.replace(/^\s*\d+\s*[.)\]]\s*/, '').trim()  // strip leading "1." / "1)" / "1]"
    const qIdx    = cleaned.indexOf('?')
    if (qIdx !== -1) {
      const question = cleaned.substring(0, qIdx + 1).trim()
      const answer   = cleaned.substring(qIdx + 1).trim()
      items.push({ question, answer })
    } else if (items.length > 0) {
      // Continuation of previous answer (wrapped to next paragraph)
      const last = items[items.length - 1]
      last.answer = (last.answer + ' ' + cleaned).trim()
    }
  }
  return items
}

export function ArticleBody({ body, pullQuotes = [], inlineAd, inlineAds, inlineCta, columnSlug }: Props) {
  const brand = getColumnBrand(columnSlug)
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
  //
  // First pass: pluck out complete <blockquote>...</blockquote> elements
  // so the inner <p> doesn't get split off from its parent. Without this,
  // an editor that wrote `<blockquote><p>Quote text</p></blockquote>` ends
  // up with TWO chunks — `<blockquote>` (empty) and `<p>Quote</p></blockquote>`
  // (orphaned closing tag) — which renders as an empty quote box plus a
  // stray paragraph below. The blockquote element stays self-contained
  // here so the CSS pull-quote treatment renders the text.
  const chunks: string[] = []
  const bqRe = /<blockquote\b[^>]*>[\s\S]*?<\/blockquote>/gi
  let cursor = 0
  for (const m of cleanHtml.matchAll(bqRe)) {
    const idx = m.index ?? 0
    if (idx > cursor) {
      // Split the gap before this blockquote at p/h2/etc boundaries
      const gap = cleanHtml.substring(cursor, idx)
      chunks.push(...gap.split(/(?=<(?:p|h2|h3|figure|ul|ol)\b)/i).filter(c => c.trim()))
    }
    chunks.push(m[0])           // the blockquote stays whole
    cursor = idx + m[0].length
  }
  if (cursor < cleanHtml.length) {
    const tail = cleanHtml.substring(cursor)
    chunks.push(...tail.split(/(?=<(?:p|h2|h3|figure|ul|ol)\b)/i).filter(c => c.trim()))
  }

  const inlineCtaIndex = inlineCta ? Math.floor(chunks.length * 0.3) : -1

  // Multi-slot inline ads — when `inlineAds` is set, render up to 3 ads
  // at 30%, 55%, 80% through the chunks. Filter out null/undefined first
  // so a partly-filled array doesn't leave gaps in the body. Falls back
  // to the single-slot `inlineAd` for legacy callers (one slot at 55%).
  const inlineAdSlots: ReactNode[] = inlineAds
    ? inlineAds.filter((n): n is ReactNode => n != null)
    : inlineAd
      ? [inlineAd]
      : []
  const AD_POSITIONS = [0.30, 0.55, 0.80]
  // Map each ad to its chunk index — same length as inlineAdSlots.
  const inlineAdIndices: number[] = inlineAdSlots.map((_, i) =>
    Math.floor(chunks.length * AD_POSITIONS[Math.min(i, AD_POSITIONS.length - 1)])
  )

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
    // High-impact gradient pull quote — full brand-color gradient bg + white
    // text + heart accent + soft glow blobs. Per the magazine mockup, this
    // is the "wow" treatment for the lead-in quote. Mid-article quotes get
    // a softer variant (see below).
    elements.push(
      <figure
        key="lead-quote"
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 mt-2 mb-12 text-white"
        style={{
          background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.primary}e6 50%, ${darken(brand.primary, 0.30)} 100%)`,
          boxShadow:  `0 16px 40px ${brand.primary}47`,
        }}
      >
        {/* Soft glow blobs for depth (per the mockup) */}
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-black/10 blur-2xl pointer-events-none" />
        {/* Tilted brand-icon watermark accent in the bottom-right */}
        <BrandWatermark
          columnSlug={columnSlug ?? null}
          className="absolute bottom-4 right-4 md:bottom-5 md:right-6 -rotate-12 pointer-events-none"
          size={68}
          fillOpacity={0.18}
        />
        <span
          aria-hidden="true"
          className="relative block text-[3rem] md:text-[3.5rem] font-black not-italic leading-none mb-2 text-white/60"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          &ldquo;
        </span>
        <blockquote className="relative font-serif italic text-xl md:text-2xl lg:text-3xl font-medium leading-snug tracking-tight">
          {quoteText}
        </blockquote>
      </figure>
    )
  }

  let dropCapApplied = false
  // Identify the Rapid Fire range up front so we can bundle those chunks
  // into a single callout instead of rendering each as a normal paragraph.
  const rapidFire = findRapidFireRange(chunks)
  // Track whether we've already alternated colors for Q&A. Q rows get the
  // brand tint, A rows get the neutral panel. Heuristic: first match per
  // article is treated as a question.
  let qaIndex = 0

  chunks.slice(firstBodyIdx).forEach((chunk, j) => {
    const i = j + firstBodyIdx

    // Skip chunks inside the Rapid Fire range — they're rendered as a
    // single callout when we hit the start index.
    if (rapidFire && i > rapidFire.start && i < rapidFire.end) return
    if (rapidFire && i === rapidFire.start) {
      // Bundle [start, end) into a single styled box. Parse the content
      // into Q/A pairs so we can render them structured like Quick Hits
      // (bold question, regular answer underneath) rather than dumping
      // raw HTML.
      const rawBody = chunks.slice(rapidFire.start + 1, rapidFire.end).join('')
      const items   = parseRapidFireItems(rawBody)
      const isSoft  = brand.style === 'soft'

      // Soft palette for the box (Mom: peach bg + rose questions). The
      // question text reads in the column's PRIMARY brand color (rose for
      // Mom) — matches the labels in the top strip so the visual identity
      // stays consistent. The soft accent (teal) is for icon-style elements
      // only, not text labels.
      const bgColor       = isSoft ? (brand.softBg     ?? brand.primary + '0e') : (brand.primary + '0d')
      const borderColor   = isSoft ? (brand.softBorder ?? brand.primary + '22') : 'rgba(0,0,0,0.06)'
      const questionColor = brand.primary

      if (isSoft) {
        elements.push(
          <section
            key={`rf-${i}`}
            className="my-10 rounded-2xl overflow-hidden border px-5 md:px-7 py-5 md:py-6"
            style={{ backgroundColor: bgColor, borderColor }}
          >
            <span
              className="inline-flex items-center gap-1 text-[10px] md:text-xs font-black uppercase tracking-widest text-white rounded-full px-3 py-1 mb-4"
              style={{ backgroundColor: brand.primary }}
            >
              ⚡ Rapid Fire
            </span>
            <div className="space-y-4">
              {items.map((item, k) => (
                <div key={k}>
                  <p className="font-bold text-base md:text-lg leading-snug" style={{ color: questionColor }}>
                    {item.question}
                  </p>
                  {item.answer && (
                    <p className="text-base md:text-lg text-foreground/85 leading-relaxed">
                      {item.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )
      } else {
        elements.push(
          <section
            key={`rf-${i}`}
            className="my-10 rounded-2xl overflow-hidden border border-border/40 shadow-sm"
          >
            <div
              className="px-5 py-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-white flex items-center gap-2"
              style={{ backgroundColor: brand.primary }}
            >
              ⚡ Rapid Fire
            </div>
            <div className="px-5 md:px-7 py-5 md:py-6 space-y-4" style={{ backgroundColor: bgColor }}>
              {items.map((item, k) => (
                <div key={k}>
                  <p className="font-bold text-base md:text-lg leading-snug" style={{ color: questionColor }}>
                    {item.question}
                  </p>
                  {item.answer && (
                    <p className="text-base md:text-lg text-foreground/85 leading-relaxed">
                      {item.answer}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>
        )
      }
      return
    }

    // Detect Q&A pattern — magazine interview treatment. The speaker labels
    // (RRP:, Hayley:, etc.) drive the alternation but DON'T render: the
    // question sits in a soft-pink box with bold brand-colored text, and
    // the answer sits below as plain body copy. Cleaner than the prior
    // label-heavy boxes, lets the reader's eye flow Q → A → Q → A.
    const qa = extractQA(chunk)
    if (qa) {
      const isQuestion = qaIndex % 2 === 0
      qaIndex++
      if (isQuestion) {
        elements.push(
          <div
            key={`qa-${i}`}
            className="mt-7 md:mt-8 mb-2 rounded-lg px-4 py-3 md:px-5 md:py-3.5"
            style={{ backgroundColor: brand.primary + '12' }}
          >
            <p
              className="font-bold text-base md:text-lg leading-snug"
              style={{ color: brand.primary }}
              dangerouslySetInnerHTML={{ __html: qa.text }}
            />
          </div>
        )
      } else {
        elements.push(
          <p
            key={`qa-${i}`}
            className="text-base md:text-lg text-foreground/85 leading-relaxed mb-1 px-1"
            dangerouslySetInnerHTML={{ __html: qa.text }}
          />
        )
      }
      return
    }

    // Bold-question paragraph pattern — when a paragraph is JUST a
    // <strong>...</strong> tag ending in a question mark, render it as a
    // soft-tinted Q&A box (light brand bg + dark brand-color bold text)
    // instead of plain bold paragraph. Picks up the magazine Q&A style for
    // columns that format interviews as bold-Q + paragraph-A pairs (Grands,
    // Teacher of the Month) without needing the RRP:/Name: prefix.
    const boldQ = chunk.match(/^<p\b[^>]*>\s*<strong\b[^>]*>([\s\S]+?)<\/strong>\s*<\/p>\s*$/i)
    if (boldQ) {
      const questionText = boldQ[1].trim()
      // Must look like an actual question (ends with ?) to avoid styling
      // every bold-paragraph (could be a name, a label, a callout).
      if (/\?\s*$/.test(questionText.replace(/<[^>]+>/g, ''))) {
        elements.push(
          <div
            key={`bq-${i}`}
            className="mt-8 mb-2 rounded-lg px-4 py-3 md:px-5 md:py-3.5"
            style={{ backgroundColor: brand.primary + '14' }}
          >
            <p
              className="font-bold text-base md:text-lg leading-snug"
              style={{ color: brand.softLabel === '#08264A' ? brand.primary : (brand.softLabel ?? brand.primary) }}
              dangerouslySetInnerHTML={{ __html: questionText }}
            />
          </div>
        )
        return
      }
    }

    // In-body <blockquote> chunks get the magazine gradient pull-quote
    // treatment per the column spec — purple gradient bg, white serif
    // italic text, soft glow blobs, tilted heart watermark. Previously
    // these fell through to dangerouslySetInnerHTML which rendered as a
    // basic italic paragraph.
    if (/^<blockquote\b/i.test(chunk)) {
      // Strip the blockquote wrapper to get just the inner HTML, then
      // strip nested <p> tags so we render the text directly inside the
      // figure (cleaner typography than nested paragraph defaults).
      const inner = chunk
        .replace(/^<blockquote\b[^>]*>/i, '')
        .replace(/<\/blockquote>\s*$/i, '')
        .replace(/^<p\b[^>]*>/i, '')
        .replace(/<\/p>\s*$/i, '')
        .trim()
      elements.push(
        <figure
          key={`bq-${i}`}
          className="relative overflow-hidden rounded-2xl p-6 md:p-8 my-12 text-white"
          style={{
            background: `linear-gradient(135deg, ${brand.primary} 0%, ${brand.primary}e6 50%, ${darken(brand.primary, 0.30)} 100%)`,
            boxShadow:  `0 16px 40px ${brand.primary}47`,
          }}
        >
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-black/10 blur-2xl pointer-events-none" />
          <BrandWatermark
            columnSlug={columnSlug ?? null}
            className="absolute bottom-4 right-4 md:bottom-5 md:right-6 -rotate-12 pointer-events-none"
            size={68}
            fillOpacity={0.18}
          />
          <span
            aria-hidden="true"
            className="relative block text-[3rem] md:text-[3.5rem] font-black not-italic leading-none mb-2 text-white/60"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            &ldquo;
          </span>
          <blockquote
            className="relative font-serif italic text-xl md:text-2xl lg:text-3xl font-medium leading-snug tracking-tight"
            dangerouslySetInnerHTML={{ __html: inner }}
          />
        </figure>
      )
      return
    }

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
    // Multi-slot inline ads — insert each ad at its mapped chunk index.
    // Loops over ALL slots each iteration so a single chunk can host more
    // than one ad (rare, only when chunks.length is very small and two
    // percentages map to the same index — defensive in case of ties).
    for (let s = 0; s < inlineAdSlots.length; s++) {
      if (i === inlineAdIndices[s]) {
        elements.push(<div key={`ad-${i}-${s}`} className="my-10">{inlineAdSlots[s]}</div>)
      }
    }

    const quoteIndex = quoteIndices.indexOf(i)
    if (quoteIndex !== -1 && pullQuotes[quoteIndex]) {
      // Mid-article pull quote — softer treatment than the leading
      // gradient quote. Lavender/peach-tinted bg, brand-color left border,
      // brand-color quote mark. Per the magazine mockup's SoftPullQuote.
      elements.push(
        <figure
          key={`q-${i}`}
          className="relative rounded-2xl p-6 md:p-7 my-12 shadow-sm"
          style={{
            backgroundColor: brand.primary + '0e',
            borderLeft:      `4px solid ${brand.primary}`,
          }}
        >
          <BrandWatermark
            columnSlug={columnSlug ?? null}
            className="absolute -right-2 -bottom-4 md:-right-6 md:-bottom-8 -rotate-6 pointer-events-none"
            size={120}
            fillOpacity={0.08}
          />
          <span
            aria-hidden="true"
            className="block text-[3rem] md:text-[3.5rem] font-black not-italic leading-none mb-2"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif', color: brand.primary, opacity: 0.5 }}
          >
            &ldquo;
          </span>
          <blockquote
            className="relative font-serif italic text-xl md:text-2xl font-semibold leading-snug"
            style={{ color: brand.softLabel ?? 'hsl(var(--foreground))' }}
          >
            {pullQuotes[quoteIndex]}
          </blockquote>
        </figure>
      )
    }
  })

  return (
    /* CSS custom property exposed for the drop cap + pull quote rules so
       they inherit the column's brand color without hardcoding navy. */
    <div className="article-body max-w-none" style={{ ['--brand-primary' as string]: brand.primary }}>
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
           opening paragraph. Picks up --brand-primary so each column's
           drop cap matches its identity (rose for Mom, apple-red for
           Teacher, teal for Grands, navy fallback for everything else). */
        .article-body .article-dropcap p:first-of-type {
          color: hsl(var(--foreground));
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
          color: var(--brand-primary, #1a2744);
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
        /* Rapid Fire callout — bolded question / italic answer alternation
           inside a brand-tinted box. The bundle is rendered via dangerouslySetInnerHTML
           so we style its children: each <p> becomes a tight row. */
        .article-body .article-rapid-fire p {
          margin: 0 0 0.5rem 0;
          font-size: 0.95rem;
          line-height: 1.5;
          color: hsl(var(--foreground) / 0.9);
        }
        .article-body .article-rapid-fire p:last-child { margin-bottom: 0; }
        .article-body .article-rapid-fire strong { display: inline; }
        .article-body .article-rapid-fire em { color: hsl(var(--foreground) / 0.75); }
        @media (min-width: 768px) {
          .article-body .article-rapid-fire p {
            font-size: 1rem;
          }
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