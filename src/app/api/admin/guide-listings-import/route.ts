// src/app/api/admin/guide-listings-import/route.ts
// Bulk-inserts guide listing rows from CSV import.
//
// Behavior change (migration 134): the importer no longer creates
// advertiser_accounts rows. Each guide CSV row becomes a self-contained
// guide_listings entry with the business identity stored inline
// (business_name, phone, address, etc.). Listings stand on their own
// as directory content — they only get an advertiser_account link when
// a business CLAIMS the listing and upgrades to a featured/paid tier.
//
// If a row's business_name exactly matches an existing
// advertiser_account.business_name (case-insensitive), the import
// auto-associates by setting advertiser_account_id. That handles the
// case where an editor re-imports a guide CSV for a business that
// already advertises elsewhere. Anything else: advertiser_account_id
// stays NULL.
//
// Each request takes ≤30 rows; client sends in chunks.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export type GuideListingImportRow = {
  guide_type_slug:   string          // private-school, childcare, healthy-kids, etc.
  business_name:     string
  category:          string          // subcategory within the guide
  description?:      string | null
  phone?:            string | null
  email?:            string | null
  website_url?:      string | null
  address?:          string | null
  city_state_zip?:   string | null
  neighborhood?:     string | null
  hours?:            string | null
  hero_photo_url?:   string | null
  card_hook?:        string | null
  listing_tier?:     string          // 'community' | 'enhanced' | 'featured'
  listing_year?:     number | string | null
  // Extra fields stored in guide_data JSONB
  [key: string]:     unknown
}

export type GuideListingImportResult = {
  inserted:   number
  matched:    number              // landed inline + auto-linked to existing advertiser
  skipped:    number
  errors:     string[]
  rowResults: {
    name: string
    status: 'inserted' | 'matched' | 'skipped' | 'error'
    message?: string
  }[]
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

// Fields that live as first-class columns on guide_listings. Anything
// else passes through into the guide_data JSONB so guide-specific
// extras (e.g. age ranges, certifications) survive the round trip.
const CORE_FIELDS = new Set([
  'guide_type_slug', 'business_name', 'category', 'description',
  'phone', 'email', 'website_url', 'address', 'city_state_zip',
  'neighborhood', 'hours', 'listing_tier', 'listing_year',
  'hero_photo_url', 'card_hook',
])

export async function POST(req: NextRequest) {
  try {
    const { rows }: { rows: GuideListingImportRow[] } = await req.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows' }, { status: 400 })
    }
    if (rows.length > 30) {
      return NextResponse.json({ error: 'Max 30 rows per request' }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    const result: GuideListingImportResult = {
      inserted: 0, matched: 0, skipped: 0, errors: [], rowResults: [],
    }

    // Pre-load every existing advertiser_account name for the optional
    // 'this business already advertises with us' auto-link. Lowercase
    // exact match only — keeps it conservative, no fuzzy guessing.
    const { data: existingAccts } = await supabase
      .from('advertiser_accounts')
      .select('id, business_name')
      .limit(10000)
    const acctByName = new Map<string, string>()
    for (const a of (existingAccts ?? []) as Array<{ id: string; business_name: string }>) {
      acctByName.set(a.business_name.trim().toLowerCase(), a.id)
    }

    for (const row of rows) {
      const name = row.business_name?.trim()
      if (!name) {
        result.skipped++
        result.rowResults.push({ name: '(no name)', status: 'skipped', message: 'Missing business name' })
        continue
      }

      try {
        // Optional auto-link: if a CRM advertiser already exists with
        // this exact business name, link the listing to it. Otherwise
        // leave advertiser_account_id NULL — it's just directory content.
        const linkedAcctId = acctByName.get(name.toLowerCase()) ?? null

        // Build guide_data from non-core fields so guide-specific
        // payload (age ranges, certifications, custom JSON…) survives.
        const guideData: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(row)) {
          if (!CORE_FIELDS.has(k) && v !== null && v !== undefined && v !== '') {
            guideData[k] = v
          }
        }
        if (row.description) guideData.description    = row.description
        if (row.hours)       guideData.hours          = row.hours

        const listingYear = typeof row.listing_year === 'string'
          ? parseInt(row.listing_year, 10)
          : (row.listing_year ?? null)

        const { error: listingErr } = await supabase
          .from('guide_listings')
          .insert({
            advertiser_account_id: linkedAcctId,     // NULL unless an exact-match advertiser exists
            guide_type_slug:       row.guide_type_slug,
            category:              row.category?.trim() || null,
            listing_tier:          row.listing_tier || 'community',
            listing_year:          Number.isFinite(listingYear) ? listingYear : null,
            is_published:          true,
            display_order:         9999,
            // Inline business identity (migration 134) — listing is now
            // self-sufficient; public render reads these directly.
            business_name:    name,
            office_phone:     row.phone          ?? null,
            mobile_phone:     null,                       // CSV doesn't differentiate; leave null
            website_url:      row.website_url    ?? null,
            contact_email:    row.email          ?? null,
            address:          row.address        ?? null,
            city_state_zip:   row.city_state_zip ?? null,
            neighborhood:     row.neighborhood   ?? null,
            hero_photo_url:   row.hero_photo_url ?? null,
            card_hook:        row.card_hook      ?? null,
            guide_data:       guideData,
          })

        if (listingErr) {
          const msg = listingErr.message
          result.errors.push(`${name}: ${msg}`)
          result.rowResults.push({ name, status: 'error', message: msg })
          continue
        }
        if (linkedAcctId) {
          result.matched++
          result.rowResults.push({ name, status: 'matched', message: 'Linked to existing advertiser' })
        } else {
          result.inserted++
          result.rowResults.push({ name, status: 'inserted' })
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        result.errors.push(`${name}: ${msg}`)
        result.rowResults.push({ name, status: 'error', message: msg })
      }
    }

    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
