// ── Strategist: candidate gathering ──────────────────────────────
//
// Walks every content pool table and emits a normalized list of items
// the strategist can consider for the upcoming week. Each candidate
// carries enough metadata to be scored (recency, timeliness, tone hint,
// last-used) and enough content to seed caption generation (title,
// preview, image).

import type { SupabaseClient } from '@supabase/supabase-js'

export type CandidateKind = 'article' | 'event' | 'school_bit' | 'quote' | 'spotlight' | 'video'

export interface Candidate {
  sourceKind:  CandidateKind
  sourceId:    string
  brandSlug:   string | null     // null = syndication-eligible across all brands
  title:       string
  preview:     string             // excerpt / blurb / quote text
  imageUrl:    string | null
  link:        string | null      // canonical URL on our site (if applicable)
  publishedAt: string | null      // ISO; for recency scoring
  anchorDate:  string | null      // ISO; for events (timeliness scoring)
  lastUsedAt:  string | null      // ISO; for cooldown
  toneHint:    string | null      // 'inspiring' | 'funny' | etc, where editor set one
  topics:      string[]
  authorName:  string | null
  columnLabel: string | null
}

// Generous defaults; the scorer will filter aggressively after.
const ARTICLE_LOOKBACK_DAYS    = 120
const SCHOOL_BIT_LOOKBACK_DAYS = 60

