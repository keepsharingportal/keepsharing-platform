'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, ChevronDown, ChevronUp,
  Filter, X, Shield,
} from 'lucide-react'
import type { AuditRow } from './page'

interface Props {
  rows:            AuditRow[]
  total:           number
  page:            number
  pageSize:        number
  actorFilter:     string
  actionFilter:    string
  actorEmails:     string[]
  actionPrefixes:  string[]
}

// Action → label + color. Unknown actions fall through to the generic
// portal-text style — the verb itself is descriptive enough.
const ACTION_TONE: Record<string, string> = {
  'user.created':                   'text-portal-green',
  'user.deleted':                   'text-portal-red',
  'user.role_changed':              'text-portal-amber',
  'user.status_changed':            'text-portal-amber',
  'integration.connected':          'text-portal-green',
  'integration.disconnected':       'text-portal-red',
  'integration.sync_triggered':     'text-portal-blue',
  'integration.campaign_remapped':  'text-portal-blue',
  'school_bit.deleted':             'text-portal-red',
  'school_bit.reject':              'text-portal-amber',
  'school_bit.approve':             'text-portal-green',
  'school_bit.reopen':              'text-portal-sub',
  'school_bit.edit':                'text-portal-sub',
  'article.approve':                'text-portal-green',
  'article.trash':                  'text-portal-red',
  'article.archive':                'text-portal-amber',
  'article.draft':                  'text-portal-sub',
}

