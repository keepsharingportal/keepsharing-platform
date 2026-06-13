// /admin/circulation/ad-match — cross-reference print advertisers ↔ distribution stops.
//
// Diagnostic + linking tool. Answers: "Of the N advertisers who paid for a
// print ad in [issue_month], how many are also pickup-location stops, and
// which ones?"
//
// Four result buckets:
//   1. Possible duplicate advertisers — pairs of advertiser_accounts rows
//      with very high name similarity (likely the same real business
//      entered twice). Archive one before linking to avoid double-counting.
//   2. Likely match           — name similarity ≥ 0.45 with one or more
//      unlinked stops. Multi-select with default-checked high-confidence
//      rows, then "Link selected" applies the FK in bulk.
//   3. Already linked         — advertiser already has circulation_stops.
//      advertiser_account_id set (one or more stops).
//   4. No match               — advertiser in print but no candidate stops.

import Link from 'next/link'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { regionForMarket } from '@/lib/circulation/regions'
import { AdMatchClient, type AdvertiserView, type StopView, type DuplicatePair } from './AdMatchClient'

export const metadata = { title: 'Print Ad Match — Distribution Portal' }
export const dynamic  = 'force-dynamic'

interface PageProps { searchParams: Promise<{ month?: string }> }

interface AdvertiserRow {
  id:            string
  business_name: string
  slug:          string
  contact_name:  string | null
  contact_email: string | null
}
interface PrintPlacementRow {
  advertiser_account_id: string
  size:                  number
  design:                string
}
interface StopRow {
  id:                    string
  name:                  string
  address:               string | null
  city:                  string | null
  is_advertiser:         boolean
  ad_level:              string | null
  advertiser_account_id: string | null
}

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function fmtMonth(m: string): string {
  return new Date(m + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function sizeLabel(s: number): string {
  if (s === 1)    return 'Full'
  if (s === 0.66) return '2/3'
  if (s === 0.5)  return '1/2'
  if (s === 0.33) return '1/3'
  if (s === 0.25) return '1/4'
  if (s === 0.16) return '1/6'
  if (s === 0.12) return '1/8'
  return String(s)
}
function tierForSize(s: number): 'top' | 'middle' | 'bottom' {
  if (s >= 0.66) return 'top'
  if (s >= 0.33) return 'middle'
  return 'bottom'
}

// Token-level normalization. Returns the cleaned business-name string AND
// the canonical token list (with synonyms expanded so 'st' and 'saint'
// hash to the same token).
const STOP_WORDS = new Set(['the', 'of', 'and', '&'])
const SYNONYMS: Record<string, string> = {
  'st':         'saint',
  'st.':        'saint',
  'blvd':       'boulevard',
  'blvd.':      'boulevard',
  'rd':         'road',
  'rd.':        'road',
  'dr':         'doctor',
  'dr.':        'doctor',
  'co':         'company',
  'co.':        'company',
  'corp':       'corporation',
  'corp.':      'corporation',
  'inc':        '',
  'inc.':       '',
  'llc':        '',
  'llc.':       '',
  'l.l.c.':     '',
  'incorporated': '',
  // Common single-letter / abbreviation collisions
  'jr':         'junior',
  'jr.':        'junior',
  'sr':         'senior',
  'sr.':        'senior',
  // Common business suffixes
  'umc':        'umc',           // keep as-is — distinguishing token
  'school':     'school',
  'church':     'church',
  'baptist':    'baptist',
  'methodist':  'methodist',
}

function tokens(name: string): string[] {
  return name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s.]/g, ' ')
    .split(/\s+/)
    .map(t => {
      const trimmed = t.replace(/\.$/, '')
      if (trimmed in SYNONYMS) return SYNONYMS[trimmed]
      return SYNONYMS[t] ?? t
    })
    .filter(t => t && !STOP_WORDS.has(t))
}

