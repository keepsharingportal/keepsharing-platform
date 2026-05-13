// src/app/api/admin/guide-listings-import/route.ts
// Bulk-inserts guide listing rows from CSV import.
// Each row creates/updates:
//   1. advertiser_accounts — the business record
//   2. guide_listings — the guide-specific listing entry
//
// Deduplication: advertiser_accounts matched by normalized business_name.
// If an account exists, guide_listings is upserted by (advertiser_account_id, guide_type_slug).
// Max 25 rows per request — send in chunks from the client.

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
  listing_tier?:     string          // 'community' | 'enhanced' | 'featured'
  // Extra fields stored in guide_data JSONB
  [key: string]:     unknown
}

export type GuideListingImportResult = {
  inserted:   number
  updated:    number
  skipped:    number
  errors:     string[]
  rowResults: {
    name: string
    status: 'inserted' | 'updated' | 'skipped' | 'error'
    message?: string
  }[]
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

function makeSlugUnique(base: string, existing: Set<string>): string {
  if (!existing.has(base)) { existing.add(base); return base }
  for (let i = 2; i < 200; i++) {
    const c = `${base}-${i}`
    if (!existing.has(c)) { existing.add(c); return c }
  }
  return `${base}-${Date.now()}`
}

const CORE_FIELDS = new Set([
  'guide_type_slug', 'business_name', 'category', 'description',
  'phone', 'email', 'website_url', 'address', 'city_state_zip',
  'neighborhood', 'hours', 'listing_tier',
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
      inserted: 0, updated: 0, skipped: 0, errors: [], rowResults: [],
    }

    // Pre-load existing accounts by slug for dedup
    const nameKeys = rows.map(r => toSlug(r.business_name))
    const { data: existingAccts } = await supabase
      .from('advertiser_accounts')
      .select('id, slug, business_name')
      .in('slug', nameKeys)
    const acctBySlug = new Map(
      (existingAccts ?? []).map((a: { id: string; slug: string; business_name: string }) => [a.slug, a])
    )
    const existingSlugs = new Set(acctBySlug.keys())

    for (const row of rows) {
      const name = row.business_name?.trim()
      if (!name) {
        result.skipped++
        result.rowResults.push({ name: '(no name)', status: 'skipped', message: 'Missing business name' })
        continue
      }

      try {
        const baseSlug   = toSlug(name)
        let acctId: string
        let isNew = false

        const existing = acctBySlug.get(baseSlug)

        if (existing) {
          acctId = existing.id
        } else {
          // Create advertiser_accounts record
          const slug = makeSlugUnique(baseSlug, existingSlugs)
          const { data: newAcct, error: acctErr } = await supabase
            .from('advertiser_accounts')
            .insert({
              slug,
              business_name:   name,
              office_phone:    row.phone ?? null,
              website_url:     row.website_url ?? null,
              address:         row.address ?? null,
              city_state_zip:  row.city_state_zip ?? null,
              neighborhood:    row.neighborhood ?? null,
              package_tier:    row.listing_tier === 'enhanced' ? 'enhanced' : 'community',
              onboarding_status: 'imported',
            })
            .select('id, slug')
            .single()

          if (acctErr || !newAcct) {
            const msg = acctErr?.message ?? 'Failed to create account'
            result.errors.push(`${name}: ${msg}`)
            result.rowResults.push({ name, status: 'error', message: msg })
            continue
          }

          acctId = newAcct.id
          acctBySlug.set(baseSlug, { id: acctId, slug, business_name: name })
          isNew = true
        }

        // Build guide_data from non-core fields
        const guideData: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(row)) {
          if (!CORE_FIELDS.has(k) && v !== null && v !== undefined && v !== '') {
            guideData[k] = v
          }
        }
        if (row.description) guideData.description = row.description
        if (row.hours)       guideData.hours       = row.hours

        // Upsert guide_listings
        const { error: listingErr } = await supabase
          .from('guide_listings')
          .upsert({
            advertiser_account_id: acctId,
            guide_type_slug:       row.guide_type_slug,
            category:              row.category?.trim() || null,
            listing_tier:          row.listing_tier || 'community',
            is_published:          true,
            guide_data:            guideData,
            display_order:         9999,
          }, {
            onConflict: 'advertiser_account_id,guide_type_slug',
          })

        if (listingErr) {
          const msg = listingErr.message
          result.errors.push(`${name}: ${msg}`)
          result.rowResults.push({ name, status: 'error', message: msg })
        } else {
          if (isNew) { result.inserted++; result.rowResults.push({ name, status: 'inserted' }) }
          else       { result.updated++;  result.rowResults.push({ name, status: 'updated' }) }
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
