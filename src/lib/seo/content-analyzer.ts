// ── Content analyzer — 12-factor on-page SEO score ──────────────────────────
//
// Grades an article on the factors Google actually weighs for on-page
// SEO. Score is 0-100; the breakdown tells the editor WHY they lost
// points so they can fix specifics rather than guess.
//
// Run on every article edit (server-side from the API) + on every
// weekly audit. Stored in guide_articles.seo_score +
// seo_score_breakdown.
//
// Inspired by the analysis pillars Yoast / Rank Math grade on, but
// tuned for local-news family content (not e-commerce).

export interface AnalyzerInput {
  /** Article title (rendered <h1>). */
  title:              string
  /** Editor-tuned SEO title (if set). */
  seoTitle?:          string | null
  /** Excerpt / dek (used as meta description fallback). */
  excerpt?:           string | null
  /** Editor-tuned meta description (if set). */
  seoDescription?:    string | null
  /** Focus keyword the article targets. */
  focusKeyword?:      string | null
  /** Secondary keywords (LSI / related). */
  secondaryKeywords?: string[]
  /** Article body — HTML (we'll strip tags for analysis). */
  bodyHtml:           string
  /** Article URL slug (the last path segment). */
  slug:               string
  /** Hero image URL — counts toward image factor. */
  heroImageUrl?:      string | null
  /** Whether the hero image has alt text set (caller should pass true
   *  if alt is present, false if missing). When unknown, leave undefined. */
  heroImageHasAlt?:   boolean
  /** Count of internal links (to other pages on our domain) in the body. */
  internalLinkCount?: number
  /** Count of external links in the body. */
  externalLinkCount?: number
}

export interface FactorResult {
  /** Stable identifier — let the UI key on this and persist across runs. */
  key:        string
  /** Human label shown in the breakdown UI. */
  label:      string
  /** 0-N points earned on this factor. */
  score:      number
  /** Max points this factor can contribute. */
  max:        number
  /** 'pass' = full points, 'partial' = some, 'fail' = zero. */
  status:     'pass' | 'partial' | 'fail'
  /** Editor-facing explanation of what passed/failed and how to fix. */
  notes:      string
}

export interface AnalyzerResult {
  /** 0-100 overall score (sum(score) / sum(max) * 100, rounded). */
  score:      number
  /** Per-factor results in display order. */
  breakdown:  FactorResult[]
  /** Convenience pre-rolled grade for the badge UI. */
  grade:      'excellent' | 'good' | 'needs-work' | 'poor'
}

const TITLE_MIN  = 30, TITLE_MAX  = 65
const DESC_MIN   = 110, DESC_MAX  = 160
const SLUG_MAX   = 75
const BODY_MIN   = 300
const BODY_IDEAL = 800

function stripHtml(html: string): string {
  return (html ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi,  ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length
}

function countSentences(text: string): number {
  return (text.match(/[.!?]+/g) ?? []).length || 1
}

function lc(s: string | null | undefined): string {
  return (s ?? '').toLowerCase()
}

/** Flesch reading ease score — higher = easier to read. */
function fleschReadingEase(text: string): number {
  const words      = countWords(text)
  const sentences  = countSentences(text)
  if (words === 0) return 0
  const syllables  = text.split(/\s+/).reduce((sum, w) => sum + estimateSyllables(w), 0)
  // Flesch Reading Ease: 206.835 - 1.015 * (words/sentences) - 84.6 * (syllables/words)
  return 206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words)
}

function estimateSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '')
  if (!w) return 0
  // Naive: count vowel groups; subtract trailing silent e.
  const groups = w.match(/[aeiouy]+/g) ?? []
  let count = groups.length
  if (w.endsWith('e') && count > 1) count -= 1
  return Math.max(1, count)
}

