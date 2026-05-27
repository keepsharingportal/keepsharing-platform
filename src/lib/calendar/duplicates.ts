// Duplicate-event detection.
//
// Hyperlocal calendars get fed from multiple sources: iCal feeds, AI
// extraction from organizer pages, public submissions, and VA team manual
// adds. With 100+ events in flight, it's easy for the same event to land
// twice — say, the iCal pulls "Storytime — Tuesday May 27" and the VA
// also adds it from a Facebook post the same day.
//
// This module centralizes the dedup logic:
//
//   normalizeTitle(t)      → strip filler words + punctuation, lowercase
//   titleSimilarity(a, b)  → Jaccard on word sets, 0–1
//   findPossibleDuplicates → server-side query against calendar_events
//                            returning ranked candidates inside a ±2 day
//                            window in the same market
//
// Used by:
//   - /api/admin/events/check-duplicates  (Quick Add live warning)
//   - /api/admin/events                   (POST create — could block obvious
//                                          dupes; for now warns only)
//   - future: iCal ingest (auto-flag suspected dupes for review)

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Words that don't help distinguish events. Stripped before similarity
// scoring so "The Annual Spring Fest" ≈ "Spring Fest".
const FILLER_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'at', 'in', 'on', 'for', 'with',
  'to', 'by', 'from', 'this', 'that', 'these', 'those', 'is', 'are',
  'annual', 'monthly', 'weekly', 'event', 'events',
])

/**
 * Normalize a title for comparison: lowercase, strip punctuation, drop
 * filler words, collapse whitespace. The result is a space-joined token
 * string suitable for Jaccard.
 */
export function normalizeTitle(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')   // strip punctuation, keep letters/digits/whitespace
    .split(/\s+/)
    .filter(w => w.length > 0 && !FILLER_WORDS.has(w))
    .join(' ')
}

/**
 * Jaccard similarity on word sets. Returns 0..1 — 1 means identical word
 * sets, 0 means no overlap. We use this instead of full Levenshtein because
 * it's order-insensitive ("Library Storytime" ~= "Storytime at the Library")
 * and dramatically cheaper to compute over many candidates.
 */
export function titleSimilarity(a: string, b: string): number {
  const A = new Set(normalizeTitle(a).split(' ').filter(Boolean))
  const B = new Set(normalizeTitle(b).split(' ').filter(Boolean))
  if (A.size === 0 || B.size === 0) return 0
  let intersection = 0
  for (const w of A) if (B.has(w)) intersection++
  const union = A.size + B.size - intersection
  return union === 0 ? 0 : intersection / union
}

export interface DuplicateMatch {
  id:            string
  title:         string
  start_date:    string
  start_time:    string | null
  location_name: string | null
  city:          string | null
  status:        string
  similarity:    number
}

interface FindOpts {
  /** Required — what we're checking against the DB */
  title:        string
  start_date:   string    // 'YYYY-MM-DD'
  /** Optional but improves precision */
  city?:        string | null
  /** Tenant scope — match the market filter from getAdminContext */
  market:       string
  /** Don't match this id (used when editing an existing event) */
  excludeId?:   string
  /** How wide the date window is. Default 2 days each side. */
  dayWindow?:   number
  /** Similarity threshold below which a candidate is dropped. Default 0.5 */
  minSimilarity?: number
  /** Optional cap. Default 5. */
  limit?:       number
  /** Supabase client — caller passes an admin client to bypass RLS. */
  supabase:     SupabaseClient
}

/**
 * Find events that might be duplicates of the one described. Returns the
 * top N candidates ranked by similarity descending. The caller decides what
 * threshold counts as "definitely a duplicate" vs "worth a glance".
 */
export async function findPossibleDuplicates(opts: FindOpts): Promise<DuplicateMatch[]> {
  const dayWindow     = opts.dayWindow     ?? 2
  const minSimilarity = opts.minSimilarity ?? 0.5
  const limit         = opts.limit         ?? 5

  // Compute the date window
  const base   = new Date(opts.start_date + 'T12:00:00')
  const before = new Date(base.getTime() - dayWindow * 86_400_000).toISOString().split('T')[0]
  const after  = new Date(base.getTime() + dayWindow * 86_400_000).toISOString().split('T')[0]

  // Pull every alive event in the window for this market. We do the
  // similarity scoring in JS rather than via Postgres trigram because
  // (a) the candidate set is small (typically <50 in a 5-day window),
  // (b) keeping the logic in JS means it's testable + tweakable without
  // a migration, and (c) we don't have pg_trgm installed yet.
  let query = opts.supabase
    .from('calendar_events')
    .select('id, title, start_date, start_time, location_name, city, status')
    .gte('start_date', before)
    .lte('start_date', after)
    .is('deleted_at', null)
  if (opts.market)    query = query.eq('market', opts.market)
  if (opts.excludeId) query = query.neq('id', opts.excludeId)

  const { data, error } = await query
  if (error) {
    // Some columns (market, deleted_at) might be missing on a partially-
    // migrated DB. Soft-degrade — return empty rather than throwing.
    if (/column .* does not exist/i.test(error.message)) return []
    throw error
  }

  type Row = {
    id: string; title: string; start_date: string; start_time: string | null;
    location_name: string | null; city: string | null; status: string;
  }
  const rows = (data ?? []) as Row[]
  const cityNorm = opts.city?.toLowerCase().trim() ?? ''

  const scored: DuplicateMatch[] = rows
    .map(r => {
      let similarity = titleSimilarity(opts.title, r.title)
      // City match boost — same-city candidates are much more likely to
      // be true duplicates. Adds 0.15 to the score, capped at 1.0.
      if (cityNorm && r.city && r.city.toLowerCase().trim() === cityNorm) {
        similarity = Math.min(1, similarity + 0.15)
      }
      return {
        id:            r.id,
        title:         r.title,
        start_date:    r.start_date,
        start_time:    r.start_time,
        location_name: r.location_name,
        city:          r.city,
        status:        r.status,
        similarity,
      }
    })
    .filter(m => m.similarity >= minSimilarity)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, limit)

  return scored
}

/**
 * Convenience wrapper that builds its own service-role client. Use from
 * API routes only — never from a browser bundle.
 */
export function supabaseAdminForDedup(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    { auth: { persistSession: false } },
  )
}
