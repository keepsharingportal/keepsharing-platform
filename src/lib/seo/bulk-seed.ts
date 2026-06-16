// ── Bulk SEO seeder ─────────────────────────────────────────────────
//
// Walks published articles where seo_title OR seo_description is
// empty, asks Claude to generate social-optimized copy per article,
// writes the result back + stamps seo_ai_seeded_at so the editor
// knows which rows are AI-seeded vs human-tuned.
//
// Processes in batches of 5 to fit Vercel's 300s window comfortably.
// Each call to runBulkSeed processes one batch — the editor clicks
// "Run next batch" multiple times until the queue is empty.

import type { SupabaseClient } from '@supabase/supabase-js'
import { runAI } from '@/lib/ai/client'
import { loadBrandPromptContext, renderBrandContextForPrompt } from '@/lib/seo/brand-profile'

const SYSTEM_PROMPT = `You produce social-sharing-optimized SEO copy for a single article. Each
article gets:
  - seo_title:        50-60 chars, lead with the key benefit / hook
  - seo_description:  140-155 chars, full sentence with locality + payoff
  - seo_focus_keyword: 2-5 words, the primary search term this article targets

Read the brand voice + audience + the article excerpt + body snippet.
Be SPECIFIC to the brand's market — name sub-areas when relevant.
Don't repeat the article title verbatim; rewrite for social share appeal.

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

/** Returns next N candidates needing seed work. Sorted by published_at
 *  desc so most-recent (and most-trafficked likely) get seeded first. */
export async function findSeedCandidates(
  sb:          SupabaseClient,
  brandSlug:   string | null,
  limit:       number = 5,
): Promise<SeedCandidate[]> {
  let q = sb
    .from('guide_articles')
    .select('id, title, excerpt, body, brand_slug, seo_title, seo_description, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(limit)
  if (brandSlug) q = q.eq('brand_slug', brandSlug)
  // We want rows where BOTH overrides are unset — the editor decides
  // whether half-filled rows need backfilling individually.
  q = q.or('seo_title.is.null,seo_title.eq.')
  q = q.or('seo_description.is.null,seo_description.eq.')

  const { data } = await q
  return ((data ?? []) as Array<{
    id: string; title: string; excerpt: string | null; body: string | null;
    brand_slug: string | null; seo_title: string | null; seo_description: string | null;
  }>).map(r => ({
    id:          r.id,
    title:       r.title,
    excerpt:     r.excerpt,
    bodySnippet: ((r.body ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).slice(0, 1200),
    brandSlug:   r.brand_slug ?? 'rrp',
  }))
}

/** Generate seed for one candidate. */
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

# Article to seed
Title: ${c.title}
Existing excerpt: ${c.excerpt ?? '(none)'}
Body snippet (first 1200 chars, HTML stripped):
${c.bodySnippet}

Generate SEO copy per the system prompt. Emit raw JSON only.`

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

/** Run one batch. Returns the per-article results — caller decides
 *  whether to save immediately (true) or queue for editor review. */
export async function runBulkSeed(
  sb:          SupabaseClient,
  brandSlug:   string | null,
  batchSize:   number = 5,
  save:        boolean = true,
): Promise<{ processed: number; saved: number; errors: number; results: SeedResult[] }> {
  const candidates = await findSeedCandidates(sb, brandSlug, batchSize)
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
