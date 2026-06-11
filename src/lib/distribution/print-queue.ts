// Print distribution: log an article into article_distribution_log
// (migration 165) and stamp print_queued_at on the article so re-saves
// don't double-fire. The actual PDF / InDesign export happens at
// /admin/distribution/print-queue where the designer pulls the data.

import { createClient } from '@supabase/supabase-js'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function queueArticleForPrint(articleId: string, triggeredBy: string = 'publish-hook'): Promise<{ ok: true } | { ok: false; error: string }> {
  const db = adminDb()
  try {
    const { data: artData } = await db
      .from('guide_articles')
      .select('id, brand_slug, queue_for_print, print_issue_month, print_queued_at, title, slug')
      .eq('id', articleId)
      .maybeSingle()
    const article = artData as null | {
      id: string; brand_slug: string;
      queue_for_print: boolean | null; print_issue_month: string | null;
      print_queued_at: string | null;
      title: string; slug: string;
    }
    if (!article) return { ok: false, error: 'article_not_found' }
    if (!article.queue_for_print) return { ok: false, error: 'queue_for_print_disabled' }
    if (article.print_queued_at) return { ok: false, error: 'already_queued' }

    await db.from('article_distribution_log').insert({
      article_id:  articleId,
      brand_slug:  article.brand_slug ?? 'rrp',
      channel:     'print',
      status:      'queued',
      detail:      { issue_month: article.print_issue_month, title: article.title, slug: article.slug },
      triggered_by: triggeredBy,
    })
    await db.from('guide_articles').update({
      print_queued_at: new Date().toISOString(),
    }).eq('id', articleId)
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  }
}
