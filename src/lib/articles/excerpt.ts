// ── Article excerpt derivation ────────────────────────────────────────
//
// Shared helper for pulling a ~160-char teaser out of an article's
// body when the editor hasn't hand-written an excerpt. Sentence-aware
// (trims at a sentence boundary when one falls in the sweet spot) and
// strips HTML + common markdown so the output is clean plain text.
//
// Used by every card render surface (Latest Stories on the homepage,
// column landing pages, district hub archive cards) so cards always
// carry a teaser line instead of just a title.

const MAX_CHARS = 160

export function deriveLeadFromBody(body: string | null | undefined): string {
  if (!body) return ''
  const stripped = body
    .replace(/<\/?[^>]+>/g, ' ')                      // HTML tags
    .replace(/[#*_>`~]+/g, ' ')                       // markdown noise
    .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')            // markdown images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')          // markdown links → link text
    .replace(/\s+/g, ' ')
    .trim()

  if (!stripped) return ''
  if (stripped.length <= MAX_CHARS) return stripped

  // Prefer a sentence boundary in the 60..MAX_CHARS window so the
  // teaser reads as a complete thought when possible.
  const window = stripped.slice(0, MAX_CHARS + 40)
  const sentenceEnd = window.search(/[.!?]\s/)
  if (sentenceEnd >= 60 && sentenceEnd <= MAX_CHARS) {
    return window.slice(0, sentenceEnd + 1)
  }
  // Otherwise trim at the last whole word and add ellipsis.
  return stripped.slice(0, MAX_CHARS - 1).replace(/\s+\S*$/, '') + '…'
}
