// POST /api/admin/seo/internal-links?id=…
//   body: { sourceId, targetId, anchorText, targetPath }
//   → opens the source article body, replaces the FIRST unlinked
//     occurrence of anchorText with <a href="targetPath">anchorText</a>,
//     saves the article, marks the suggestion 'applied'.
//
// DELETE /api/admin/seo/internal-links?id=…
//   → marks the suggestion 'rejected' (no edit to article body).
//
// Both endpoints honor requireAdmin().

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const adminCtx = await requireAdmin()
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const body = await req.json().catch(() => null) as {
    sourceId?: string; targetId?: string; anchorText?: string; targetPath?: string;
  } | null
  if (!body?.sourceId || !body?.targetId || !body?.anchorText || !body?.targetPath) {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 })
  }

  const sb = createAdminClient()
  const { data: article } = await sb
    .from('guide_articles')
    .select('id, body')
    .eq('id', body.sourceId)
    .maybeSingle()
  if (!article) return NextResponse.json({ error: 'source article not found' }, { status: 404 })

  const html = (article.body as string | null) ?? ''
  // Replace the FIRST occurrence of the anchor text that isn't already
  // inside an <a> tag. We do this by walking the HTML and tracking <a>
  // depth — simple state machine, no DOM parser dependency.
  const updated = insertFirstAnchor(html, body.anchorText, body.targetPath)
  if (updated.html === html) {
    return NextResponse.json({ error: 'anchor text not found in current article body — it may have been edited since the suggestion was made' }, { status: 422 })
  }

  await sb.from('guide_articles').update({ body: updated.html }).eq('id', body.sourceId)
  await sb.from('internal_link_suggestions').update({
    status:      'applied',
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminCtx.userId ?? null,
  }).eq('id', id)

  // Revalidate the source article path so the new link is live
  // immediately, not on next ISR expiry.
  await revalidateSource(sb, body.sourceId)

  return NextResponse.json({ ok: true })
}

/** PUT /api/admin/seo/internal-links?action=apply-all
 *  Apply every pending suggestion in one pass — careful: walks one
 *  suggestion at a time so each body edit composes cleanly. Each
 *  insert opens the (already edited) body, finds the next unlinked
 *  occurrence, swaps it. Skips suggestions whose anchor has been
 *  removed since they were queued. */
export async function PUT(req: NextRequest) {
  const adminCtx = await requireAdmin()
  const action   = new URL(req.url).searchParams.get('action')
  if (action !== 'apply-all') {
    return NextResponse.json({ error: 'unknown action' }, { status: 400 })
  }

  const sb = createAdminClient()
  const { data: pending } = await sb
    .from('internal_link_suggestions')
    .select('id, source_article_id, target_article_id, anchor_text')
    .eq('status', 'pending')
    .order('match_score', { ascending: false })
    .limit(500)

  type Sug = { id: string; source_article_id: string; target_article_id: string; anchor_text: string }
  const sugs = (pending ?? []) as Sug[]
  if (sugs.length === 0) return NextResponse.json({ ok: true, applied: 0, skipped: 0 })

  // Pre-load every target article so we can build href paths.
  const targetIds = Array.from(new Set(sugs.map(s => s.target_article_id)))
  const { data: targets } = await sb
    .from('guide_articles')
    .select('id, slug, column_slug')
    .in('id', targetIds)
  const pathById = new Map(
    (targets ?? []).map(t => [t.id as string, `/columns/${t.column_slug}/${t.slug}`])
  )

  // Cache mutated bodies in-memory so multiple suggestions for the
  // same source compose cleanly.
  const bodyCache = new Map<string, string>()
  const sourceDirty = new Set<string>()
  let applied = 0, skipped = 0
  const appliedIds: string[] = []
  const skippedIds: string[] = []

  for (const s of sugs) {
    const targetPath = pathById.get(s.target_article_id)
    if (!targetPath) { skipped++; skippedIds.push(s.id); continue }

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
      skipped++
      skippedIds.push(s.id)
      continue
    }
    bodyCache.set(s.source_article_id, result.html)
    sourceDirty.add(s.source_article_id)
    appliedIds.push(s.id)
    applied++
  }

  // Persist mutated bodies in one batch + revalidate.
  for (const sourceId of sourceDirty) {
    await sb.from('guide_articles').update({ body: bodyCache.get(sourceId) }).eq('id', sourceId)
    await revalidateSource(sb, sourceId)
  }

  const nowIso = new Date().toISOString()
  if (appliedIds.length > 0) {
    await sb.from('internal_link_suggestions').update({
      status: 'applied', reviewed_at: nowIso, reviewed_by: adminCtx.userId ?? null,
    }).in('id', appliedIds)
  }
  if (skippedIds.length > 0) {
    // Skipped = anchor missing in body. Mark rejected so they leave
    // the queue — they're stale, manual review can re-create them
    // from the next cron pass if still valid.
    await sb.from('internal_link_suggestions').update({
      status: 'rejected', reviewed_at: nowIso, reviewed_by: adminCtx.userId ?? null,
    }).in('id', skippedIds)
  }

  return NextResponse.json({ ok: true, applied, skipped })
}

async function revalidateSource(sb: ReturnType<typeof createAdminClient>, sourceId: string): Promise<void> {
  const { data: a } = await sb
    .from('guide_articles')
    .select('slug, column_slug')
    .eq('id', sourceId)
    .maybeSingle()
  if (a?.slug && a?.column_slug) {
    try { revalidatePath(`/columns/${a.column_slug}/${a.slug}`) } catch { /* best-effort */ }
  }
}

export async function DELETE(req: NextRequest) {
  const adminCtx = await requireAdmin()
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const sb = createAdminClient()
  await sb.from('internal_link_suggestions').update({
    status:      'rejected',
    reviewed_at: new Date().toISOString(),
    reviewed_by: adminCtx.userId ?? null,
  }).eq('id', id)
  return NextResponse.json({ ok: true })
}

/** Replace the first occurrence of anchor in html that isn't already
 *  inside an <a> tag with <a href="target">anchor</a>. Returns
 *  { html: newHtml, replaced: boolean }. Case-insensitive match,
 *  case-preserving (uses the matched text as the anchor). */
function insertFirstAnchor(html: string, anchor: string, target: string): { html: string; replaced: boolean } {
  if (!anchor) return { html, replaced: false }
  const anchorRe = new RegExp(`\\b${anchor.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
  let depth = 0
  let i = 0
  while (i < html.length) {
    if (html.startsWith('<a', i) && html[i + 2]?.match(/\s|>/)) {
      depth++
      // Skip to end of opening tag.
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
    // Step to next < or end of string.
    const nextLt = html.indexOf('<', i + 1)
    if (nextLt === -1) break
    i = nextLt
  }
  return { html, replaced: false }
}
