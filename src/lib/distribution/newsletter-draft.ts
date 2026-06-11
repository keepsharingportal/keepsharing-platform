// Generate a brand-voiced newsletter draft for an article and log it to
// article_distribution_log. The actual send happens in GHL (via a workflow
// the publisher has set up to email subscribers with the brand tag), so
// this module's job is:
//
//   1. Pull the article + brand context
//   2. Generate a tight newsletter snippet (subject line + 150-250 word body)
//      via the AI integration using the brand voice
//   3. Write the prepared payload to article_distribution_log so editorial
//      can copy/paste into GHL or trigger their newsletter workflow
//   4. (Optional) Trigger the per-brand newsletter workflow if configured
//      — the workflow itself is responsible for delivery
//
// All operations are best-effort and never throw past the caller. Errors
// land in article_distribution_log.detail so the admin can see what
// happened without bouncing to logs.

import { createClient } from '@supabase/supabase-js'
import { runAI } from '@/lib/ai/client'
import { loadBrand, buildBrandPromptFragment } from '@/lib/brands'
import { publicOriginForBrand } from '@/lib/markets'

function adminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

interface DraftArticle {
  id:             string
  title:          string
  subtitle:       string | null
  excerpt:        string | null
  body:           string | null
  slug:           string
  column_slug:    string | null
  hero_image_url: string | null
  brand_slug:     string
}

export interface NewsletterDraft {
  subjectLine:    string
  preheader:      string
  body:           string
  cta_label:      string
  cta_url:        string
  hero_image_url: string | null
}

/** Best-effort draft generation + log. Returns the draft on success;
 *  null on any failure (the failure is already recorded in
 *  article_distribution_log). */
export async function generateAndLogNewsletterDraft(articleId: string, triggeredBy: string = 'publish-hook'): Promise<NewsletterDraft | null> {
  const db = adminDb()
  try {
    // 1. Load the article + brand context.
    const { data: artData } = await db
      .from('guide_articles')
      .select('id, title, subtitle, excerpt, body, slug, column_slug, hero_image_url, brand_slug, queue_newsletter_draft, newsletter_drafted_at')
      .eq('id', articleId)
      .maybeSingle()
    const article = artData as null | (DraftArticle & { queue_newsletter_draft: boolean; newsletter_drafted_at: string | null })
    if (!article) {
      await logAttempt(db, articleId, 'rrp', 'failed', null, 'article_not_found', triggeredBy)
      return null
    }
    if (!article.queue_newsletter_draft) {
      // Caller misconfigured — return null without logging since this
      // wasn't requested.
      return null
    }
    if (article.newsletter_drafted_at) {
      // Already drafted; don't double-fire.
      return null
    }

    const brandSlug = article.brand_slug
    const brand = await loadBrand(brandSlug)
    if (!brand) {
      await logAttempt(db, articleId, brandSlug, 'failed', null, 'brand_not_found', triggeredBy)
      return null
    }

    // 2. Generate draft via AI.
    const brandFragment = buildBrandPromptFragment(brand)
    const articleUrl = `${publicOriginForBrand(brandSlug)}/articles/${article.slug}`
    const bodySnippet = (article.body ?? '').slice(0, 1500)
    const prompt = [
      '## BRAND CONTEXT',
      brandFragment,
      '',
      '## TASK',
      'Draft a newsletter snippet for this article. Subject line + preheader + 150-250 word body + a strong CTA label. The newsletter sends to readers who subscribed to this brand. Write in the brand voice, never inflated, focus on the reader payoff.',
      '',
      '## ARTICLE',
      `Title: ${article.title}`,
      article.subtitle ? `Subtitle: ${article.subtitle}` : '',
      article.excerpt ? `Excerpt: ${article.excerpt}` : '',
      `URL: ${articleUrl}`,
      '',
      bodySnippet ? `Body excerpt:\n${bodySnippet}` : '',
      '',
      '## OUTPUT',
      'Return STRICT JSON:',
      '{',
      '  "subjectLine": "string — < 60 chars, no emoji",',
      '  "preheader":   "string — < 90 chars, the inbox preview line",',
      '  "body":        "string — 150-250 words, brand voice, ends with a sentence that warrants the CTA",',
      '  "cta_label":   "string — < 30 chars, action verb leading"',
      '}',
      'JSON only.',
    ].filter(Boolean).join('\n')

    const aiOut = await runAI({
      taskKind: 'drafting',
      caller:   'newsletter.draft',
      systemPrompt: 'You write newsletter snippets for a regional family publication. Output is JSON only.',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 800,
    })
    let raw = aiOut.text.trim()
    if (raw.startsWith('```')) raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
    const parsed = JSON.parse(raw) as { subjectLine: string; preheader: string; body: string; cta_label: string }
    const draft: NewsletterDraft = {
      subjectLine:    parsed.subjectLine,
      preheader:      parsed.preheader,
      body:           parsed.body,
      cta_label:      parsed.cta_label,
      cta_url:        articleUrl,
      hero_image_url: article.hero_image_url,
    }

    // 3. Log + stamp the article so re-saves don't re-fire.
    await logAttempt(db, articleId, brandSlug, 'success', draft, null, triggeredBy)
    await db.from('guide_articles').update({
      newsletter_drafted_at:  new Date().toISOString(),
      newsletter_draft_error: null,
    }).eq('id', articleId)

    return draft
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    await logAttempt(db, articleId, 'rrp', 'failed', null, msg, triggeredBy)
    await db.from('guide_articles').update({
      newsletter_draft_error: msg.slice(0, 1000),
    }).eq('id', articleId).then(() => undefined, () => undefined)
    return null
  }
}

async function logAttempt(
  db: ReturnType<typeof adminDb>,
  articleId: string,
  brandSlug: string,
  status:    'success' | 'failed' | 'queued',
  detail:    NewsletterDraft | null,
  errorMsg:  string | null,
  triggeredBy: string,
): Promise<void> {
  try {
    await db.from('article_distribution_log').insert({
      article_id:  articleId,
      brand_slug:  brandSlug,
      channel:     'newsletter',
      status,
      detail:      detail ? { draft: detail } : errorMsg ? { error: errorMsg } : null,
      triggered_by: triggeredBy,
    })
  } catch { /* migration may not be applied yet */ }
}
