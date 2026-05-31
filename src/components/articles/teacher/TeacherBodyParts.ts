// Extract the FIRST blockquote from a Teacher article body so the
// feature treatment can lift it out into the styled TeacherPullQuote.
// Returns the cleaned quote text + attribution (split on em/en/hyphen
// dash) and the body HTML with the blockquote removed so it doesn't
// render twice.

export interface TeacherBodyParts {
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

export function parseTeacherBody(bodyHtml: string): TeacherBodyParts {
  const bqMatch = bodyHtml.match(BLOCKQUOTE_RE)
  if (!bqMatch) return { leadPullQuote: null, body: bodyHtml }
  const split = splitQuoteAndAttribution(bqMatch[1])
  if (!split.quote) return { leadPullQuote: null, body: bodyHtml }
  return {
    leadPullQuote: split,
    body:          bodyHtml.replace(bqMatch[0], ''),
  }
}
