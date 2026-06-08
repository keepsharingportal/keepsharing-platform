'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check, X, Calendar, MapPin, Mail, Clock, RefreshCw,
  ChevronDown, ChevronUp, Trash2, Save,
} from 'lucide-react'
import type { PendingEvent } from './page'
import { EVENT_CATEGORIES, EVENT_TAGS } from '@/lib/calendar-taxonomy'

function fmtDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

interface Props {
  events: PendingEvent[]
}

// Local-only edit buffer keyed by event id. The page state holds the SSR
// snapshot; the edit buffer overlays changes the operator hasn't saved yet.
type EditState = Partial<{
  title:            string
  description:      string
  category:         string
  start_date:       string
  end_date:         string
  start_time:       string
  end_time:         string
  location_name:    string
  address:          string
  city:             string
  age_range:        string
  cost_text:        string
  is_free:          boolean
  registration_url: string
  organizer_name:   string
  hero_image_url:   string
  tags:             string[]
}>

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-portal-border outline-none focus:border-portal-blue bg-white'
const labelCls = 'block text-[10px] font-bold text-portal-sub uppercase tracking-wider mb-1.5'

export function PendingEventsClient({ events }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy]         = useState<string | null>(null)
  const [msg, setMsg]           = useState<{ id: string; text: string; ok: boolean } | null>(null)
  const [edits, setEdits]       = useState<Record<string, EditState>>({})

  function patch(id: string, field: keyof EditState, value: unknown) {
    setEdits(s => ({ ...s, [id]: { ...s[id], [field]: value } }))
  }

  function toggleTag(id: string, base: string[], tag: string) {
    const has = base.includes(tag)
    patch(id, 'tags', has ? base.filter(t => t !== tag) : [...base, tag])
  }

  async function callPatch(id: string, body: Record<string, unknown>): Promise<boolean> {
    setBusy(id)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/calendar-events/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMsg({ id, text: j?.error ?? `HTTP ${res.status}`, ok: false })
        return false
      }
      return true
    } catch (e) {
      setMsg({ id, text: e instanceof Error ? e.message : 'Network error', ok: false })
      return false
    } finally {
      setBusy(null)
    }
  }

  async function saveEdits(id: string) {
    const e = edits[id]
    if (!e || Object.keys(e).length === 0) {
      setMsg({ id, text: 'No changes to save', ok: true })
      return
    }
    const ok = await callPatch(id, e)
    if (ok) {
      setMsg({ id, text: '✓ Edits saved', ok: true })
      setEdits(s => { const n = { ...s }; delete n[id]; return n })
      router.refresh()
    }
  }

  async function approveAndPublish(id: string) {
    const ok = await callPatch(id, { ...(edits[id] ?? {}), status: 'published' })
    if (ok) {
      setEdits(s => { const n = { ...s }; delete n[id]; return n })
      router.refresh()
    }
  }

  async function reject(id: string) {
    const ok = await callPatch(id, { status: 'rejected' })
    if (ok) router.refresh()
  }

  async function trash(id: string) {
    if (!confirm('Move this event to trash? You can restore it later.')) return
    setBusy(id)
    try {
      const res = await fetch(`/api/admin/calendar-events/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setMsg({ id, text: j?.error ?? `HTTP ${res.status}`, ok: false })
        return
      }
      router.refresh()
    } finally { setBusy(null) }
  }

  function v<K extends keyof EditState>(ev: PendingEvent, k: K): EditState[K] {
    const e = edits[ev.id]
    if (e && k in e) return e[k] as EditState[K]
    const raw = (ev as unknown as Record<string, unknown>)[k]
    return (raw ?? (k === 'tags' ? [] : '')) as EditState[K]
  }

  return (
    <div className="space-y-3">
      {events.map(ev => {
        const isOpen   = expanded === ev.id
        const busyHere = busy === ev.id
        const dirty    = !!edits[ev.id] && Object.keys(edits[ev.id]).length > 0

        return (
          <div key={ev.id} className="rounded-lg border border-portal-border bg-white overflow-hidden">
            {/* Summary row */}
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <button onClick={() => setExpanded(isOpen ? null : ev.id)} className="flex-1 min-w-0 text-left">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <p className="text-sm font-bold text-portal-text leading-tight">{ev.title}</p>
                  {ev.source_type && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-portal-sub">
                      {ev.source_name ?? ev.source_type}
                    </span>
                  )}
                  {dirty && (
                    <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-portal-amber-lt text-portal-amber">
                      Unsaved edits
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-portal-sub">
                  <span className="inline-flex items-center gap-1"><Calendar size={11} /> {fmtDate(ev.start_date)}</span>
                  {ev.start_time && <span className="inline-flex items-center gap-1"><Clock size={11} /> {ev.start_time}</span>}
                  {ev.location_name && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {ev.location_name}</span>}
                  {ev.email && <span className="inline-flex items-center gap-1"><Mail size={11} /> {ev.email}</span>}
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => reject(ev.id)}
                  disabled={busyHere}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-red-200 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-40"
                >
                  {busyHere ? <RefreshCw size={11} className="animate-spin" /> : <X size={11} />}
                  Reject
                </button>
                <button
                  onClick={() => approveAndPublish(ev.id)}
                  disabled={busyHere}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
                >
                  {busyHere ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
                  {dirty ? 'Save & Publish' : 'Approve & Publish'}
                </button>
                <button
                  onClick={() => setExpanded(isOpen ? null : ev.id)}
                  className="text-portal-muted hover:text-portal-text p-1"
                  title={isOpen ? 'Collapse' : 'Expand & edit'}
                >
                  {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {msg?.id === ev.id && (
              <div className={`px-4 py-2 text-xs font-semibold ${msg.ok ? 'bg-portal-green-lt text-portal-green' : 'bg-red-50 text-red-700'}`}>
                {msg.text}
              </div>
            )}

            {/* Expanded inline edit form */}
            {isOpen && (
              <div className="border-t border-portal-border bg-portal-bg/40 p-4 space-y-4">

                {/* Title + description */}
                <div className="grid md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className={labelCls}>Title</label>
                    <input className={inputCls} value={v(ev,'title') as string ?? ''} onChange={e => patch(ev.id, 'title', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Category</label>
                    <select className={inputCls} value={v(ev,'category') as string ?? ''} onChange={e => patch(ev.id, 'category', e.target.value)}>
                      <option value="">— No category —</option>
                      {EVENT_CATEGORIES.map(c => (
                        <option key={c.slug} value={c.slug}>{c.emoji} {c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Description</label>
                  <textarea
                    className={`${inputCls} resize-y`}
                    rows={4}
                    value={v(ev,'description') as string ?? ''}
                    onChange={e => patch(ev.id, 'description', e.target.value)}
                  />
                </div>

                {/* Tags */}
                <div>
                  <label className={labelCls}>Tags</label>
                  <div className="flex flex-wrap gap-1.5">
                    {EVENT_TAGS.map(t => {
                      const current = (v(ev,'tags') as string[]) ?? []
                      const active  = current.includes(t.slug)
                      return (
                        <button
                          key={t.slug}
                          type="button"
                          onClick={() => toggleTag(ev.id, current, t.slug)}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${
                            active
                              ? 'bg-portal-navy text-white border-blue-600'
                              : 'bg-white text-portal-sub border-portal-border hover:border-gray-400'
                          }`}
                        >
                          {t.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Date / time */}
                <div className="grid md:grid-cols-4 gap-3">
                  <div>
                    <label className={labelCls}>Start date</label>
                    <input type="date" className={inputCls} value={v(ev,'start_date') as string ?? ''} onChange={e => patch(ev.id, 'start_date', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>End date</label>
                    <input type="date" className={inputCls} value={v(ev,'end_date') as string ?? ''} onChange={e => patch(ev.id, 'end_date', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Start time</label>
                    <input type="time" className={inputCls} value={v(ev,'start_time') as string ?? ''} onChange={e => patch(ev.id, 'start_time', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>End time</label>
                    <input type="time" className={inputCls} value={v(ev,'end_time') as string ?? ''} onChange={e => patch(ev.id, 'end_time', e.target.value)} />
                  </div>
                </div>

                {/* Location */}
                <div className="grid md:grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Venue / location name</label>
                    <input className={inputCls} value={v(ev,'location_name') as string ?? ''} onChange={e => patch(ev.id, 'location_name', e.target.value)} placeholder="Montgomery Zoo" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelCls}>Address</label>
                    <input className={inputCls} value={v(ev,'address') as string ?? ''} onChange={e => patch(ev.id, 'address', e.target.value)} placeholder="2301 Coliseum Pkwy, Montgomery, AL 36110" />
                  </div>
                  <div>
                    <label className={labelCls}>City</label>
                    <input className={inputCls} value={v(ev,'city') as string ?? ''} onChange={e => patch(ev.id, 'city', e.target.value)} placeholder="Montgomery" />
                  </div>
                  <div>
                    <label className={labelCls}>Organizer / hosting org</label>
                    <input className={inputCls} value={v(ev,'organizer_name') as string ?? ''} onChange={e => patch(ev.id, 'organizer_name', e.target.value)} placeholder="Montgomery Public Library" />
                  </div>
                  <div>
                    <label className={labelCls}>Registration URL</label>
                    <input type="url" className={inputCls} value={v(ev,'registration_url') as string ?? ''} onChange={e => patch(ev.id, 'registration_url', e.target.value)} placeholder="https://..." />
                  </div>
                </div>

                {/* Audience + cost */}
                <div className="grid md:grid-cols-4 gap-3">
                  <div>
                    <label className={labelCls}>Age range</label>
                    <input className={inputCls} value={v(ev,'age_range') as string ?? ''} onChange={e => patch(ev.id, 'age_range', e.target.value)} placeholder="All ages / Ages 5+ / Adults" />
                  </div>
                  <div>
                    <label className={labelCls}>Cost</label>
                    <input className={inputCls} value={v(ev,'cost_text') as string ?? ''} onChange={e => patch(ev.id, 'cost_text', e.target.value)} placeholder="$10 / Free / Pay-what-you-can" disabled={Boolean(v(ev,'is_free'))} />
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm font-semibold text-portal-text pb-2">
                      <input
                        type="checkbox"
                        checked={Boolean(v(ev,'is_free') ?? ev.is_free)}
                        onChange={e => patch(ev.id, 'is_free', e.target.checked)}
                        className="w-4 h-4 rounded text-portal-blue"
                      />
                      Free event
                    </label>
                  </div>
                  <div>
                    <label className={labelCls}>Hero image URL</label>
                    <input type="url" className={inputCls} value={v(ev,'hero_image_url') as string ?? ''} onChange={e => patch(ev.id, 'hero_image_url', e.target.value)} placeholder="https://..." />
                  </div>
                </div>

                {/* Source provenance (read-only) */}
                {(ev.source_url || ev.discovery_notes || ev.email || ev.phone) && (
                  <div className="rounded-lg border border-portal-border bg-white p-3 text-xs space-y-1">
                    <p className="text-[10px] font-bold text-portal-sub uppercase tracking-wider mb-1">Submission context</p>
                    {ev.source_url && <p><strong className="text-portal-sub">Source URL:</strong> <a href={ev.source_url} target="_blank" rel="noreferrer" className="text-portal-blue hover:underline break-all">{ev.source_url}</a></p>}
                    {ev.email && <p><strong className="text-portal-sub">Submitter email:</strong> {ev.email}</p>}
                    {ev.phone && <p><strong className="text-portal-sub">Submitter phone:</strong> {ev.phone}</p>}
                    {ev.discovery_notes && <p className="whitespace-pre-wrap"><strong className="text-portal-sub">Editor notes:</strong> {ev.discovery_notes}</p>}
                  </div>
                )}

                {/* Action bar */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-portal-border">
                  <button
                    type="button"
                    onClick={() => saveEdits(ev.id)}
                    disabled={busyHere || !dirty}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-portal-border-2 bg-white text-portal-text rounded-lg hover:bg-portal-bg disabled:opacity-40"
                  >
                    <Save size={11} /> Save edits (stay pending)
                  </button>
                  <button
                    type="button"
                    onClick={() => trash(ev.id)}
                    disabled={busyHere}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-portal-red/30 bg-white text-portal-red rounded-lg hover:bg-portal-red-lt disabled:opacity-40 ml-auto"
                  >
                    <Trash2 size={11} /> Move to trash
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
