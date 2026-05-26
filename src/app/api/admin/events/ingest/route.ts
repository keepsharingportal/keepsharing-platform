// POST /api/admin/events/ingest
// Body: { source_id: string } → pulls iCal for one source and inserts pending events
// Body: { source_id: 'all' }  → pulls every active ingestion_method='ical' source
//
// Discovered events ALWAYS land as status='pending'. Operator review required.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

// NOTE: ical-ingestor is NOT statically imported here. node-ical (its
// underlying dep) executes module-level code that calls BigInt() in a
// way Turbopack's build-time page-data collection can't evaluate,
// producing a "BigInt is not a function" error during `next build`.
// We load it lazily inside the handler instead — runs fine at request
// time on the Node.js runtime, and the build never has to touch it.

export const runtime         = 'nodejs'
export const dynamic         = 'force-dynamic'
export const maxDuration     = 60   // iCal fetches can be slow

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  )
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const sourceId = (body?.source_id as string | undefined) ?? ''

  if (!sourceId) {
    return NextResponse.json({ error: 'source_id is required (or pass "all")' }, { status: 400 })
  }

  // Run one or many sources
  let sourceIds: string[] = []
  if (sourceId === 'all') {
    const supabase = supabaseAdmin()
    const { data, error } = await supabase
      .from('trusted_event_sources')
      .select('id')
      .eq('is_active', true)
      .eq('ingestion_method', 'ical')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    sourceIds = (data ?? []).map(r => (r as { id: string }).id)
  } else {
    sourceIds = [sourceId]
  }

  // Lazy-load the ingestor so node-ical isn't pulled into the build's
  // module evaluation (see top-of-file note).
  const { ingestFromSource } = await import('@/lib/calendar/ical-ingestor')

  const results = []
  for (const id of sourceIds) {
    try {
      results.push(await ingestFromSource(id))
    } catch (e) {
      results.push({ source_id: id, error: e instanceof Error ? e.message : String(e) })
    }
  }

  revalidatePath('/admin/events/sources')
  revalidatePath('/admin/events/pending')

  const totalInserted = results.reduce((sum, r) => sum + ('inserted' in r ? r.inserted : 0), 0)
  return NextResponse.json({ success: true, total_inserted: totalInserted, results })
}
