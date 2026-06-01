// Parse a sanitized Grands article body into the structured parts the
// feature treatment needs:
//   - leadPullQuote:    FIRST <blockquote> lifted out for GrandsPullQuote
//   - introParas:       paragraphs before the first bold question (lede)
//   - qaPairs:          { question, answer } pairs detected from the body
//   - grandMoment:      { text, afterQAIndex } — pulled from an
//                       <h3>A Grand Moment</h3> + next paragraph in the
//                       body. afterQAIndex is the zero-based index of
//                       the Q&A pair that came BEFORE the H3 (so the
//                       renderer can insert the moment in the right
//                       spot). -1 means "before the first Q&A."
//
// Editor convention for the mid-article break:
//   Add a Heading 3 with the literal text "A Grand Moment" anywhere in
//   the body, then put the moment line as the very next paragraph.
//   Both get pulled out so they don't double-render below.

export interface GrandsBodyParts {
  leadPullQuote: { quote: string; attribution: string } | null
  qaPairs:       Array<{ question: string; answer: string }>
  introParas:    string[]
  grandMoment:   { text: string; afterQAIndex: number } | null
}

const PARA_OR_H3_RE = /<(?:p|h3)\b[^>]*>[\s\S]*?<\/(?:p|h3)>/gi
const BLOCKQUOTE_RE = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/i

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

const NON_QUESTION_LABELS = new Set([
  'bio', 'note', 'editor’s note', "editor's note", 'editors note', 'editor note',
  'update', 'source', 'photo', 'caption', 'p.s.', 'ps', 'sidebar', 'tip', 'pro tip',
])

function matchBoldQuestion(pHtml: string): string | null {
  const m = pHtml.match(/^<p\b[^>]*>\s*<strong\b[^>]*>([\s\S]+?)<\/strong>\s*<\/p>\s*$/i)
  if (!m) return null
  const text = stripTags(m[1])
  if (text.length < 3 || text.length > 280) return null
  const norm = text.replace(/[:.!?\s]+$/g, '').toLowerCase().trim()
  if (NON_QUESTION_LABELS.has(norm)) return null
  return m[1].trim()
}

function isGrandMomentHeading(chunk: string): boolean {
  if (!/^<h3\b/i.test(chunk)) return false
  const text = stripTags(chunk).toLowerCase().replace(/[:.!?\s]+$/g, '').trim()
  return text === 'a grand moment' || text === 'grand moment'
}

function splitQuoteAndAttribution(raw: string): { quote: string; attribution: string } {
  const cleaned = stripTags(raw).replace(/[“”"]/g, '').trim()
  const m = cleaned.match(/^([\s\S]+?)\s*[—–-]\s*([^—–-]+)$/)
  if (m) return { quote: m[1].trim(), attribution: m[2].trim() }
  return { quote: cleaned, attribution: '' }
}

export function parseGrandsBody(bodyHtml: string): GrandsBodyParts {
  // 1. Lift the FIRST <blockquote> as the pull quote
  let workingBody = bodyHtml
  let leadPullQuote: GrandsBodyParts['leadPullQuote'] = null
  const bqMatch = bodyHtml.match(BLOCKQUOTE_RE)
  if (bqMatch) {
    const split = splitQuoteAndAttribution(bqMatch[1])
    if (split.quote) leadPullQuote = split
    workingBody = bodyHtml.replace(bqMatch[0], '')
  }

  // 2. Walk paragraphs + h3 chunks. Bold-question paragraph starts a Q&A
  //    pair. <h3>A Grand Moment</h3> captures the NEXT paragraph as the
  //    grand moment text and remembers which Q&A pair was last flushed.
  const chunks = workingBody.match(PARA_OR_H3_RE) ?? []
  const introParas: string[] = []
  const qaPairs: GrandsBodyParts['qaPairs'] = []
  let grandMoment: GrandsBodyParts['grandMoment'] = null
  let seenFirstQuestion = false
  let currentAnswer: string[] = []
  let currentQuestion: string | null = null
  let momentCapturePending = false

  const flushPair = () => {
    if (currentQuestion !== null) {
      qaPairs.push({ question: currentQuestion, answer: currentAnswer.join('\n') })
      currentQuestion = null
      currentAnswer   = []
    }
  }

  for (const chunk of chunks) {
    if (momentCapturePending) {
      // The chunk immediately after the H3 marker becomes the moment text.
      // If somehow it's another H3 or a bold question, abandon the capture
      // (no moment for this article) and keep walking.
      momentCapturePending = false
      if (/^<p\b/i.test(chunk) && !matchBoldQuestion(chunk)) {
        grandMoment = {
          text:         stripTags(chunk),
          afterQAIndex: qaPairs.length - 1,
        }
        continue
      }
      // Fall through to handle this chunk normally below.
    }

    if (isGrandMomentHeading(chunk)) {
      flushPair()
      momentCapturePending = true
      continue
    }

    if (/^<h3\b/i.test(chunk)) {
      // Non-moment H3 — treat as a section break inside the current
      // answer (rare in interview content). Append to current answer
      // if we're inside one; otherwise drop.
      if (seenFirstQuestion) currentAnswer.push(chunk)
      continue
    }

    const q = matchBoldQuestion(chunk)
    if (q !== null) {
      flushPair()
      seenFirstQuestion = true
      currentQuestion   = q
      continue
    }
    if (!seenFirstQuestion) {
      introParas.push(chunk)
    } else {
      currentAnswer.push(chunk)
    }
  }
  flushPair()

  return { leadPullQuote, qaPairs, introParas, grandMoment }
}
