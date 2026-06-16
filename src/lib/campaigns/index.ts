// ── Themed campaigns — types + load/save helpers ─────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'

export type CampaignStatus = 'planning' | 'active' | 'published' | 'archived'

export type CampaignArticleRole = 'cover' | 'feature' | 'supporting' | 'cta'

export type SponsorPlacementType =
  | 'cover-sponsor'
  | 'section-sponsor'
  | 'feature-sponsor'
  | 'directory-listing'
  | 'social-shoutout'

export interface AIBrief {
  /** Editorial brief text Claude proposed. */
  editorial_brief?:    string
  /** Suggested articles to write/assign. */
  article_assignments?: Array<{
    title:             string
    angle:             string
    target_keyword?:   string
    word_count_target?: number
    role?:             CampaignArticleRole
  }>
  /** Sponsor categories worth pitching for this campaign. */
  sponsor_categories?: string[]
  /** Newsletter spotlight angle. */
  newsletter_angle?:   string
  /** Social hashtags + caption hooks unique to this campaign. */
  social_hooks?:       { hashtags?: string[]; hooks?: string[] }
}

export interface ThemedCampaign {
  id:                   string
  brandSlug:            string
  slug:                 string
  themeTitle:           string
  month:                string   // YYYY-MM-DD (1st of month)
  brief:                string | null
  aiBrief:              AIBrief
  targetKeywords:       string[]
  status:               CampaignStatus
  magazineIssueId:      string | null
  coverImageUrl:        string | null
  heroTagline:          string | null
  publicLandingActive:  boolean
  createdAt:            string
  updatedAt:            string
}

export interface CampaignArticle {
  campaignId:   string
  articleId:    string
  role:         CampaignArticleRole
  displayOrder: number
}

export interface CampaignSponsor {
  id:                    string
  campaignId:            string
  advertiserAccountId:   string | null
  sponsorName:           string | null
  placementType:         SponsorPlacementType
  dealValueCents:        number | null
  notes:                 string | null
}

interface CampaignRow {
  id: string; brand_slug: string; slug: string; theme_title: string; month: string;
  brief: string | null; ai_brief: AIBrief | null; target_keywords: string[] | null;
  status: CampaignStatus; magazine_issue_id: string | null;
  cover_image_url: string | null; hero_tagline: string | null;
  public_landing_active: boolean;
  created_at: string; updated_at: string;
}

function mapCampaign(r: CampaignRow): ThemedCampaign {
  return {
    id:                  r.id,
    brandSlug:           r.brand_slug,
    slug:                r.slug,
    themeTitle:          r.theme_title,
    month:               r.month,
    brief:               r.brief,
    aiBrief:             r.ai_brief ?? {},
    targetKeywords:      r.target_keywords ?? [],
    status:              r.status,
    magazineIssueId:     r.magazine_issue_id,
    coverImageUrl:       r.cover_image_url,
    heroTagline:         r.hero_tagline,
    publicLandingActive: r.public_landing_active,
    createdAt:           r.created_at,
    updatedAt:           r.updated_at,
  }
}

export async function listCampaigns(
  sb:        SupabaseClient,
  brandSlug: string | null = null,
): Promise<ThemedCampaign[]> {
  let q = sb.from('themed_campaigns').select('*').order('month', { ascending: false })
  if (brandSlug) q = q.eq('brand_slug', brandSlug)
  const { data } = await q
  return ((data ?? []) as CampaignRow[]).map(mapCampaign)
}

export async function loadCampaign(
  sb: SupabaseClient, id: string,
): Promise<ThemedCampaign | null> {
  const { data } = await sb.from('themed_campaigns').select('*').eq('id', id).maybeSingle()
  return data ? mapCampaign(data as CampaignRow) : null
}

export async function loadCampaignBySlug(
  sb: SupabaseClient, brandSlug: string, slug: string,
): Promise<ThemedCampaign | null> {
  const { data } = await sb.from('themed_campaigns')
    .select('*')
    .eq('brand_slug', brandSlug)
    .eq('slug', slug)
    .maybeSingle()
  return data ? mapCampaign(data as CampaignRow) : null
}

export interface CreateCampaignInput {
  brandSlug:        string
  slug:             string
  themeTitle:       string
  month:            string
  brief?:           string
  targetKeywords?:  string[]
  status?:          CampaignStatus
  magazineIssueId?: string | null
  coverImageUrl?:   string
  heroTagline?:     string
  createdBy?:       string
}

