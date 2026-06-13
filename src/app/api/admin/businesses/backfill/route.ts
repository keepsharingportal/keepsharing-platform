// POST /api/admin/businesses/backfill
//
// Walks advertiser_accounts → circulation_stops → guide_listings, builds
// the canonical `businesses` table, and writes business_id back to each
// child row.
//
// Idempotent: rows that already have business_id set are skipped. Re-run
// after onboarding new stops or advertisers to fold them in.
//
// Match algorithm:
//   1. advertiser_accounts seed the table (most canonical names + contact).
//   2. circulation_stops match against existing businesses by name +
//      address similarity. If the best candidate is ≥ 0.75 it gets linked
//      AND any missing profile fields on the business get filled in from
//      the stop (logo, socials). Below 0.75 → create a new business.
//   3. guide_listings inherit their business_id from their linked
//      advertiser_accounts row.
//
// Returns a summary with: new businesses created, stops/listings/
// advertisers linked, conflicts (rows that matched 2+ businesses at
// similar scores — editor decides).

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { normalizedName, similarity, addressSimilarity } from '@/lib/businesses/normalize'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

interface BusinessRow {
  id:              string
  name:            string
  normalized_name: string
  address:         string | null
  city:            string | null
  zip:             string | null
  website:         string | null
  instagram:       string | null
  facebook:        string | null
  tiktok:          string | null
  logo_path:       string | null
  contact_name:    string | null
  phone:           string | null
  email:           string | null
  description:     string | null
  archived_at:     string | null
  merged_into_id:  string | null
}

const NAME_THRESHOLD = 0.75

export async function POST(_req: NextRequest) {
  await requireAdmin()
  const sb = createAdminClient()

  // Load every existing business so we can match against them in memory.
  // The set is small (thousands at most), the matching is N×M, so doing
  // it in JS is faster than per-stop queries.
  const { data: existingBiz, error: bizErr } = await sb
    .from('businesses')
    .select('id, name, normalized_name, address, city, zip, website, instagram, facebook, tiktok, logo_path, contact_name, phone, email, description, archived_at, merged_into_id')
    .is('archived_at', null)
    .is('merged_into_id', null)
  if (bizErr) return NextResponse.json({ error: bizErr.message }, { status: 500 })
  const businesses: BusinessRow[] = (existingBiz ?? []) as BusinessRow[]

  let newBusinesses     = 0
  let linkedAdvertisers = 0
  let linkedStops       = 0
  let linkedListings    = 0
  let mergedFieldsCount = 0
  const conflicts: Array<{ source: string; source_id: string; source_name: string; candidate_ids: string[]; scores: number[] }> = []

  // ── 1. Seed from advertiser_accounts ─────────────────────────────────
  const { data: advs } = await sb
    .from('advertiser_accounts')
    .select('id, business_name, contact_name, contact_email, contact_phone, business_id, archived_at')
    .is('archived_at', null)
  type AdvRow = { id: string; business_name: string; contact_name: string | null; contact_email: string | null; contact_phone: string | null; business_id: string | null }
  for (const a of (advs ?? []) as AdvRow[]) {
    if (a.business_id) continue
    const match = bestMatch(a.business_name, null, businesses)
    let businessId: string
    if (match && match.score >= NAME_THRESHOLD) {
      businessId = match.business.id
    } else {
      const inserted = await insertBusiness(sb, {
        name:         a.business_name,
        normalized_name: normalizedName(a.business_name),
        contact_name: a.contact_name,
        email:        a.contact_email,
        phone:        a.contact_phone,
      })
      if (!inserted) continue
      businesses.push(inserted)
      businessId = inserted.id
      newBusinesses++
    }
    await sb.from('advertiser_accounts').update({ business_id: businessId }).eq('id', a.id)
    linkedAdvertisers++
  }

  // ── 2. circulation_stops — match or create ──────────────────────────
  const { data: stops } = await sb
    .from('circulation_stops')
    .select('id, name, address, city, zip, website, instagram, facebook, tiktok, logo_path, contact_name, contact_phone, contact_email, business_id, is_pickup')
    .eq('is_pickup', false)
  type StopRow = { id: string; name: string; address: string | null; city: string | null; zip: string | null; website: string | null; instagram: string | null; facebook: string | null; tiktok: string | null; logo_path: string | null; contact_name: string | null; contact_phone: string | null; contact_email: string | null; business_id: string | null }
  for (const s of (stops ?? []) as StopRow[]) {
    if (s.business_id) continue
    const match = bestMatch(s.name, s.address, businesses)
    let businessId: string

    if (match && match.score >= NAME_THRESHOLD) {
      // Check for ambiguity — another candidate within 0.05 of the top score
      const tied = scoreAll(s.name, s.address, businesses)
        .filter(c => c.score >= NAME_THRESHOLD && c.business.id !== match.business.id && (match.score - c.score) < 0.05)
      if (tied.length > 0) {
        conflicts.push({
          source: 'circulation_stops', source_id: s.id, source_name: s.name,
          candidate_ids: [match.business.id, ...tied.map(t => t.business.id)],
          scores:        [match.score, ...tied.map(t => t.score)],
        })
        // Skip linking — let editor resolve manually
        continue
      }
      businessId = match.business.id

      // Fill in any missing fields on the business from the stop's data
      const fillIn: Partial<BusinessRow> = {}
      const biz = match.business
      if (!biz.address     && s.address)     fillIn.address     = s.address
      if (!biz.city        && s.city)        fillIn.city        = s.city
      if (!biz.zip         && s.zip)         fillIn.zip         = s.zip
      if (!biz.website     && s.website)     fillIn.website     = s.website
      if (!biz.instagram   && s.instagram)   fillIn.instagram   = s.instagram
      if (!biz.facebook    && s.facebook)    fillIn.facebook    = s.facebook
      if (!biz.tiktok      && s.tiktok)      fillIn.tiktok      = s.tiktok
      if (!biz.logo_path   && s.logo_path)   fillIn.logo_path   = s.logo_path
      if (!biz.contact_name && s.contact_name) fillIn.contact_name = s.contact_name
      if (!biz.phone       && s.contact_phone) fillIn.phone       = s.contact_phone
      if (!biz.email       && s.contact_email) fillIn.email       = s.contact_email
      if (Object.keys(fillIn).length > 0) {
        await sb.from('businesses').update(fillIn).eq('id', businessId)
        Object.assign(biz, fillIn)
        mergedFieldsCount += Object.keys(fillIn).length
      }
    } else {
      // Create new business from stop fields
      const inserted = await insertBusiness(sb, {
        name:           s.name,
        normalized_name: normalizedName(s.name),
        address:        s.address,
        city:           s.city,
        zip:            s.zip,
        website:        s.website,
        instagram:      s.instagram,
        facebook:       s.facebook,
        tiktok:         s.tiktok,
        logo_path:      s.logo_path,
        contact_name:   s.contact_name,
        phone:          s.contact_phone,
        email:          s.contact_email,
      })
      if (!inserted) continue
      businesses.push(inserted)
      businessId = inserted.id
      newBusinesses++
    }

    await sb.from('circulation_stops').update({ business_id: businessId }).eq('id', s.id)
    linkedStops++
  }

  // ── 3. guide_listings — inherit from advertiser_account.business_id ──
  const { data: listings } = await sb
    .from('guide_listings')
    .select('id, advertiser_account_id, business_id')
  type LstRow = { id: string; advertiser_account_id: string | null; business_id: string | null }
  // Build a map of advertiser_account_id → business_id
  const { data: advsForMap } = await sb
    .from('advertiser_accounts')
    .select('id, business_id')
    .not('business_id', 'is', null)
  const advBizMap = new Map<string, string>()
  for (const a of (advsForMap ?? []) as Array<{ id: string; business_id: string }>) {
    advBizMap.set(a.id, a.business_id)
  }
  for (const l of (listings ?? []) as LstRow[]) {
    if (l.business_id) continue
    if (!l.advertiser_account_id) continue
    const bizId = advBizMap.get(l.advertiser_account_id)
    if (!bizId) continue
    await sb.from('guide_listings').update({ business_id: bizId }).eq('id', l.id)
    linkedListings++
  }

  return NextResponse.json({
    ok: true,
    summary: {
      new_businesses:       newBusinesses,
      linked_advertisers:   linkedAdvertisers,
      linked_stops:         linkedStops,
      linked_listings:      linkedListings,
      profile_fields_filled: mergedFieldsCount,
      conflicts:            conflicts.length,
    },
    conflicts,
    total_businesses: businesses.length,
  })
}

