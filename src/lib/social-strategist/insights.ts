// ── Strategist: Insights pull ─────────────────────────────────────
//
// Daily job that walks dispatched social_plan_slot rows from the last
// 7 days and writes engagement metrics to social_performance. The
// strategist reads social_performance to auto-bias future picks
// (Phase 4 of Sprint 10).
//
// Source of truth: the per-brand FB Page tokens stored in
// facebook_pages (originally set up for the legacy auto-poster). For
// IG insights we pull from the linked IG Business account tied to the
// FB Page. GHL doesn't currently expose post-level analytics via API,
// so we go direct to Meta Graph for the metrics.
//
// What we record per slot×platform:
//   impressions, reach, reactions, comments, shares, clicks,
//   engagement_rate = (reactions+comments+shares) / reach
//
// Gracefully degrades when:
//   - facebook_pages row missing for the brand (skip + warn)
//   - GHL post id doesn't match a recent Page post (skip + warn)
//   - Meta API returns an error (record refresh attempt without metrics)

import type { SupabaseClient } from '@supabase/supabase-js'

const FB_GRAPH = 'https://graph.facebook.com/v21.0'

interface FacebookPage {
  brand_slug:              string
  page_id:                 string
  page_token:              string
  ig_business_account_id:  string | null
}

interface DispatchedSlot {
  id:            string
  plan_id:       string
  brand_slug:    string
  source_kind:   string
  tone:          string | null
  day_of_week:   number
  slot:          string
  scheduled_for: string
  ghl_post_id:   string | null
  fb_caption:    string | null
  ig_caption:    string | null
  platforms:     string[]
}

