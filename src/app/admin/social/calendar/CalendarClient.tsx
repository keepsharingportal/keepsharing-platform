'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FileText, Calendar as CalendarIcon, GraduationCap, Quote, Users, Video, Sparkles, X, ExternalLink, AlertTriangle, CheckCircle2, Clock, Trash2, Loader2 } from 'lucide-react'
import { MARKETS } from '@/lib/markets'

interface Slot {
  id:            string
  plan_id:       string | null
  scheduled_for: string
  source_kind:   string
  source_id:     string | null
  platforms:     string[]
  fb_caption:    string | null
  ig_caption:    string | null
  image_url:     string | null
  status:        string
  urgency:       string
  ghl_post_id:   string | null
  ghl_error:     string | null
  brand_slug:    string
}

const KIND_ICON: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  article:    FileText,
  event:      CalendarIcon,
  school_bit: GraduationCap,
  quote:      Quote,
  spotlight:  Users,
  video:      Video,
  custom:     Sparkles,
}

const STATUS_DOT: Record<string, string> = {
  pending:    'bg-slate-400',
  approved:   'bg-portal-blue',
  dispatched: 'bg-portal-green',
  posted:     'bg-portal-green',
  failed:     'bg-portal-red',
  skipped:    'bg-slate-300',
}

export function CalendarClient({ gridStartIso, currentMonth, currentYear, slots }: {
  gridStartIso: string
  currentMonth: number
  currentYear:  number
  slots:        Slot[]
}) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  // Group slots by YYYY-MM-DD
  const byDay = new Map<string, Slot[]>()
  for (const s of slots) {
    const d = new Date(s.scheduled_for)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    if (!byDay.has(key)) byDay.set(key, [])
    byDay.get(key)!.push(s)
  }

  // Build the 6×7 grid days
  const gridStart = new Date(gridStartIso)
  const days: { key: string; date: Date; inMonth: boolean }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setUTCDate(gridStart.getUTCDate() + i)
    const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
    days.push({ key, date: d, inMonth: d.getUTCMonth() === currentMonth && d.getUTCFullYear() === currentYear })
  }

  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  return (
    <>
      <div className="bg-white border border-portal-border rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-portal-bg border-b border-portal-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="px-2 py-2 text-[10px] font-bold uppercase tracking-wider text-portal-sub text-center">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map(({ key, date, inMonth }) => {
            const daySlots = byDay.get(key) ?? []
            const isToday = key === todayKey
            return (
              <button
                key={key}
                type="button"
                onClick={() => daySlots.length > 0 && setSelectedDay(key)}
                className={`relative min-h-[90px] p-1.5 text-left border-b border-r border-portal-border last-of-type:border-r-0 ${
                  inMonth ? 'bg-white' : 'bg-portal-bg'
                } ${daySlots.length > 0 ? 'hover:bg-portal-bg cursor-pointer' : 'cursor-default'} ${
                  isToday ? 'ring-2 ring-inset ring-portal-blue' : ''
                }`}
              >
                <div className={`text-[11px] font-bold mb-1 ${inMonth ? 'text-portal-text' : 'text-portal-muted'}`}>
                  {date.getUTCDate()}
                </div>
                <div className="space-y-0.5">
                  {daySlots.slice(0, 3).map(s => {
                    const Icon = KIND_ICON[s.source_kind] ?? FileText
                    const t = new Date(s.scheduled_for)
                    return (
                      <div key={s.id} className="flex items-center gap-1 text-[10px] text-portal-text bg-portal-bg rounded px-1 py-0.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOT[s.status] ?? 'bg-slate-300'}`} />
                        <Icon size={9} className="text-portal-sub shrink-0" />
                        <span className="text-portal-sub shrink-0">{t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                      </div>
                    )
                  })}
                  {daySlots.length > 3 && (
                    <div className="text-[9px] font-bold text-portal-blue">+ {daySlots.length - 3} more</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {selectedDay && (
        <DayDrawer
          dayKey={selectedDay}
          slots={byDay.get(selectedDay) ?? []}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </>
  )
}

function DayDrawer({ dayKey, slots, onClose }: { dayKey: string; slots: Slot[]; onClose: () => void }) {
  const router = useRouter()
  const [busyId, setBusyId] = useState<string | null>(null)
  const dayDate = new Date(dayKey + 'T00:00:00Z')

  async function cancelSlot(slot: Slot) {
    if (!confirm(`Cancel this ${slot.source_kind} post? This deletes it from GHL too.`)) return
    setBusyId(slot.id)
    try {
      const res = await fetch(`/api/admin/social/calendar/${slot.id}`, { method: 'DELETE' })
      if (res.ok) router.refresh()
      else alert('Cancel failed.')
    } finally { setBusyId(null) }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-xl bg-white shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-portal-border px-5 py-3 flex items-center justify-between">
          <div>
            <h2 className="text-[16px] font-bold text-portal-text">
              {dayDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}
            </h2>
            <p className="text-[11px] text-portal-sub">{slots.length} {slots.length === 1 ? 'post' : 'posts'}</p>
          </div>
          <button type="button" onClick={onClose} className="text-portal-sub hover:text-portal-text"><X size={18} /></button>
        </div>

        <div className="p-5 space-y-3">
          {slots.map(s => {
            const Icon    = KIND_ICON[s.source_kind] ?? FileText
            const t       = new Date(s.scheduled_for)
            const caption = s.fb_caption ?? s.ig_caption ?? ''
            const brand   = MARKETS.find(m => m.slug === s.brand_slug)
            return (
              <div key={s.id} className="bg-white border border-portal-border rounded-lg overflow-hidden">
                <div className="px-3 py-2 flex items-center justify-between flex-wrap gap-2 bg-portal-bg border-b border-portal-border">
                  <div className="flex items-center gap-2">
                    <Icon size={13} className="text-portal-sub" />
                    <span className="text-[12px] font-bold uppercase tracking-wider text-portal-text">{s.source_kind}</span>
                    <span className="text-[11px] text-portal-sub">{brand?.short ?? s.brand_slug}</span>
                    {s.urgency === 'urgent' && <span className="text-[9px] font-bold uppercase text-portal-amber bg-portal-amber-lt px-1.5 py-0.5 rounded">Urgent</span>}
                    {s.urgency === 'direct' && <span className="text-[9px] font-bold uppercase text-portal-blue bg-portal-blue-lt px-1.5 py-0.5 rounded">Direct</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <Clock size={11} className="text-portal-sub" />
                    <span className="text-portal-text">{t.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                    <StatusPill status={s.status} />
                  </div>
                </div>
                <div className="p-3">
                  {s.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.image_url} alt="" className="w-full aspect-[1.91/1] object-cover rounded mb-2 bg-portal-bg" />
                  )}
                  <p className="text-[12px] text-portal-text leading-relaxed whitespace-pre-line">{caption || '(no caption)'}</p>
                  {s.ghl_error && (
                    <div className="mt-2 px-2 py-1.5 bg-portal-red-lt text-portal-red text-[11px] rounded inline-flex items-start gap-1.5">
                      <AlertTriangle size={11} className="mt-0.5 shrink-0" /> {s.ghl_error}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] text-portal-sub">Platforms:</span>
                    {s.platforms.map(p => (
                      <span key={p} className="text-[10px] font-bold uppercase bg-portal-bg text-portal-sub px-1.5 py-0.5 rounded border border-portal-border">{p}</span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-2 pt-2 border-t border-portal-border">
                    {s.plan_id && (
                      <Link href={`/admin/social/plan?brand=${s.brand_slug}`}
                        className="text-[11px] font-bold text-portal-blue hover:underline inline-flex items-center gap-1">
                        <ExternalLink size={10} /> Open weekly plan
                      </Link>
                    )}
                    {s.source_kind === 'article' && s.source_id && (
                      <Link href={`/admin/articles/${s.source_id}/edit`}
                        className="text-[11px] font-bold text-portal-blue hover:underline inline-flex items-center gap-1">
                        <ExternalLink size={10} /> Open article
                      </Link>
                    )}
                    <button type="button"
                      onClick={() => cancelSlot(s)} disabled={busyId === s.id}
                      className="ml-auto inline-flex items-center gap-1 text-[11px] font-bold text-portal-red hover:underline disabled:opacity-50">
                      {busyId === s.id ? <Loader2 size={10} className="animate-spin" /> : <Trash2 size={10} />} Cancel
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    pending:    { label: 'Pending',    cls: 'bg-portal-bg text-portal-sub border-portal-border',     icon: <Clock size={9} /> },
    approved:   { label: 'Approved',   cls: 'bg-portal-blue-lt text-portal-blue border-portal-blue', icon: <CheckCircle2 size={9} /> },
    dispatched: { label: 'Scheduled',  cls: 'bg-portal-green-lt text-portal-green border-portal-green', icon: <CheckCircle2 size={9} /> },
    posted:     { label: 'Posted',     cls: 'bg-portal-green-lt text-portal-green border-portal-green', icon: <CheckCircle2 size={9} /> },
    failed:     { label: 'Failed',     cls: 'bg-portal-red-lt text-portal-red border-portal-red',       icon: <AlertTriangle size={9} /> },
    skipped:    { label: 'Skipped',    cls: 'bg-portal-bg text-portal-sub border-portal-border',        icon: <X size={9} /> },
  }
  const m = map[status] ?? map.pending
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded border ${m.cls}`}>
      {m.icon}{m.label}
    </span>
  )
}
