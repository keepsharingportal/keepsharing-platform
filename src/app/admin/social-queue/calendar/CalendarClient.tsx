'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, X, Loader2 } from 'lucide-react'

interface QueueItem {
  id:            string
  source_kind:   string
  source_id:     string
  brand_slug:    string | null
  scheduled_for: string
  status:        string
  platforms:     string[]
  captions:      Record<string, { caption: string }>
  needs_review:  boolean
  recycle_index: number
}

const PLATFORM_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  facebook:  { bg: 'bg-blue-100',    text: 'text-blue-800',    label: 'FB' },
  instagram: { bg: 'bg-pink-100',    text: 'text-pink-800',    label: 'IG' },
  twitter:   { bg: 'bg-sky-100',     text: 'text-sky-800',     label: 'X' },
  pinterest: { bg: 'bg-red-100',     text: 'text-red-800',     label: 'Pin' },
}

const STATUS_COLORS: Record<string, string> = {
  pending:     'text-portal-amber',
  ready:       'text-portal-blue',
  dispatching: 'text-portal-amber',
  completed:   'text-portal-green',
  failed:      'text-portal-red',
  rejected:    'text-portal-sub',
  paused:      'text-portal-sub',
}

export function CalendarClient({
  gridStartIso, currentMonth, currentYear, items,
}: {
  gridStartIso: string
  currentMonth: number
  currentYear:  number
  items:        QueueItem[]
}) {
  const router = useRouter()
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  // Group items by YYYY-MM-DD.
  const byDay = new Map<string, QueueItem[]>()
  for (const it of items) {
    const d = it.scheduled_for.slice(0, 10)
    const list = byDay.get(d) ?? []
    list.push(it)
    byDay.set(d, list)
  }

  // Build the 6×7 grid of dates.
  const gridStart = new Date(gridStartIso)
  const days: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setUTCDate(gridStart.getUTCDate() + i)
    days.push(d)
  }

  const selectedItems = selectedDay ? (byDay.get(selectedDay) ?? []) : []

  async function action(id: string, action: 'approve' | 'reject') {
    setBusy(id)
    try {
      await fetch(`/api/admin/social-queue/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action }),
      })
      router.refresh()
    } finally { setBusy(null) }
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: 'minmax(0,1fr) 360px' }}>

      {/* Calendar grid */}
      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-portal-bg border-b border-portal-border">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((d, i) => {
            const iso       = d.toISOString().slice(0, 10)
            const dayItems  = byDay.get(iso) ?? []
            const isCurMonth = d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear
            const isToday    = iso === new Date().toISOString().slice(0, 10)
            const isSelected = iso === selectedDay
            const platformChips = new Map<string, number>()
            for (const item of dayItems) {
              for (const p of item.platforms) {
                platformChips.set(p, (platformChips.get(p) ?? 0) + 1)
              }
            }
            return (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDay(iso === selectedDay ? null : iso)}
                className={`relative min-h-[96px] p-2 text-left border-r border-b border-portal-border last-in-row:border-r-0 transition-colors ${
                  isSelected ? 'bg-portal-blue/10' :
                  !isCurMonth ? 'bg-portal-bg/30 text-portal-muted' :
                  'bg-white hover:bg-portal-bg'
                }`}
                style={{ borderRight: (i + 1) % 7 === 0 ? 'none' : undefined }}
              >
                <div className={`text-[11px] font-bold ${isToday ? 'text-portal-blue' : isCurMonth ? 'text-portal-text' : 'text-portal-muted'}`}>
                  {d.getUTCDate()}
                  {isToday && <span className="ml-1 text-[9px]">today</span>}
                </div>
                {dayItems.length > 0 && (
                  <div className="mt-1.5 space-y-0.5">
                    {Array.from(platformChips.entries()).slice(0, 4).map(([p, n]) => {
                      const c = PLATFORM_COLORS[p] ?? { bg: 'bg-gray-100', text: 'text-gray-800', label: p }
                      return (
                        <div key={p} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${c.bg} ${c.text} inline-block mr-0.5`}>
                          {c.label}{n > 1 ? ` ×${n}` : ''}
                        </div>
                      )
                    })}
                    {dayItems.some(it => it.needs_review && it.status === 'ready') && (
                      <div className="text-[9px] font-bold text-portal-amber mt-0.5">⚠ needs review</div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Side panel */}
      <div className="space-y-3">
        {!selectedDay ? (
          <div className="bg-white border border-portal-border rounded-lg p-6 text-center text-portal-sub text-[13px]">
            Click any day to see its scheduled posts.
          </div>
        ) : (
          <>
            <div className="bg-white border border-portal-border rounded-lg p-3">
              <div className="text-[13px] font-bold text-portal-text">
                {new Date(selectedDay + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
              </div>
              <div className="text-[11px] text-portal-sub">{selectedItems.length} scheduled</div>
            </div>
            {selectedItems.length === 0 && (
              <div className="bg-white border border-portal-border rounded-lg p-4 text-center text-portal-sub text-[12px]">
                Nothing scheduled for this day.
              </div>
            )}
            {selectedItems.map(it => {
              const time = new Date(it.scheduled_for).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              const captionPreview = it.captions.facebook?.caption ?? it.captions.instagram?.caption ?? '(captions not yet generated)'
              return (
                <div key={it.id} className="bg-white border border-portal-border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 bg-portal-bg text-portal-sub rounded">{it.source_kind}</span>
                    <span className="text-[10px] text-portal-sub">{time}</span>
                    <span className={`text-[10px] font-bold ${STATUS_COLORS[it.status] ?? 'text-portal-sub'}`}>{it.status}</span>
                    {it.platforms.map(p => {
                      const c = PLATFORM_COLORS[p] ?? { bg: 'bg-gray-100', text: 'text-gray-800', label: p }
                      return (
                        <span key={p} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>{c.label}</span>
                      )
                    })}
                  </div>
                  <div className="text-[12px] text-portal-text line-clamp-3 mb-2">{captionPreview}</div>
                  <div className="flex items-center gap-1.5">
                    {it.status === 'ready' && it.needs_review && (
                      <button
                        type="button" onClick={() => action(it.id, 'approve')} disabled={busy === it.id}
                        className="px-2 py-0.5 text-[11px] font-semibold text-white bg-portal-green rounded hover:opacity-90 disabled:opacity-50"
                      >
                        {busy === it.id ? <Loader2 size={10} className="animate-spin" /> : <Check size={10} />} Approve
                      </button>
                    )}
                    {it.status !== 'rejected' && it.status !== 'completed' && (
                      <button
                        type="button" onClick={() => action(it.id, 'reject')} disabled={busy === it.id}
                        className="px-2 py-0.5 text-[11px] font-semibold text-portal-red bg-white border border-portal-red rounded hover:bg-portal-red-lt disabled:opacity-50"
                      >
                        <X size={10} className="inline" /> Reject
                      </button>
                    )}
                    <Link href={`/admin/social-queue?status=${it.status}`} className="text-[11px] font-bold text-portal-blue ml-auto">Edit →</Link>
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>
    </div>
  )
}
