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
  qaPairs:       Array<{ question: string; answer: string; iconHint: string | null }>
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

// Optional icon-hint prefix at the start of a question: `[heart] What
// has been the sweetest part of becoming a grandparent?` Editors can
// drop this in the bold question text when they want a specific icon
// match; otherwise GrandsBody falls back to the rotating icon set.
const ICON_HINT_RE = /^\s*\[([a-z][a-z0-9_-]{0,20})\]\s*/i

function matchBoldQuestion(pHtml: string): { html: string; iconHint: string | null } | null {
  const m = pHtml.match(/^<p\b[^>]*>\s*<strong\b[^>]*>([\s\S]+?)<\/strong>\s*<\/p>\s*$/i)
  if (!m) return null
  const text = stripTags(m[1])
  if (text.length < 3 || text.length > 280) return null
  const norm = text.replace(/[:.!?\s]+$/g, '').toLowerCase().trim()
  if (NON_QUESTION_LABELS.has(norm)) return null

  // Check for an optional [icon-name] prefix. The hint can appear inside
  // the <strong> wrapper either before or after any whitespace.
  let inner    = m[1].trim()
  let iconHint: string | null = null
  const hintMatch = inner.match(ICON_HINT_RE)
  if (hintMatch) {
    iconHint = hintMatch[1].toLowerCase()
    inner    = inner.replace(ICON_HINT_RE, '').trim()
  }
  return { html: inner, iconHint }
}