export function analyzeArticle(input: AnalyzerInput): AnalyzerResult {
  const breakdown: FactorResult[] = []
  const text     = stripHtml(input.bodyHtml)
  const wordCount = countWords(text)
  const titleForRanking = input.seoTitle?.trim() || input.title
  const descForRanking  = input.seoDescription?.trim() || input.excerpt?.trim() || ''
  const fk      = (input.focusKeyword ?? '').trim()
  const fkLower = fk.toLowerCase()
  const slug    = input.slug ?? ''

  // ── 1. Title length ─────────────────────────────────────────────────────
  {
    const len = titleForRanking.length
    let score = 0
    let status: FactorResult['status'] = 'fail'
    let notes  = ''
    if (len >= TITLE_MIN && len <= TITLE_MAX) {
      score = 10; status = 'pass'
      notes = `Title is ${len} chars — in the ${TITLE_MIN}-${TITLE_MAX} sweet spot.`
    } else if (len > 0 && len < TITLE_MIN) {
      score = 4; status = 'partial'
      notes = `Title is short (${len} chars). Aim for ${TITLE_MIN}-${TITLE_MAX} for SERP impact.`
    } else if (len > TITLE_MAX) {
      score = 6; status = 'partial'
      notes = `Title is long (${len} chars) — Google will truncate after ~60.`
    } else {
      notes = 'Title is missing.'
    }
    breakdown.push({ key: 'title-length', label: 'Title length', score, max: 10, status, notes })
  }

  // ── 2. Title contains focus keyword ─────────────────────────────────────
  if (fk) {
    const found = lc(titleForRanking).includes(fkLower)
    const atStart = lc(titleForRanking).startsWith(fkLower)
    let score = 0
    let status: FactorResult['status'] = 'fail'
    let notes  = ''
    if (atStart)      { score = 12; status = 'pass';    notes = 'Focus keyword leads the title — strongest position for ranking.' }
    else if (found)   { score = 8;  status = 'partial'; notes = 'Focus keyword is in the title but not at the start.' }
    else              {              notes = `Title does not contain the focus keyword "${fk}".` }
    breakdown.push({ key: 'title-focus', label: 'Title contains focus keyword', score, max: 12, status, notes })
  } else {
    breakdown.push({ key: 'title-focus', label: 'Title contains focus keyword', score: 0, max: 12, status: 'fail',
      notes: 'No focus keyword set. Set one to enable keyword-based grading.' })
  }

  // ── 3. Meta description length ──────────────────────────────────────────
  {
    const len = descForRanking.length
    let score = 0
    let status: FactorResult['status'] = 'fail'
    let notes  = ''
    if (len >= DESC_MIN && len <= DESC_MAX) {
      score = 10; status = 'pass'
      notes = `Description is ${len} chars — in the ${DESC_MIN}-${DESC_MAX} sweet spot.`
    } else if (len > 0 && len < DESC_MIN) {
      score = 4; status = 'partial'
      notes = `Description is short (${len} chars). Expand to ${DESC_MIN}-${DESC_MAX} for SERP value.`
    } else if (len > DESC_MAX) {
      score = 6; status = 'partial'
      notes = `Description is long (${len} chars) — Google will truncate.`
    } else {
      notes = 'No meta description (excerpt is empty too). Add one — it controls the SERP snippet.'
    }
    breakdown.push({ key: 'desc-length', label: 'Meta description length', score, max: 10, status, notes })
  }

  // ── 4. Meta description contains focus keyword ──────────────────────────
  if (fk) {
    const has = lc(descForRanking).includes(fkLower)
    breakdown.push({
      key: 'desc-focus', label: 'Description contains focus keyword',
      score: has ? 6 : 0, max: 6,
      status: has ? 'pass' : 'fail',
      notes: has
        ? 'Focus keyword appears in the meta description — good.'
        : `Description does not contain "${fk}".`,
    })
  }

  // ── 5. Slug length + contains focus keyword ─────────────────────────────
  {
    let score = 0
    let status: FactorResult['status'] = 'fail'
    const notes: string[] = []
    if (slug.length > 0 && slug.length <= SLUG_MAX) { score += 3; notes.push(`Slug is ${slug.length} chars (good).`) }
    else if (slug.length > SLUG_MAX) notes.push(`Slug is ${slug.length} chars — trim to ≤${SLUG_MAX}.`)
    else                              notes.push('Slug is missing.')
    if (fk && slug.includes(fkLower.replace(/\s+/g, '-'))) { score += 4; notes.push('Focus keyword appears in the slug.') }
    else if (fk)                                            notes.push(`Slug doesn't include the focus keyword "${fk}".`)
    if (score >= 7) status = 'pass'
    else if (score >= 3) status = 'partial'
    breakdown.push({ key: 'slug', label: 'URL slug', score, max: 7, status, notes: notes.join(' ') })
  }

  // ── 6. Word count ───────────────────────────────────────────────────────
  {
    let score = 0
    let status: FactorResult['status'] = 'fail'
    let notes  = ''
    if (wordCount >= BODY_IDEAL)      { score = 12; status = 'pass';    notes = `${wordCount} words — substantial article.` }
    else if (wordCount >= BODY_MIN)   { score = 7;  status = 'partial'; notes = `${wordCount} words. Aim for ${BODY_IDEAL}+ for stronger ranking.` }
    else if (wordCount > 0)           {              notes = `${wordCount} words — too thin for ranking on competitive queries.` }
    else                              {              notes = 'Body is empty.' }
    breakdown.push({ key: 'word-count', label: 'Word count', score, max: 12, status, notes })
  }

  // ── 7. Focus keyword in first paragraph ─────────────────────────────────
  if (fk) {
    const firstPara = text.split(/\.\s/)[0] ?? text.slice(0, 200)
    const has = lc(firstPara).includes(fkLower)
    breakdown.push({
      key: 'kw-first-para', label: 'Focus keyword in first paragraph',
      score: has ? 8 : 0, max: 8,
      status: has ? 'pass' : 'fail',
      notes: has
        ? 'Focus keyword is in the opening — good early signal to Google.'
        : `Focus keyword "${fk}" not in the first paragraph. Mention it early.`,
    })
  }

  // ── 8. Focus keyword density ────────────────────────────────────────────
  if (fk && wordCount > 0) {
    const occurrences = (text.toLowerCase().match(new RegExp(`\\b${escapeRe(fkLower)}\\b`, 'g')) ?? []).length
    const density     = occurrences / wordCount
    let score = 0
    let status: FactorResult['status'] = 'fail'
    let notes  = ''
    if (density >= 0.005 && density <= 0.025) {
      score = 8; status = 'pass'
      notes = `${occurrences} mentions across ${wordCount} words (${(density * 100).toFixed(1)}% density) — in the natural range.`
    } else if (density > 0 && density < 0.005) {
      score = 3; status = 'partial'
      notes = `Focus keyword appears only ${occurrences}× — too sparse. Aim for 0.5-2.5% density.`
    } else if (density > 0.025) {
      score = 2; status = 'partial'
      notes = `Focus keyword density is ${(density * 100).toFixed(1)}% — risks reading as stuffed. Pare back.`
    } else {
      notes = 'Focus keyword does not appear in the body.'
    }
    breakdown.push({ key: 'kw-density', label: 'Focus keyword density', score, max: 8, status, notes })
  }

  // ── 9. Subheadings present ──────────────────────────────────────────────
  {
    const h2Count = (input.bodyHtml.match(/<h2[\s>]/gi) ?? []).length
    const h3Count = (input.bodyHtml.match(/<h3[\s>]/gi) ?? []).length
    let score = 0
    let status: FactorResult['status'] = 'fail'
    let notes  = ''
    if (h2Count >= 2)      { score = 6; status = 'pass'; notes = `${h2Count} H2 + ${h3Count} H3 — well-structured.` }
    else if (h2Count >= 1) { score = 3; status = 'partial'; notes = 'Only one subheading — add more for scannability.' }
    else                   { notes = 'No subheadings. Add H2s to break up the article.' }
    if (fk) {
      const headingsText = (input.bodyHtml.match(/<h[2-3][^>]*>([\s\S]*?)<\/h[2-3]>/gi) ?? []).join(' ').toLowerCase()
      if (headingsText.includes(fkLower)) {
        score = Math.min(8, score + 2)
        notes += ' Focus keyword appears in at least one subheading.'
      }
    }
    breakdown.push({ key: 'subheadings', label: 'Subheadings', score, max: 8, status, notes })
  }

  // ── 10. Hero image + alt text ───────────────────────────────────────────
  {
    let score = 0
    let status: FactorResult['status'] = 'fail'
    let notes  = ''
    if (input.heroImageUrl) {
      score = 4
      if (input.heroImageHasAlt === true) {
        score = 7; status = 'pass'
        notes = 'Hero image present + has alt text.'
      } else if (input.heroImageHasAlt === false) {
        status = 'partial'
        notes = 'Hero image is set but missing alt text — add one for accessibility + image search.'
      } else {
        status = 'partial'
        notes = 'Hero image is set (alt-text status unknown).'
      }
    } else {
      notes = 'No hero image — articles with imagery rank + share better.'
    }
    breakdown.push({ key: 'hero-image', label: 'Hero image + alt', score, max: 7, status, notes })
  }

  // ── 11. Internal links ──────────────────────────────────────────────────
  {
    const internal = input.internalLinkCount ?? 0
    let score = 0
    let status: FactorResult['status'] = 'fail'
    let notes  = ''
    if (internal >= 3)      { score = 7; status = 'pass';    notes = `${internal} internal links — solid topical authority signal.` }
    else if (internal >= 1) { score = 4; status = 'partial'; notes = `${internal} internal link — add 2-3 more to nearby related articles.` }
    else                    { notes = 'No internal links. Every article should link to 2-4 related pieces.' }
    breakdown.push({ key: 'internal-links', label: 'Internal links', score, max: 7, status, notes })
  }

  // ── 12. Readability (Flesch reading ease) ───────────────────────────────
  if (wordCount > 50) {
    const flesch = fleschReadingEase(text)
    let score = 0
    let status: FactorResult['status'] = 'fail'
    let notes  = ''
    if (flesch >= 60)      { score = 5; status = 'pass';    notes = `Flesch reading ease ${flesch.toFixed(0)} — accessible to general readers.` }
    else if (flesch >= 50) { score = 3; status = 'partial'; notes = `Flesch ${flesch.toFixed(0)} — slightly hard. Shorter sentences + simpler words = better.` }
    else                   {              notes = `Flesch ${flesch.toFixed(0)} — challenging read. Cut long sentences + jargon.` }
    breakdown.push({ key: 'readability', label: 'Readability', score, max: 5, status, notes })
  }

  const total    = breakdown.reduce((s, f) => s + f.score, 0)
  const maxTotal = breakdown.reduce((s, f) => s + f.max, 0)
  const pct      = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0

  const grade: AnalyzerResult['grade'] =
    pct >= 85 ? 'excellent' :
    pct >= 70 ? 'good'      :
    pct >= 50 ? 'needs-work':
                'poor'

  return { score: pct, breakdown, grade }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
