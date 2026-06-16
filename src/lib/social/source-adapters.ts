// ── Source adapters — convert any content type to a queueable payload ─
//
// Each content kind (article / event / guide / game / school-bit /
// column / cta) has its own table shape. The social rotation engine
// doesn't care about those shapes — it works on a normalized
// SocialPayload. The adapters bridge the two.
//
// Adding a new content kind = write a new adapter that exports
// loadPayload(sb, sourceId): Promise<SocialPayload>.

import type { SupabaseClient } from '@supabase/supabase-js'
import { MARKETS } from '@/lib/markets'

export interface SocialPayload {
  sourceKind:  string
  sourceId:    string
  brandSlug:   string | null
  title:       string
  excerpt:     string | null
  link:        string        // full URL with origin
  imageUrl:    string | null  // hero image for crop generation
  /** Time-anchored sources (events) carry a fire-on date that
   *  ramp_days_before computes against. */
  anchorDate?: string         // ISO datetime
}

function originForBrand(brandSlug: string | null): string {
  const m = brandSlug ? MARKETS.find(x => x.slug === brandSlug) : null
  return m ? `https://${m.publicHost}` : 'https://riverregionparents.com'
}

/** Article (guide_articles row). */
export async function loadArticlePayload(
  sb: SupabaseClient, id: string,
): Promise<SocialPayload | null> {
  const { data } = await sb
    .from('guide_articles')
    .select('id, title, excerpt, slug, column_slug, hero_image_url, brand_slug, seo_title, seo_description')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  const brand = (data.brand_slug as string | null) ?? 'rrp'
  const origin = originForBrand(brand)
  const path = data.column_slug ? `/columns/${data.column_slug}/${data.slug}` : `/articles/${data.slug}`
  return {
    sourceKind: 'article',
    sourceId:   data.id as string,
    brandSlug:  brand,
    title:      ((data.seo_title as string | null) ?? data.title as string).trim(),
    excerpt:    (data.seo_description as string | null) ?? (data.excerpt as string | null) ?? null,
    link:       `${origin}${path}`,
    imageUrl:   (data.hero_image_url as string | null) ?? null,
  }
}

/** Calendar event. */
export async function loadEventPayload(
  sb: SupabaseClient, id: string,
): Promise<SocialPayload | null> {
  const { data } = await sb
    .from('calendar_events')
    .select('id, title, description, slug, start_date, image_url, brand_slug')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  const brand = (data.brand_slug as string | null) ?? 'rrp'
  const origin = originForBrand(brand)
  return {
    sourceKind: 'event',
    sourceId:   data.id as string,
    brandSlug:  brand,
    title:      data.title as string,
    excerpt:    data.description as string | null,
    link:       `${origin}/calendar/${data.slug ?? data.id}`,
    imageUrl:   data.image_url as string | null,
    anchorDate: data.start_date as string | null ?? undefined,
  }
}

/** Guide hub page (guides config + content). */
export async function loadGuidePayload(
  _sb: SupabaseClient, guideSlug: string, brandSlug: string | null = 'rrp',
): Promise<SocialPayload | null> {
  const origin = originForBrand(brandSlug)
  // Guides are code-defined. Best-effort metadata.
  const titles: Record<string, { title: string; excerpt: string }> = {
    'family-resource-guide':  { title: 'Family Resource Guide',  excerpt: 'Your one-stop directory for everything River Region families need.' },
    'summer-fun-guide':       { title: 'Summer Fun Guide',       excerpt: 'Camps, day trips, activities, and ideas for families this summer.' },
    'special-needs-guide':    { title: 'Special Needs Guide',    excerpt: 'Resources, therapists, support groups, and family services.' },
    'summer-camp-guide':      { title: 'Summer Camp Guide',      excerpt: 'Every summer camp in the River Region, with dates, ages, and pricing.' },
  }
  const meta = titles[guideSlug]
  if (!meta) return null
  return {
    sourceKind: 'guide',
    sourceId:   guideSlug,
    brandSlug,
    title:      meta.title,
    excerpt:    meta.excerpt,
    link:       `${origin}/${guideSlug}`,
    imageUrl:   null,  // optional — guide cover can be added later
  }
}

