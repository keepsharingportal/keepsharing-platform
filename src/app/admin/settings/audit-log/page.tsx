// ── /admin/settings/audit-log ───────────────────────────────────────────────
// Append-only log of every mutating admin action. Visible only to settings-tier
// admins (super + admin). Filter by actor, by action prefix, paginate the rest.

import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'
import { requireSettingsAccess } from '@/lib/admin/auth'
import { AuditLogClient } from './AuditLogClient'

export const metadata: Metadata = { title: 'Audit Log — Admin' }
export const dynamic = 'force-dynamic'

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

const PAGE_SIZE = 100

export interface AuditRow {
  id:            string
  occurred_at:   string
  actor_id:      string | null
  actor_email:   string | null
  actor_role:    string | null
  action:        string
  target_table:  string | null
  target_id:     string | null
  before:        Record<string, unknown> | null
  after:         Record<string, unknown> | null
  ip:            string | null
  user_agent:    string | null
  meta:          Record<string, unknown> | null
}

interface PageProps {
  searchParams: Promise<{
    actor?:  string
    action?: string
    page?:   string
  }>
}

export default async function AuditLogPage({ searchParams }: PageProps) {
  // Gate the whole page — settings tier only. Editors and Publishers must
  // not see other people's actions, and admins/supers are the only ones who
  // can act on suspicious entries anyway.
  await requireSettingsAccess()

  const sp = await searchParams
  const actorFilter  = sp.actor?.trim()  ?? ''
  const actionFilter = sp.action?.trim() ?? ''
  const page         = Math.max(1, Number(sp.page) || 1)

  const supabase = supabaseAdmin()

  // Probe — graceful fallback if migration 138 hasn't run yet.
  const probe = await supabase.from('admin_audit_log').select('id').limit(1)
  if (probe.error) {
    return (
      <div className="flex-1 overflow-y-auto bg-portal-bg">
        <div className="bg-white border-b border-portal-border px-6 py-4">
          <Link href="/admin/settings" className="inline-flex items-center gap-1 text-xs font-semibold text-portal-sub hover:text-portal-text mb-2">
            <ArrowLeft size={12} /> Settings
          </Link>
          <h1 className="portal-page-title">Audit Log</h1>
        </div>
        <div className="p-6 max-w-3xl">
          <div className="rounded-lg border border-portal-amber/40 bg-portal-amber-lt px-5 py-4">
            <p className="text-sm font-bold text-portal-amber mb-1">Migration needed</p>
            <p className="text-sm text-portal-amber leading-relaxed">
              Apply <code className="bg-portal-amber-lt px-1 rounded">supabase/migrations/138_admin_audit_log.sql</code> in the Supabase SQL editor to enable the audit log.
            </p>
          </div>
        </div>
      </div>
    )
  }

  let q = supabase
    .from('admin_audit_log')
    .select('*', { count: 'exact' })
    .order('occurred_at', { ascending: false })

  if (actorFilter) {
    q = q.ilike('actor_email', `%${actorFilter}%`)
  }
  if (actionFilter) {
    q = q.ilike('action', `${actionFilter}%`)
  }

  const from = (page - 1) * PAGE_SIZE
  const to   = from + PAGE_SIZE - 1
  q = q.range(from, to)

  const { data, count } = await q
  const rows = (data ?? []) as AuditRow[]
  const total = count ?? 0

  // Distinct actors + actions for the filter dropdowns (limited window so this
  // stays cheap as the log grows).
  const [actorsRes, actionsRes] = await Promise.all([
    supabase.from('admin_audit_log').select('actor_email').not('actor_email', 'is', null).limit(500),
    supabase.from('admin_audit_log').select('action').limit(500),
  ])
  const actorEmails = Array.from(new Set(((actorsRes.data ?? []) as Array<{ actor_email: string | null }>)
    .map(r => r.actor_email).filter(Boolean) as string[])).sort()
  const actionPrefixes = Array.from(new Set(((actionsRes.data ?? []) as Array<{ action: string }>)
    .map(r => r.action.split('.')[0]))).sort()

  return (
    <div className="flex-1 overflow-y-auto bg-portal-bg">
      <div className="bg-white border-b border-portal-border px-6 py-4">
        <Link href="/admin/settings" className="inline-flex items-center gap-1 text-xs font-semibold text-portal-sub hover:text-portal-text mb-2">
          <ArrowLeft size={12} /> Settings
        </Link>
        <h1 className="portal-page-title">Audit Log</h1>
        <p className="portal-page-subtitle">Every mutating admin action — append-only. Service-role write, settings-tier read.</p>
      </div>

      <div className="p-6">
        <AuditLogClient
          rows={rows}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          actorFilter={actorFilter}
          actionFilter={actionFilter}
          actorEmails={actorEmails}
          actionPrefixes={actionPrefixes}
        />
      </div>
    </div>
  )
}
