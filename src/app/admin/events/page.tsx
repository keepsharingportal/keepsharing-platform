// /admin/events — central events admin.
// Lists every calendar event (alive — soft-deletes excluded) with tabs,
// filters, and 30-per-page pagination, mirroring the School Bits admin
// shape so staff can move between them with muscle memory.
//
// Tabs:
//   Upcoming · Past · Pending Review · Cancelled
// Quick actions:
//   + New Event  ·  Import CSV  ·  Manage Sources  ·  Community Connections

import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, marketsToQuery } from '@/lib/admin/auth'
import { EventsAdminClient } from './EventsAdminClient'

export const metadata: Metadata = { title: 'Events — Admin' }
export const dynamic = 'force-dynamic'

export interface EventRow {
  id:               string
  slug:             string | null
  title:            string
  description:      string | null
  start_date:       string
  end_date:         string | null
  start_time:       string | null
  end_time:         string | null
  location_name:    string | null
  address:          string | null
  city:             string | null
  email:            string | null
  phone:            string | null
  age_range:        string | null
  cost_text:        string | null
  is_free:          boolean | null
  hero_image_url:   string | null
  category:         string | null
  status:           string
  created_at:       string
  // Migration 077 fields (may be missing on legacy rows)
  registration_url?: string | null
  organizer_name?:   string | null
  organizer_email?:  string | null
  tags?:             string[] | null
  source_type?:      string | null
  source_name?:      string | null
  source_url?:       string | null
  discovery_notes?:  string | null
  is_featured?:      boolean | null
  featured_until?:   string | null
  recurrence_rule?:  string | null
  // Migration 109 — plain-text time-display override
  display_time_override?: string | null
  // Migration 092 fields — image pipeline
  image_orig_path?:  string | null
  image_width?:      number | null
  image_height?:     number | null
}

export interface EventSource {
  id:   string
  name: string
}

export default async function EventsAdminPage() {
  const ctx = await requireAdmin()
  const supabase = createAdminClient()
  const marketScope = marketsToQuery(ctx)

  // Probe — graceful fallback if migration 077 isn't applied yet (some
  // selected columns won't exist). Falls back to the legacy column set.
  const richCols = 'id, slug, title, description, start_date, end_date, start_time, end_time, location_name, address, city, email, phone, age_range, cost_text, is_free, hero_image_url, category, status, created_at, registration_url, organizer_name, organizer_email, tags, source_type, source_name, source_url, discovery_notes, is_featured, featured_until, recurrence_rule, display_time_override, image_orig_path, image_width, image_height'
  const baseCols = 'id, slug, title, description, start_date, end_date, start_time, end_time, location_name, address, city, email, phone, age_range, cost_text, is_free, hero_image_url, category, status, created_at'

  let events: EventRow[] | null = null

  // Try rich query first, scoped to the markets the current admin can see.
  // If the market column doesn't exist yet (migration 090 not applied),
  // fall back to an unscoped query — the only safe option until the column
  // is added.
  function buildQuery(cols: string, opts: { scoped: boolean; aliveOnly: boolean }) {
    const base = opts.aliveOnly
      ? supabase.from('calendar_events').select(cols).is('deleted_at', null)
      : supabase.from('calendar_events').select(cols)
    const scoped = opts.scoped ? base.in('market', marketScope) : base
    return scoped
      .order('start_date', { ascending: true })
      .order('start_time', { ascending: true, nullsFirst: true })
      .limit(2000)
  }

  const rich = await buildQuery(richCols, { scoped: true, aliveOnly: true })
  if (rich.error && /column "market" does not exist/i.test(rich.error.message ?? '')) {
    const unscoped = await buildQuery(richCols, { scoped: false, aliveOnly: true })
    events = (unscoped.data ?? null) as EventRow[] | null
  } else if (rich.error && /column .* does not exist/i.test(rich.error.message ?? '')) {
    const base = await buildQuery(baseCols, { scoped: true, aliveOnly: true })
    if (base.error && /column "market" does not exist/i.test(base.error.message ?? '')) {
      const unscoped = await buildQuery(baseCols, { scoped: false, aliveOnly: true })
      events = (unscoped.data ?? null) as EventRow[] | null
    } else {
      events = (base.data ?? null) as EventRow[] | null
    }
  } else if (rich.error && /deleted_at/i.test(rich.error.message ?? '')) {
    // Legacy DB without soft-delete column
    const fallback = await buildQuery(richCols, { scoped: true, aliveOnly: false })
    events = (fallback.data ?? null) as EventRow[] | null
  } else {
    events = (rich.data ?? null) as EventRow[] | null
  }

  // Sources list for the filter dropdown — scoped to the same market(s).
  const sourcesRes = await supabase
    .from('trusted_event_sources')
    .select('id, name')
    .in('market', marketScope)
    .order('name', { ascending: true })

  return (
    <div className="flex-1 overflow-y-auto">
      <EventsAdminClient
        initialEvents={events ?? []}
        sources={(sourcesRes.data ?? []) as EventSource[]}
      />
    </div>
  )
}
