// Parse a Mom-to-Mom article body into the structured parts the feature
// treatment needs:
//   - leadPullQuote:  the FIRST <blockquote> lifted out for MomPullQuote
//   - introParas:     paragraphs before the Q&A starts (lede)
//   - qaPairs:        { question, answer } pairs detected from the body
//   - rapidFireItems: { question, answer } items from a "Rapid Fire"
//                     section
//
// Two Q&A authoring conventions are supported (whichever is found first
// in the body wins, so editors can mix-and-match across articles but
// not within one):
//
//   1. Speaker labels — `<p>RRP: question?</p>` followed by
//      `<p>PP: answer.</p>`. This is the convention every existing
//      Mom-to-Mom article uses (RRP = River Region Parents,
//      PP/HD/etc. = subject's initials).
//
//   2. Bold question paragraph — `<p><strong>question?</strong></p>`
//      followed by one or more plain answer paragraphs (the Grands
//      convention). Used when the author wants the prompt to stand
//      out without using speaker initials.
//
// Rapid Fire is detected as an H2/H3 (or bolded paragraph) reading
// "Rapid Fire" / "Rapid Fire Questions" and slices the chunks until
// the next heading or a long prose paragraph with no `?`.

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

// Editorial labels that LOOK like speakers / questions but aren't.
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

