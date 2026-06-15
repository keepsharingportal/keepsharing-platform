// ── Internal-link suggestion engine ─────────────────────────────────────────
//
// Scans recently-published articles for sentences that mention ANOTHER
// published article's focus keyword (or title) and emits suggestions
// into internal_link_suggestions for editor review.
//
// Internal linking is a major ranking signal — Google treats it as a
// "topic authority" vote. Most CMSes don't do this automatically; doing
// it well puts us ahead of plugin-based competitors.
//
// Run nightly via /api/cron/seo-internal-links. Idempotent — same
// suggestion isn't queued twice (matching pair already pending).

import type { SupabaseClient } from '@supabase/supabase-js'

interface ArticleRow {
  id:                string
  title:             string
  slug:              string
  column_slug:       string | null
  body:              string | null
  seo_focus_keyword: string | null
}

interface Suggestion {
  sourceArticleId: string
  targetArticleId: string
  anchorText:      string
  contextSnippet:  string
  matchScore:      number
}

const MIN_PHRASE_LEN  = 8       // skip "and", "the" etc. — phrase must be a real concept
const MAX_PHRASE_LEN  = 60
const PAGE_LIMIT      = 1500    // cap per run; larger corpora paginate next time
const PER_PAIR_LIMIT  = 3       // don't queue >3 suggestions between the same pair

/** Build a regex that matches the keyword as a whole-word phrase
 *  (case-insensitive). Escapes regex metachars. */
function phraseRegex(phrase: string): RegExp {
  const esc = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').trim()
  return new RegExp(`\\b${esc}\\b`, 'gi')
}

function stripHtmlAndExistingLinks(html: string): string {
  // We DON'T want to suggest a link inside text that's already inside
  // an <a> tag — drop those entire spans before matching.
  return (html ?? '')
    .replace(/<a\b[^>]*>.*?<\/a>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi,  ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Surrounding paragraph context for a match — ~120 chars on either
 *  side. Helps the editor decide whether the proposed link makes
 *  sense in context. */
function contextAround(text: string, matchStart: number, matchEnd: number): string {
  const a = Math.max(0, matchStart - 120)
  const b = Math.min(text.length, matchEnd + 120)
  const snippet = text.slice(a, b)
  return (a > 0 ? '…' : '') + snippet + (b < text.length ? '…' : '')
}

export async function runInternalLinkPass(sb: SupabaseClient): Promise<{
  articlesScanned: number
  suggestionsCreated: number
}> {
  // Pull every published article with either a focus keyword OR a
  // useful title. The keyword/title becomes the "phrase to find" on the
  // candidates side; we also need their body to scan for matches.
  const { data: articles, error } = await sb
    .from('guide_articles')
    .select('id, title, slug, column_slug, body, seo_focus_keyword')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(PAGE_LIMIT)
  if (error || !articles) return { articlesScanned: 0, suggestionsCreated: 0 }

  const rows = articles as ArticleRow[]

  // Build the "things to link TO" list. Prefer focus_keyword (it's
  // editor-curated), fall back to title.
  type Target = { id: string; phrase: string; score: number }
  const targets: Target[] = []
  for (const a of rows) {
    const fk = (a.seo_focus_keyword ?? '').trim()
    if (fk.length >= MIN_PHRASE_LEN && fk.length <= MAX_PHRASE_LEN) {
      targets.push({ id: a.id, phrase: fk, score: 90 })  // editor-set = highest signal
    } else {
      const t = a.title.trim()
      if (t.length >= MIN_PHRASE_LEN && t.length <= MAX_PHRASE_LEN) {
        targets.push({ id: a.id, phrase: t, score: 60 })
      }
    }
  }

  // Pre-fetch existing pending suggestions so we don't requeue dupes.
  const { data: existing } = await sb
    .from('internal_link_suggestions')
    .select('source_article_id, target_article_id, anchor_text')
    .in('status', ['pending', 'accepted'])
  const existingKeys = new Set(
    (existing ?? []).map(e => `${e.source_article_id}::${e.target_article_id}::${(e.anchor_text as string).toLowerCase()}`)
  )

  // Walk each source article's body, look for any target's phrase that
  // isn't pointing at the source itself, isn't already linked, and
  // hasn't been suggested before.
  const suggestions: Suggestion[] = []
  for (const source of rows) {
    if (!source.body) continue
    const text = stripHtmlAndExistingLinks(source.body)
    if (!text) continue
    const perSourcePairCount = new Map<string, number>()

    for (const t of targets) {
      if (t.id === source.id) continue
      const pairKey = `${source.id}::${t.id}`
      const pairCount = perSourcePairCount.get(pairKey) ?? 0
      if (pairCount >= PER_PAIR_LIMIT) continue
      const re = phraseRegex(t.phrase)
      let m: RegExpExecArray | null
      while ((m = re.exec(text)) !== null) {
        if (pairCount >= PER_PAIR_LIMIT) break
        const anchor   = m[0]
        const ctx      = contextAround(text, m.index, m.index + anchor.length)
        const dedup    = `${source.id}::${t.id}::${anchor.toLowerCase()}`
        if (existingKeys.has(dedup)) continue
        existingKeys.add(dedup)
        suggestions.push({
          sourceArticleId: source.id,
          targetArticleId: t.id,
          anchorText:      anchor,
          contextSnippet:  ctx,
          matchScore:      t.score,
        })
        perSourcePairCount.set(pairKey, (perSourcePairCount.get(pairKey) ?? 0) + 1)
      }
    }
  }

  if (suggestions.length === 0) return { articlesScanned: rows.length, suggestionsCreated: 0 }

  // Bulk insert in chunks of 500 (Supabase default limit).
  let created = 0
  for (let i = 0; i < suggestions.length; i += 500) {
    const chunk = suggestions.slice(i, i + 500).map(s => ({
      source_article_id: s.sourceArticleId,
      target_article_id: s.targetArticleId,
      anchor_text:       s.anchorText,
      context_snippet:   s.contextSnippet,
      match_score:       s.matchScore,
      status:            'pending',
    }))
    const { error: insErr } = await sb.from('internal_link_suggestions').insert(chunk)
    if (!insErr) created += chunk.length
  }

  return { articlesScanned: rows.length, suggestionsCreated: created }
}
