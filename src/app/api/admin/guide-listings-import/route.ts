// src/app/api/admin/guide-listings-import/route.ts
// Bulk-inserts (or merges) guide listing rows from CSV import.
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
// Two modes (body field `mode`, default 'insert'):
//   'insert' — every row creates a new row. Used for the first import
//              of a new guide year.
//   'merge'  — match existing row by
//              (guide_type_slug, lower(business_name), category, listing_year)
//              and ONLY fill empty/null fields. Never overwrites editor
//              data (logos, hero photos, hand-edited blurbs, etc.).
//              Insert if no match. Used to refresh next year's CSV
//              without losing the touch-ups done in admin between cycles.
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
  merged:     number              // matched an existing row; empty fields filled
  matched:    number              // landed inline + auto-linked to existing advertiser
  unchanged:  number              // merged but every field was already populated
  skipped:    number
  errors:     string[]
  rowResults: {
    name: string
    status: 'inserted' | 'merged' | 'matched' | 'unchanged' | 'skipped' | 'error'
    message?: string
    filledFields?: string[]       // for merged rows — which fields the importer wrote
  }[]
}

export type ImportMode = 'insert' | 'merge'

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

// Field that maps from the import row → guide_listings column. Order
// matters only for the merge-fill report. Anything not in this list
// gets dropped into guide_data JSONB (see buildGuideData below).
const FIELD_TO_COLUMN: Array<{ source: keyof GuideListingImportRow; column: string }> = [
  { source: 'business_name',    column: 'business_name' },
  { source: 'phone',            column: 'office_phone' },
  { source: 'email',            column: 'contact_email' },
  { source: 'website_url',      column: 'website_url' },
  { source: 'address',          column: 'address' },
  { source: 'city_state_zip',   column: 'city_state_zip' },
  { source: 'neighborhood',     column: 'neighborhood' },
  { source: 'hero_photo_url',   column: 'hero_photo_url' },
  { source: 'card_hook',        column: 'card_hook' },
]

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
}

function buildGuideData(row: GuideListingImportRow): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(row)) {
    if (!CORE_FIELDS.has(k) && v !== null && v !== undefined && v !== '') {
      out[k] = v
    }
  }
  if (row.description) out.description = row.description
  if (row.hours)       out.hours       = row.hours
  return out
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { rows: GuideListingImportRow[]; mode?: ImportMode }
    const rows = body.rows
    const mode: ImportMode = body.mode === 'merge' ? 'merge' : 'insert'
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows' }, { status: 400 })
    }
    if (rows.length > 30) {
      return NextResponse.json({ error: 'Max 30 rows per request' }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    const result: GuideListingImportResult = {
      inserted: 0, merged: 0, matched: 0, unchanged: 0, skipped: 0, errors: [], rowResults: [],
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
        const guideData = buildGuideData(row)

        const listingYear = typeof row.listing_year === 'string'
          ? parseInt(row.listing_year, 10)
          : (row.listing_year ?? null)
        const yearNum = Number.isFinite(listingYear as number) ? (listingYear as number) : null
        const category = row.category?.trim() || null

        // ── Merge path ─────────────────────────────────────────────
        // Match on (guide_type_slug, lower(business_name), category, listing_year).
        // Multiple categories per business = multiple rows; each merges
        // independently. The match is conservative — exact name match
        // only, no fuzzy guessing.
        if (mode === 'merge') {
          let q = supabase
            .from('guide_listings')
            .select('id, business_name, office_phone, contact_email, website_url, address, city_state_zip, neighborhood, hero_photo_url, card_hook, guide_data, advertiser_account_id, listing_tier')
            .eq('guide_type_slug', row.guide_type_slug)
            .ilike('business_name', name)
          if (category) q = q.eq('category', category)
          else          q = q.is('category', null)
          if (yearNum !== null) q = q.eq('listing_year', yearNum)
          else                  q = q.is('listing_year', null)
          const { data: existing } = await q.maybeSingle()

          if (existing) {
            // Build a partial update that ONLY writes empty fields.
            // Editor-touched columns stay exactly as they are.
            const update: Record<string, unknown> = {}
            const filledFields: string[] = []
            for (const { source, column } of FIELD_TO_COLUMN) {
              const incoming = (row as Record<string, unknown>)[source]
              if (isEmpty(incoming)) continue
              if (isEmpty((existing as Record<string, unknown>)[column])) {
                update[column] = incoming
                filledFields.push(column)
              }
            }
            // Auto-link advertiser only if not already linked.
            if (linkedAcctId && isEmpty(existing.advertiser_account_id)) {
              update.advertiser_account_id = linkedAcctId
              filledFields.push('advertiser_account_id')
            }
            // guide_data: merge keys, never overwrite existing keys.
            const existingData = (existing.guide_data ?? {}) as Record<string, unknown>
            const dataMerged   = { ...existingData }
            let dataChanged    = false
            for (const [k, v] of Object.entries(guideData)) {
              if (isEmpty(existingData[k])) {
                dataMerged[k] = v
                dataChanged   = true
              }
            }
            if (dataChanged) {
              update.guide_data = dataMerged
              filledFields.push('guide_data')
            }

            if (Object.keys(update).length === 0) {
              result.unchanged++
              result.rowResults.push({ name, status: 'unchanged', message: 'All fields already populated' })
              continue
            }
            const { error: updateErr } = await supabase
              .from('guide_listings')
              .update(update)
              .eq('id', existing.id)
            if (updateErr) {
              const msg = updateErr.message
              result.errors.push(`${name}: ${msg}`)
              result.rowResults.push({ name, status: 'error', message: msg })
              continue
            }
            result.merged++
            result.rowResults.push({ name, status: 'merged', filledFields })
            continue
          }
          // No existing row — fall through to insert below.
        }

        const { error: listingErr } = await supabase
          .from('guide_listings')
          .insert({
            advertiser_account_id: linkedAcctId,     // NULL unless an exact-match advertiser exists
            guide_type_slug:       row.guide_type_slug,
            category,
            listing_tier:          row.listing_tier || 'community',
            listing_year:          yearNum,
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
