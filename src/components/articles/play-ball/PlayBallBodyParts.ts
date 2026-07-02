// Extract the FIRST blockquote from a Play Ball article body so the
// feature treatment can lift it out into the styled PlayBallPullQuote.
// Returns the cleaned quote text + attribution (split on em/en dash) and
// the body HTML with the blockquote removed so it doesn't render twice.

export interface PlayBallBodyParts {
  leadPullQuote: { quote: string; attribution: string } | null
  body:          string
}

const BLOCKQUOTE_RE = /<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>/i

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, '').trim()
}

function splitQuoteAndAttribution(raw: string): { quote: string; attribution: string } {
  const cleaned = stripTags(raw).replace(/[“”"]/g, '').trim()
  const m = cleaned.match(/^([\s\S]+?)\s*[—–-]\s*([^—–-]+)$/)
  if (m) return { quote: m[1].trim(), attribution: m[2].trim() }
  return { quote: cleaned, attribution: '' }
}

// Prose lead-quote fallback: when the editor didn't wrap the lede in
// <blockquote>, treat a quoted first paragraph as the pull quote. Same
// story as the Grands parser — editors type naturally and the branded
// treatment renders "for free."
function matchProseLeadQuote(pHtml: string): { quote: string; attribution: string } | null {
  const inner = pHtml.match(/^<p\b[^>]*>([\s\S]*?)<\/p>\s*$/i)
  if (!inner) return null
  const text = stripTags(inner[1])
  if (text.length < 8 || text.length > 320) return null
  if (!/^[“"'‘][\s\S]+[”"'’]/.test(text)) return null
  return splitQuoteAndAttribution(text)
}

export function parsePlayBallBody(bodyHtml: string): PlayBallBodyParts {
  const bqMatch = bodyHtml.match(BLOCKQUOTE_RE)
  if (bqMatch) {
    const split = splitQuoteAndAttribution(bqMatch[1])
    if (split.quote) {
      return { leadPullQuote: split, body: bodyHtml.replace(bqMatch[0], '') }
    }
  }
  const firstPara = bodyHtml.match(/<p\b[^>]*>[\s\S]*?<\/p>/i)
  if (firstPara) {
    const prose = matchProseLeadQuote(firstPara[0])
    if (prose?.quote) {
      return { leadPullQuote: prose, body: bodyHtml.replace(firstPara[0], '') }
    }
  }
  return { leadPullQuote: null, body: bodyHtml }
}
