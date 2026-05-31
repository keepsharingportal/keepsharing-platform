// Parse a Mom-to-Mom article body into the structured parts the feature
// treatment needs:
//   - leadPullQuote: the FIRST <blockquote> lifted out for MomPullQuote
//   - qaPairs:       bold-question paragraph + following non-question
//                    paragraphs grouped as { question, answer } pairs
//   - introParas:    paragraphs before the first question (lede + setup)
//
// Mirrors GrandsBodyParts so editors can author Mom articles using the
// same "bold question on its own paragraph + answer paragraph(s) below"
// convention they already use for Grands.

export interface MomBodyParts {
  leadPullQuote: { quote: string; attribution: string } | null
  qaPairs:       Array<{ question: string; answer: string }>
  introParas:    string[]
}

const PARA_RE       = /<p\b[^>]*>[\s\S]*?<\/p>/gi
const BLOCKQUOTE_RE = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/i

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

// Editorial labels that LOOK like bold paragraphs but aren't questions.
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

function splitQuoteAndAttribution(raw: string): { quote: string; attribution: string } {
  const cleaned = stripTags(raw).replace(/[“”"]/g, '').trim()
  const m = cleaned.match(/^([\s\S]+?)\s*[—–-]\s*([^—–-]+)$/)
  if (m) return { quote: m[1].trim(), attribution: m[2].trim() }
  return { quote: cleaned, attribution: '' }
}

export function parseMomBody(bodyHtml: string): MomBodyParts {
  let workingBody = bodyHtml
  let leadPullQuote: MomBodyParts['leadPullQuote'] = null
  const bqMatch = bodyHtml.match(BLOCKQUOTE_RE)
  if (bqMatch) {
    const split = splitQuoteAndAttribution(bqMatch[1])
    if (split.quote) leadPullQuote = split
    workingBody = bodyHtml.replace(bqMatch[0], '')
  }

  const paras = workingBody.match(PARA_RE) ?? []
  const introParas: string[] = []
  const qaPairs: MomBodyParts['qaPairs'] = []
  let seenFirstQuestion = false
  let currentAnswer: string[] = []
  let currentQuestion: string | null = null

  const flushPair = () => {
    if (currentQuestion !== null) {
      qaPairs.push({ question: currentQuestion, answer: currentAnswer.join('\n') })
      currentQuestion = null
      currentAnswer   = []
    }
  }

  for (const p of paras) {
    const q = matchBoldQuestion(p)
    if (q !== null) {
      flushPair()
      seenFirstQuestion = true
      currentQuestion   = q
      continue
    }
    if (!seenFirstQuestion) {
      introParas.push(p)
    } else {
      currentAnswer.push(p)
    }
  }
  flushPair()

  return { leadPullQuote, qaPairs, introParas }
}
