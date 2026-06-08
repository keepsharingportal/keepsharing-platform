'use client'

// Email Center — interactive admin UI for templates, schedules, manual sends,
// and queue monitoring.

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, Check, Send, RotateCw, AlertTriangle, ChevronDown,
  Mail, Inbox, ListChecks, Calendar, Save,
} from 'lucide-react'

export interface EmailTemplate {
  id:           string
  market:       string
  key:          string
  name:         string
  subject:      string
  body_html:    string
  trigger_type: string
  send_day:     number
  active:       boolean
  description:  string | null
}
export interface RouteSchedule {
  route_id:           string
  route_name:         string
  delivery_start_day: number
  archive_day:        number
  late_submit_days:   number
}
export interface QueueRow {
  id:            string
  status:        string
  to_email:      string
  subject:       string
  template_key:  string | null
  last_error:    string | null
  attempts:      number
  sent_at:       string | null
  created_at:    string
}

interface Props {
  market:            string
  initialTemplates:  EmailTemplate[]
  initialSchedules:  RouteSchedule[]
  routes:            Array<{ id: string; name: string }>
  recentQueue:       QueueRow[]
  initialQueueStats: Record<string, number>
}

export function EmailCenter({ market, initialTemplates, initialSchedules, routes, recentQueue, initialQueueStats }: Props) {
  const router      = useRouter()
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates)
  const [schedules, setSchedules] = useState<RouteSchedule[]>(initialSchedules)
  const [queue,     setQueue]     = useState<QueueRow[]>(recentQueue)
  const [stats,     setStats]     = useState<Record<string, number>>(initialQueueStats)

  return (
    <div className="space-y-6">
      <QuickActions market={market} routes={routes} onDone={refresh} />
      <TemplatesEditor templates={templates} onChange={setTemplates} />
      <SchedulesEditor schedules={schedules} onChange={setSchedules} />
      <QueueSection market={market} queue={queue} stats={stats} onRefresh={refresh} />
    </div>
  )

  async function refresh() {
    router.refresh()
    // Best-effort re-pull of queue stats + recent without a full page reload.
    try {
      const [statsRes, recentRes] = await Promise.all([
        fetch('/api/admin/circulation/emails', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ action: 'queue-stats', market }),
        }).then(r => r.json() as Promise<{ stats?: Record<string, number> }>),
        fetch(`/api/admin/circulation/emails?market=${encodeURIComponent(market)}`).then(r => r.json() as Promise<{ recent?: QueueRow[] }>),
      ])
      if (statsRes.stats)   setStats(statsRes.stats)
      if (recentRes.recent) setQueue(recentRes.recent)
    } catch { /* fail open */ }
  }
}

// ── Quick actions ──────────────────────────────────────────────────────────

