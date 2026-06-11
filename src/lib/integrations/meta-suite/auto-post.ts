// Auto-post a freshly-published article to the connected Facebook Page
// (+ Instagram if linked + hero image present). Generates the caption via
// the AI integration using the brand voice. Fires from the article PATCH
// handler when transitioning to published.

import { createClient } from '@supabase/supabase-js'
import { runAI } from '@/lib/ai/client'
import { loadBrand, buildBrandPromptFragment } from '@/lib/brands'
import { createPagePost, createInstagramPost, metaSuiteErrorMessage } from './client'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface ArticleSnapshot {
  id:            string
  title:         string
  subtitle:      string | null
  excerpt:       string | null
  slug:          string
  hero_image_url: string | null
  column_slug:   string | null
}

/** Best-effort auto-post. Stamps guide_articles.auto_posted_at / fb_post_id
 *  on success, auto_post_error on failure. Never throws. Returns a summary. */
export async function autoPostArticle(articleId: string, brandSlug: string = 'rrp'): Promise<{ ok: boolean; fbPostId?: string; igMediaId?: string; error?: string }> {
  const db = adminDb()
  try {
    // 1. Load the article.
    const { data: artData } = await db
      .from('guide_articles')
      .select('id, title, subtitle, excerpt, slug, hero_image_url, column_slug, auto_post_to_social, auto_posted_at')
      .eq('id', articleId)
      .maybeSingle()
    const article = artData as null | (ArticleSnapshot & { auto_post_to_social: boolean; auto_posted_at: string | null })
    if (!article) return { ok: false, error: 'Article not found' }
    if (!article.auto_post_to_social) return { ok: false, error: 'auto_post_to_social not enabled' }
    if (article.auto_posted_at) return { ok: false, error: 'Already auto-posted' }

    // 2. Pick the connected Page (single-Page brand for now). Multi-Page
    //    setups can extend this to match a brand_slug on the Page row.
    const { data: pageData } = await db
      .from('facebook_pages')
      .select('id, fb_page_id, page_access_token, ig_business_id')
      .eq('is_active', true)
      .order('connected_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const page = pageData as null | { id: string; fb_page_id: string; page_access_token: string; ig_business_id: string | null }
    if (!page) return { ok: false, error: 'No connected Facebook Page' }

    // 3. Build the caption with brand voice context.
    const brand = await loadBrand(brandSlug)
    const brandFragment = brand ? buildBrandPromptFragment(brand) : `Brand: ${brandSlug.toUpperCase()}`
    const site = brand?.voice?.site_url ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://riverregionparents.com'
    const link = `${site}/articles/${article.slug}`

    const hint = [
      `New article just went live: "${article.title}"`,
      article.subtitle ? `Subhead: ${article.subtitle}` : '',
      article.excerpt  ? `Excerpt: ${article.excerpt}`  : '',
      `Article URL: ${link}`,
    ].filter(Boolean).join('\n')

    const captionResp = await runAI({
      taskKind: 'caption',
      caller:   'auto-post.article-published',
      systemPrompt: `You write Facebook + Instagram captions for hyperlocal media.\n\n${brandFragment}\n\nWrite a caption that hooks in the first line, surfaces the most interesting angle of the article (not just the title), and ends with one sentence + the article link. Keep it 2-3 short paragraphs. Light emoji use only when it fits.`,
      messages: [{ role: 'user', content: hint }],
      maxTokens: 350,
    })
    const caption = captionResp.text.trim()

    // 4. Post to Facebook.
    const fbResult = await createPagePost(page.fb_page_id, page.page_access_token, {
      message:  caption,
      link,
      mediaUrl: article.hero_image_url ?? undefined,
    })

    // 5. Optional IG cross-post if a linked IG account + a hero image.
    let igMediaId: string | undefined
    if (page.ig_business_id && article.hero_image_url) {
      try {
        const ig = await createInstagramPost(page.ig_business_id, page.page_access_token, {
          message:  caption,
          mediaUrl: article.hero_image_url,
        })
        igMediaId = ig.id
      } catch (e) {
        console.warn('[auto-post] IG cross-post failed:', metaSuiteErrorMessage(e))
      }
    }

    // 6. Mirror to facebook_page_posts so the post appears in the admin
    //    history alongside manual posts.
    await db.from('facebook_page_posts').insert({
      page_id:           page.id,
      fb_post_id:        fbResult.id,
      message:           caption,
      link,
      media_url:         article.hero_image_url ?? null,
      also_to_instagram: !!igMediaId,
      ig_media_id:       igMediaId ?? null,
      status:            'live',
      published_at:      new Date().toISOString(),
    }).then(() => undefined, () => undefined)

    // 7. Stamp the article so re-saves don't double-fire.
    await db.from('guide_articles').update({
      auto_posted_at:         new Date().toISOString(),
      auto_posted_fb_post_id: fbResult.id,
      auto_post_error:        null,
    }).eq('id', articleId)

    return { ok: true, fbPostId: fbResult.id, igMediaId }
  } catch (e) {
    const msg = metaSuiteErrorMessage(e)
    try {
      await db.from('guide_articles').update({ auto_post_error: msg.slice(0, 1000) }).eq('id', articleId)
    } catch { /* ignore */ }
    return { ok: false, error: msg }
  }
}
