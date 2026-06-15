// ── Auto-apply high-confidence internal-link suggestions ────────────────
//
// Walks every PENDING internal_link_suggestion with match_score >=
// AUTO_APPLY_THRESHOLD (default 90 — focus-keyword match + page-2 GSC
// boost) and inserts each <a> into the source article body, marking
// the suggestion 'applied'.
//
// Composing multiple suggestions per source article is the tricky bit
// — same in-memory body cache pattern as the manual apply-all so the
// edits compose cleanly.
//
// Skipped suggestions (anchor disappeared from the body after a manual
// edit since the suggestion was queued) are marked 'rejected' so the
// queue stays clean.
//
// Designed for the daily cron — only auto-applies very-high-confidence
// matches so editor review still catches the medium/low ones.

import type { SupabaseClient } from '@supabase/supabase-js'

/** Conservative default — requires focus_keyword match (90) OR title
 *  match + page-2 boost (60 + 30 = 90). Editor still reviews everything
 *  below this. */
export const DEFAULT_AUTO_APPLY_THRESHOLD = 90

/** Hard cap per cron run — don't apply more than this many edits in
 *  one pass. Keeps the cron well within its time budget and gives the
 *  editor a chance to notice if something goes wrong. */
const MAX_APPLIES_PER_RUN = 200

export interface AutoApplyResult {
  applied:   number
  skipped:   number
  threshold: number
  /** IDs of articles whose bodies were rewritten — caller may want
   *  to revalidate those paths. */
  touchedArticleIds: string[]
}

export async function autoApplyHighConfidenceLinks(
  sb:        SupabaseClient,
  threshold: number = DEFAULT_AUTO_APPLY_THRESHOLD,
): Promise<AutoApplyResult> {
  const { data: pending } = await sb
    .from('internal_link_suggestions')
    .select('id, source_article_id, target_article_id, anchor_text, match_score')
    .eq('status', 'pending')
    .gte('match_score', threshold)
    .order('match_score', { ascending: false })
    .limit(MAX_APPLIES_PER_RUN)

  type Sug = { id: string; source_article_id: string; target_article_id: string; anchor_text: string; match_score: number }
  const sugs = (pending ?? []) as Sug[]
  if (sugs.length === 0) {
    return { applied: 0, skipped: 0, threshold, touchedArticleIds: [] }
  }

  // Resolve target paths.
  const targetIds = Array.from(new Set(sugs.map(s => s.target_article_id)))
  const { data: targets } = await sb
    .from('guide_articles')
    .select('id, slug, column_slug')
    .in('id', targetIds)
  const pathById = new Map(
    (targets ?? []).map(t => [t.id as string, `/columns/${t.column_slug}/${t.slug}`])
  )

  // Walk suggestions one at a time so composes work.
  const bodyCache: Map<string, string> = new Map()
  const dirtySources = new Set<string>()
  const appliedIds: string[] = []
  const skippedIds: string[] = []

  for (const s of sugs) {
    const targetPath = pathById.get(s.target_article_id)
    if (!targetPath) { skippedIds.push(s.id); continue }

    let html = bodyCache.get(s.source_article_id) ?? null
    if (html === null) {
      const { data: row } = await sb
        .from('guide_articles')
        .select('body')
        .eq('id', s.source_article_id)
        .maybeSingle()
      html = (row?.body as string | null) ?? ''
      bodyCache.set(s.source_article_id, html)
    }

    const result = insertFirstAnchor(html, s.anchor_text, targetPath)
    if (result.html === html) {
      skippedIds.push(s.id)
      continue
    }
    bodyCache.set(s.source_article_id, result.html)
    dirtySources.add(s.source_article_id)
    appliedIds.push(s.id)
  }

  // Persist mutated bodies.
  for (const sourceId of dirtySources) {
    await sb.from('guide_articles').update({ body: bodyCache.get(sourceId) }).eq('id', sourceId)
  }

  const nowIso = new Date().toISOString()
  if (appliedIds.length > 0) {
    await sb.from('internal_link_suggestions').update({
      status: 'applied', reviewed_at: nowIso, reviewed_by: 'auto-apply-cron',
    }).in('id', appliedIds)
  }
  if (skippedIds.length > 0) {
    await sb.from('internal_link_suggestions').update({
      status: 'rejected', reviewed_at: nowIso, reviewed_by: 'auto-apply-cron',
    }).in('id', skippedIds)
  }

  return {
    applied:           appliedIds.length,
    skipped:           skippedIds.length,
    threshold,
    touchedArticleIds: Array.from(dirtySources),
  }
}

/** Insert the first unlinked occurrence of `anchor` inside `html` as
 *  <a href="target">anchor</a>. Walks the HTML tracking <a> depth to
 *  avoid wrapping inside an existing link. Case-insensitive match,
 *  case-preserving anchor. Copied from the manual route handler so the
 *  cron doesn't have to import server-route code. */
function insertFirstAnchor(html: string, anchor: string, target: string): { html: string; replaced: boolean } {
  if (!anchor) return { html, replaced: false }
  const anchorRe = new RegExp(`\\b${anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  let depth = 0
  let i = 0
  while (i < html.length) {
    if (html.startsWith('<a', i) && html[i + 2]?.match(/\s|>/)) {
      depth++
      const close = html.indexOf('>', i)
      i = close === -1 ? html.length : close + 1
      continue
    }
    if (html.startsWith('</a>', i)) {
      depth = Math.max(0, depth - 1)
      i += 4
      continue
    }
    if (depth === 0) {
      const rest = html.slice(i)
      const m = anchorRe.exec(rest)
      if (m && m.index < (rest.indexOf('<') === -1 ? rest.length : rest.indexOf('<'))) {
        const anchorMatch = m[0]
        const before = html.slice(0, i + m.index)
        const after  = html.slice(i + m.index + anchorMatch.length)
        const linked = `<a href="${target}">${anchorMatch}</a>`
        return { html: before + linked + after, replaced: true }
      }
    }
    const nextLt = html.indexOf('<', i + 1)
    if (nextLt === -1) break
    i = nextLt
  }
  return { html, replaced: false }
}
