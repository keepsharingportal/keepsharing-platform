// POST /api/admin/events/bulk-action
// Body: { ids: string[], action: BulkAction }
//
//   approve     → status='published'  (Pending → live)
//   reject      → status='rejected'
//   cancel      → status='cancelled'  (kept in DB, hidden from public)
//   reopen      → status='pending'    (back to review queue)
//   delete      → status='archived' + deleted_at=now (soft delete, matches
//                  the DELETE method on the single-event route)
//   feature     → is_featured=true
//   unfeature   → is_featured=false (+ featured_until=null)
//
// The BulkBar on /admin/events surfaces a context-appropriate subset of
// these per tab — see EventsAdminClient.tsx for the matrix.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'
import { requireAdmin, type AdminContext } from '@/lib/admin/auth'

export const runtime = 'nodejs'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
  )
}

const RICH_COLS = ['reviewed_at', 'reviewed_by', 'deleted_at', 'is_featured', 'featured_until']

type Action = 'approve' | 'reject' | 'cancel' | 'reopen' | 'delete' | 'feature' | 'unfeature'
const ALLOWED: Set<Action> = new Set([
  'approve','reject','cancel','reopen','delete','feature','unfeature',
])

interface Body {
  ids?:    string[]
  action?: Action
}

export async function POST(req: NextRequest) {
  let admin: AdminContext
  try { admin = await requireAdmin() }
  catch (e) { if (e instanceof Response) return e; throw e }

  const body = await req.json().catch(() => null) as Body | null
  const ids  = Array.isArray(body?.ids)
    ? body!.ids.filter((s): s is string => typeof s === 'string' && s.length > 0)
    : []
  const action = body?.action

  if (ids.length === 0) {
    return NextResponse.json({ error: 'ids must be a non-empty array' }, { status: 400 })
  }
  if (!action || !ALLOWED.has(action)) {
    return NextResponse.json(
      { error: 'action must be approve | reject | cancel | reopen | delete | feature | unfeature' },
      { status: 400 },
    )
  }

  const supabase = supabaseAdmin()
  const now      = new Date().toISOString()

  // Per-row market check. Super-admins bypass. Anyone else must own every
  // single id they're trying to mutate — a partial mismatch is treated as
  // 403 for the whole batch rather than silently dropping the disallowed
  // rows, which would be a confusing "looks like it worked" failure.
  if (admin.role !== 'super') {
    const { data: rows, error: scopeErr } = await supabase
      .from('calendar_events')
      .select('id, market')
      .in('id', ids)
    if (scopeErr && !/column "market" does not exist/i.test(scopeErr.message)) {
      return NextResponse.json({ error: scopeErr.message }, { status: 500 })
    }
    if (rows) {
      type ScopeRow = { id: string; market: string | null }
      const offending = (rows as ScopeRow[]).filter(r =>
        r.market !== null && !admin.allowedMarkets.includes(r.market),
      )
      if (offending.length > 0) {
        return NextResponse.json(
          { error: `Batch contains ${offending.length} event(s) outside your allowed markets` },
          { status: 403 },
        )
      }
    }
  }

  let patch: Record<string, unknown>
  switch (action) {
    case 'approve':   patch = { status: 'published', reviewed_at: now }; break
    case 'reject':    patch = { status: 'rejected',  reviewed_at: now }; break
    case 'cancel':    patch = { status: 'cancelled', reviewed_at: now }; break
    case 'reopen':    patch = { status: 'pending',   reviewed_at: null }; break
    case 'delete':    patch = { status: 'archived',  deleted_at:  now }; break
    case 'feature':   patch = { is_featured: true }; break
    case 'unfeature': patch = { is_featured: false, featured_until: null }; break
  }

  let { error, count } = await supabase
    .from('calendar_events')
    .update(patch, { count: 'exact' })
    .in('id', ids)

  if (error && /column .* does not exist/i.test(error.message)) {
    const fallback = { ...patch }
    for (const k of RICH_COLS) delete fallback[k]
    if (action === 'delete' && !('deleted_at' in fallback)) {
      // No soft-delete column at all — fall back to hard delete.
      const { error: e2, count: c2 } = await supabase
        .from('calendar_events')
        .delete({ count: 'exact' })
        .in('id', ids)
      if (e2) return NextResponse.json({ error: e2.message }, { status: 500 })
      revalidatePath('/admin/events')
      revalidatePath('/calendar')
      return NextResponse.json({ affected: c2 ?? 0, hardDeleted: true })
    }
    ;({ error, count } = await supabase
      .from('calendar_events')
      .update(fallback, { count: 'exact' })
      .in('id', ids))
  }

  if (error) {
    console.error('[admin/events bulk-action] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  revalidatePath('/admin/events')
  revalidatePath('/admin/events/pending')
  revalidatePath('/calendar')
  revalidatePath('/')
  return NextResponse.json({ affected: count ?? 0, action })
}
