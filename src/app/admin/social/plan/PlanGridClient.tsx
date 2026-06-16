'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles, Loader2, CheckCircle2, AlertTriangle, Edit2, RotateCw, Send,
  FileText, Calendar, GraduationCap, Quote, Users, Video,
} from 'lucide-react'
import type { PlanRow, SlotRow } from './page'

const DAYS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SLOTS = ['morning', 'midday', 'afternoon', 'evening'] as const

const KIND_ICON: Record<string, React.ComponentType<{ size?: number }>> = {
  article:    FileText,
  event:      Calendar,
  school_bit: GraduationCap,
  quote:      Quote,
  spotlight:  Users,
  video:      Video,
  custom:     Sparkles,
}

export function PlanGridClient({ plan, slots, brand, weekStart }: {
  plan:      PlanRow
  slots:     SlotRow[]
  brand:     string
  weekStart: string
}) {
  const router = useRouter()
  const [busy,  setBusy]  = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function regeneratePlan() {
    setBusy('regenerate'); setError(null)
    try {
      const res = await fetch('/api/admin/social/strategist/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand, week_start: weekStart }),
      })
      const j = await res.json()
      if (!res.ok) setError(j?.error ?? 'regenerate failed')
      else         router.refresh()
    } finally { setBusy(null) }
  }

  async function approveAndPush() {
    if (!confirm(`Push all ${slots.length} posts to GHL Social Planner? Editor cannot undo from this UI — you'd have to delete posts in GHL.`)) return
    setBusy('approve'); setError(null)
    try {
      const res = await fetch('/api/admin/social/plan/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id }),
      })
      const j = await res.json()
      if (!res.ok) setError(j?.error ?? 'approve failed')
      else         router.refresh()
    } finally { setBusy(null) }
  }

  // Build a (day, slot) lookup
  const grid: Record<string, SlotRow> = {}
  for (const s of slots) grid[`${s.day_of_week}:${s.slot}`] = s

  const approved = plan.status === 'approved' || plan.status === 'pushed' || plan.status === 'completed'
  const pushed   = !!plan.pushed_at

  return (
    <div className="space-y-3">

      {/* Toolbar */}
      <div className="bg-white border border-portal-border rounded-lg p-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <StatusChip status={plan.status} />
          <span className="text-[11px] text-portal-sub">
            {slots.length} posts · generated {timeAgo(plan.generated_at)}
            {plan.pushed_at && ` · pushed ${timeAgo(plan.pushed_at)}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button" onClick={regeneratePlan} disabled={!!busy || pushed}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-portal-sub bg-white border border-portal-border-2 rounded hover:bg-portal-bg disabled:opacity-50"
          >
            {busy === 'regenerate' ? <Loader2 size={11} className="animate-spin" /> : <RotateCw size={11} />}
            Regenerate plan
          </button>
          <button
            type="button" onClick={approveAndPush} disabled={!!busy || pushed || slots.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold text-white bg-portal-green rounded hover:opacity-90 disabled:opacity-50"
          >
            {busy === 'approve' ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            {pushed ? 'Pushed to GHL' : approved ? 'Push to GHL' : 'Approve & push to GHL'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-portal-red-lt text-portal-red border border-portal-red rounded p-2 text-[12px] inline-flex items-start gap-1.5">
          <AlertTriangle size={12} className="mt-0.5 shrink-0" /> {error}
        </div>
      )}

      {/* 7-day grid */}
      <div className="overflow-x-auto">
        <div className="grid gap-2 min-w-[1100px]" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
          {/* Header row */}
          <div></div>
          {DAYS.map((d, i) => {
            const date = new Date(weekStart + 'T00:00:00')
            date.setDate(date.getDate() + i)
            return (
              <div key={d} className="text-center py-1">
                <div className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">{d}</div>
                <div className="text-[10px] text-portal-muted">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
              </div>
            )
          })}

          {/* Slot rows */}
          {SLOTS.map(slotName => (
            <SlotRowRender
              key={slotName}
              slotName={slotName}
              grid={grid}
              pushed={pushed}
              onChanged={() => router.refresh()}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function SlotRowRender({ slotName, grid, pushed, onChanged }: {
  slotName: typeof SLOTS[number]
  grid:     Record<string, SlotRow>
  pushed:   boolean
  onChanged: () => void
}) {
  return (
    <>
      <div className="flex items-center text-[11px] font-bold uppercase tracking-wider text-portal-sub">
        {slotName}
      </div>
      {[0, 1, 2, 3, 4, 5, 6].map(d => {
        const s = grid[`${d}:${slotName}`]
        if (!s) return (
          <div key={d} className="bg-white border border-dashed border-portal-border rounded p-2 text-[10px] text-portal-muted text-center">
            empty
          </div>
        )
        return <SlotCard key={d} slot={s} pushed={pushed} onChanged={onChanged} />
      })}
    </>
  )
}

function SlotCard({ slot, pushed, onChanged }: { slot: SlotRow; pushed: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState(false)
  const [fb, setFb] = useState(slot.fb_caption ?? '')
  const [ig, setIg] = useState(slot.ig_caption ?? '')
  const [busy, setBusy] = useState(false)
  const Icon = KIND_ICON[slot.source_kind] ?? FileText

  const tone = slot.tone ?? ''
  const dispatched = slot.status === 'dispatched' || slot.status === 'posted'

  async function save() {
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/social/plan/slot/${slot.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fb_caption: fb, ig_caption: ig }),
      })
      if (res.ok) { setEditing(false); onChanged() }
    } finally { setBusy(false) }
  }

  async function remove() {
    if (!confirm('Delete this slot?')) return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/social/plan/slot/${slot.id}`, { method: 'DELETE' })
      if (res.ok) onChanged()
    } finally { setBusy(false) }
  }

  return (
    <div className={`bg-white border rounded p-2 text-[10px] space-y-1 ${
      slot.urgency === 'urgent' ? 'border-portal-amber' : 'border-portal-border'
    }`}>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-portal-sub">
          <Icon size={10} />
          <span className="uppercase font-bold">{slot.source_kind}</span>
          {tone && <span className="text-portal-muted">· {tone}</span>}
        </span>
        {dispatched && <CheckCircle2 size={10} className="text-portal-green" />}
        {slot.ghl_error && (
          <span title={slot.ghl_error} className="inline-flex">
            <AlertTriangle size={10} className="text-portal-red" />
          </span>
        )}
      </div>

      {slot.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slot.image_url} alt="" className="w-full aspect-[1.91/1] object-cover rounded bg-portal-bg" />
      )}

      {editing ? (
        <div className="space-y-1">
          <textarea
            rows={3} value={fb} onChange={e => setFb(e.target.value)}
            placeholder="FB caption"
            className="w-full p-1 text-[10px] border border-portal-border-2 rounded resize-vertical"
          />
          <textarea
            rows={3} value={ig} onChange={e => setIg(e.target.value)}
            placeholder="IG caption"
            className="w-full p-1 text-[10px] border border-portal-border-2 rounded resize-vertical"
          />
          <div className="flex gap-1">
            <button type="button" onClick={save} disabled={busy}
              className="px-2 py-0.5 text-[10px] font-bold text-white bg-portal-navy rounded disabled:opacity-50">
              {busy ? '…' : 'Save'}
            </button>
            <button type="button" onClick={() => { setEditing(false); setFb(slot.fb_caption ?? ''); setIg(slot.ig_caption ?? '') }}
              className="px-2 py-0.5 text-[10px] text-portal-sub">cancel</button>
          </div>
        </div>
      ) : (
        <>
          <div className="text-portal-text line-clamp-3 leading-snug">
            {slot.fb_caption ?? slot.custom_caption ?? '(no caption)'}
          </div>
          {!pushed && (
            <div className="flex gap-1 pt-0.5 border-t border-portal-border opacity-60 hover:opacity-100">
              <button type="button" onClick={() => setEditing(true)}
                className="text-[10px] text-portal-blue hover:underline inline-flex items-center gap-0.5">
                <Edit2 size={9} /> edit
              </button>
              <button type="button" onClick={remove} disabled={busy}
                className="text-[10px] text-portal-red hover:underline ml-auto">
                delete
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatusChip({ status }: { status: string }) {
  const cls = status === 'draft'     ? 'bg-portal-bg text-portal-sub border-portal-border'
            : status === 'approved'  ? 'bg-portal-blue-lt text-portal-blue border-portal-blue'
            : status === 'pushed'    ? 'bg-portal-green-lt text-portal-green border-portal-green'
            : status === 'completed' ? 'bg-portal-green-lt text-portal-green border-portal-green'
            :                          'bg-portal-bg text-portal-sub border-portal-border'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${cls}`}>
      {status}
    </span>
  )
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  const min = Math.round(ms / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.round(h / 24)
  return `${d}d ago`
}
