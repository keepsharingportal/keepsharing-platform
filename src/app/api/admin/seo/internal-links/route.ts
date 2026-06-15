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
  return NextResponse.json({ ok: true })
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
