// src/app/api/admin/events-csv-import/route.ts
// Bulk-inserts pre-parsed event records into calendar_events.
// Deduplication: matched by title + start_date (exact).
// Receives chunks of 25 from the browser import UI.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export type EventImportRow = {
  title:         string
  start_date:    string     // YYYY-MM-DD
  end_date?:     string | null
  start_time?:   string | null
  end_time?:     string | null
  description?:  string | null
  location_name?: string | null
  address?:      string | null
  category?:     string | null
  is_free?:      boolean
  cost_text?:    string | null
  hero_image_url?: string | null
  website_url?:  string | null
  organizer?:    string | null
}

export type EventImportResult = {
  inserted:   number
  skipped:    number
  errors:     string[]
  rowResults: { title: string; status: 'ok' | 'skipped' | 'error'; message?: string }[]
}

function slugify(title: string, date: string, existing: Set<string>): string {
  const base = `${title}-${date}`
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 100)

  if (!existing.has(base)) { existing.add(base); return base }
  for (let i = 2; i < 100; i++) {
    const c = `${base}-${i}`
    if (!existing.has(c)) { existing.add(c); return c }
  }
  return `${base}-${Date.now()}`
}

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  try {
    const { rows }: { rows: EventImportRow[] } = await req.json()
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }
    if (rows.length > 50) {
      return NextResponse.json({ error: 'Max 50 rows per request' }, { status: 400 })
    }

    const supabase = supabaseAdmin()
    const result: EventImportResult = { inserted: 0, skipped: 0, errors: [], rowResults: [] }

    // Load existing slugs for this date window to avoid duplicates
    const dates = [...new Set(rows.map(r => r.start_date).filter(Boolean))]
    const { data: existing } = await supabase
      .from('calendar_events')
      .select('slug, title, start_date')
      .in('start_date', dates)

    const existingSlugs = new Set((existing ?? []).map((r: { slug: string }) => r.slug))
    // Dedup key: title|start_date
    const existingKeys = new Set(
      (existing ?? []).map((r: { title: string; start_date: string }) =>
        `${r.title.toLowerCase().trim()}|${r.start_date}`
      )
    )

    for (const row of rows) {
      const dedupKey = `${row.title.toLowerCase().trim()}|${row.start_date}`
      try {
        if (!row.title?.trim() || !row.start_date) {
          result.skipped++
          result.rowResults.push({ title: row.title ?? '(no title)', status: 'skipped', message: 'Missing title or date' })
          continue
        }

        if (existingKeys.has(dedupKey)) {
          result.skipped++
          result.rowResults.push({ title: row.title, status: 'skipped', message: 'Event already exists for this date' })
          continue
        }

        const slug = slugify(row.title, row.start_date, existingSlugs)

        const record = {
          slug,
          title:         row.title.trim(),
          start_date:    row.start_date,
          end_date:      row.end_date || null,
          start_time:    row.start_time || null,
          end_time:      row.end_time || null,
          description:   row.description?.trim() || null,
          location_name: row.location_name?.trim() || null,
          address:       row.address?.trim() || null,
          category:      row.category?.trim() || 'Family',
          is_free:       row.is_free ?? false,
          cost_text:     row.cost_text?.trim() || null,
          hero_image_url: row.hero_image_url?.trim() || null,
          website_url:   row.website_url?.trim() || null,
          organizer:     row.organizer?.trim() || null,
          status:        'published',
          created_at:    new Date().toISOString(),
        }

        const { error } = await supabase.from('calendar_events').insert(record)

        if (error) {
          const msg = `Insert failed: ${error.message}`
          result.errors.push(`${row.title}: ${msg}`)
          result.rowResults.push({ title: row.title, status: 'error', message: msg })
        } else {
          existingKeys.add(dedupKey)
          existingSlugs.add(slug)
          result.inserted++
          result.rowResults.push({ title: row.title, status: 'ok' })
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        result.errors.push(`${row.title}: ${msg}`)
        result.rowResults.push({ title: row.title, status: 'error', message: msg })
      }
    }

    return NextResponse.json(result)
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
