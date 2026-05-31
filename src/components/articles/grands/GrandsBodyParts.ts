// Parse a sanitized article body into the structured parts the Grands
// feature treatment needs:
//   - leadPullQuote: the FIRST <blockquote> in the body (extracted so the
//                    feature hero can render it as a styled PullQuote)
//   - qaPairs:       { question, answer } pairs detected as bold-question
//                    paragraph + the following non-question paragraphs
//   - introParas:    paragraphs before the Q&A section (lede + setup)
//   - outroParas:    paragraphs after the Q&A section (closing thoughts)
//
// HTML is split lightly; the existing ArticleBody chunk splitter is too
// coupled to the standard rendering path so this is its own pass.

export interface GrandsBodyParts {
  leadPullQuote: { quote: string; attribution: string } | null
  qaPairs:       Array<{ question: string; answer: string }>
  introParas:    string[]
  outroParas:    string[]
}

const PARA_RE       = /<p\b[^>]*>[\s\S]*?<\/p>/gi
const BLOCKQUOTE_RE = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/i

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

// Detect a bold-question paragraph: <p><strong>question...?</strong></p>.
// Returns the inner question text (with HTML preserved) when it matches.
function matchBoldQuestion(pHtml: string): string | null {
  const m = pHtml.match(/^<p\b[^>]*>\s*<strong\b[^>]*>([\s\S]+?)<\/strong>\s*<\/p>\s*$/i)
  if (!m) return null
  const text = stripTags(m[1])
  if (!/\?\s*$/.test(text)) return null
  return m[1].trim()
}

// Detect an em-dash attribution like "— Debbie Peavy" from the end of a
// blockquote — used to split the quote text from its attribution when the
// editor put them inside the same blockquote.
function splitQuoteAndAttribution(raw: string): { quote: string; attribution: string } {
  const cleaned = stripTags(raw).replace(/[“”"]/g, '').trim()
  const m = cleaned.match(/^([\s\S]+?)\s*[—–-]\s*([^—–-]+)$/)
  if (m) return { quote: m[1].trim(), attribution: m[2].trim() }
  return { quote: cleaned, attribution: '' }
}

export function parseGrandsBody(bodyHtml: string): GrandsBodyParts {
  // 1. Extract the FIRST blockquote — that becomes the feature pull quote
  let workingBody = bodyHtml
  let leadPullQuote: GrandsBodyParts['leadPullQuote'] = null
  const bqMatch = bodyHtml.match(BLOCKQUOTE_RE)
  if (bqMatch) {
    const split = splitQuoteAndAttribution(bqMatch[1])
    if (split.quote) leadPullQuote = split
    // Remove the blockquote from the body so it doesn't render twice
    workingBody = bodyHtml.replace(bqMatch[0], '')
  }

  // 2. Walk paragraphs, group bold-question + following paragraphs into
  //    Q&A pairs. Paragraphs before the first question = intro; paragraphs
  //    after the last grouped answer (when another question doesn't follow)
  //    that AREN'T inside the Q&A chain = outro. Implementation: paragraphs
  //    before the first question are intro; everything from first question
  //    onward gets grouped into Q&A pairs.
  const paras = workingBody.match(PARA_RE) ?? []
  const introParas: string[] = []
  const qaPairs: GrandsBodyParts['qaPairs'] = []
  let outroParas: string[] = []
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

  // Heuristic: if the last Q&A's answer ends with a closing-thought
  // paragraph (more than ~80 chars and reads as outro), the editor may
  // have written closing prose. For now we leave everything inside the
  // pairs — editors can use a heading or other marker for closing thoughts
  // if needed. outroParas stays empty in this pass.
  outroParas = []

  return { leadPullQuote, qaPairs, introParas, outroParas }
}