// Token-set Jaccard + a small boost when one name's tokens are a subset
// of the other (common in "Business Name" ↔ "Business Name - Location" cases),
// and an extra boost when the FIRST token (often the brand) matches exactly.
function similarity(a: string, b: string): number {
  const at = new Set(tokens(a))
  const bt = new Set(tokens(b))
  if (at.size === 0 || bt.size === 0) return 0
  let inter = 0
  for (const t of at) if (bt.has(t)) inter++
  const union = at.size + bt.size - inter
  let score = inter / union

  // Subset boost: if every token of the smaller set is in the larger,
  // bump the score (handles "Adams Drugs" advertiser ↔ "Adams Drugs -
  // 7200 Copperfield" stop).
  const smaller = at.size <= bt.size ? at : bt
  const larger  = at.size >  bt.size ? at : bt
  let subset = true
  for (const t of smaller) if (!larger.has(t)) { subset = false; break }
  if (subset) score = Math.min(1, score + 0.15)

  // First-token-match boost: business names typically lead with the
  // brand. Aligns "United Gymstars" ↔ "United Gymstars Cheer Camp"
  // higher than "Cheer Camp" alone.
  const aTokensArr = tokens(a)
  const bTokensArr = tokens(b)
  if (aTokensArr.length > 0 && bTokensArr.length > 0 && aTokensArr[0] === bTokensArr[0]) {
    score = Math.min(1, score + 0.05)
  }

  return score
}

