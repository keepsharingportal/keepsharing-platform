'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Check, X, Calendar, MapPin, Mail, Phone, Clock, RefreshCw, ChevronDown, ChevronUp,
} from 'lucide-react'
import type { PendingEvent } from './page'

function fmtDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

interface Props {
  events: PendingEvent[]
}

export function PendingEventsClient({ events }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState<string | null>(null)
  const [busy, setBusy]         = useState<string | null>(null)
  const [msg, setMsg]           = useState<{ id: string; text: string; ok: boolean } | null>(null)

  async function act(id: string, status: 'published' | 'rejected') {
    setBusy(id)
    setMsg(null)
    try {
      const res = await fetch(`/api/admin/calendar-events/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setMsg({ id, text: json?.error ?? `HTTP ${res.status}`, ok: false })
        return
      }
      router.refresh()
    } catch (e) {
      setMsg({ id, text: e instanceof Error ? e.message : 'Network error', ok: false })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      {events.map(ev => {
        const isOpen   = expanded === ev.id
        const busyHere = busy === ev.id
        return (
          <div key={ev.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="flex flex-wrap items-start justify-between gap-3 p-4">
              <button
                onClick={() => setExpanded(isOpen ? null : ev.id)}
                className="flex-1 min-w-0 text-left"
              >
                <p className="text-sm font-bold text-gray-900 leading-tight">{ev.title}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1"><Calendar size={11} /> {fmtDate(ev.start_date)}</span>
                  {ev.start_time && <span className="inline-flex items-center gap-1"><Clock size={11} /> {ev.start_time}</span>}
                  {ev.location_name && <span className="inline-flex items-center gap-1"><MapPin size={11} /> {ev.location_name}</span>}
                  {ev.email && <span className="inline-flex items-center gap-1"><Mail size={11} /> {ev.email}</span>}
                </div>
              </button>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => act(ev.id, 'rejected')}
                  disabled={busyHere}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold border border-red-200 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 disabled:opacity-40"
                >
                  {busyHere ? <RefreshCw size={11} className="animate-spin" /> : <X size={11} />}
                  Reject
                </button>
                <button
                  onClick={() => act(ev.id, 'published')}
                  disabled={busyHere}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
                >
                  {busyHere ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
                  Approve &amp; Publish
                </button>
                <button
                  onClick={() => setExpanded(isOpen ? null : ev.id)}
                  className="text-gray-400 hover:text-gray-700 p-1"
                  title={isOpen ? 'Collapse' : 'Expand'}
                >
                  {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>

            {msg?.id === ev.id && (
              <div className={`px-4 py-2 text-xs ${msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {msg.text}
              </div>
            )}

            {isOpen && (
              <div className="border-t border-gray-100 bg-gray-50/50 p-4 space-y-3 text-sm">
                {ev.description && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Description</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{ev.description}</p>
                  </div>
                )}

                <div className="grid sm:grid-cols-2 gap-3 text-xs">
                  {ev.end_date && ev.end_date !== ev.start_date && (
                    <div><strong className="text-gray-600">End date:</strong> {fmtDate(ev.end_date)}</div>
                  )}
                  {ev.end_time && <div><strong className="text-gray-600">End time:</strong> {ev.end_time}</div>}
                  {ev.address && <div><strong className="text-gray-600">Address:</strong> {ev.address}</div>}
                  {ev.city && <div><strong className="text-gray-600">City:</strong> {ev.city}</div>}
                  {ev.age_range && <div><strong className="text-gray-600">Age range:</strong> {ev.age_range}</div>}
                  {ev.cost_text && <div><strong className="text-gray-600">Cost:</strong> {ev.cost_text}</div>}
                  {ev.is_free && <div className="text-green-700 font-semibold">Free event</div>}
                  {ev.phone && <div className="inline-flex items-center gap-1"><Phone size={11} /> {ev.phone}</div>}
                </div>

                {ev.hero_image_url && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Submitted image</p>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ev.hero_image_url} alt={ev.title} className="max-w-xs rounded-lg border border-gray-200" />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