export function AuditLogClient({
  rows, total, page, pageSize, actorFilter, actionFilter, actorEmails, actionPrefixes,
}: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const rangeStart = (page - 1) * pageSize + 1
  const rangeEnd   = Math.min(page * pageSize, total)

  function pushParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (!v) params.delete(k); else params.set(k, v)
    }
    params.delete('page')
    const qs = params.toString()
    startTransition(() => router.push(qs ? `/admin/settings/audit-log?${qs}` : '/admin/settings/audit-log', { scroll: false }))
  }

  function toggleRow(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const hasFilter = !!actorFilter || !!actionFilter

  return (
    <div className="space-y-4">
      <div className="bg-white border border-portal-border rounded-lg p-4 flex items-center gap-3 flex-wrap">
        <Filter size={14} className="text-portal-muted" />
        <select
          value={actorFilter}
          onChange={e => pushParams({ actor: e.target.value || null })}
          className="text-xs px-2.5 py-1.5 border border-portal-border rounded-lg bg-white cursor-pointer outline-none focus:border-portal-blue max-w-[260px]"
        >
          <option value="">All actors</option>
          {actorEmails.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select
          value={actionFilter}
          onChange={e => pushParams({ action: e.target.value || null })}
          className="text-xs px-2.5 py-1.5 border border-portal-border rounded-lg bg-white cursor-pointer outline-none focus:border-portal-blue"
        >
          <option value="">All actions</option>
          {actionPrefixes.map(a => <option key={a} value={a}>{a}.*</option>)}
        </select>
        {hasFilter && (
          <button
            type="button"
            onClick={() => pushParams({ actor: null, action: null })}
            className="text-xs text-portal-sub hover:text-portal-text underline inline-flex items-center gap-1"
          >
            <X size={11} /> Clear
          </button>
        )}
        <span className="ml-auto text-xs text-portal-muted tabular-nums">
          {total === 0 ? 'No events' : `${rangeStart.toLocaleString()}–${rangeEnd.toLocaleString()} of ${total.toLocaleString()}`}
        </span>
      </div>

      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[10rem_1fr_12rem_8rem_2rem] gap-x-4 px-4 py-2 border-b border-portal-border bg-portal-bg text-[11px] font-semibold text-portal-muted uppercase tracking-wider">
          <div>When</div>
          <div>Action · Target</div>
          <div>Actor</div>
          <div className="text-right">IP</div>
          <div />
        </div>
        <div className="divide-y divide-portal-border">
          {rows.map(r => {
            const isOpen = expanded.has(r.id)
            const tone   = ACTION_TONE[r.action] ?? 'text-portal-text'
            const when   = new Date(r.occurred_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
            return (
              <div key={r.id}>
                <button
                  type="button"
                  onClick={() => toggleRow(r.id)}
                  className="w-full grid grid-cols-[10rem_1fr_12rem_8rem_2rem] gap-x-4 px-4 py-2.5 items-center text-left hover:bg-portal-bg/60"
                >
                  <div className="text-xs text-portal-sub tabular-nums">{when}</div>
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${tone}`}>{r.action}</p>
                    {(r.target_table || r.target_id) && (
                      <p className="text-[11px] text-portal-muted font-mono truncate">
                        {r.target_table}{r.target_id ? `:${r.target_id}` : ''}
                      </p>
                    )}
                  </div>
                  <div className="text-xs text-portal-sub truncate inline-flex items-center gap-1.5">
                    {r.actor_role && (
                      <span className="text-[9px] font-bold uppercase tracking-wider text-portal-blue bg-portal-blue-lt border border-portal-blue/30 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                        <Shield size={8} /> {r.actor_role}
                      </span>
                    )}
                    <span className="truncate">{r.actor_email ?? '—'}</span>
                  </div>
                  <div className="text-[11px] text-portal-muted font-mono text-right truncate">{r.ip ?? '—'}</div>
                  <div className="text-portal-muted">
                    {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 py-3 bg-portal-bg/40 border-t border-portal-border space-y-2 text-xs">
                    {r.before && (
                      <pre className="bg-portal-red-lt/30 border border-portal-red/20 rounded p-2 overflow-x-auto text-[11px] leading-snug text-portal-text">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-portal-red mb-1">Before</span>
                        {JSON.stringify(r.before, null, 2)}
                      </pre>
                    )}
                    {r.after && (
                      <pre className="bg-portal-green-lt/30 border border-portal-green/20 rounded p-2 overflow-x-auto text-[11px] leading-snug text-portal-text">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-portal-green mb-1">After</span>
                        {JSON.stringify(r.after, null, 2)}
                      </pre>
                    )}
                    {r.meta && (
                      <pre className="bg-portal-blue-lt/30 border border-portal-blue/20 rounded p-2 overflow-x-auto text-[11px] leading-snug text-portal-text">
                        <span className="block text-[9px] font-bold uppercase tracking-wider text-portal-blue mb-1">Meta</span>
                        {JSON.stringify(r.meta, null, 2)}
                      </pre>
                    )}
                    {r.user_agent && (
                      <p className="text-[11px] text-portal-muted">UA: <code className="font-mono">{r.user_agent}</code></p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {rows.length === 0 && (
            <div className="px-4 py-12 text-center text-sm text-portal-muted">
              {hasFilter ? 'No events match these filters.' : 'No audit events yet — they appear here as soon as anyone mutates admin data.'}
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs">
          <Link
            href={page > 1 ? `?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: String(page - 1) }).toString()}` : '#'}
            scroll={false}
            aria-disabled={page <= 1}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border ${page <= 1 ? 'border-portal-border text-portal-border-2 pointer-events-none' : 'border-portal-border-2 text-portal-text hover:bg-portal-bg'}`}
          >
            <ChevronLeft size={11} /> Previous
          </Link>
          <span className="text-portal-sub tabular-nums">Page <strong className="text-portal-text">{page}</strong> of {totalPages}</span>
          <Link
            href={page < totalPages ? `?${new URLSearchParams({ ...Object.fromEntries(searchParams), page: String(page + 1) }).toString()}` : '#'}
            scroll={false}
            aria-disabled={page >= totalPages}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border ${page >= totalPages ? 'border-portal-border text-portal-border-2 pointer-events-none' : 'border-portal-border-2 text-portal-text hover:bg-portal-bg'}`}
          >
            Next <ChevronRight size={11} />
          </Link>
        </div>
      )}
    </div>
  )
}
