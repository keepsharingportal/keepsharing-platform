// ── Social queue ─ insertion + status helpers ─────────────────────────
//
// Reads social_schedules for the (brand, contentType) pair, calculates
// every fire moment (initial + recycles + rotation + ramp), and inserts
// pending queue rows for each. Status starts as 'pending' — the
// dispatch cron generates captions + flips them to 'ready'.

import type { SupabaseClient } from '@supabase/supabase-js'

export interface ScheduleRow {
  id:                  string
  brand_slug:          string | null
  content_type:        string
  platforms:           string[]
  recycle_offsets_days: number[]
  rotation_days:       number | null
  ramp_days_before:    number[] | null
  quiet_hours_local:   string | null
  max_posts_per_day:   number
  active:              boolean
  paused_until:        string | null
}

/** Find the relevant schedule for a (brand, contentType) pair. Brand-
 *  scoped wins over global; both must be active. */
export async function loadSchedule(
  sb: SupabaseClient, brandSlug: string | null, contentType: string,
): Promise<ScheduleRow | null> {
  const { data: brandScoped } = brandSlug ? await sb
    .from('social_schedules')
    .select('*')
    .eq('content_type', contentType)
    .eq('brand_slug', brandSlug)
    .eq('active', true)
    .maybeSingle() : { data: null }
  if (brandScoped) return brandScoped as ScheduleRow

  const { data: global } = await sb
    .from('social_schedules')
    .select('*')
    .eq('content_type', contentType)
    .is('brand_slug', null)
    .eq('active', true)
    .maybeSingle()
  return (global as ScheduleRow | null) ?? null
}

/** Insert queue rows for a fresh publish. Handles initial + recycles +
 *  ramp days before an anchor date. Idempotent — re-running for the
 *  same (sourceKind, sourceId) does nothing if rows already exist. */
export async function enqueueForSource(
  sb:           SupabaseClient,
  sourceKind:   string,
  sourceId:     string,
  brandSlug:    string | null,
  anchorDate?:  string,         // for events
): Promise<{ inserted: number; reason?: string }> {
  // Already queued? Skip — prevents duplicates on republish events.
  const { count: existingCount } = await sb
    .from('social_queue')
    .select('id', { count: 'exact', head: true })
    .eq('source_kind', sourceKind)
    .eq('source_id', sourceId)
  if (existingCount && existingCount > 0) {
    return { inserted: 0, reason: 'already queued' }
  }

  const schedule = await loadSchedule(sb, brandSlug, sourceKind)
  if (!schedule) return { inserted: 0, reason: 'no schedule for content type' }
  if (schedule.paused_until && new Date(schedule.paused_until) > new Date()) {
    return { inserted: 0, reason: 'schedule paused' }
  }

  // Compute fire moments.
  const now = Date.now()
  const fires: Array<{ when: Date; recycleIndex: number }> = []

  // Recycle offsets (relative to NOW, the publish moment).
  for (const [idx, offset] of schedule.recycle_offsets_days.entries()) {
    fires.push({
      when:         new Date(now + offset * 86400000),
      recycleIndex: idx,
    })
  }

  // Ramp days before anchor (events).
  if (anchorDate && Array.isArray(schedule.ramp_days_before)) {
    const anchor = new Date(anchorDate).getTime()
    if (Number.isFinite(anchor)) {
      for (const [idx, daysBefore] of schedule.ramp_days_before.entries()) {
        const when = new Date(anchor - daysBefore * 86400000)
        // Only future ramps make sense.
        if (when.getTime() > now) {
          fires.push({ when, recycleIndex: idx + 1000 })  // +1000 to distinguish from offset recycles
        }
      }
    }
  }

  // Rotation (evergreen) — first 4 occurrences only; later rotations get
  // generated on a separate cron pass.
  if (schedule.rotation_days && schedule.rotation_days > 0) {
    for (let i = 1; i <= 4; i++) {
      fires.push({
        when:         new Date(now + i * schedule.rotation_days * 86400000),
        recycleIndex: 2000 + i,
      })
    }
  }

  if (fires.length === 0) return { inserted: 0, reason: 'no fires computed' }

  const rows = fires.map(f => ({
    source_kind:   sourceKind,
    source_id:     sourceId,
    brand_slug:    brandSlug,
    scheduled_for: f.when.toISOString(),
    status:        'pending',
    platforms:    schedule.platforms,
    captions:      {},
    needs_review:  true,
    recycle_index: f.recycleIndex,
  }))

  const { error } = await sb.from('social_queue').insert(rows)
  if (error) return { inserted: 0, reason: error.message }

  return { inserted: rows.length }
}