// Heuristic prompt-directive detector: an interview prompt often starts
// with the subject's name + comma + a directive verb ("Jacqueline, tell
// us about your grandchildren."). Ends in a period, not a question mark,
// so matchProseQuestion below misses it. This catches that pattern so
// natural interview prose gets styled Q&A cards without asking the
// editor to bold anything.
const DIRECTIVE_VERBS = /(tell|share|walk|describe|give|talk|explain|show|say|paint|take|start)/i
const NAME_PREFIX_RE  = /^[“"']?[A-Z][A-Za-z'-]{1,20}[,]\s+/  // "Jacqueline, ..." / "Big Al, ..."
function matchDirectivePrompt(pHtml: string): { html: string; iconHint: string | null } | null {
  const inner = pHtml.match(/^<p\b[^>]*>([\s\S]*?)<\/p>\s*$/i)
  if (!inner) return null
  const raw  = inner[1].trim()
  const text = stripTags(raw)
  if (text.length < 8 || text.length > 200) return null
  if (!NAME_PREFIX_RE.test(text)) return null
  // The word AFTER the comma must be a directive verb — rules out
  // "Sarah, my mother, used to say..." which isn't a prompt.
  const afterComma = text.replace(NAME_PREFIX_RE, '')
  if (!DIRECTIVE_VERBS.test(afterComma.split(/\s+/)[0] ?? '')) return null
  // Must be one short line, not a paragraph that starts with a name.
  const terminatorCount = (text.match(/[.!?]/g) || []).length
  if (terminatorCount > 1) return null
  if (/<(blockquote|ul|ol|table|figure)\b/i.test(raw)) return null
  return { html: raw, iconHint: null }
}

// Heuristic question detector: a paragraph is a question if the WHOLE
// paragraph is a single short line (< 260 chars) ending in "?". Falls
// back for editors who type Q&A prose naturally instead of remembering
// to bold each question with the toolbar's B button. Keeps the parser
// permissive so the branded Q&A cards render "for free" on every
// spotlight, matching June's polished template.
//
// Guardrails: must be short-form (rules out multi-sentence answers that
// happen to end in ?), must not be in the NON_QUESTION_LABELS bucket,
// and must not contain a nested blockquote/list (structural content).
function matchProseQuestion(pHtml: string): { html: string; iconHint: string | null } | null {
  const inner = pHtml.match(/^<p\b[^>]*>([\s\S]*?)<\/p>\s*$/i)
  if (!inner) return null
  const raw  = inner[1].trim()
  const text = stripTags(raw)
  if (text.length < 6 || text.length > 260) return null
  if (!/\?[\s”"']*$/.test(text)) return null
  // Reject if there's more than one sentence terminator inside the
  // paragraph (a question is one line, not a paragraph closing on ?).
  const terminatorCount = (text.match(/[.!?]/g) || []).length
  if (terminatorCount > 2) return null
  const norm = text.replace(/[:.!?\s”"']+$/g, '').toLowerCase().trim()
  if (NON_QUESTION_LABELS.has(norm)) return null
  // Nested structural elements → not a Q prompt.
  if (/<(blockquote|ul|ol|table|figure)\b/i.test(raw)) return null

  let cleaned  = raw
  let iconHint: string | null = null
  const hintMatch = cleaned.match(ICON_HINT_RE)
  if (hintMatch) {
    iconHint = hintMatch[1].toLowerCase()
    cleaned  = cleaned.replace(ICON_HINT_RE, '').trim()
  }
  return { html: cleaned, iconHint }
}

// Prose lead-quote detector: when the article body doesn't wrap the
// lede in <blockquote>, but the FIRST paragraph is a short quoted line
// (curly or straight quotes, < 320 chars), lift it as the pull quote
// so the purple hero card renders. Same "editors type naturally"
// story as matchProseQuestion.
function matchProseLeadQuote(pHtml: string): { quote: string; attribution: string } | null {
  const inner = pHtml.match(/^<p\b[^>]*>([\s\S]*?)<\/p>\s*$/i)
  if (!inner) return null
  const text = stripTags(inner[1])
  if (text.length < 8 || text.length > 320) return null
  // Must open with an opening quote character and close with one too.
  if (!/^[“"'‘][\s\S]+[”"'’]/.test(text)) return null
  return splitQuoteAndAttribution(text)
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
  // 1. Lift the FIRST <blockquote> as the pull quote. When the editor
  //    didn't use the blockquote button, fall back to detecting a
  //    quoted first paragraph — that covers the natural "editor types
  //    prose" case where the lede quote is just wrapped in "…" chars.
  let workingBody = bodyHtml
  let leadPullQuote: GrandsBodyParts['leadPullQuote'] = null
  const bqMatch = bodyHtml.match(BLOCKQUOTE_RE)
  if (bqMatch) {
    const split = splitQuoteAndAttribution(bqMatch[1])
    if (split.quote) leadPullQuote = split
    workingBody = bodyHtml.replace(bqMatch[0], '')
  } else {
    const firstPara = bodyHtml.match(/<p\b[^>]*>[\s\S]*?<\/p>/i)
    if (firstPara) {
      const prose = matchProseLeadQuote(firstPara[0])
      if (prose?.quote) {
        leadPullQuote = prose
        workingBody = bodyHtml.replace(firstPara[0], '')
      }
    }
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
  let currentIconHint: string | null = null
  let momentCapturePending = false

  const flushPair = () => {
    if (currentQuestion !== null) {
      qaPairs.push({
        question: currentQuestion,
        answer:   currentAnswer.join('\n'),
        iconHint: currentIconHint,
      })
      currentQuestion = null
      currentAnswer   = []
      currentIconHint = null
    }
  }

  for (const chunk of chunks) {
    if (momentCapturePending) {
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
      if (seenFirstQuestion) currentAnswer.push(chunk)
      continue
    }

    // Question detection cascade:
    //   1. Bold-wrapped (editor used the B button — winning convention).
    //   2. Directive prompt ("Jacqueline, tell us about your...") —
    //      catches statement-form prompts common in real interviews.
    //   3. Prose question (short paragraph ending in "?") — catches
    //      standard question-form prompts.
    // Any of the three lifts the paragraph into a Q&A card so natural
    // interview prose renders as the branded template with zero
    // formatting hints from the editor.
    const q = matchBoldQuestion(chunk) ?? matchDirectivePrompt(chunk) ?? matchProseQuestion(chunk)
    if (q !== null) {
      flushPair()
      seenFirstQuestion = true
      currentQuestion   = q.html
      currentIconHint   = q.iconHint
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