export async function createCampaign(
  sb: SupabaseClient, input: CreateCampaignInput,
): Promise<ThemedCampaign> {
  const row = {
    brand_slug:           input.brandSlug,
    slug:                 input.slug,
    theme_title:          input.themeTitle,
    month:                input.month,
    brief:                input.brief ?? null,
    target_keywords:      input.targetKeywords ?? [],
    status:               input.status ?? 'planning',
    magazine_issue_id:    input.magazineIssueId ?? null,
    cover_image_url:      input.coverImageUrl ?? null,
    hero_tagline:         input.heroTagline ?? null,
    created_by:           input.createdBy ?? null,
    last_edited_by:       input.createdBy ?? null,
  }
  const { data, error } = await sb.from('themed_campaigns').insert(row).select().single()
  if (error || !data) throw new Error(`createCampaign failed: ${error?.message ?? 'no data'}`)
  return mapCampaign(data as CampaignRow)
}

export interface UpdateCampaignInput {
  brief?:               string | null
  aiBrief?:             AIBrief
  targetKeywords?:      string[]
  status?:              CampaignStatus
  coverImageUrl?:       string | null
  heroTagline?:         string | null
  publicLandingActive?: boolean
  editedBy?:            string
}

export async function updateCampaign(
  sb: SupabaseClient, id: string, input: UpdateCampaignInput,
): Promise<void> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (input.brief !== undefined)               update.brief                  = input.brief
  if (input.aiBrief !== undefined)             update.ai_brief               = input.aiBrief
  if (input.targetKeywords !== undefined)      update.target_keywords        = input.targetKeywords
  if (input.status !== undefined)              update.status                 = input.status
  if (input.coverImageUrl !== undefined)       update.cover_image_url        = input.coverImageUrl
  if (input.heroTagline !== undefined)         update.hero_tagline           = input.heroTagline
  if (input.publicLandingActive !== undefined) update.public_landing_active  = input.publicLandingActive
  if (input.editedBy)                          update.last_edited_by         = input.editedBy
  await sb.from('themed_campaigns').update(update).eq('id', id)
}

/** Linked articles loader with article meta for display. */
export async function loadCampaignArticles(
  sb: SupabaseClient, campaignId: string,
): Promise<Array<{
  article: { id: string; title: string; slug: string; columnSlug: string | null; heroImageUrl: string | null; excerpt: string | null; publishedAt: string | null }
  role: CampaignArticleRole
  displayOrder: number
}>> {
  const { data: links } = await sb
    .from('themed_campaign_articles')
    .select('article_id, role, display_order')
    .eq('campaign_id', campaignId)
    .order('display_order', { ascending: true })
  const rows = (links ?? []) as Array<{ article_id: string; role: CampaignArticleRole; display_order: number }>
  if (rows.length === 0) return []
  const ids = rows.map(r => r.article_id)
  const { data: arts } = await sb
    .from('guide_articles')
    .select('id, title, slug, column_slug, hero_image_url, excerpt, published_at')
    .in('id', ids)
  const articleById = new Map(
    ((arts ?? []) as Array<{ id: string; title: string; slug: string; column_slug: string | null; hero_image_url: string | null; excerpt: string | null; published_at: string | null }>)
      .map(a => [a.id, a])
  )
  return rows.map(r => {
    const a = articleById.get(r.article_id)
    if (!a) return null
    return {
      article: {
        id:           a.id,
        title:        a.title,
        slug:         a.slug,
        columnSlug:   a.column_slug,
        heroImageUrl: a.hero_image_url,
        excerpt:      a.excerpt,
        publishedAt:  a.published_at,
      },
      role: r.role,
      displayOrder: r.display_order,
    }
  }).filter(Boolean) as Array<{
    article: { id: string; title: string; slug: string; columnSlug: string | null; heroImageUrl: string | null; excerpt: string | null; publishedAt: string | null }
    role: CampaignArticleRole
    displayOrder: number
  }>
}

export async function addArticleToCampaign(
  sb: SupabaseClient, campaignId: string, articleId: string, role: CampaignArticleRole = 'supporting',
): Promise<void> {
  await sb.from('themed_campaign_articles').upsert({
    campaign_id: campaignId,
    article_id:  articleId,
    role,
    display_order: 0,
  }, { onConflict: 'campaign_id,article_id' })
}

export async function removeArticleFromCampaign(
  sb: SupabaseClient, campaignId: string, articleId: string,
): Promise<void> {
  await sb.from('themed_campaign_articles')
    .delete()
    .eq('campaign_id', campaignId)
    .eq('article_id', articleId)
}
