// ── Bulk SOCIAL seeder ─────────────────────────────────────────────
//
// Mirror of lib/seo/bulk-seed.ts but for SOCIAL post copy. Walks
// published articles where social_hook (or the per-platform captions)
// are empty and runs the friend-voice caption generator to backfill:
//   - social_hook        (the "Why click?" lead)
//   - social_fb_caption  (Facebook post text)
//   - social_ig_caption  (Instagram caption + hashtags)
//
// Uses the same anti-loop safety as the SEO seeder:
//   - Server query excludes rows reseeded in the last 30 minutes
//   - Caller tracks processed IDs per session
//
// Modes:
//   - 'missing'   : social_hook IS NULL (never seeded)
//   - 'reseed-ai' : social_ai_seeded_at IS NOT NULL AND > 30 min old
//                   (re-runs with the latest voice profile / prompt)

import type { SupabaseClient } from '@supabase/supabase-js'
import { loadArticlePayload } from '@/lib/social/source-adapters'
import { generateCaptionsForContent } from '@/lib/social/caption-generator'

export interface SocialSeedCandidate {
  id:         string
  title:      string
  brandSlug:  string
}

export interface SocialSeedResult {
  articleId:    string
  socialHook:   string
  fbCaption:    string
  igCaption:    string
  error?:       string
}

export type SocialSeedMode = 'missing' | 'reseed-ai'

export async function findSocialSeedCandidates(
  sb:        SupabaseClient,
  brandSlug: string | null,
  limit:     number = 5,
  mode:      SocialSeedMode = 'missing',
): Promise<SocialSeedCandidate[]> {
  let q = sb
    .from('guide_articles')
    .select('id, title, brand_slug, social_hook, social_ai_seeded_at, published_at')
    .eq('published', true)
    .order('published_at', { ascending: false })
    .limit(limit)
  if (brandSlug) q = q.eq('brand_slug', brandSlug)

  if (mode === 'reseed-ai') {
    // Re-process rows the seeder previously wrote — but exclude any
    // within the last 30 minutes so auto-continue can't loop. Also
    // skip per-platform mode rows: those have editor-written verbatim
    // captions and the hook isn't authoritative there.
    const freshCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    q = q.not('social_ai_seeded_at', 'is', null)
    q = q.lt('social_ai_seeded_at', freshCutoff)
    q = q.eq('social_mode', 'hook')
  } else {
    // Rows in 'hook' mode where the hook isn't set yet. Editor-written
    // rows (with social_ai_seeded_at NULL but social_hook populated)
    // are protected by the hook-empty clause. Per-platform-mode rows
    // are protected by the mode filter.
    q = q.or('social_hook.is.null,social_hook.eq.')
    q = q.eq('social_mode', 'hook')
  }

  const { data } = await q
  return ((data ?? []) as Array<{ id: string; title: string; brand_slug: string | null }>).map(r => ({
    id:        r.id,
    title:     r.title,
    brandSlug: r.brand_slug ?? 'rrp',
  }))
}

async function seedOne(
  sb: SupabaseClient,
  c:  SocialSeedCandidate,
): Promise<SocialSeedResult> {
  try {
    const payload = await loadArticlePayload(sb, c.id)
    if (!payload) {
      return { articleId: c.id, socialHook: '', fbCaption: '', igCaption: '', error: 'article not found' }
    }

    const captions = await generateCaptionsForContent(
      sb,
      payload.brandSlug ?? 'rrp',
      {
        title:        payload.title,
        excerpt:      payload.excerpt,
        link:         payload.link,
        contentType:  'article',
        socialHook:   payload.socialHook,
        tone:         null,  // AI detects best tone
        authorName:   payload.authorName,
        columnLabel:  payload.columnLabel,
      },
      ['facebook', 'instagram'],
    )

    const fb = captions.find(c => c.platform === 'facebook')
    const ig = captions.find(c => c.platform === 'instagram')

    const hookSource = fb?.caption ?? ig?.caption ?? ''
    const social_hook = hookSource.split(/[.!?]\s/)[0]?.trim().slice(0, 240) ?? ''

    const igCaption = ig
      ? `${ig.caption}${ig.hashtags && ig.hashtags.length ? '\n\n' + ig.hashtags.join(' ') : ''}`
      : ''

    return {
      articleId:  c.id,
      socialHook: social_hook,
      fbCaption:  fb?.caption ?? '',
      igCaption,
    }
  } catch (e) {
    return {
      articleId: c.id,
      socialHook: '', fbCaption: '', igCaption: '',
      error: e instanceof Error ? e.message : String(e),
    }
  }
}

export async function runBulkSocialSeed(
  sb:        SupabaseClient,
  brandSlug: string | null,
  batchSize: number = 5,
  save:      boolean = true,
  mode:      SocialSeedMode = 'missing',
): Promise<{ processed: number; saved: number; errors: number; results: SocialSeedResult[] }> {
  const candidates = await findSocialSeedCandidates(sb, brandSlug, batchSize, mode)
  if (candidates.length === 0) {
    return { processed: 0, saved: 0, errors: 0, results: [] }
  }

  const results: SocialSeedResult[] = []
  for (const c of candidates) {
    const r = await seedOne(sb, c)
    results.push(r)
  }

  let saved  = 0
  let errors = results.filter(r => r.error).length
  if (save) {
    const now = new Date().toISOString()
    for (const r of results) {
      if (r.error) continue
      // Sprint 9: write the hook only + pin to hook mode. Dispatcher
      // AI-regenerates FB + IG fresh on every fire from the hook + the
      // brand voice profile. Per-platform fields are nulled so we never
      // have an article in hook mode that also carries stale overrides.
      const { error } = await sb.from('guide_articles').update({
        social_mode:         'hook',
        social_hook:         r.socialHook || null,
        social_fb_caption:   null,
        social_ig_caption:   null,
        social_ai_seeded_at: now,
      }).eq('id', r.articleId)
      if (!error) saved++
      else errors++
    }
  }

  return { processed: candidates.length, saved, errors, results }
}