/** School bit. */
export async function loadSchoolBitPayload(
  sb: SupabaseClient, id: string,
): Promise<SocialPayload | null> {
  const { data } = await sb
    .from('school_bits')
    .select('id, title, body, school_name, brand_slug, image_url')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  const brand = (data.brand_slug as string | null) ?? 'rrp'
  const origin = originForBrand(brand)
  return {
    sourceKind: 'school-bit',
    sourceId:   data.id as string,
    brandSlug:  brand,
    title:      `${data.title} — ${data.school_name ?? 'School News'}`,
    excerpt:    (data.body as string | null)?.slice(0, 280) ?? null,
    link:       `${origin}/school-zone/school-bits/${data.id}`,
    imageUrl:   data.image_url as string | null,
  }
}

/** Generic CTA — newsletter signup, advertiser callout, etc. CTAs are
 *  hand-defined per brand. */
export async function loadCtaPayload(
  _sb: SupabaseClient, ctaId: string, brandSlug: string | null = 'rrp',
): Promise<SocialPayload | null> {
  const origin = originForBrand(brandSlug)
  const CTAS: Record<string, { title: string; excerpt: string; path: string }> = {
    'newsletter': { title: 'Get the weekly River Region Parents newsletter',
                    excerpt: 'Local family events, must-read articles, and exclusive offers — every Tuesday.',
                    path:    '/subscribe' },
    'advertise':  { title: 'Advertise with River Region Parents',
                    excerpt: 'Reach 50,000+ engaged local families per month. Print + digital + social.',
                    path:    '/advertise' },
    'submit':     { title: 'Submit a story or nominate someone',
                    excerpt: 'Teacher of the Month, Mom to Mom, family spotlights — we want to feature them.',
                    path:    '/submit' },
  }
  const meta = CTAS[ctaId]
  if (!meta) return null
  return {
    sourceKind: 'cta',
    sourceId:   ctaId,
    brandSlug,
    title:      meta.title,
    excerpt:    meta.excerpt,
    link:       `${origin}${meta.path}`,
    imageUrl:   null,
  }
}

/** Themed campaign — the campaign landing page becomes a social
 *  promotion source. */
export async function loadCampaignPayload(
  sb: SupabaseClient, id: string,
): Promise<SocialPayload | null> {
  const { data } = await sb
    .from('themed_campaigns')
    .select('id, brand_slug, slug, theme_title, hero_tagline, cover_image_url')
    .eq('id', id)
    .maybeSingle()
  if (!data) return null
  const brand = (data.brand_slug as string | null) ?? 'rrp'
  const origin = originForBrand(brand)
  return {
    sourceKind: 'campaign',
    sourceId:   data.id as string,
    brandSlug:  brand,
    title:      data.theme_title as string,
    excerpt:    (data.hero_tagline as string | null) ?? null,
    link:       `${origin}/campaigns/${data.slug}`,
    imageUrl:   (data.cover_image_url as string | null) ?? null,
  }
}

/** Dispatch table — kind → loader. */
const LOADERS: Record<string, (sb: SupabaseClient, id: string, brandSlug?: string | null) => Promise<SocialPayload | null>> = {
  'article':    (sb, id) => loadArticlePayload(sb, id),
  'event':      (sb, id) => loadEventPayload(sb, id),
  'guide':      (sb, id, brand) => loadGuidePayload(sb, id, brand ?? null),
  'school-bit': (sb, id) => loadSchoolBitPayload(sb, id),
  'cta':        (sb, id, brand) => loadCtaPayload(sb, id, brand ?? null),
  'campaign':   (sb, id) => loadCampaignPayload(sb, id),
}

export async function loadPayload(
  sb: SupabaseClient, kind: string, id: string, brandSlug?: string | null,
): Promise<SocialPayload | null> {
  const loader = LOADERS[kind]
  if (!loader) return null
  return loader(sb, id, brandSlug)
}
