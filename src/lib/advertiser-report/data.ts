// Advertiser monthly report — data aggregation.
//
// Loads everything the public report at /r/<token> renders. Best-in-class
// version pulls in parallel:
//   - current-period totals from every signal source (taps, msgs, links,
//     ads, Facebook campaigns)
//   - prior-period totals over an equal-length window for period-over-
//     period comparisons (the renewal-pitch numbers)
//   - daily trend series for the line chart
//   - per-source breakdown (which guide listing drove which contact)
//   - active goals + computed progress %
//   - auto-generated coaching insights (lines like "your CTR dropped —
//     consider refreshing your creative")
//
// Headline numbers are the dollars-of-business equivalents: leads,
// phone taps, link clicks, scans. Impressions get a smaller detail
// block below — they're context, not the headline.

import { createAdminClient } from '@/lib/supabase/admin'
import { computeChange, type PeriodChange } from '@/lib/admin/period-compare'

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
  /** Prior period (same length, immediately before current). */
  priorRange: {
    since: string
    until: string
    days:  number
  }
  /** Headline numbers — what the advertiser actually bought this period. */
  headline: {
    phoneTaps:        PeriodChange
    websiteClicks:    PeriodChange
    emailOpens:       PeriodChange
    formInquiries:    PeriodChange
    shortLinkClicks:  number              // cumulative, not period-deltable
    facebookResults:  PeriodChange
  }
  /** Reach — the impression / spend story. Supporting detail. */
  reach: {
    onSiteAdImpressions: number
    onSiteAdClicks:      number
    onSiteAdCtr:         number       // as percentage (e.g. 1.23 = 1.23%)
    facebookSpend:       PeriodChange   // dollars
    facebookImpressions: PeriodChange
    facebookReach:       number
    facebookClicks:      PeriodChange
    facebookCpc:         number | null
    facebookCtr:         number | null
  }
  /** Daily totals for the line chart — date string + actions count. */
  trend: Array<{ date: string; actions: number }>
  /** Per-source breakdowns, for the detail sections beneath the headline. */
  details: {
    listingTaps: Array<{
      source_listing_id: string | null
      source_path:       string | null
      tel:               number
      mailto:            number
      website:           number
      total:             number
    }>
    inquiries: Array<{
      id:           string
      created_at:   string
      parent_name:  string
      parent_email: string
      message:      string
    }>
    shortLinks: Array<{
      id:           string
      shortcode:    string
      destination:  string
      label:        string | null
      channel:      string | null
      click_count:  number
    }>
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
  /** Goals set by admin — progress is computed from current totals. */
  goals: Array<{
    id:           string
    metric:       string
    target:       number
    current:      number
    pct:          number               // 0–100+
    period_start: string
    period_end:   string
    notes:        string | null
  }>
  /** Auto-generated coaching lines. Each one a short, plain-language
   *  insight the advertiser can act on. */
  coaching: Array<{
    tone: 'positive' | 'warning' | 'info'
    text: string
  }>
  /** Per-listing breakdown — only populated when the advertiser owns
   *  multiple guide listings (otherwise the single listing's stats are
   *  the whole report). */
  perListing: Array<{
    listing_id:    string
    guide_slug:    string | null
    listing_name:  string
    tel:           number
    mailto:        number
    website:       number
    total:         number
  }>
  /** Year-over-year comparison — same date range one year prior.
   *  yearAgo will be null when no data exists from that window
   *  (platform too young / advertiser too new). */
  yearOverYear: {
    range:     { since: string; until: string }
    phoneTaps: { current: number; yearAgo: number | null }
    inquiries: { current: number; yearAgo: number | null }
    fbResults: { current: number; yearAgo: number | null }
    available: boolean       // true when ANY metric had yearAgo data
  }
}

function isoTs(date: string, end = false) {
  return end ? `${date}T23:59:59Z` : `${date}T00:00:00Z`
}