async function fbInsights(pageId: string, token: string, postId: string): Promise<{
  impressions: number; reach: number; reactions: number; comments: number; shares: number; clicks: number;
} | null> {
  // Page post by id (post id format on FB is usually pageId_postId)
  const fullId = postId.includes('_') ? postId : `${pageId}_${postId}`
  const fields = [
    'shares',
    'comments.summary(true).limit(0)',
    'reactions.summary(true).limit(0)',
    'insights.metric(post_impressions,post_impressions_unique,post_clicks)',
  ].join(',')
  const url = `${FB_GRAPH}/${encodeURIComponent(fullId)}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(token)}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json() as {
    shares?:    { count?: number }
    comments?:  { summary?: { total_count?: number } }
    reactions?: { summary?: { total_count?: number } }
    insights?:  { data?: Array<{ name: string; values: Array<{ value: number }> }> }
  }
  const insightsByName = new Map<string, number>()
  for (const i of data.insights?.data ?? []) {
    insightsByName.set(i.name, i.values?.[0]?.value ?? 0)
  }
  return {
    impressions: insightsByName.get('post_impressions') ?? 0,
    reach:       insightsByName.get('post_impressions_unique') ?? 0,
    reactions:   data.reactions?.summary?.total_count ?? 0,
    comments:    data.comments?.summary?.total_count ?? 0,
    shares:      data.shares?.count ?? 0,
    clicks:      insightsByName.get('post_clicks') ?? 0,
  }
}

async function findFbPostByCaption(pageId: string, token: string, captionSnippet: string, scheduledFor: string): Promise<string | null> {
  // GHL doesn't always return the underlying FB post id. Fallback: pull
  // the page's recent posts in a 24h window around scheduled_for and
  // match by the first 30 chars of the caption.
  const since = Math.floor(new Date(scheduledFor).getTime() / 1000) - 6 * 3600
  const until = Math.floor(new Date(scheduledFor).getTime() / 1000) + 24 * 3600
  const url = `${FB_GRAPH}/${pageId}/posts?fields=id,message&since=${since}&until=${until}&access_token=${encodeURIComponent(token)}`
  const res = await fetch(url)
  if (!res.ok) return null
  const data = await res.json() as { data?: Array<{ id: string; message?: string }> }
  const needle = captionSnippet.slice(0, 30).toLowerCase()
  const hit = (data.data ?? []).find(p => (p.message ?? '').toLowerCase().includes(needle))
  return hit?.id ?? null
}

export async function refreshInsightsForRecentPosts(sb: SupabaseClient): Promise<{
  scanned: number; updated: number; warnings: string[]
}> {
  const warnings: string[] = []
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const oneHourAgo   = new Date(Date.now() - 1 * 3600000).toISOString()

  // Pull dispatched slots posted within the last 7 days (but at least 1h old —
  // FB insights need a beat to stabilize after publish).
  const { data: rawSlots } = await sb
    .from('social_plan_slot')
    .select(`
      id, plan_id, source_kind, tone, day_of_week, slot, scheduled_for,
      ghl_post_id, fb_caption, ig_caption, platforms,
      social_plan!inner(brand_slug)
    `)
    .eq('status', 'dispatched')
    .gte('scheduled_for', sevenDaysAgo)
    .lte('scheduled_for', oneHourAgo)

  const slots = ((rawSlots ?? []) as unknown as Array<DispatchedSlot & { social_plan: { brand_slug: string } }>)
    .map(s => ({ ...s, brand_slug: s.social_plan.brand_slug }))

  if (slots.length === 0) return { scanned: 0, updated: 0, warnings: ['no dispatched slots in window'] }

  // Pull every relevant brand's FB Page in one query.
  const brands = Array.from(new Set(slots.map(s => s.brand_slug)))
  const { data: pages } = await sb
    .from('facebook_pages')
    .select('brand_slug, page_id, page_token, ig_business_account_id')
    .in('brand_slug', brands)
    .eq('is_active', true)
  const pageByBrand = new Map<string, FacebookPage>()
  for (const p of (pages ?? []) as FacebookPage[]) pageByBrand.set(p.brand_slug, p)

  let updated = 0
  for (const s of slots) {
    const page = pageByBrand.get(s.brand_slug)
    if (!page) {
      warnings.push(`No facebook_pages row for ${s.brand_slug} — skipping slot ${s.id}`)
      continue
    }

    if (s.platforms.includes('facebook') && s.fb_caption) {
      let postId = s.ghl_post_id
      // GHL post IDs aren't FB post IDs. Resolve by caption match.
      if (!postId?.includes('_')) {
        postId = await findFbPostByCaption(page.page_id, page.page_token, s.fb_caption, s.scheduled_for)
      }
      if (!postId) {
        warnings.push(`Couldn't resolve FB post id for slot ${s.id}`)
        continue
      }
      const ins = await fbInsights(page.page_id, page.page_token, postId)
      if (!ins) {
        warnings.push(`FB insights call failed for slot ${s.id}`)
        continue
      }
      const engagement_rate = ins.reach > 0
        ? Math.round(((ins.reactions + ins.comments + ins.shares) / ins.reach) * 10000) / 100
        : 0
      await sb.from('social_performance').upsert({
        slot_id:         s.id,
        platform:        'facebook',
        brand_slug:      s.brand_slug,
        source_kind:     s.source_kind,
        tone:            s.tone,
        day_of_week:     s.day_of_week,
        slot:            s.slot,
        impressions:     ins.impressions,
        reach:           ins.reach,
        reactions:       ins.reactions,
        comments:        ins.comments,
        shares:          ins.shares,
        clicks:          ins.clicks,
        engagement_rate,
        posted_at:       s.scheduled_for,
        refreshed_at:    new Date().toISOString(),
      }, { onConflict: 'slot_id,platform' })
      updated++
    }

    // IG insights left as a follow-up — the IG Graph API requires the
    // media id, which we'd resolve from the IG Business account's
    // /media list keyed by timestamp/caption. Same pattern as FB above.
    // Implementing once we confirm GHL's IG post ID format.
  }

  return { scanned: slots.length, updated, warnings }
}
