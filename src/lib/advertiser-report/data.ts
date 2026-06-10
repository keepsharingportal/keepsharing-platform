// Advertiser monthly report — data aggregation.
//
// One function: loadAdvertiserReport(advertiserId, since, until). Returns
// every number we render on the public report at /r/<token>. All sources
// pulled in parallel; failures degrade gracefully (one missing pipeline
// shouldn't blank the whole report).
//
// What we collect, by pipeline:
//
//   FIRST-PARTY (we own the data, real-time)
//     - listing_contact_events     phone taps / mailto / website click-throughs
//     - listing_messages           form-fill inquiries with advertiser_account_id
//     - short_links + click_count  cumulative clicks on the advertiser's links
//     - ad_events                  on-site ad impressions + clicks
//
//   THIRD-PARTY (ingested nightly via Meta Marketing API)
//     - facebook_campaign_metrics_daily   spend / impressions / clicks / results
//
// What the report shows up top — the value strip:
//   leads (form fills) + phone taps + total link clicks + QR scans
// Those are the dollars-of-business-equivalent numbers.
//
// Impressions sit below as supporting detail. They tell us how much reach
// the dollars bought; they don't lead the story.

import { createAdminClient } from '@/lib/supabase/admin'

export interface AdvertiserReportData {
  advertiser: {
    id:            string
    business_name: string
    slug:          string | null
    contact_email: string | null
    website_url:   string | null
  }
  range: {
    since: string         // 'YYYY-MM-DD'
    until: string         // 'YYYY-MM-DD'
    days:  number
  }
  /** Headline numbers — what the advertiser actually bought this period. */
  headline: {
    phoneTaps:        number
    websiteClicks:    number
    emailOpens:       number
    formInquiries:    number
    shortLinkClicks:  number
    facebookResults:  number      // leads / conversions / link clicks per FB campaign objective
  }
  /** Reach — the impression / spend story. Supporting detail. */
  reach: {
    onSiteAdImpressions: number
    onSiteAdClicks:      number
    onSiteAdCtr:         number       // as percentage (e.g. 1.23 = 1.23%)
    facebookSpend:       number       // dollars
    facebookImpressions: number
    facebookReach:       number
    facebookClicks:      number
    facebookCpc:         number | null
    facebookCtr:         number | null
  }
  /** Per-source breakdowns, for the detail sections beneath the headline. */
  details: {
    /** One row per listing where contact taps occurred. */
    listingTaps: Array<{
      source_listing_id: string | null
      source_path:       string | null
      tel:               number
      mailto:            number
      website:           number
      total:             number
    }>
    /** One row per inbound form fill. */
    inquiries: Array<{
      id:           string
      created_at:   string
      parent_name:  string
      parent_email: string
      message:      string
    }>
    /** One row per active short link, sorted by clicks desc. */
    shortLinks: Array<{
      id:           string
      shortcode:    string
      destination:  string
      label:        string | null
      channel:      string | null
      click_count:  number
    }>
    /** One row per Facebook campaign that had spend or activity in range. */
    facebookCampaigns: Array<{
      campaign_id:  string
      name:         string
      objective:    string | null
      status:       string | null
      spend:        number
      impressions:  number
      clicks:       number
      link_clicks:  number
      results:      number
      cost_per_result: number | null
    }>
  }
}