function QuickActions({ market, routes, onDone }: { market: string; routes: Array<{ id: string; name: string }>; onDone: () => void }) {
  const [busy,   setBusy]   = useState<string | null>(null)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [routeId,   setRouteId]   = useState('')

  // Auto-dismiss the success/error toast after a few seconds. Success messages
  // fade faster (4s) so the UI stops shouting once the action lands; error
  // messages linger longer (8s) so the admin can actually read them. Cleanup
  // the timer if a new result comes in before the previous one expires.
  useEffect(() => {
    if (!result) return
    const ttl = result.ok ? 4000 : 8000
    const id  = setTimeout(() => setResult(null), ttl)
    return () => clearTimeout(id)
  }, [result])

  async function call(action: string, extra: Record<string, unknown> = {}) {
    setBusy(action)
    setResult(null)
    try {
      const res = await fetch('/api/admin/circulation/emails', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, market, ...extra }),
      })
      const j = await res.json() as { error?: string; queued?: number; sent?: number; failed?: number; skipped?: boolean }
      if (!res.ok) throw new Error(j.error ?? 'Failed')
      const msg = 'queued' in j ? `Queued ${j.queued} email${j.queued === 1 ? '' : 's'}`
              : j.skipped       ? `${j.sent ?? 0} sent · queue retained (RESEND_API_KEY not set)`
              : `${j.sent ?? 0} sent · ${j.failed ?? 0} failed`
      setResult({ ok: true, text: msg })
      onDone()
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(null)
    }
  }

  return (
    <section>
      <SectionHeading icon={Send} title="Quick actions" description="Enqueue scheduled templates manually or drain the queue right now" />
      <div className="rounded-xl border border-portal-border bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* On-our-way */}
          <div className="rounded-md border border-portal-border p-3 space-y-2">
            <p className="text-sm font-bold text-portal-text">Send &ldquo;On our way&rdquo;</p>
            <p className="text-[11px] text-portal-sub">To every stop with a contact email{routeId ? ' on the selected route' : ' in this region'}.</p>
            <select
              value={routeId}
              onChange={e => setRouteId(e.target.value)}
              className="w-full rounded-md border border-portal-border-2 px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
            >
              <option value="">— Whole region —</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
            <button
              onClick={() => call('send-on-our-way', routeId ? { route_id: routeId } : {})}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {busy === 'send-on-our-way' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Enqueue on-our-way
            </button>
          </div>

          {/* Reminders */}
          <div className="rounded-md border border-portal-border p-3 space-y-2">
            <p className="text-sm font-bold text-portal-text">Send invoice reminders</p>
            <p className="text-[11px] text-portal-sub">To drivers who haven&apos;t submitted yet this month.</p>
            <button
              onClick={() => call('send-reminders')}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {busy === 'send-reminders' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Enqueue reminders
            </button>
          </div>

          {/* Test */}
          <div className="rounded-md border border-portal-border p-3 space-y-2">
            <p className="text-sm font-bold text-portal-text">Send a test email</p>
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-portal-border-2 px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
            />
            <button
              onClick={() => call('send-test', { to_email: testEmail })}
              disabled={busy !== null || !testEmail.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-md hover:opacity-90 disabled:opacity-50"
            >
              {busy === 'send-test' ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
              Send test
            </button>
          </div>

          {/* Drain queue */}
          <div className="rounded-md border border-portal-border p-3 space-y-2">
            <p className="text-sm font-bold text-portal-text">Process queue now</p>
            <p className="text-[11px] text-portal-sub">Drains the pending queue (batch 30) via Resend.</p>
            <button
              onClick={() => call('process-queue', { batch_size: 30 })}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              {busy === 'process-queue' ? <Loader2 size={12} className="animate-spin" /> : <RotateCw size={12} />}
              Process queue
            </button>
          </div>
        </div>

        {result && (
          <p className={`text-xs font-semibold ${result.ok ? 'text-portal-green' : 'text-portal-red'} flex items-center gap-1`}>
            {result.ok ? <Check size={11} /> : <AlertTriangle size={11} />}
            {result.text}
          </p>
        )}
      </div>
    </section>
  )
}

// ── Templates ──────────────────────────────────────────────────────────────

function TemplatesEditor({ templates, onChange }: { templates: EmailTemplate[]; onChange: (t: EmailTemplate[]) => void }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy,   setBusy]   = useState<string | null>(null)

  function patch(id: string, fields: Partial<EmailTemplate>) {
    onChange(templates.map(t => t.id === id ? { ...t, ...fields } : t))
  }

  async function save(t: EmailTemplate) {
    setBusy(t.id)
    try {
      const res = await fetch('/api/admin/circulation/email-templates', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id: t.id, subject: t.subject, body_html: t.body_html, send_day: t.send_day, active: t.active }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string }
        alert(j.error ?? 'Save failed')
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <section>
      <SectionHeading icon={ListChecks} title="Templates" description="Edit subject + HTML body. Variables use {{token}} — see the description for each template." />
      <ul className="space-y-2">
        {templates.map(t => {
          const isOpen = openId === t.id
          return (
            <li key={t.id} className="rounded-xl border border-portal-border bg-white overflow-hidden">
              <button
                onClick={() => setOpenId(isOpen ? null : t.id)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-portal-bg"
              >
                <Mail size={14} className="text-portal-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-portal-text truncate">{t.name}</p>
                  <p className="text-[11px] text-portal-sub truncate">
                    {t.trigger_type === 'scheduled' ? `Scheduled · day ${t.send_day}` : 'Triggered automatically'}
                    {!t.active && ' · disabled'}
                    {t.description ? ` · ${t.description}` : ''}
                  </p>
                </div>
                <ChevronDown size={14} className={`text-gray-300 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>
              {isOpen && (
                <div className="border-t border-gray-100 p-3 space-y-2 bg-portal-bg">
                  <FieldText label="Subject" value={t.subject} onChange={v => patch(t.id, { subject: v })} />
                  <FieldArea label="Body (HTML — supports {{tokens}})" value={t.body_html} onChange={v => patch(t.id, { body_html: v })} rows={8} />
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end">
                    {t.trigger_type === 'scheduled' && (
                      <FieldNumber label="Send day" value={t.send_day} onChange={v => patch(t.id, { send_day: v })} />
                    )}
                    <label className="flex items-center gap-1.5 text-xs text-portal-text">
                      <input type="checkbox" checked={t.active} onChange={e => patch(t.id, { active: e.target.checked })} />
                      Active
                    </label>
                  </div>
                  <div>
                    <button
                      onClick={() => save(t)}
                      disabled={busy === t.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-md hover:opacity-90 disabled:opacity-50"
                    >
                      {busy === t.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Save template
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
        {templates.length === 0 && (
          <p className="text-xs text-portal-sub italic px-3">No templates seeded yet — apply migration 114 first.</p>
        )}
      </ul>
    </section>
  )
}

// ── Schedules ──────────────────────────────────────────────────────────────

function SchedulesEditor({ schedules, onChange }: { schedules: RouteSchedule[]; onChange: (s: RouteSchedule[]) => void }) {
  const [busy, setBusy] = useState<string | null>(null)

  function patch(routeId: string, fields: Partial<RouteSchedule>) {
    onChange(schedules.map(s => s.route_id === routeId ? { ...s, ...fields } : s))
  }

  async function save(s: RouteSchedule) {
    setBusy(s.route_id)
    try {
      const res = await fetch('/api/admin/circulation/route-schedules', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          route_id:           s.route_id,
          delivery_start_day: s.delivery_start_day,
          archive_day:        s.archive_day,
          late_submit_days:   s.late_submit_days,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string }
        alert(j.error ?? 'Save failed')
      }
    } finally {
      setBusy(null)
    }
  }

  return (
    <section>
      <SectionHeading icon={Calendar} title="Per-route schedules" description="When does each route's monthly cycle fire?" />
      {schedules.length === 0 ? (
        <p className="text-xs text-portal-sub italic px-3">Add routes first to configure their schedules.</p>
      ) : (
        <ul className="space-y-2">
          {schedules.map(s => (
            <li key={s.route_id} className="rounded-xl border border-portal-border bg-white p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-bold text-portal-text">{s.route_name}</p>
                <button
                  onClick={() => save(s)}
                  disabled={busy === s.route_id}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-portal-navy text-white rounded-md hover:opacity-90 disabled:opacity-50"
                >
                  {busy === s.route_id ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
                  Save
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <FieldNumber label="Delivery start day" value={s.delivery_start_day} onChange={v => patch(s.route_id, { delivery_start_day: v })} />
                <FieldNumber label="Archive day"        value={s.archive_day}        onChange={v => patch(s.route_id, { archive_day: v })} />
                <FieldNumber label="Late-submit days"   value={s.late_submit_days}   onChange={v => patch(s.route_id, { late_submit_days: v })} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// ── Queue ──────────────────────────────────────────────────────────────────

function QueueSection({ market, queue, stats, onRefresh }: { market: string; queue: QueueRow[]; stats: Record<string, number>; onRefresh: () => void }) {
  void market
  return (
    <section>
      <SectionHeading icon={Inbox} title="Queue" description="Recent 50 outbound emails" />
      <div className="rounded-xl border border-portal-border bg-white overflow-hidden">
        <div className="flex items-center gap-3 p-3 border-b border-gray-100 text-xs">
          <Badge label="Pending"  count={stats.pending  ?? 0} color="amber" />
          <Badge label="Sending"  count={stats.sending  ?? 0} color="blue"  />
          <Badge label="Sent"     count={stats.sent     ?? 0} color="green" />
          <Badge label="Failed"   count={stats.failed   ?? 0} color="red"   />
          <button onClick={onRefresh} className="ml-auto inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-portal-sub hover:text-portal-text">
            <RotateCw size={11} /> Refresh
          </button>
        </div>
        {queue.length === 0 ? (
          <p className="text-xs text-portal-sub italic p-4">No emails sent yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {queue.map(r => (
              <li key={r.id} className="p-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-portal-text truncate">{r.subject}</p>
                  <p className="text-[11px] text-portal-sub truncate">
                    {r.to_email}
                    {r.template_key && <> · <code className="bg-gray-100 px-1 rounded">{r.template_key}</code></>}
                  </p>
                  {r.last_error && (
                    <p className="text-[11px] text-portal-red mt-0.5">⚠ {r.last_error}</p>
                  )}
                </div>
                <div className="shrink-0 text-right">
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${STATUS_COLOR[r.status] ?? 'text-portal-sub'}`}>{r.status}</p>
                  <p className="text-[10px] text-portal-muted mt-0.5">{new Date(r.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'text-amber-600',
  sending: 'text-portal-blue',
  sent:    'text-emerald-600',
  failed:  'text-portal-red',
}

function Badge({ label, count, color }: { label: string; count: number; color: 'amber' | 'blue' | 'green' | 'red' }) {
  const bg: Record<typeof color, string> = {
    amber: 'bg-portal-amber-lt text-portal-amber',
    blue:  'bg-portal-blue-lt text-portal-blue',
    green: 'bg-portal-green-lt text-portal-green',
    red:   'bg-red-50 text-red-800',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${bg[color]}`}>
      <span>{label}</span>
      <span className="font-bold">{count}</span>
    </span>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function SectionHeading({ icon: Icon, title, description }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; description?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <Icon size={14} className="text-portal-muted shrink-0" />
      <div>
        <h2 className="text-sm font-bold text-portal-text">{title}</h2>
        {description && <p className="text-[11px] text-portal-sub">{description}</p>}
      </div>
    </div>
  )
}

function FieldText({ label, value, onChange }: { label: string; value: string; onChange: (s: string) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub">{label}</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        className="mt-0.5 w-full rounded-md border border-portal-border-2 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
      />
    </label>
  )
}

function FieldArea({ label, value, onChange, rows = 4 }: { label: string; value: string; onChange: (s: string) => void; rows?: number }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub">{label}</span>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        rows={rows}
        className="mt-0.5 w-full rounded-md border border-portal-border-2 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-portal-blue/30 resize-y"
      />
    </label>
  )
}

function FieldNumber({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-portal-sub">{label}</span>
      <input
        type="number"
        value={value}
        min={1}
        max={31}
        onChange={e => onChange(parseInt(e.target.value || '0', 10))}
        className="mt-0.5 w-full rounded-md border border-portal-border-2 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
      />
    </label>
  )
}
