'use client'

// Per-advertiser goals panel on /admin/advertisers/[id]. Lets you set
// targets per metric per month so the advertiser's report renders
// progress bars. Used in renewal conversations: "you committed to 30
// inquiries this month, we delivered 47."

import { useEffect, useState } from 'react'
import {
  Target, Plus, Trash2, RefreshCw, AlertTriangle, CheckCircle2,
} from 'lucide-react'

interface Goal {
  id:           string
  metric:       string
  target_value: number
  period_start: string
  period_end:   string
  notes:        string | null
  is_active:    boolean
  created_at:   string
}

const METRICS: Array<{ value: string; label: string }> = [
  { value: 'phone_taps',        label: 'Phone taps' },
  { value: 'form_inquiries',    label: 'Form inquiries' },
  { value: 'website_clicks',    label: 'Website clicks' },
  { value: 'email_opens',       label: 'Email opens' },
  { value: 'short_link_clicks', label: 'Short-link clicks' },
  { value: 'facebook_results',  label: 'Facebook results' },
  { value: 'total_engagement',  label: 'Total engagement' },
]

function metricLabel(m: string): string {
  return METRICS.find(x => x.value === m)?.label ?? m
}

function thisMonthRange(): { start: string; end: string } {
  const now   = new Date()
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
  const end   = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0))
  return {
    start: start.toISOString().slice(0, 10),
    end:   end.toISOString().slice(0, 10),
  }
}

export function AdvertiserGoalsPanel({ advertiserId }: { advertiserId: string }) {
  const [goals,    setGoals]    = useState<Goal[]>([])
  const [loading,  setLoading]  = useState(true)
  const [busy,     setBusy]     = useState<string | null>(null)
  const [err,      setErr]      = useState<string | null>(null)
  const [adding,   setAdding]   = useState(false)
  const [newMetric, setNewMetric] = useState<string>('form_inquiries')
  const [newTarget, setNewTarget] = useState<string>('')
  const [newStart,  setNewStart]  = useState<string>(thisMonthRange().start)
  const [newEnd,    setNewEnd]    = useState<string>(thisMonthRange().end)
  const [newNotes,  setNewNotes]  = useState<string>('')

  async function load() {
    setLoading(true); setErr(null)
    try {
      const res = await fetch(`/api/admin/advertisers/${advertiserId}/goals`, { cache: 'no-store' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      setGoals((json.goals ?? []) as Goal[])
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [advertiserId])

  async function create() {
    if (!newTarget.trim() || isNaN(Number(newTarget))) { setErr('Target must be a number'); return }
    setBusy('create'); setErr(null)
    try {
      const res = await fetch(`/api/admin/advertisers/${advertiserId}/goals`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          metric:       newMetric,
          target_value: Number(newTarget),
          period_start: newStart,
          period_end:   newEnd,
          notes:        newNotes.trim() || null,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      setAdding(false)
      setNewTarget(''); setNewNotes('')
      await load()
    } finally { setBusy(null) }
  }

  async function remove(goalId: string) {
    if (!confirm('Delete this goal?')) return
    setBusy(`del:${goalId}`); setErr(null)
    try {
      const res = await fetch(`/api/admin/advertisers/${advertiserId}/goals/${goalId}`, { method: 'DELETE' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(json?.error ?? `HTTP ${res.status}`); return }
      await load()
    } finally { setBusy(null) }
  }

  const inp = 'w-full text-sm border border-portal-border rounded-lg px-2.5 py-1.5 outline-none focus:border-portal-blue bg-white'
  const lbl = 'block text-[10px] font-bold uppercase tracking-wider text-portal-muted mb-1'

  return (
    <section className="bg-white rounded-lg border border-portal-border p-5 space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <Target size={14} className="text-portal-blue" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-portal-sub flex-1">Goals</h2>
        {!adding && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-portal-blue hover:text-portal-navy"
          >
            <Plus size={11} /> Add goal
          </button>
        )}
      </div>

      <p className="text-[11px] text-portal-sub leading-snug">
        Set monthly targets for what the advertiser cares about. Progress bars + percent-of-goal show up on the report at <code className="font-mono text-portal-text">/r/{'<token>'}</code>.
      </p>

      {loading ? (
        <p className="text-xs text-portal-muted inline-flex items-center gap-1.5">
          <RefreshCw size={11} className="animate-spin" /> Loading…
        </p>
      ) : (
        <>
          {goals.length === 0 && !adding && (
            <p className="text-[11px] text-portal-muted py-2">No goals set yet. Click <strong>Add goal</strong> to set one.</p>
          )}
          {goals.length > 0 && (
            <ul className="divide-y divide-portal-border bg-portal-bg/50 rounded-lg">
              {goals.map(g => (
                <li key={g.id} className="px-3 py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-portal-text">
                      {metricLabel(g.metric)} <span className="text-portal-muted font-normal">· target {g.target_value.toLocaleString()}</span>
                    </p>
                    <p className="text-[11px] text-portal-sub">
                      {g.period_start} → {g.period_end}{g.notes ? ` · ${g.notes}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(g.id)}
                    disabled={busy === `del:${g.id}`}
                    title="Delete goal"
                    className="shrink-0 p-1.5 text-portal-muted hover:text-portal-red hover:bg-portal-red-lt rounded-lg disabled:opacity-40"
                  >
                    {busy === `del:${g.id}` ? <RefreshCw size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {adding && (
            <div className="rounded-lg border border-portal-blue/30 bg-portal-blue-lt/40 p-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Metric</label>
                  <select value={newMetric} onChange={e => setNewMetric(e.target.value)} className={inp}>
                    {METRICS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={lbl}>Target</label>
                  <input type="number" min="1" value={newTarget} onChange={e => setNewTarget(e.target.value)} className={inp} placeholder="30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={lbl}>Period start</label>
                  <input type="date" value={newStart} onChange={e => setNewStart(e.target.value)} className={inp} />
                </div>
                <div>
                  <label className={lbl}>Period end</label>
                  <input type="date" value={newEnd} onChange={e => setNewEnd(e.target.value)} className={inp} />
                </div>
              </div>
              <div>
                <label className={lbl}>Notes (optional)</label>
                <input type="text" value={newNotes} onChange={e => setNewNotes(e.target.value)} className={inp} placeholder="e.g. May 2026 — Pam committed to 30 leads" />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={create}
                  disabled={busy === 'create' || !newTarget.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:bg-portal-navy/90 disabled:opacity-40"
                >
                  {busy === 'create' ? <RefreshCw size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                  Save goal
                </button>
                <button
                  type="button"
                  onClick={() => { setAdding(false); setErr(null) }}
                  className="text-xs text-portal-sub hover:text-portal-text px-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {err && (
        <p className="text-xs text-portal-red font-semibold inline-flex items-center gap-1 bg-portal-red-lt border border-portal-red/30 rounded-lg px-2.5 py-1.5">
          <AlertTriangle size={11} /> {err}
        </p>
      )}
    </section>
  )
}