// ── helpers ────────────────────────────────────────────────────────────

interface BusinessInsert {
  name:             string
  normalized_name:  string
  address?:         string | null
  city?:            string | null
  zip?:             string | null
  website?:         string | null
  instagram?:       string | null
  facebook?:        string | null
  tiktok?:          string | null
  logo_path?:       string | null
  contact_name?:    string | null
  phone?:           string | null
  email?:           string | null
  description?:     string | null
}

async function insertBusiness(sb: ReturnType<typeof createAdminClient>, b: BusinessInsert): Promise<BusinessRow | null> {
  const { data, error } = await sb.from('businesses').insert(b).select('*').single()
  if (error) {
    console.warn('[backfill] insertBusiness failed:', error.message)
    return null
  }
  return data as BusinessRow
}

function bestMatch(name: string, address: string | null, businesses: BusinessRow[]): { business: BusinessRow; score: number } | null {
  let best: { business: BusinessRow; score: number } | null = null
  for (const b of businesses) {
    let s = similarity(name, b.name)
    if (address && b.address) {
      const addr = addressSimilarity(address, b.address)
      // Address match boosts a name match, address mismatch dampens it.
      // For multi-location chains ("Adams Drugs") the address is the
      // tiebreaker so we should weight it noticeably.
      if (addr >= 0.5)      s = Math.min(1, s + 0.1)
      else if (addr === 0)  s = Math.max(0, s - 0.15)
    }
    if (!best || s > best.score) best = { business: b, score: s }
  }
  return best
}

function scoreAll(name: string, address: string | null, businesses: BusinessRow[]): Array<{ business: BusinessRow; score: number }> {
  return businesses.map(b => {
    let s = similarity(name, b.name)
    if (address && b.address) {
      const addr = addressSimilarity(address, b.address)
      if (addr >= 0.5)      s = Math.min(1, s + 0.1)
      else if (addr === 0)  s = Math.max(0, s - 0.15)
    }
    return { business: b, score: s }
  }).sort((a, b) => b.score - a.score)
}