function priorWindow(since: string, until: string): { since: string; until: string; days: number } {
  const sinceMs = new Date(`${since}T00:00:00Z`).getTime()
  const untilMs = new Date(`${until}T00:00:00Z`).getTime()
  const days = Math.max(1, Math.round((untilMs - sinceMs) / 86_400_000) + 1)
  const priorEndMs   = sinceMs - 86_400_000
  const priorStartMs = priorEndMs - (days - 1) * 86_400_000
  return {
    since: new Date(priorStartMs).toISOString().slice(0, 10),
    until: new Date(priorEndMs).toISOString().slice(0, 10),
    days,
  }
}

function yearAgoRange(since: string, until: string): { since: string; until: string } {
  function shift(d: string): string {
    const ms  = new Date(`${d}T00:00:00Z`).getTime() - 365 * 86_400_000
    return new Date(ms).toISOString().slice(0, 10)
  }
  return { since: shift(since), until: shift(until) }
}

export async function loadAdvertiserReport(
  advertiserId: string,
  since:        string,
  until:        string,
): Promise<AdvertiserReportData | null> {
  const supabase = createAdminClient()
  const prior     = priorWindow(since, until)
  const yearAgo   = yearAgoRange(since, until)

  const advRes = await supabase
    .from('advertiser_accounts')
    .select('id, business_name, slug, contact_email, website_url')
    .eq('id', advertiserId)
    .maybeSingle()
  if (advRes.error || !advRes.data) return null
  const advertiser = advRes.data as AdvertiserReportData['advertiser']

  // ── Pull current + prior windows for every source in parallel ──────────
  const [
    curEventsRes, priEventsRes,
    curMsgRes,    priMsgRes,
    shortLinksRes,
    adPlacementsRes,
    fbCampaignsRes,
    goalsRes,
    listingsRes,
    yaTapsRes, yaMsgRes,
  ] = await Promise.all([
    supabase.from('listing_contact_events')
      .select('event_type, source_listing_id, source_path, occurred_at')
      .eq('advertiser_id', advertiserId)
      .gte('occurred_at', isoTs(since))
      .lte('occurred_at', isoTs(until, true))
      .limit(20_000),
    supabase.from('listing_contact_events')
      .select('event_type')
      .eq('advertiser_id', advertiserId)
      .gte('occurred_at', isoTs(prior.since))
      .lte('occurred_at', isoTs(prior.until, true))
      .limit(20_000),
    supabase.from('listing_messages')
      .select('id, created_at, parent_name, parent_email, message')
      .eq('advertiser_account_id', advertiserId)
      .gte('created_at', isoTs(since))
      .lte('created_at', isoTs(until, true))
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('listing_messages')
      .select('id')
      .eq('advertiser_account_id', advertiserId)
      .gte('created_at', isoTs(prior.since))
      .lte('created_at', isoTs(prior.until, true)),
    supabase.from('short_links')
      .select('id, shortcode, destination, label, channel, click_count')
      .eq('advertiser_id', advertiserId)
      .eq('is_active', true)
      .order('click_count', { ascending: false })
      .limit(200),
    supabase.from('ad_placements')
      .select('id, impression_count, click_count')
      .eq('advertiser_account_id', advertiserId),
    supabase.from('facebook_campaigns')
      .select('fb_campaign_id, name, objective, effective_status')
      .eq('advertiser_id', advertiserId),
    supabase.from('advertiser_report_goals')
      .select('*')
      .eq('advertiser_id', advertiserId)
      .eq('is_active', true),
    supabase.from('guide_listings')
      .select('id, business_name, guide_type_slug')
      .eq('advertiser_account_id', advertiserId)
      .limit(50),
    supabase.from('listing_contact_events')
      .select('event_type')
      .eq('advertiser_id', advertiserId)
      .gte('occurred_at', isoTs(yearAgo.since))
      .lte('occurred_at', isoTs(yearAgo.until, true))
      .limit(20_000),
    supabase.from('listing_messages')
      .select('id')
      .eq('advertiser_account_id', advertiserId)
      .gte('created_at', isoTs(yearAgo.since))
      .lte('created_at', isoTs(yearAgo.until, true)),
  ])

  // ── Roll up listing contact events (current + prior) ───────────────────
  type Ev = { event_type: string; source_listing_id: string | null; source_path: string | null; occurred_at: string }
  const curEvents = (curEventsRes.data ?? []) as Ev[]
  const priEvents = (priEventsRes.data ?? []) as Array<{ event_type: string }>

  const curTaps = { tel: 0, mailto: 0, website: 0 }
  const priTaps = { tel: 0, mailto: 0, website: 0 }
  for (const e of curEvents) {
    if (e.event_type === 'tel')     curTaps.tel++
    if (e.event_type === 'mailto')  curTaps.mailto++
    if (e.event_type === 'website') curTaps.website++
  }
  for (const e of priEvents) {
    if (e.event_type === 'tel')     priTaps.tel++
    if (e.event_type === 'mailto')  priTaps.mailto++
    if (e.event_type === 'website') priTaps.website++
  }

  // Per-source listing breakdown.
  const listingTapMap = new Map<string, { source_listing_id: string | null; source_path: string | null; tel: number; mailto: number; website: number; total: number }>()
  for (const ev of curEvents) {
    const key = ev.source_listing_id ?? `path:${ev.source_path ?? '(unknown)'}`
    let row = listingTapMap.get(key)
    if (!row) { row = { source_listing_id: ev.source_listing_id, source_path: ev.source_path, tel: 0, mailto: 0, website: 0, total: 0 }; listingTapMap.set(key, row) }
    if (ev.event_type === 'tel')     row.tel++
    if (ev.event_type === 'mailto')  row.mailto++
    if (ev.event_type === 'website') row.website++
    row.total++
  }
  const listingTaps = Array.from(listingTapMap.values()).sort((a, b) => b.total - a.total)

  // Inquiries
  const inquiries = (curMsgRes.data ?? []) as AdvertiserReportData['details']['inquiries']
  const priInquiries = (priMsgRes.data ?? []) as Array<{ id: string }>

  // Short links — lifetime totals (no daily granularity yet; see backlog)
  const shortLinks   = (shortLinksRes.data ?? []) as AdvertiserReportData['details']['shortLinks']
  const shortLinkSum = shortLinks.reduce((sum, l) => sum + (l.click_count ?? 0), 0)

  // On-site ads (lifetime; same caveat)
  type AdRow = { impression_count: number | null; click_count: number | null }
  const adRows = (adPlacementsRes.data ?? []) as AdRow[]
  const adImpressions = adRows.reduce((s, p) => s + (p.impression_count ?? 0), 0)
  const adClicks      = adRows.reduce((s, p) => s + (p.click_count      ?? 0), 0)

  // ── Facebook campaign + metrics ─────────────────────────────────────────
  const fbCampaignIds = ((fbCampaignsRes.data ?? []) as Array<{ fb_campaign_id: string }>).map(c => c.fb_campaign_id)
  const [curFbRes, priFbRes] = await Promise.all([
    fbCampaignIds.length > 0
      ? supabase.from('facebook_campaign_metrics_daily')
          .select('fb_campaign_id, day, spend, impressions, reach, clicks, link_clicks, results, cost_per_result')
          .in('fb_campaign_id', fbCampaignIds)
          .gte('day', since).lte('day', until)
          .limit(10_000)
      : { data: [] as Array<Record<string, unknown>>, error: null },
    fbCampaignIds.length > 0
      ? supabase.from('facebook_campaign_metrics_daily')
          .select('spend, impressions, clicks, results')
          .in('fb_campaign_id', fbCampaignIds)
          .gte('day', prior.since).lte('day', prior.until)
          .limit(10_000)
      : { data: [] as Array<Record<string, unknown>>, error: null },
  ])
  type FbDaily = { fb_campaign_id: string; day: string; spend: number | null; impressions: number | null; reach: number | null; clicks: number | null; link_clicks: number | null; results: number | null; cost_per_result: number | null }
  const curFb = (curFbRes.data ?? []) as FbDaily[]
  const priFb = (priFbRes.data ?? []) as Array<{ spend: number | null; impressions: number | null; clicks: number | null; results: number | null }>

  const curFbTotals = { spend: 0, impressions: 0, reach: 0, clicks: 0, linkClicks: 0, results: 0 }
  for (const m of curFb) {
    curFbTotals.spend       += Number(m.spend       ?? 0)
    curFbTotals.impressions += Number(m.impressions ?? 0)
    curFbTotals.reach        = Math.max(curFbTotals.reach, Number(m.reach ?? 0))
    curFbTotals.clicks      += Number(m.clicks      ?? 0)
    curFbTotals.linkClicks  += Number(m.link_clicks ?? 0)
    curFbTotals.results     += Number(m.results     ?? 0)
  }
  const priFbTotals = { spend: 0, impressions: 0, clicks: 0, results: 0 }
  for (const m of priFb) {
    priFbTotals.spend       += Number(m.spend       ?? 0)
    priFbTotals.impressions += Number(m.impressions ?? 0)
    priFbTotals.clicks      += Number(m.clicks      ?? 0)
    priFbTotals.results     += Number(m.results     ?? 0)
  }

  const fbByCampaign = new Map<string, AdvertiserReportData['details']['facebookCampaigns'][number]>()
  const fbCampaignMeta = new Map<string, { name: string; objective: string | null; status: string | null }>()
  for (const c of (fbCampaignsRes.data ?? []) as Array<{ fb_campaign_id: string; name: string; objective: string | null; effective_status: string | null }>) {
    fbCampaignMeta.set(c.fb_campaign_id, { name: c.name, objective: c.objective, status: c.effective_status })
  }
  for (const m of curFb) {
    let row = fbByCampaign.get(m.fb_campaign_id)
    const meta = fbCampaignMeta.get(m.fb_campaign_id)
    if (!row) {
      row = {
        campaign_id: m.fb_campaign_id, name: meta?.name ?? '(unknown campaign)',
        objective: meta?.objective ?? null, status: meta?.status ?? null,
        spend: 0, impressions: 0, clicks: 0, link_clicks: 0, results: 0, cost_per_result: null,
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
  const facebookCampaigns = Array.from(fbByCampaign.values()).sort((a, b) => b.spend - a.spend)

  // ── Daily trend series — total actions per day ─────────────────────────
  const trendMap = new Map<string, number>()
  for (const e of curEvents) {
    const day = e.occurred_at.slice(0, 10)
    trendMap.set(day, (trendMap.get(day) ?? 0) + 1)
  }
  for (const m of inquiries) {
    const day = m.created_at.slice(0, 10)
    trendMap.set(day, (trendMap.get(day) ?? 0) + 1)
  }
  const sinceMs = new Date(isoTs(since)).getTime()
  const untilMs = new Date(isoTs(until)).getTime()
  const trend: Array<{ date: string; actions: number }> = []
  for (let t = sinceMs; t <= untilMs; t += 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10)
    trend.push({ date: day, actions: trendMap.get(day) ?? 0 })
  }

  // ── Goals: current progress per active goal in range ───────────────────
  type GoalRow = { id: string; metric: string; target_value: number; period_start: string; period_end: string; notes: string | null }
  const goalRows = (goalsRes.data ?? []) as GoalRow[]
  function metricValue(metric: string): number {
    switch (metric) {
      case 'phone_taps':       return curTaps.tel
      case 'website_clicks':   return curTaps.website
      case 'email_opens':      return curTaps.mailto
      case 'form_inquiries':   return inquiries.length
      case 'short_link_clicks': return shortLinkSum
      case 'facebook_results': return curFbTotals.results
      case 'total_engagement': return curTaps.tel + curTaps.website + curTaps.mailto + inquiries.length + shortLinkSum + curFbTotals.results
      default: return 0
    }
  }
  const goals = goalRows.map(g => {
    const current = metricValue(g.metric)
    return {
      id:           g.id,
      metric:       g.metric,
      target:       g.target_value,
      current,
      pct:          g.target_value > 0 ? (current / g.target_value) * 100 : 0,
      period_start: g.period_start,
      period_end:   g.period_end,
      notes:        g.notes,
    }
  })

  // ── Coaching insights — auto-generated, advertiser-facing language ────
  const coaching: Array<{ tone: 'positive' | 'warning' | 'info'; text: string }> = []
  const phoneCh = computeChange(curTaps.tel,     priTaps.tel)
  const inqCh   = computeChange(inquiries.length, priInquiries.length)
  const fbCh    = computeChange(curFbTotals.results, priFbTotals.results)
  const fbSpendCh = computeChange(curFbTotals.spend, priFbTotals.spend)

  if (phoneCh.pctChange !== null && phoneCh.pctChange > 25) {
    coaching.push({ tone: 'positive', text: `Phone taps up ${phoneCh.pctChange.toFixed(0)}% vs the prior period — momentum is building.` })
  } else if (phoneCh.pctChange !== null && phoneCh.pctChange < -25) {
    coaching.push({ tone: 'warning', text: `Phone taps dropped ${Math.abs(phoneCh.pctChange).toFixed(0)}%. Consider refreshing your ad creative or moving up to Featured placement.` })
  }
  if (inqCh.pctChange !== null && inqCh.pctChange > 25) {
    coaching.push({ tone: 'positive', text: `Inquiries up ${inqCh.pctChange.toFixed(0)}% — readers are reaching out at a higher rate.` })
  }
  if (fbCh.pctChange !== null && fbSpendCh.pctChange !== null) {
    if (fbSpendCh.pctChange > 10 && fbCh.pctChange < 0) {
      coaching.push({ tone: 'warning', text: `You spent more on Facebook but got fewer results. The audience or creative may need attention.` })
    } else if (fbSpendCh.pctChange < -10 && fbCh.pctChange > 0) {
      coaching.push({ tone: 'positive', text: `You got more results with less spend — your campaigns are improving efficiency.` })
    }
  }
  if (shortLinkSum === 0 && curFbTotals.spend > 0) {
    coaching.push({ tone: 'info', text: `No short-link clicks yet. Tag your Facebook ad URLs with a tracked short link to see exactly which campaign drives action.` })
  }
  if (curTaps.tel + curTaps.website + curTaps.mailto + inquiries.length === 0 && adImpressions > 0) {
    coaching.push({ tone: 'warning', text: `Your ad has impressions but no engagement yet. Refreshing the headline or offer often jump-starts contact actions.` })
  }
  if (coaching.length === 0) {
    coaching.push({ tone: 'info', text: `Activity is steady. Keep an eye on this dashboard — a refreshed creative or a new promo can shift the numbers fast.` })
  }

  // ── Per-listing breakdown (multi-listing advertisers) ──────────────────
  type ListingRow = { id: string; business_name: string; guide_type_slug: string | null }
  const listings = (listingsRes.data ?? []) as ListingRow[]
  const listingNameById = new Map<string, ListingRow>(listings.map(l => [l.id, l]))
  type PerListing = AdvertiserReportData['perListing'][number]
  let perListing: PerListing[] = []
  if (listings.length > 1) {
    const map = new Map<string, PerListing>()
    for (const ev of curEvents) {
      if (!ev.source_listing_id) continue
      const meta = listingNameById.get(ev.source_listing_id)
      if (!meta) continue
      let row = map.get(ev.source_listing_id)
      if (!row) {
        row = {
          listing_id:   ev.source_listing_id,
          guide_slug:   meta.guide_type_slug,
          listing_name: meta.business_name,
          tel: 0, mailto: 0, website: 0, total: 0,
        }
        map.set(ev.source_listing_id, row)
      }
      if (ev.event_type === 'tel')     row.tel++
      if (ev.event_type === 'mailto')  row.mailto++
      if (ev.event_type === 'website') row.website++
      row.total++
    }
    perListing = Array.from(map.values()).sort((a, b) => b.total - a.total)
  }

  // ── Year-over-year ─────────────────────────────────────────────────────
  type YaTap = { event_type: string }
  const yaTaps = (yaTapsRes.data ?? []) as YaTap[]
  const yaMsg  = (yaMsgRes.data  ?? []) as Array<{ id: string }>
  const yaTapsTel = yaTaps.filter(t => t.event_type === 'tel').length
  const yaInq     = yaMsg.length
  // FB results year-ago — we need the year-ago facebook metrics window too.
  // Cheapest path: another query inline. Most advertisers won't have
  // year-ago FB data, so we keep it as a fallback to 0 / null.
  let yaFbResults = 0
  let yaFbAvailable = false
  if (fbCampaignIds.length > 0) {
    const { data: yaFbRes } = await supabase
      .from('facebook_campaign_metrics_daily')
      .select('results')
      .in('fb_campaign_id', fbCampaignIds)
      .gte('day', yearAgo.since).lte('day', yearAgo.until)
      .limit(10_000)
    yaFbResults = ((yaFbRes ?? []) as Array<{ results: number | null }>).reduce((s, r) => s + Number(r.results ?? 0), 0)
    if ((yaFbRes ?? []).length > 0) yaFbAvailable = true
  }
  const yoyAvailable = yaTaps.length > 0 || yaMsg.length > 0 || yaFbAvailable

  // ── Compose ────────────────────────────────────────────────────────────
  const days = Math.max(1, Math.round((untilMs - sinceMs) / 86_400_000) + 1)
  const onSiteAdCtr = adImpressions > 0 ? (adClicks / adImpressions) * 100 : 0
  const fbCtr = curFbTotals.impressions > 0 ? (curFbTotals.linkClicks / curFbTotals.impressions) * 100 : null
  const fbCpc = curFbTotals.linkClicks > 0 ? curFbTotals.spend / curFbTotals.linkClicks : null

  return {
    advertiser,
    range: { since, until, days },
    priorRange: prior,
    headline: {
      phoneTaps:       computeChange(curTaps.tel,        priTaps.tel),
      websiteClicks:   computeChange(curTaps.website,    priTaps.website),
      emailOpens:      computeChange(curTaps.mailto,     priTaps.mailto),
      formInquiries:   computeChange(inquiries.length,   priInquiries.length),
      shortLinkClicks: shortLinkSum,
      facebookResults: computeChange(curFbTotals.results, priFbTotals.results),
    },
    reach: {
      onSiteAdImpressions: adImpressions,
      onSiteAdClicks:      adClicks,
      onSiteAdCtr,
      facebookSpend:       computeChange(Math.round(curFbTotals.spend * 100), Math.round(priFbTotals.spend * 100)),
      facebookImpressions: computeChange(curFbTotals.impressions, priFbTotals.impressions),
      facebookReach:       curFbTotals.reach,
      facebookClicks:      computeChange(curFbTotals.clicks, priFbTotals.clicks),
      facebookCpc:         fbCpc,
      facebookCtr:         fbCtr,
    },
    trend,
    details: { listingTaps, inquiries, shortLinks, facebookCampaigns },
    goals,
    coaching,
    perListing,
    yearOverYear: {
      range:     yearAgo,
      phoneTaps: { current: curTaps.tel,        yearAgo: yaTaps.length > 0 ? yaTapsTel : null },
      inquiries: { current: inquiries.length,   yearAgo: yaMsg.length  > 0 ? yaInq     : null },
      fbResults: { current: curFbTotals.results, yearAgo: yaFbAvailable     ? yaFbResults : null },
      available: yoyAvailable,
    },
  }
}

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
