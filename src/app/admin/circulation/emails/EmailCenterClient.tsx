'use client'

// Email Center client. Mirrors admin/emails.php from the v3_FINAL portal
// source: queue stats banner, Send Now actions (driver reminders +
// on-our-way), per-route schedule editor, templates table with inline
// editor modal, Send test email button in the page header.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Send } from 'lucide-react'

export interface Template {
  id:           string
  key:          string
  name:         string
  description:  string | null
  subject:      string
  body_html:    string
  trigger_type: string
  send_day:     number | null
  active:       boolean
}

export interface RouteSchedule {
  route_id:           string
  route_name:         string
  delivery_start_day: number
  archive_day:        number
  late_submit_days:   number
}

interface QueueStats { pending: number; sent: number; failed: number }

interface Props {
  market:        string
  monthLabel:    string
  driversPending: number
  stopsWithEmail: number
  templates:     Template[]
  routes:        RouteSchedule[]
  queueStats:    QueueStats
  testEmailDefault: string
}

export function EmailCenterClient({
  market, monthLabel, driversPending, stopsWithEmail,
  templates, routes, queueStats, testEmailDefault,
}: Props) {
  const router = useRouter()
  const [busy,        setBusy]        = useState<string | null>(null)
  const [flash,       setFlash]       = useState<{ tone: 'success' | 'error' | 'info'; msg: string } | null>(null)
  const [editing,     setEditing]     = useState<Template | null>(null)
  const [onRoute,     setOnRoute]     = useState<string>('')
  const [scheduleState, setScheduleState] = useState<RouteSchedule[]>(routes)

  async function callAction(action: string, body: Record<string, unknown> = {}) {
    setBusy(action)
    setFlash(null)
    try {
      const res = await fetch('/api/admin/circulation/emails', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ action, market, ...body }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) {
        setFlash({ tone: 'error', msg: j.error ?? `${action} failed.` })
        return
      }
      if (j.message) setFlash({ tone: 'success', msg: j.message })
      else            setFlash({ tone: 'success', msg: `${action.replace(/-/g, ' ')} ok.` })
      router.refresh()
    } finally { setBusy(null) }
  }

  async function saveSchedules() {
    setBusy('save-schedules')
    setFlash(null)
    try {
      for (const r of scheduleState) {
        const res = await fetch('/api/admin/circulation/route-schedules', {
          method:  'PATCH',
          headers: { 'content-type': 'application/json' },
          body:    JSON.stringify({
            route_id:           r.route_id,
            delivery_start_day: r.delivery_start_day,
            archive_day:        r.archive_day,
            late_submit_days:   r.late_submit_days,
          }),
        })
        if (!res.ok) {
          const j = await res.json().catch(() => ({}))
          setFlash({ tone: 'error', msg: `Schedule save failed on ${r.route_name}: ${j.error ?? res.statusText}` })
          return
        }
      }
      setFlash({ tone: 'success', msg: 'Schedules saved.' })
    } finally { setBusy(null) }
  }

  function setScheduleField(routeId: string, field: 'delivery_start_day' | 'archive_day' | 'late_submit_days', value: number) {
    setScheduleState(prev => prev.map(r => r.route_id === routeId ? { ...r, [field]: value } : r))
  }

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div><h1 className="ph-title">Email center</h1></div>
        <div className="ph-actions">
          <button type="button" onClick={() => callAction('send-test', { to_email: testEmailDefault })} disabled={busy === 'send-test'} className="btn btn-ghost btn-sm">
            <Mail size={14} /> Send test email
          </button>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {flash && (
          <div className={`alert alert-${flash.tone === 'success' ? 'success' : flash.tone === 'error' ? 'error' : 'info'}`}>
            {flash.msg}
          </div>
        )}

        {queueStats.pending > 0 && (
          <div className="alert alert-info mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              📬 Email queue: <strong>{queueStats.pending}</strong> pending, <strong>{queueStats.sent}</strong> sent
              {queueStats.failed > 0 && <>, <strong style={{ color: 'var(--color-portal-red)' }}>{queueStats.failed} failed</strong></>},
              sending at 30/hour automatically.
            </span>
            <button type="button" onClick={() => callAction('process-queue')} disabled={busy === 'process-queue'} className="btn btn-primary btn-sm">
              Send next batch now
            </button>
          </div>
        )}

        <div className="grid-2 mb-4">
          {/* Send Now */}
          <div className="card">
            <div className="card-title mb-3">Send now</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: 12, border: '1px solid var(--color-portal-border)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div>
                  <div className="fw-600 text-sm">Driver reminders</div>
                  <div className="text-muted" style={{ fontSize: 12 }}>{driversPending} haven&apos;t submitted for {monthLabel}</div>
                </div>
                <button
                  type="button"
                  disabled={driversPending === 0 || busy === 'send-reminders'}
                  onClick={() => callAction('send-reminders')}
                  className="btn btn-amber btn-sm"
                >
                  Send ({driversPending})
                </button>
              </div>

              <div style={{ padding: 12, border: '1px solid var(--color-portal-border)', borderRadius: 8 }}>
                <div className="fw-600 text-sm mb-1">On our way — to locations</div>
                <div className="text-muted" style={{ fontSize: 12, marginBottom: 8 }}>{stopsWithEmail} locations have contact emails</div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <select value={onRoute} onChange={e => setOnRoute(e.target.value)} style={{ flex: 1, padding: '6px 10px', border: '1.5px solid var(--color-portal-border-2)', borderRadius: 8, fontSize: 12 }}>
                    <option value="">All routes</option>
                    {routes.map(r => <option key={r.route_id} value={r.route_id}>{r.route_name}</option>)}
                  </select>
                  <button
                    type="button"
                    onClick={() => callAction('send-on-our-way', onRoute ? { route_id: onRoute } : {})}
                    disabled={busy === 'send-on-our-way'}
                    className="btn btn-primary btn-sm"
                  >
                    <Send size={12} /> Send
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Route delivery schedules */}
          <div className="card">
            <div className="card-title mb-2">Route delivery schedules</div>
            <p className="text-sub text-sm mb-3">Each route can have its own dates — useful when you expand to other cities.</p>
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Route</th>
                  <th style={{ textAlign: 'center' }}>Copies arrive day</th>
                  <th style={{ textAlign: 'center' }}>Archive day</th>
                  <th style={{ textAlign: 'center' }}>Late window</th>
                </tr>
              </thead>
              <tbody>
                {scheduleState.map(r => (
                  <tr key={r.route_id}>
                    <td>{r.route_name}</td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="number" min={1} max={28} value={r.delivery_start_day}
                        onChange={e => setScheduleField(r.route_id, 'delivery_start_day', Number(e.target.value))}
                        style={{ width: 48, padding: 4, border: '1.5px solid var(--color-portal-border-2)', borderRadius: 5, textAlign: 'center', fontSize: 12 }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="number" min={1} max={31} value={r.archive_day}
                        onChange={e => setScheduleField(r.route_id, 'archive_day', Number(e.target.value))}
                        style={{ width: 48, padding: 4, border: '1.5px solid var(--color-portal-border-2)', borderRadius: 5, textAlign: 'center', fontSize: 12 }}
                      />
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="number" min={0} max={30} value={r.late_submit_days}
                        onChange={e => setScheduleField(r.route_id, 'late_submit_days', Number(e.target.value))}
                        style={{ width: 48, padding: 4, border: '1.5px solid var(--color-portal-border-2)', borderRadius: 5, textAlign: 'center', fontSize: 12 }}
                      />
                    </td>
                  </tr>
                ))}
                {scheduleState.length === 0 && (
                  <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--color-portal-muted)' }}>No active routes.</td></tr>
                )}
              </tbody>
            </table>
            <div className="text-muted mt-2" style={{ fontSize: 11 }}>
              Copies arrive day = when on-our-way emails go out &nbsp;·&nbsp; Archive day = when invoices close &nbsp;·&nbsp; Late window = days after month end to still submit
            </div>
            <button type="button" onClick={saveSchedules} disabled={busy === 'save-schedules'} className="btn btn-primary btn-sm mt-3">
              {busy === 'save-schedules' ? 'Saving…' : 'Save schedules'}
            </button>
          </div>
        </div>

        {/* All templates */}
        <div className="card">
          <div className="card-title mb-3">All email templates</div>
          {templates.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, color: 'var(--color-portal-muted)' }}>
              No templates yet.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Subject</th>
                  <th>Trigger</th>
                  <th style={{ textAlign: 'center' }}>Day</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {templates.map(t => {
                  const trigger = (t.trigger_type ?? 'auto').toLowerCase()
                  const triggerLabel = trigger === 'auto' ? 'Automatic' : trigger === 'manual' ? 'Manual' : trigger === 'scheduled' ? 'Scheduled' : trigger
                  const triggerBadge = trigger === 'auto' ? 'badge-green' : trigger === 'manual' ? 'badge-amber' : trigger === 'scheduled' ? 'badge-rrp' : 'badge-gray'
                  return (
                    <tr key={t.id} style={{ opacity: t.active ? 1 : 0.45 }}>
                      <td>
                        <div className="fw-600 text-sm">{t.name}</div>
                        {t.description && <div className="text-muted" style={{ fontSize: 11 }}>{t.description}</div>}
                      </td>
                      <td className="text-sub text-sm">
                        {t.subject.length > 50 ? t.subject.slice(0, 50) + '…' : t.subject}
                      </td>
                      <td><span className={`badge ${triggerBadge}`}>{triggerLabel}</span></td>
                      <td style={{ textAlign: 'center', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
                        {trigger === 'scheduled' ? `${t.send_day}th` : '-'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${t.active ? 'badge-green' : 'badge-gray'}`}>{t.active ? 'On' : 'Off'}</span>
                      </td>
                      <td>
                        <button type="button" onClick={() => setEditing(t)} className="btn btn-ghost btn-xs">Edit</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {editing && (
        <TemplateEditor
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); router.refresh() }}
        />
      )}
    </div>
  )
}

function TemplateEditor({ template, onClose, onSaved }: { template: Template; onClose: () => void; onSaved: () => void }) {
  const [subject,  setSubject]  = useState(template.subject)
  const [body,     setBody]     = useState(template.body_html)
  const [active,   setActive]   = useState(template.active)
  const [sendDay,  setSendDay]  = useState<number>(template.send_day ?? 1)
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/email-templates', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({
          id:        template.id,
          subject,
          body_html: body,
          send_day:  sendDay,
          active,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(j.error ?? 'Save failed.'); return }
      onSaved()
    } finally { setBusy(false) }
  }

  const showSendDay = template.trigger_type === 'scheduled'

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} className="portal-app" style={{ background: 'white', borderRadius: 12, padding: 24, width: '100%', maxWidth: 700, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.25)' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Editing: {template.name}</div>
        <p className="text-muted text-sm mb-3">
          Use <code>{`{{variable}}`}</code> placeholders — replaced automatically when emails send. Available:{' '}
          <code>{`{{first_name}}`}</code> <code>{`{{month}}`}</code> <code>{`{{pay}}`}</code> <code>{`{{stops}}`}</code> <code>{`{{route_name}}`}</code> <code>{`{{stop_name}}`}</code> <code>{`{{contact_first}}`}</code> <code>{`{{pub_name}}`}</code> <code>{`{{login_url}}`}</code>
        </p>

        <div className="fg">
          <label>Subject line</label>
          <input value={subject} onChange={e => setSubject(e.target.value)} required />
        </div>

        <div className="fg">
          <label>Email body (HTML)</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            style={{ height: 280, fontFamily: 'ui-monospace, monospace', fontSize: 12, width: '100%', padding: 10, border: '1.5px solid var(--color-portal-border-2)', borderRadius: 8 }}
          />
          <div className="hint">Write in HTML using &lt;p&gt; tags. The KeepSharing logo + greeting + signature are added automatically.</div>
        </div>

        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {showSendDay && (
            <div className="fg">
              <label>Send on day of month</label>
              <input type="number" min={1} max={28} value={sendDay} onChange={e => setSendDay(Number(e.target.value))} />
              <div className="hint">1 = 1st of every month</div>
            </div>
          )}
          <div className="fg" style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 400, textTransform: 'none', letterSpacing: 0, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={active} onChange={e => setActive(e.target.checked)} /> Active — send this email
            </label>
          </div>
        </div>

        {err && <p className="text-sm" style={{ color: 'var(--color-portal-red)' }}>{err}</p>}

        <div className="modal-footer">
          <button type="button" onClick={save} disabled={busy} className="btn btn-primary">{busy ? 'Saving…' : 'Save template'}</button>
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  )
}