// Match a paragraph that opens with a speaker label (`Name: text`).
// Returns the speaker initials/name and the cleaned body text (with
// the `Name:` prefix and any wrapping <strong> stripped, but other
// inline HTML preserved so links survive). Returns null if the
// paragraph doesn't look like a speaker line.
//
// We allow letters, periods, apostrophes, spaces, hyphens in the
// speaker name (handles "RRP", "Phyllis P.", "Dr. Watson"). Max 30
// chars on the name prevents long sentence-starts from false-matching.
function matchSpeakerLine(pHtml: string): { speaker: string; bodyHtml: string } | null {
  const m = pHtml.match(/^<p\b[^>]*>\s*(?:<strong\b[^>]*>)?\s*([A-Z][A-Za-z0-9 .'\-]{0,30}?)\s*:\s*(?:<\/strong>)?\s*([\s\S]+?)\s*<\/p>\s*$/i)
  if (!m) return null
  const speaker = m[1].trim()
  if (speaker.length < 1 || speaker.length > 30) return null
  if (/^https?$/i.test(speaker)) return null
  if (NON_QUESTION_LABELS.has(speaker.toLowerCase())) return null
  return { speaker, bodyHtml: m[2].trim() }
}

function splitQuoteAndAttribution(raw: string): { quote: string; attribution: string } {
  const cleaned = stripTags(raw).replace(/[“”"]/g, '').trim()
  const m = cleaned.match(/^([\s\S]+?)\s*[—–-]\s*([^—–-]+)$/)
  if (m) return { quote: m[1].trim(), attribution: m[2].trim() }
  return { quote: cleaned, attribution: '' }
}

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

function isRapidFireEnd(chunk: string): boolean {
  if (/^<h(?:1|2)\b/i.test(chunk)) return true
  if (/^<blockquote\b/i.test(chunk)) return true
  const text = stripTags(chunk)
  return text.length > 80 && !text.includes('?')
}

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

// Decide whether this body uses speaker-label Q&A by scanning the first
// ~20 chunks for at least one Speaker: text paragraph that ends with a
// question mark AND at least one OTHER distinct speaker afterward.
// Catches the RRP/PP convention without false-positiving on a single
// "Editor: note" line.
function detectsSpeakerConvention(chunks: string[]): { questioner: string; answerer: string } | null {
  const seen: Array<{ speaker: string; isQuestion: boolean }> = []
  for (const chunk of chunks.slice(0, 20)) {
    const line = matchSpeakerLine(chunk)
    if (!line) continue
    const cleanText = stripTags(line.bodyHtml)
    seen.push({ speaker: line.speaker, isQuestion: cleanText.includes('?') })
  }
  // Find the first speaker who asks a question and any distinct second
  // speaker who appears after them.
  const firstQuestioner = seen.find(s => s.isQuestion)
  if (!firstQuestioner) return null
  const firstQuestionerIdx = seen.indexOf(firstQuestioner)
  const otherSpeaker = seen.slice(firstQuestionerIdx + 1)
    .find(s => s.speaker !== firstQuestioner.speaker)
  if (!otherSpeaker) return null
  return { questioner: firstQuestioner.speaker, answerer: otherSpeaker.speaker }
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

  const chunks = workingBody.match(PARA_OR_HEADING_RE) ?? []

  // 2. Slice out the Rapid Fire range first — anything inside it is
  //    parsed separately and the chunks are removed from the main walk.
  const rapidFireChunks: string[] = []
  const mainChunks: string[] = []
  let inRapidFire = false
  for (const chunk of chunks) {
    if (!inRapidFire && isRapidFireHeading(chunk)) {
      inRapidFire = true
      continue
    }
    if (inRapidFire) {
      if (isRapidFireEnd(chunk)) {
        inRapidFire = false
        mainChunks.push(chunk)
      } else {
        rapidFireChunks.push(chunk)
      }
      continue
    }
    mainChunks.push(chunk)
  }
  const rapidFireItems = parseRapidFireItems(rapidFireChunks)

  // 3. Walk the main chunks. Decide convention up-front (speaker-label
  //    vs bold-paragraph). Speaker convention wins when both are
  //    present since it's what most existing Mom content uses.
  const introParas: string[] = []
  const qaPairs: MomBodyParts['qaPairs'] = []
  const speakerCfg = detectsSpeakerConvention(mainChunks)

  if (speakerCfg) {
    // Speaker-label mode: questioner lines start questions, answerer
    // lines append to the current answer. Lines from any other speaker
    // are treated as continuations of the current answer. Non-speaker
    // paragraphs before the first question = intro; non-speaker
    // paragraphs after the last QA = outro (dropped — bio renders
    // separately upstream if needed).
    let seenFirstQuestion = false
    let currentQuestion: string | null = null
    const currentAnswerParts: string[] = []
    const flush = () => {
      if (currentQuestion !== null) {
        qaPairs.push({ question: currentQuestion, answer: currentAnswerParts.join('') })
        currentQuestion = null
        currentAnswerParts.length = 0
      }
    }
    for (const chunk of mainChunks) {
      const line = matchSpeakerLine(chunk)
      if (line && line.speaker === speakerCfg.questioner) {
        flush()
        seenFirstQuestion = true
        currentQuestion = line.bodyHtml
        continue
      }
      if (line && line.speaker === speakerCfg.answerer) {
        if (seenFirstQuestion) {
          currentAnswerParts.push(`<p>${line.bodyHtml}</p>`)
        }
        continue
      }
      // Not a speaker line — intro before the first Q, otherwise treat
      // as a continuation of the current answer (e.g. an unlabeled
      // paragraph the editor left between answer paragraphs).
      if (!seenFirstQuestion) {
        if (/^<p\b/i.test(chunk)) introParas.push(chunk)
      } else if (currentQuestion !== null && /^<p\b/i.test(chunk)) {
        currentAnswerParts.push(chunk)
      }
    }
    flush()
  } else {
    // Bold-paragraph mode (Grands convention).
    let seenFirstQuestion = false
    let currentQuestion: string | null = null
    const currentAnswerParts: string[] = []
    const flush = () => {
      if (currentQuestion !== null) {
        qaPairs.push({ question: currentQuestion, answer: currentAnswerParts.join('') })
        currentQuestion = null
        currentAnswerParts.length = 0
      }
    }
    for (const chunk of mainChunks) {
      const q = matchBoldQuestion(chunk)
      if (q !== null) {
        flush()
        seenFirstQuestion = true
        currentQuestion = q
        continue
      }
      if (!seenFirstQuestion) {
        if (/^<p\b/i.test(chunk)) introParas.push(chunk)
      } else {
        currentAnswerParts.push(chunk)
      }
    }
    flush()
  }

  return { leadPullQuote, qaPairs, introParas, rapidFireItems }
}