export async function gatherCandidates(sb: SupabaseClient, brandSlug: string): Promise<Candidate[]> {
  const out: Candidate[] = []
  const articleCutoff   = new Date(Date.now() - ARTICLE_LOOKBACK_DAYS    * 86400_000).toISOString()
  const schoolBitCutoff = new Date(Date.now() - SCHOOL_BIT_LOOKBACK_DAYS * 86400_000).toISOString()

  // ── Articles ────────────────────────────────────────────────
  const { data: articles } = await sb
    .from('guide_articles')
    .select('id, title, excerpt, slug, column_slug, hero_image_url, published_at, brand_slug, syndicated_to_brands, author_byline, author_name, topics, social_voice_tone')
    .eq('published', true)
    .gte('published_at', articleCutoff)
    .or(`brand_slug.eq.${brandSlug},syndicated_to_brands.cs.{${brandSlug}}`)
    .order('published_at', { ascending: false })
    .limit(80)

  for (const a of (articles ?? []) as Array<Record<string, unknown>>) {
    out.push({
      sourceKind:  'article',
      sourceId:    a.id as string,
      brandSlug:   (a.brand_slug as string | null) ?? null,
      title:       a.title as string,
      preview:     (a.excerpt as string | null) ?? '',
      imageUrl:    (a.hero_image_url as string | null) ?? null,
      link:        a.column_slug && a.slug ? `/columns/${a.column_slug}/${a.slug}` : null,
      publishedAt: (a.published_at as string | null) ?? null,
      anchorDate:  null,
      lastUsedAt:  null, // joined separately below
      toneHint:    (a.social_voice_tone as string | null) ?? null,
      topics:      (a.topics as string[] | null) ?? [],
      authorName:  ((a.author_byline as string | null) ?? (a.author_name as string | null)) ?? null,
      columnLabel: null, // resolved in caption composer
    })
  }

  // ── School bits ─────────────────────────────────────────────
  const { data: bits } = await sb
    .from('school_bits')
    .select('id, headline, body, image_url, published_at, brand_slug')
    .eq('status', 'published')
    .gte('published_at', schoolBitCutoff)
    .eq('brand_slug', brandSlug)
    .order('published_at', { ascending: false })
    .limit(40)

  for (const b of (bits ?? []) as Array<Record<string, unknown>>) {
    out.push({
      sourceKind:  'school_bit',
      sourceId:    b.id as string,
      brandSlug:   (b.brand_slug as string | null) ?? null,
      title:       (b.headline as string) ?? '',
      preview:     (b.body as string | null)?.slice(0, 280) ?? '',
      imageUrl:    (b.image_url as string | null) ?? null,
      link:        null,
      publishedAt: (b.published_at as string | null) ?? null,
      anchorDate:  null,
      lastUsedAt:  null,
      toneHint:    'celebratory',
      topics:      [],
      authorName:  null,
      columnLabel: null,
    })
  }

  // ── Events (upcoming in the next 14 days) ──────────────────
  const now      = new Date().toISOString()
  const inFourteen = new Date(Date.now() + 14 * 86400_000).toISOString()
  const { data: events } = await sb
    .from('calendar_events')
    .select('id, title, description, slug, hero_image_url, start_date, brand_slug')
    .gte('start_date', now)
    .lte('start_date', inFourteen)
    .eq('brand_slug', brandSlug)
    .order('start_date', { ascending: true })
    .limit(20)

  for (const e of (events ?? []) as Array<Record<string, unknown>>) {
    out.push({
      sourceKind:  'event',
      sourceId:    e.id as string,
      brandSlug:   (e.brand_slug as string | null) ?? null,
      title:       e.title as string,
      preview:     (e.description as string | null)?.slice(0, 280) ?? '',
      imageUrl:    (e.hero_image_url as string | null) ?? null,
      link:        e.slug ? `/calendar/events/${e.slug}` : null,
      publishedAt: null,
      anchorDate:  (e.start_date as string | null) ?? null,
      lastUsedAt:  null,
      toneHint:    'practical',
      topics:      [],
      authorName:  null,
      columnLabel: null,
    })
  }

  // ── Quotes ──────────────────────────────────────────────────
  const { data: quotes } = await sb
    .from('quote_bank')
    .select('id, quote, attribution, brand_slug, tone_hint, topics, image_url, last_used_at')
    .eq('is_active', true)
    .or(`brand_slug.eq.${brandSlug},brand_slug.is.null`)
    .order('times_used', { ascending: true })
    .limit(40)

  for (const q of (quotes ?? []) as Array<Record<string, unknown>>) {
    out.push({
      sourceKind:  'quote',
      sourceId:    q.id as string,
      brandSlug:   (q.brand_slug as string | null) ?? null,
      title:       ((q.quote as string) ?? '').slice(0, 60),
      preview:     (q.quote as string) ?? '',
      imageUrl:    (q.image_url as string | null) ?? null,
      link:        null,
      publishedAt: null,
      anchorDate:  null,
      lastUsedAt:  (q.last_used_at as string | null) ?? null,
      toneHint:    (q.tone_hint as string | null) ?? 'inspiring',
      topics:      (q.topics as string[] | null) ?? [],
      authorName:  (q.attribution as string | null) ?? null,
      columnLabel: null,
    })
  }

  // ── Curated videos ──────────────────────────────────────────
  const { data: videos } = await sb
    .from('curated_videos')
    .select('id, title, description, video_url, thumbnail, brand_slug, category, last_used_at')
    .eq('is_active', true)
    .or(`brand_slug.eq.${brandSlug},brand_slug.is.null`)
    .order('times_used', { ascending: true })
    .limit(20)

  for (const v of (videos ?? []) as Array<Record<string, unknown>>) {
    out.push({
      sourceKind:  'video',
      sourceId:    v.id as string,
      brandSlug:   (v.brand_slug as string | null) ?? null,
      title:       v.title as string,
      preview:     (v.description as string | null) ?? '',
      imageUrl:    (v.thumbnail as string | null) ?? null,
      link:        (v.video_url as string | null) ?? null,
      publishedAt: null,
      anchorDate:  null,
      lastUsedAt:  (v.last_used_at as string | null) ?? null,
      toneHint:    null,
      topics:      v.category ? [v.category as string] : [],
      authorName:  null,
      columnLabel: null,
    })
  }

  // ── Community spotlights ────────────────────────────────────
  // The table predates the strategist (migration 037) — uses honoree_name /
  // honoree_context / hero_image_url / full_story_link. Migration 200
  // ALTERs in brand_slug + tone_hint + times_used + last_used_at.
  const { data: spots } = await sb
    .from('community_spotlights')
    .select('id, honoree_name, honoree_context, hero_image_url, full_story_link, brand_slug, tone_hint, last_used_at')
    .eq('is_active', true)
    .or(`brand_slug.eq.${brandSlug},brand_slug.is.null`)
    .order('times_used', { ascending: true })
    .limit(30)

  for (const s of (spots ?? []) as Array<Record<string, unknown>>) {
    out.push({
      sourceKind:  'spotlight',
      sourceId:    s.id as string,
      brandSlug:   (s.brand_slug as string | null) ?? null,
      title:       s.honoree_name as string,
      preview:     (s.honoree_context as string | null) ?? '',
      imageUrl:    (s.hero_image_url as string | null) ?? null,
      link:        (s.full_story_link as string | null) ?? null,
      publishedAt: null,
      anchorDate:  null,
      lastUsedAt:  (s.last_used_at as string | null) ?? null,
      toneHint:    (s.tone_hint as string | null) ?? 'tender',
      topics:      [],
      authorName:  null,
      columnLabel: null,
    })
  }

  // ── Recency annotation: when was each item last actually used? ──
  // Join social_plan_slot history into the candidate's lastUsedAt for
  // articles/school-bits/events (the pool tables already track this for
  // quotes/videos/spotlights).
  const ids = out.filter(c => !c.lastUsedAt).map(c => c.sourceId)
  if (ids.length > 0) {
    const { data: history } = await sb
      .from('social_plan_slot')
      .select('source_id, scheduled_for')
      .in('source_id', ids)
      .order('scheduled_for', { ascending: false })
    const lastUsedById = new Map<string, string>()
    for (const h of (history ?? []) as Array<{ source_id: string; scheduled_for: string }>) {
      if (!lastUsedById.has(h.source_id)) lastUsedById.set(h.source_id, h.scheduled_for)
    }
    for (const c of out) {
      if (!c.lastUsedAt) c.lastUsedAt = lastUsedById.get(c.sourceId) ?? null
    }
  }

  return out
}
