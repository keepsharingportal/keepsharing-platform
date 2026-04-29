import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export type SfgImportRow = {
  category: string
  business_name: string
  address?: string
  city?: string
  zip?: string
  phone?: string
  website?: string
  email?: string
  description?: string
  ages?: string
  price_range?: string
  indoor_outdoor?: string
  registration_status?: string
  financial_aid_available?: boolean
  before_after_care?: boolean
  special_needs_friendly?: boolean
  faith_based?: boolean
  drop_in_available?: boolean
  camp_director_name?: string
  discount_code?: string
  instagram_url?: string
  virtual_tour_url?: string
  listing_tier?: string
  neighborhood_tag?: string
  publication?: string
}

export type SfgImportResult = {
  inserted: number
  updated: number
  skipped: number
  errors: string[]
  rowResults: { row: number; name: string; status: 'ok' | 'updated' | 'skipped' | 'error'; message?: string }[]
}

function toSlug(name: string, existing: Set<string>): string {
  const base = name.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80)

  if (!existing.has(base)) { existing.add(base); return base }
  for (let i = 2; i < 100; i++) {
    const candidate = `${base}-${i}`
    if (!existing.has(candidate)) { existing.add(candidate); return candidate }
  }
  return `${base}-${Date.now()}`
}

export async function POST(req: NextRequest) {
  try {
    const { rows }: { rows: SfgImportRow[] } = await req.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }

    const supabase = await createClient()
    const result: SfgImportResult = { inserted: 0, updated: 0, skipped: 0, errors: [], rowResults: [] }

    // Load existing slugs for uniqueness
    const { data: existing } = await supabase.from('summer_fun_guide').select('slug, business_name')
    const existingSlugs = new Set((existing ?? []).map((r: { slug: string }) => r.slug))
    const existingByName = new Map((existing ?? []).map((r: { slug: string; business_name: string }) => [
      r.business_name.toLowerCase().trim(), r.slug
    ]))

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 1
      const rowName = row.business_name?.trim() || '(no name)'

      try {
        if (!row.business_name?.trim()) {
          result.skipped++
          result.rowResults.push({ row: rowNum, name: rowName, status: 'skipped', message: 'No business name' })
          continue
        }
        if (!row.category?.trim()) {
          result.skipped++
          result.rowResults.push({ row: rowNum, name: rowName, status: 'skipped', message: 'No category' })
          continue
        }

        const nameKey = row.business_name.toLowerCase().trim()
        const existingSlug = existingByName.get(nameKey)

        const record = {
          category:              row.category.trim(),
          business_name:         row.business_name.trim(),
          address:               row.address?.trim() || null,
          city:                  row.city?.trim() || null,
          state:                 'AL',
          zip:                   row.zip?.trim() || null,
          phone:                 row.phone?.trim() || null,
          website:               row.website?.trim() || null,
          email:                 row.email?.trim() || null,
          description:           row.description?.trim() || null,
          ages:                  row.ages?.trim() || null,
          price_range:           row.price_range || null,
          indoor_outdoor:        row.indoor_outdoor || null,
          registration_status:   row.registration_status || 'open',
          financial_aid_available: row.financial_aid_available ?? false,
          before_after_care:     row.before_after_care ?? false,
          special_needs_friendly: row.special_needs_friendly ?? false,
          faith_based:           row.faith_based ?? false,
          drop_in_available:     row.drop_in_available ?? false,
          camp_director_name:    row.camp_director_name?.trim() || null,
          discount_code:         row.discount_code?.trim() || null,
          instagram_url:         row.instagram_url?.trim() || null,
          virtual_tour_url:      row.virtual_tour_url?.trim() || null,
          listing_tier:          row.listing_tier || 'community',
          neighborhood_tag:      row.neighborhood_tag?.trim() || null,
          publication:           row.publication?.trim() || 'RRP',
          advertiser:            row.listing_tier === 'advertiser',
          featured:              row.listing_tier === 'enhanced',
          updated_at:            new Date().toISOString(),
        }

        if (existingSlug) {
          // Update existing record
          const { error } = await supabase.from('summer_fun_guide')
            .update(record)
            .eq('slug', existingSlug)
          if (error) {
            const msg = `Update failed: ${rowName} — ${error.message}`
            result.errors.push(msg)
            result.rowResults.push({ row: rowNum, name: rowName, status: 'error', message: msg })
          } else {
            result.updated++
            result.rowResults.push({ row: rowNum, name: rowName, status: 'updated' })
          }
        } else {
          // Insert new record with generated slug
          const slug = toSlug(row.business_name.trim(), existingSlugs)
          const { error } = await supabase.from('summer_fun_guide')
            .insert({ ...record, slug })
          if (error) {
            const msg = `Insert failed: ${rowName} — ${error.message}`
            result.errors.push(msg)
            result.rowResults.push({ row: rowNum, name: rowName, status: 'error', message: msg })
          } else {
            existingByName.set(nameKey, slug)
            result.inserted++
            result.rowResults.push({ row: rowNum, name: rowName, status: 'ok' })
          }
        }
      } catch (e: unknown) {
        const msg = `Row error: ${rowName} — ${e instanceof Error ? e.message : String(e)}`
        result.errors.push(msg)
        result.rowResults.push({ row: rowNum, name: rowName, status: 'error', message: msg })
      }
    }

    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
