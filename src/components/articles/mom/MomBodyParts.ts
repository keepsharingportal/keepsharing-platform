// Parse a Mom-to-Mom article body into the structured parts the feature
// treatment needs:
//   - leadPullQuote:  the FIRST <blockquote> lifted out for MomPullQuote
//   - introParas:     paragraphs before the first bold question (lede)
//   - qaPairs:        bold-question paragraphs + their following answer
//                     paragraphs grouped as { question, answer }
//   - rapidFireItems: { question, answer } items parsed out of a section
//                     headed by "Rapid Fire" (H2/H3 or a plain bolded
//                     paragraph). When present, these chunks are removed
//                     from the Q&A walk so the same content doesn't
//                     render twice.
//
// Same authoring conventions as Grands so editors don't have to learn
// a different pattern: bold question on its own paragraph, answer in
// paragraphs below, and an H2 (or bold paragraph) "Rapid Fire" header
// followed by numbered/short-form Q&A items.

export interface MomBodyParts {
  leadPullQuote:  { quote: string; attribution: string } | null
  qaPairs:        Array<{ question: string; answer: string }>
  introParas:     string[]
  rapidFireItems: Array<{ question: string; answer: string }>
}

const PARA_OR_HEADING_RE = /<(?:p|h2|h3)\b[^>]*>[\s\S]*?<\/(?:p|h2|h3)>/gi
const BLOCKQUOTE_RE      = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/i

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

const NON_QUESTION_LABELS = new Set([
  'bio', 'note', 'editor’s note', "editor's note", 'editors note', 'editor note',
  'update', 'source', 'photo', 'caption', 'p.s.', 'ps', 'sidebar', 'tip', 'pro tip',
  'rapid fire', 'rapid fire questions', 'rapidfire',
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

// Match a Rapid Fire heading — either an H2/H3 whose text contains
// "rapid fire" or a plain paragraph whose entire text reads "Rapid
// Fire" / "Rapid Fire Questions" (some editors don't use H2 buttons).
function isRapidFireHeading(chunk: string): boolean {
  if (/^<h(?:2|3)\b[^>]*>\s*(?:<strong\b[^>]*>)?[\s\S]*?rapid\s*fire[\s\S]*?<\/(?:strong>\s*)?<\/h(?:2|3)>\s*$/i.test(chunk)) {
    return true
  }
  if (/^<p\b/i.test(chunk)) {
    const text = stripTags(chunk)
    return /^rapid\s*fire(?:\s*questions?)?\s*[!.:?]?$/i.test(text)
  }
  return false
}

// Stop scanning the rapid-fire range when we hit another heading or a
// long prose paragraph with no `?` (likely the bio paragraph editors
// sometimes leave at the end of the file without a heading between).
function isRapidFireEnd(chunk: string): boolean {
  if (/^<h(?:1|2)\b/i.test(chunk)) return true
  if (/^<blockquote\b/i.test(chunk)) return true
  const text = stripTags(chunk)
  return text.length > 80 && !text.includes('?')
}

// Parse "1. Question? Answer." style paragraphs into Q/A items. Short
// continuation paragraphs (no `?`) are appended to the previous answer.
function parseRapidFireItems(chunks: string[]): Array<{ question: string; answer: string }> {
  const items: Array<{ question: string; answer: string }> = []
  for (const chunk of chunks) {
    const raw     = stripTags(chunk)
    if (!raw) continue
    const cleaned = raw.replace(/^\s*\d+\s*[.)\]]\s*/, '').trim()
    const qIdx    = cleaned.indexOf('?')
    if (qIdx !== -1) {
      const question = cleaned.substring(0, qIdx + 1).trim()
      const answer   = cleaned.substring(qIdx + 1).trim()
      items.push({ question, answer })
    } else if (items.length > 0) {
      const last = items[items.length - 1]
      last.answer = (last.answer + ' ' + cleaned).trim()
    }
  }
  return items
}

export function parseMomBody(bodyHtml: string): MomBodyParts {
  // 1. Lift the FIRST <blockquote> as the pull quote
  let workingBody = bodyHtml
  let leadPullQuote: MomBodyParts['leadPullQuote'] = null
  const bqMatch = bodyHtml.match(BLOCKQUOTE_RE)
  if (bqMatch) {
    const split = splitQuoteAndAttribution(bqMatch[1])
    if (split.quote) leadPullQuote = split
    workingBody = bodyHtml.replace(bqMatch[0], '')
  }

  // 2. Walk paragraphs/headings. Rapid Fire heading triggers a separate
  //    collection pass for that range; everything else feeds Q&A.
  const chunks = workingBody.match(PARA_OR_HEADING_RE) ?? []
  const introParas: string[] = []
  const qaPairs: MomBodyParts['qaPairs'] = []
  const rapidFireChunks: string[] = []
  let seenFirstQuestion = false
  let inRapidFire = false
  let currentAnswer: string[] = []
  let currentQuestion: string | null = null

  const flushPair = () => {
    if (currentQuestion !== null) {
      qaPairs.push({ question: currentQuestion, answer: currentAnswer.join('\n') })
      currentQuestion = null
      currentAnswer   = []
    }
  }

  for (const chunk of chunks) {
    if (!inRapidFire && isRapidFireHeading(chunk)) {
      flushPair()
      inRapidFire = true
      continue
    }
    if (inRapidFire) {
      if (isRapidFireEnd(chunk)) {
        inRapidFire = false
        // fall through — handle this chunk normally below
      } else {
        rapidFireChunks.push(chunk)
        continue
      }
    }

    const q = matchBoldQuestion(chunk)
    if (q !== null) {
      flushPair()
      seenFirstQuestion = true
      currentQuestion   = q
      continue
    }
    if (!seenFirstQuestion) {
      // Intro accepts plain <p> paragraphs only — headings before the
      // first question are dropped (typically there aren't any).
      if (/^<p\b/i.test(chunk)) introParas.push(chunk)
    } else {
      currentAnswer.push(chunk)
    }
  }
  flushPair()

  const rapidFireItems = parseRapidFireItems(rapidFireChunks)

  return { leadPullQuote, qaPairs, introParas, rapidFireItems }
}
