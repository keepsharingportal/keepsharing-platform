// Admin audit log writer.
//
// One helper, called from any mutating admin route to record what
// happened. Fire-and-forget — failures don't block the action (we log
// the failure to console but never throw to the caller). Audit logging
// should never make legitimate work fail.
//
// Typical usage:
//
//   import { recordAuditEvent } from '@/lib/admin/audit'
//   import { requireAdmin } from '@/lib/admin/auth'
//
//   export async function PATCH(req: NextRequest) {
//     const ctx = await requireAdmin()
//     // ...do the mutation...
//     await recordAuditEvent({
//       ctx,
//       req,
//       action: 'article.published',
//       target_table: 'guide_articles',
//       target_id: articleId,
//       before: prev,
//       after: next,
//     })
//     return NextResponse.json({ ok: true })
//   }
//
// Action names follow `entity.verb` (lower_snake_case). Use the past
// tense — these are records of what happened, not commands.

import type { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { AdminContext } from '@/lib/admin/auth'

export interface AuditInput {
  /** Required when an admin is acting. Skip only for cron / system events. */
  ctx?:           AdminContext | null
  /** The original request — used to capture IP + user-agent for forensics. */
  req?:           NextRequest | Request
  /** `entity.verb` — e.g. 'user.created', 'integration.disconnected'. */
  action:         string
  target_table?:  string | null
  target_id?:     string | null
  /** Pre-state JSON (omit on create). */
  before?:        Record<string, unknown> | null
  /** Post-state JSON (omit on delete). */
  after?:         Record<string, unknown> | null
  /** Arbitrary context — reason, related ids, computed counts. */
  meta?:          Record<string, unknown> | null
}

function ipFrom(req?: NextRequest | Request): string | null {
  if (!req) return null
  const h = req.headers
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0].trim()
  return h.get('x-real-ip')
}

/**
 * Write one audit row. Never throws — caller doesn't need to wrap.
 *
 * Returns the inserted row id, or null on failure (only useful in tests
 * that want to read the row back).
 */
export async function recordAuditEvent(input: AuditInput): Promise<string | null> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('admin_audit_log')
      .insert({
        actor_id:     input.ctx?.adminId ?? null,
        actor_email:  input.ctx?.email   ?? null,
        actor_role:   input.ctx?.role    ?? null,
        action:       input.action,
        target_table: input.target_table ?? null,
        target_id:    input.target_id    ?? null,
        before:       input.before       ?? null,
        after:        input.after        ?? null,
        ip:           ipFrom(input.req),
        user_agent:   input.req?.headers.get('user-agent') ?? null,
        meta:         input.meta         ?? null,
      })
      .select('id')
      .single()
    if (error) {
      console.error('[audit] insert failed', { action: input.action, error: error.message })
      return null
    }
    return (data as { id: string } | null)?.id ?? null
  } catch (e) {
    console.error('[audit] unexpected error', { action: input.action, error: e })
    return null
  }
}