export default async function AdMatchPage({ searchParams }: PageProps) {
  const sp     = await searchParams
  const ctx    = await requireAdmin()
  const market = ctx.viewingAll ? 'rrp' : ctx.activeMarket
  const region = regionForMarket(market)
  const dbKey  = region.slug
  const month  = sp.month?.trim() || currentMonth()
  const sb     = createAdminClient()

  let advertisers: AdvertiserRow[] = []
  let placements:  PrintPlacementRow[] = []
  let stops:       StopRow[] = []
  const migrationsMissing: string[] = []
  let supportsArchive = true

  // Try with archived_at filter first; fall back if migration 173 isn't applied yet.
  const advTryArchived = await sb
    .from('advertiser_accounts')
    .select('id, business_name, slug, contact_name, contact_email')
    .is('archived_at', null)
  if (advTryArchived.error && /column .* does not exist/i.test(advTryArchived.error.message)) {
    supportsArchive = false
    migrationsMissing.push('173 (advertiser_accounts.archived_at)')
    const advFallback = await sb
      .from('advertiser_accounts')
      .select('id, business_name, slug, contact_name, contact_email')
    advertisers = (advFallback.data ?? []) as AdvertiserRow[]
  } else if (advTryArchived.error) {
    if (/relation .* does not exist/.test(advTryArchived.error.message)) migrationsMissing.push('016 (advertiser_accounts)')
  } else {
    advertisers = (advTryArchived.data ?? []) as AdvertiserRow[]
  }

  const [placeRes, stopsRes] = await Promise.all([
    sb.from('print_ad_placements').select('advertiser_account_id, size, design').eq('issue_month', month),
    sb.from('circulation_stops')
      .select('id, name, address, city, is_advertiser, ad_level, advertiser_account_id')
      .eq('market', dbKey)
      .eq('active', true)
      .eq('is_pickup', false),
  ])
  if (placeRes.error && /relation .* does not exist/.test(placeRes.error.message)) migrationsMissing.push('129 (print_ad_placements)')
  if (stopsRes.error && /column .* does not exist/.test(stopsRes.error.message))    migrationsMissing.push('172 (circulation_stops.advertiser_account_id)')
  placements = (placeRes.data ?? []) as PrintPlacementRow[]
  stops      = (stopsRes.data ?? []) as StopRow[]

  // Per-advertiser largest active size this month.
  const sizesByAdvertiser = new Map<string, number>()
  for (const p of placements) {
    const current = sizesByAdvertiser.get(p.advertiser_account_id) ?? 0
    if (p.size > current) sizesByAdvertiser.set(p.advertiser_account_id, p.size)
  }

  const advertisersThisMonth: AdvertiserView[] = advertisers
    .filter(a => sizesByAdvertiser.has(a.id))
    .map(a => {
      const size = sizesByAdvertiser.get(a.id)!
      return {
        id:            a.id,
        business_name: a.business_name,
        size,
        size_label:    sizeLabel(size),
        tier:          tierForSize(size),
        contact_name:  a.contact_name,
        contact_email: a.contact_email,
      }
    })
    .sort((a, b) => b.size - a.size || a.business_name.localeCompare(b.business_name))

  // Index existing links
  const stopByAdv = new Map<string, StopView[]>()
  for (const s of stops) {
    if (s.advertiser_account_id) {
      const list = stopByAdv.get(s.advertiser_account_id) ?? []
      list.push({ id: s.id, name: s.name, address: s.address, city: s.city, is_advertiser: s.is_advertiser, ad_level: s.ad_level })
      stopByAdv.set(s.advertiser_account_id, list)
    }
  }

  // For each unlinked advertiser, find candidate stops. We DO NOT
  // consume stops across advertisers — multi-location chains often share
  // the same brand name across all four locations, so each advertiser
  // can suggest the same set of stops.
  const linked:    Array<AdvertiserView & { stops: StopView[] }> = []
  const candidate: Array<AdvertiserView & { suggestions: Array<{ stop: StopView; score: number }> }> = []
  const unmatched: AdvertiserView[] = []

  const unlinkedStops = stops.filter(s => !s.advertiser_account_id)

  for (const a of advertisersThisMonth) {
    if (stopByAdv.has(a.id)) {
      linked.push({ ...a, stops: stopByAdv.get(a.id)! })
      continue
    }
    const scored = unlinkedStops
      .map(s => ({
        stop: { id: s.id, name: s.name, address: s.address, city: s.city, is_advertiser: s.is_advertiser, ad_level: s.ad_level },
        score: similarity(a.business_name, s.name),
      }))
      .filter(x => x.score >= 0.45)
      .sort((x, y) => y.score - x.score)
      .slice(0, 8)
    if (scored.length > 0) {
      candidate.push({ ...a, suggestions: scored })
    } else {
      unmatched.push(a)
    }
  }

  // ── Possible duplicate advertisers ─────────────────────────────────────
  // Pairs of advertisers (across the whole table, not just this month)
  // whose names share enough tokens to plausibly be the same business.
  // Threshold here is higher (0.7) because false positives are costly —
  // editor will manually decide which to archive.
  const dupes: DuplicatePair[] = []
  const seenPairs = new Set<string>()
  for (let i = 0; i < advertisers.length; i++) {
    for (let j = i + 1; j < advertisers.length; j++) {
      const a = advertisers[i]
      const b = advertisers[j]
      const score = similarity(a.business_name, b.business_name)
      if (score < 0.7) continue
      const key = [a.id, b.id].sort().join(':')
      if (seenPairs.has(key)) continue
      seenPairs.add(key)
      dupes.push({
        a_id:   a.id, a_name: a.business_name,
        b_id:   b.id, b_name: b.business_name,
        score,
      })
    }
  }
  dupes.sort((x, y) => y.score - x.score)

  return (
    <AdMatchClient
      month={month}
      monthLabel={fmtMonth(month)}
      regionName={region.name}
      migrationsMissing={migrationsMissing}
      supportsArchive={supportsArchive}
      counts={{
        advertisersThisMonth: advertisersThisMonth.length,
        candidate:            candidate.length,
        linked:               linked.length,
        unmatched:            unmatched.length,
        dupes:                dupes.length,
      }}
      linked={linked}
      candidate={candidate}
      unmatched={unmatched}
      dupes={dupes}
    />
  )
}