export async function loadAdvertiserReport(
  advertiserId: string,
  since:        string,                  // 'YYYY-MM-DD'
  until:        string,                  // 'YYYY-MM-DD'
): Promise<AdvertiserReportData | null> {
  const supabase = createAdminClient()

  // ── Advertiser identity ─────────────────────────────────────────────────
  const advRes = await supabase
    .from('advertiser_accounts')
    .select('id, business_name, slug, contact_email, website_url')
    .eq('id', advertiserId)
    .maybeSingle()
  if (advRes.error || !advRes.data) return null
  const advertiser = advRes.data as AdvertiserReportData['advertiser']

  // Date-range bounds for timestamp columns. We pass YYYY-MM-DD strings to
  // Postgres which it casts; the range is INCLUSIVE on both ends, with
  // `until` extending to end-of-day so today's events count.
  const sinceTs = `${since}T00:00:00Z`
  const untilTs = `${until}T23:59:59Z`

  // ── Pull every source in parallel ────────────────────────────────────────
  const [
    contactEventsRes,
    inquiriesRes,
    shortLinksRes,
    adPlacementsRes,
    fbCampaignsRes,
  ] = await Promise.all([
    supabase
      .from('listing_contact_events')
      .select('event_type, source_listing_id, source_path')
      .eq('advertiser_id', advertiserId)
      .gte('occurred_at', sinceTs)
      .lte('occurred_at', untilTs)
      .limit(10_000),
    supabase
      .from('listing_messages')
      .select('id, created_at, parent_name, parent_email, message')
      .eq('advertiser_account_id', advertiserId)
      .gte('created_at', sinceTs)
      .lte('created_at', untilTs)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('short_links')
      .select('id, shortcode, destination, label, channel, click_count')
      .eq('advertiser_id', advertiserId)
      .eq('is_active', true)
      .order('click_count', { ascending: false })
      .limit(200),
    supabase
      .from('ad_placements')
      .select('id, impression_count, click_count')
      .eq('advertiser_account_id', advertiserId),
    supabase
      .from('facebook_campaigns')
      .select('fb_campaign_id, name, objective, effective_status')
      .eq('advertiser_id', advertiserId),
  ])

  // FB metrics come from a separate join — pull per-day rows for any
  // campaign tied to this advertiser, summed in JS so we don't need a
  // dedicated rollup view.
  const fbCampaignIds = ((fbCampaignsRes.data ?? []) as Array<{ fb_campaign_id: string }>)
    .map(c => c.fb_campaign_id)
  const fbMetricsRes = fbCampaignIds.length > 0
    ? await supabase
        .from('facebook_campaign_metrics_daily')
        .select('fb_campaign_id, day, spend, impressions, reach, clicks, link_clicks, results, cost_per_result')
        .in('fb_campaign_id', fbCampaignIds)
        .gte('day', since)
        .lte('day', until)
        .limit(10_000)
    : { data: [] as Array<Record<string, unknown>>, error: null }

  // ── Roll up listing contact events ──────────────────────────────────────
  const taps = {
    tel:     0,
    mailto:  0,
    website: 0,
  }
  const listingTapMap = new Map<string, AdvertiserReportData['details']['listingTaps'][number]>()
  for (const ev of (contactEventsRes.data ?? []) as Array<{ event_type: string; source_listing_id: string | null; source_path: string | null }>) {
    if (ev.event_type === 'tel')     taps.tel++
    if (ev.event_type === 'mailto')  taps.mailto++
    if (ev.event_type === 'website') taps.website++
    const key = ev.source_listing_id ?? `path:${ev.source_path ?? '(unknown)'}`
    let row = listingTapMap.get(key)
    if (!row) {
      row = {
        source_listing_id: ev.source_listing_id,
        source_path:       ev.source_path,
        tel:     0,
        mailto:  0,
        website: 0,
        total:   0,
      }
      listingTapMap.set(key, row)
    }
    if (ev.event_type === 'tel')     row.tel++
    if (ev.event_type === 'mailto')  row.mailto++
    if (ev.event_type === 'website') row.website++
    row.total++
  }
  const listingTaps = Array.from(listingTapMap.values()).sort((a, b) => b.total - a.total)

  // ── Inquiries ──────────────────────────────────────────────────────────
  const inquiries = (inquiriesRes.data ?? []) as AdvertiserReportData['details']['inquiries']

  // ── Short links ─────────────────────────────────────────────────────────
  // click_count is cumulative since the link was minted — we don't have
  // per-day granularity yet, so the report column shows lifetime clicks
  // alongside a footnote. Future migration adds a daily clicks table.
  const shortLinks    = (shortLinksRes.data ?? []) as AdvertiserReportData['details']['shortLinks']
  const shortLinkSum  = shortLinks.reduce((sum, l) => sum + (l.click_count ?? 0), 0)

  // ── On-site ad impressions/clicks ───────────────────────────────────────
  // ad_placements.impression_count + click_count are cumulative columns
  // (same caveat as short links). For per-period precision we'd need to
  // query ad_events; this is good enough for v1 and matches what /admin/
  // intelligence already shows.
  type AdRow = { impression_count: number | null; click_count: number | null }
  const adRows = (adPlacementsRes.data ?? []) as AdRow[]
  const adImpressions = adRows.reduce((s, p) => s + (p.impression_count ?? 0), 0)
  const adClicks      = adRows.reduce((s, p) => s + (p.click_count      ?? 0), 0)

  // ── Facebook campaign rollup ────────────────────────────────────────────
  type FbMetricsRow = {
    fb_campaign_id: string
    spend: number | null
    impressions: number | null
    reach: number | null
    clicks: number | null
    link_clicks: number | null
    results: number | null
    cost_per_result: number | null
  }
  const fbMetrics = (fbMetricsRes.data ?? []) as FbMetricsRow[]
  const fbTotals = {
    spend:       0,
    impressions: 0,
    reach:       0,
    clicks:      0,
    linkClicks:  0,
    results:     0,
  }
  const fbByCampaign = new Map<string, AdvertiserReportData['details']['facebookCampaigns'][number]>()
  const fbCampaignMeta = new Map<string, { name: string; objective: string | null; status: string | null }>()
  for (const c of (fbCampaignsRes.data ?? []) as Array<{ fb_campaign_id: string; name: string; objective: string | null; effective_status: string | null }>) {
    fbCampaignMeta.set(c.fb_campaign_id, { name: c.name, objective: c.objective, status: c.effective_status })
  }
  for (const m of fbMetrics) {
    fbTotals.spend       += Number(m.spend       ?? 0)
    fbTotals.impressions += Number(m.impressions ?? 0)
    fbTotals.reach        = Math.max(fbTotals.reach, Number(m.reach ?? 0))   // reach isn't summable across days
    fbTotals.clicks      += Number(m.clicks      ?? 0)
    fbTotals.linkClicks  += Number(m.link_clicks ?? 0)
    fbTotals.results     += Number(m.results     ?? 0)

    let row = fbByCampaign.get(m.fb_campaign_id)
    const meta = fbCampaignMeta.get(m.fb_campaign_id)
    if (!row) {
      row = {
        campaign_id:    m.fb_campaign_id,
        name:           meta?.name ?? '(unknown campaign)',
        objective:      meta?.objective ?? null,
        status:         meta?.status ?? null,
        spend:          0,
        impressions:    0,
        clicks:         0,
        link_clicks:    0,
        results:        0,
        cost_per_result: null,
      }
      fbByCampaign.set(m.fb_campaign_id, row)
    }
    row.spend       += Number(m.spend       ?? 0)
    row.impressions += Number(m.impressions ?? 0)
    row.clicks      += Number(m.clicks      ?? 0)
    row.link_clicks += Number(m.link_clicks ?? 0)
    row.results     += Number(m.results     ?? 0)
  }
  for (const row of fbByCampaign.values()) {
    row.cost_per_result = row.results > 0 ? row.spend / row.results : null
  }
  const facebookCampaigns = Array.from(fbByCampaign.values())
    .sort((a, b) => b.spend - a.spend)

  // ── Date math + return ──────────────────────────────────────────────────
  const days = Math.max(1, Math.round(
    (new Date(`${until}T00:00:00Z`).getTime() - new Date(`${since}T00:00:00Z`).getTime()) / 86_400_000,
  ) + 1)

  const onSiteAdCtr = adImpressions > 0 ? (adClicks / adImpressions) * 100 : 0
  const fbCtr       = fbTotals.impressions > 0 ? (fbTotals.linkClicks / fbTotals.impressions) * 100 : null
  const fbCpc       = fbTotals.linkClicks > 0 ? fbTotals.spend / fbTotals.linkClicks : null

  return {
    advertiser,
    range: { since, until, days },
    headline: {
      phoneTaps:       taps.tel,
      websiteClicks:   taps.website,
      emailOpens:      taps.mailto,
      formInquiries:   inquiries.length,
      shortLinkClicks: shortLinkSum,
      facebookResults: fbTotals.results,
    },
    reach: {
      onSiteAdImpressions: adImpressions,
      onSiteAdClicks:      adClicks,
      onSiteAdCtr,
      facebookSpend:       fbTotals.spend,
      facebookImpressions: fbTotals.impressions,
      facebookReach:       fbTotals.reach,
      facebookClicks:      fbTotals.clicks,
      facebookCpc:         fbCpc,
      facebookCtr:         fbCtr,
    },
    details: {
      listingTaps,
      inquiries,
      shortLinks,
      facebookCampaigns,
    },
  }
}

// Helpers for the date-range parser used by the page.
export function defaultRange(): { since: string; until: string } {
  const until = new Date()
  const since = new Date(until); since.setUTCDate(since.getUTCDate() - 29)
  return {
    since: since.toISOString().slice(0, 10),
    until: until.toISOString().slice(0, 10),
  }
}

export function parseRange(raw: { since?: string | null; until?: string | null }): { since: string; until: string } {
  const def = defaultRange()
  const valid = (s: string | null | undefined): string | null => {
    if (!s) return null
    return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
  }
  let since = valid(raw.since) ?? def.since
  let until = valid(raw.until) ?? def.until
  if (since > until) [since, until] = [until, since]
  return { since, until }
}
