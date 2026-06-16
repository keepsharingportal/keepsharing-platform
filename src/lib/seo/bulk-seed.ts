// ── Bulk SEO seeder ─────────────────────────────────────────────────
//
// SEO ≠ Social. This file ONLY produces SEO copy:
//   - seo_title: 50-60 chars, keyword-led, clear, scannable
//   - seo_description: 140-155 chars, accurate summary with the focus
//     keyword naturally placed, no clickbait, no manipulation
//   - seo_focus_keyword: 2-5 word search term this article targets
//
// These fields land in og:title + og:description (the small text on
// a shared link card) and drive Google search ranking. They are NOT
// the FB/IG post caption — that's the social_hook + caption pipeline
// in lib/social/caption-generator.ts.
//
// Two modes:
//   - 'missing' (default): only seeds rows where seo_title AND
//     seo_description are both empty
//   - 'reseed-ai': re-seeds rows where seo_ai_seeded_at is set
//     (re-runs with the new prompt; preserves human-edited rows)

import type { SupabaseClient } from '@supabase/supabase-js'
import { runAI } from '@/lib/ai/client'
import { loadBrandPromptContext, renderBrandContextForPrompt } from '@/lib/seo/brand-profile'

const SYSTEM_PROMPT = `You produce PURE SEO copy for a single article. This is for Google
search ranking + the link-preview card on shared posts. It is NOT the
social media post caption (that's a separate system with a different
voice).

Your output reads like a clear, professional snippet. No clickbait.
No manipulation. No fear-based hooks. Honest, keyword-rich, scannable.

Field constraints:
  - seo_title: 50-60 chars, lead with the primary keyword phrase OR
    the clear benefit. Title case. No question marks unless natural.
  - seo_description: 140-155 chars, a clear factual summary that names
    the topic + the locality (when relevant) + what the reader will
    learn. Place the focus keyword naturally in the first 100 chars.
  - seo_focus_keyword: 2-5 word search term parents/readers actually
    type into Google. Locality-specific when applicable
    (e.g. "Pike Road preschools" not "best preschools").

Read the brand profile to localize (use named sub-areas when relevant).
Read the article to identify the topic + primary keyword.

OUTPUT FORMAT — emit raw JSON only, no prose, no code fences:
{
  "seo_title":         "string",
  "seo_description":   "string",
  "seo_focus_keyword": "string"
}`

export interface SeedCandidate {
  id:            string
  title:         string
  excerpt:       string | null
  bodySnippet:   string
  brandSlug:     string
}

export interface SeedResult {
  articleId:        string
  seoTitle:         string
  seoDescription:   string
  seoFocusKeyword:  string
  error?:           string
}

export type SeedMode = 'missing' | 'reseed-ai'

/** Returns next N candidates needing seed work. */
export async function findSeedCandidates(
  sb:          SupabaseClient,
  brandSlug:   string | null,
  limit:       number = 5,
  mode:        SeedMode = 'missing',
): Promise<SeedCandidate[]> {
  let q = sb
    .from('guide_articles')
    .select('id, title, excerpt, body, brand_slug, seo_title, seo_description, seo_ai_seeded_at, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(limit)
  if (brandSlug) q = q.eq('brand_slug', brandSlug)

  if (mode === 'reseed-ai') {
    // Re-process rows the seeder previously wrote. Skip human-edited
    // rows entirely (those have seo_ai_seeded_at NULL but seo_title
    // populated). CRITICAL: exclude rows we just reseeded within the
    // last 30 minutes — otherwise auto-continue loops forever on the
    // same articles because the stamp keeps refreshing.
    const freshCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    q = q.not('seo_ai_seeded_at', 'is', null)
    q = q.lt('seo_ai_seeded_at', freshCutoff)
  } else {
    // Rows where BOTH overrides are unset.
    q = q.or('seo_title.is.null,seo_title.eq.')
    q = q.or('seo_description.is.null,seo_description.eq.')
  }

  const { data } = await q
  return ((data ?? []) as Array<{
    id: string; title: string; excerpt: string | null; body: string | null;
    brand_slug: string | null;
  }>).map(r => ({
    id:          r.id,
    title:       r.title,
    excerpt:     r.excerpt,
    bodySnippet: ((r.body ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 1200),
    brandSlug:   r.brand_slug ?? 'rrp',
  }))
}

async function seedOne(
  sb:        SupabaseClient,
  c:         SeedCandidate,
  brandMdCache: Map<string, string>,
): Promise<SeedResult> {
  let brandMd = brandMdCache.get(c.brandSlug)
  if (!brandMd) {
    const promptCtx = await loadBrandPromptContext(sb, c.brandSlug)
    brandMd = renderBrandContextForPrompt(promptCtx)
    brandMdCache.set(c.brandSlug, brandMd)
  }

  const userPrompt = `${brandMd}

# Article to seed SEO for
Title: ${c.title}
Existing excerpt: ${c.excerpt ?? '(none)'}
Body snippet (first 1200 chars, HTML stripped):
${c.bodySnippet}

Generate PURE SEO copy per the system prompt instructions. Emit raw JSON only.`

  try {
    const res = await runAI({
      caller:       'bulk-seo-seeder',
      taskKind:     'drafting',
      systemPrompt: SYSTEM_PROMPT,
      messages:     [{ role: 'user', content: userPrompt }],
      maxTokens:    600,
    })
    const raw = res.text.trim().replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim()
    const parsed = JSON.parse(raw) as { seo_title?: string; seo_description?: string; seo_focus_keyword?: string }
    return {
      articleId:        c.id,
      seoTitle:         (parsed.seo_title         ?? '').slice(0, 70),
      seoDescription:   (parsed.seo_description   ?? '').slice(0, 200),
      seoFocusKeyword:  (parsed.seo_focus_keyword ?? '').slice(0, 60),
    }
  } catch (e) {
    return {
      articleId:        c.id,
      seoTitle:         '',
      seoDescription:   '',
      seoFocusKeyword:  '',
      error:            e instanceof Error ? e.message : String(e),
    }
  }
}

export async function runBulkSeed(
  sb:          SupabaseClient,
  brandSlug:   string | null,
  batchSize:   number = 5,
  save:        boolean = true,
  mode:        SeedMode = 'missing',
): Promise<{ processed: number; saved: number; errors: number; results: SeedResult[] }> {
  const candidates = await findSeedCandidates(sb, brandSlug, batchSize, mode)
  if (candidates.length === 0) {
    return { processed: 0, saved: 0, errors: 0, results: [] }
  }

  const brandMdCache = new Map<string, string>()
  const results: SeedResult[] = []
  for (const c of candidates) {
    const r = await seedOne(sb, c, brandMdCache)
    results.push(r)
  }

  let saved = 0
  let errors = results.filter(r => r.error).length
  if (save) {
    const now = new Date().toISOString()
    for (const r of results) {
      if (r.error || !r.seoTitle.trim() || !r.seoDescription.trim()) continue
      const { error } = await sb.from('guide_articles').update({
        seo_title:         r.seoTitle.trim(),
        seo_description:   r.seoDescription.trim(),
        seo_focus_keyword: r.seoFocusKeyword.trim() || null,
        seo_ai_seeded_at:  now,
      }).eq('id', r.articleId)
      if (!error) saved++
      else errors++
    }
  }

  return { processed: candidates.length, saved, errors, results }
}
