'use client'

// Full Run — combined checklist across every assigned route for the driver,
// in route order. Reuses the per-stop toggle endpoint. A single Submit All
// fires `action: 'submit-all'` on the driver API which marks every draft
// delivery as submitted.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, Loader2, MessageSquare, Send, AlertCircle, Navigation, ArrowLeft } from 'lucide-react'

interface Stop {
  id: string; route_id: string; name: string; address: string | null; city: string | null;
  sort_order: number; quantities: Record<string, number> | null; not_delivering: boolean;
  is_pickup?: boolean;
}
interface DeliveryStop { id: string; delivery_id: string; stop_id: string; checked: boolean; driver_note: string | null; leftovers: number }
interface Delivery { id: string; route_id: string; status?: string }
interface Route { id: string; name: string }
interface ApiResponse {
  driver:        { user_id: string; market: string; full_name: string }
  month:         string
  routes:        Route[]
  stops:         Stop[]
  deliveries:    Delivery[]
  deliveryStops: DeliveryStop[]
}

export function FullRunPortal({ market, driverName }: { market: string; driverName: string }) {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [err, setErr]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/circulation/driver')
      .then(r => r.ok ? r.json() : Promise.reject('Failed to load'))
      .then(setData)
      .catch(e => setErr(typeof e === 'string' ? e : 'Could not load'))
  }, [])

  const view = useMemo(() => {
    if (!data) return null
    // Sort routes by sort_order (already done server-side, but be safe).
    const byStop = new Map<string, DeliveryStop>()
    for (const ds of data.deliveryStops) byStop.set(ds.stop_id, ds)

    const sections = data.routes.map(route => {
      const stops = data.stops
        .filter(s => s.route_id === route.id)
        .sort((a, b) => a.sort_order - b.sort_order)
      const eligible = stops.filter(s => !s.not_delivering && !s.is_pickup)
      const delivery = data.deliveries.find(d => d.route_id === route.id)
      const done     = eligible.filter(s => byStop.get(s.id)?.checked).length
      return {
        route,
        delivery,
        stops,
        total: eligible.length,
        done,
        submitted: (delivery?.status ?? 'draft') !== 'draft',
      }
    })

    const totalAll = sections.reduce((a, s) => a + s.total, 0)
    const doneAll  = sections.reduce((a, s) => a + s.done, 0)
    const allSubmitted = sections.every(s => s.submitted)
    return { sections, totalAll, doneAll, byStop, allSubmitted }
  }, [data])

  function updateLocally(deliveryStopId: string, patch: Partial<DeliveryStop>) {
    setData(prev => prev ? ({
      ...prev,
      deliveryStops: prev.deliveryStops.map(ds => ds.id === deliveryStopId ? { ...ds, ...patch } : ds),
    }) : prev)
  }

  async function toggleChecked(ds: DeliveryStop) {
    const next = !ds.checked
    updateLocally(ds.id, { checked: next })
    await fetch('/api/circulation/driver', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ delivery_stop_id: ds.id, checked: next }),
    }).catch(() => {})
  }

  async function saveNote(ds: DeliveryStop, driverNote: string) {
    updateLocally(ds.id, { driver_note: driverNote })
    await fetch('/api/circulation/driver', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ delivery_stop_id: ds.id, driver_note: driverNote }),
    }).catch(() => {})
  }

  // Submit All
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitBusy, setSubmitBusy] = useState(false)
  const [submitNote, setSubmitNote] = useState('')
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmitAll() {
    setSubmitBusy(true)
    setSubmitResult(null)
    try {
      const res = await fetch('/api/circulation/driver', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action: 'submit-all', driver_notes: submitNote }),
      })
      const j = await res.json() as { ok?: boolean; submitted?: number; stops?: number; pay?: number; error?: string }
      if (!res.ok || !j.ok) {
        setSubmitResult({ ok: false, text: j.error ?? 'Failed' })
        return
      }
      setSubmitResult({ ok: true, text: `Submitted ${j.submitted ?? 0} route(s) · ${j.stops ?? 0} stops · $${(j.pay ?? 0).toFixed(2)}` })
      const refresh = await fetch('/api/circulation/driver').then(r => r.json() as Promise<ApiResponse>)
      setData(refresh)
      setTimeout(() => setSubmitOpen(false), 2000)
    } catch (e) {
      setSubmitResult({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setSubmitBusy(false)
    }
  }

  if (err)   return <CenteredMessage>{err}</CenteredMessage>
  if (!data) return <CenteredMessage><Loader2 className="h-5 w-5 animate-spin" /></CenteredMessage>
  if (data.routes.length < 2) {
    return <CenteredMessage>
      <p>Full Run is for multi-route drivers.</p>
      <p className="text-xs text-gray-500 mt-1">You only have one route — use the regular checklist.</p>
      <Link href={`/distribution/${market}/driver`} className="inline-block mt-3 text-blue-600 hover:underline text-sm">Go to my route →</Link>
    </CenteredMessage>
  }

  return (
    <div className="min-h-screen bg-background public-page pb-32">
      <header className="sticky top-0 z-30 bg-card border-b border-border shadow-sm">
        <div className="container py-3 flex items-center gap-3">
          <Link href={`/distribution/${market}/driver`} className="shrink-0 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Navigation className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">{market.toUpperCase()} · {data.month} · Full Run</p>
            <p className="text-sm font-bold truncate">{driverName}</p>
          </div>
          {view && (
            <div className="shrink-0 text-right">
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Done</p>
              <p className="text-sm font-bold text-primary">{view.doneAll}/{view.totalAll}</p>
            </div>
          )}
        </div>
        {view && (
          <div className="container pb-3">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: view.totalAll > 0 ? `${(view.doneAll / view.totalAll) * 100}%` : '0%' }} />
            </div>
          </div>
        )}
      </header>

      <main className="container py-4 space-y-4">
        {view?.allSubmitted && (
          <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold leading-tight">All routes submitted</p>
              <p className="text-xs leading-tight">Nice work. Contact ops if anything needs to change.</p>
            </div>
          </div>
        )}

        {view?.sections.map(section => (
          <section key={section.route.id}>
            <div className="sticky top-[88px] z-20 bg-card border border-border rounded-xl px-3 py-2 mb-2 flex items-center justify-between">
              <p className="text-sm font-bold">{section.route.name}</p>
              <p className="text-[11px] text-muted-foreground">
                {section.done}/{section.total}
                {section.submitted && <span className="ml-1.5 text-emerald-700 font-bold">· submitted</span>}
              </p>
            </div>
            <ul className="space-y-2">
              {section.stops.map(stop => {
                const ds = view.byStop.get(stop.id)
                if (!ds) return null
                return (
                  <FullRunStopRow
                    key={stop.id}
                    stop={stop}
                    ds={ds}
                    locked={section.submitted}
                    onToggle={() => toggleChecked(ds)}
                    onNote={(n) => saveNote(ds, n)}
                  />
                )
              })}
            </ul>
          </section>
        ))}

        {/* Submit all */}
        {view && !view.allSubmitted && view.totalAll > 0 && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 space-y-3">
            <div>
              <p className="text-sm font-bold flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Submit All Routes
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Submits every route at once. Once submitted you can&apos;t toggle stops until ops reopens.
              </p>
            </div>
            {!submitOpen ? (
              <button
                onClick={() => setSubmitOpen(true)}
                disabled={view.doneAll === 0}
                className="w-full text-sm font-bold px-4 py-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
              >
                {view.doneAll === 0 ? 'Check off at least one stop first' : `Submit all (${view.doneAll}/${view.totalAll})`}
              </button>
            ) : (
              <div className="space-y-2">
                {view.doneAll < view.totalAll && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 flex items-start gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      {view.totalAll - view.doneAll} stop{view.totalAll - view.doneAll === 1 ? '' : 's'} not checked off across all routes. Those won&apos;t count toward your pay. Continue?
                    </span>
                  </div>
                )}
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Note for ops (optional, applied to every route)</span>
                  <textarea value={submitNote} onChange={e => setSubmitNote(e.target.value)} rows={2} className="mt-1 w-full rounded-md border border-border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </label>
                {submitResult && (
                  <p className={`text-xs font-semibold ${submitResult.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                    {submitResult.text}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={handleSubmitAll} disabled={submitBusy} className="flex-1 text-sm font-bold px-3 py-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-50">
                    {submitBusy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Confirm submit all'}
                  </button>
                  <button onClick={() => { setSubmitOpen(false); setSubmitResult(null) }} disabled={submitBusy} className="px-3 py-2.5 text-sm font-semibold text-muted-foreground">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function FullRunStopRow({ stop, ds, locked, onToggle, onNote }: { stop: Stop; ds: DeliveryStop; locked: boolean; onToggle: () => void; onNote: (n: string) => void }) {
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState(ds.driver_note ?? '')
  return (
    <li className={`rounded-2xl border ${ds.checked ? 'bg-green-50 border-green-200' : stop.not_delivering ? 'bg-amber-50 border-amber-200' : 'bg-card border-border'}`}>
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={onToggle}
          disabled={stop.not_delivering || locked}
          className={`shrink-0 w-11 h-11 rounded-full border-2 flex items-center justify-center transition-colors ${
            stop.not_delivering ? 'border-amber-300 bg-amber-100' :
            ds.checked          ? 'border-green-600 bg-green-600' :
                                  'border-gray-300 bg-white'
          } ${locked ? 'opacity-60' : ''}`}
        >
          {ds.checked && <Check className="h-5 w-5 text-white" strokeWidth={3} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground leading-tight truncate">{stop.name}</p>
          {stop.address && <p className="text-xs text-muted-foreground truncate">{stop.address}{stop.city ? `, ${stop.city}` : ''}</p>}
        </div>
        <button onClick={() => setOpen(o => !o)} className="shrink-0 w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && (
        <div className="px-3 pb-3 border-t border-border/60 pt-3">
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
            <MessageSquare className="h-3 w-3" /> Note
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            onBlur={() => { if (note !== (ds.driver_note ?? '')) onNote(note) }}
            rows={2}
            disabled={locked}
            className="mt-1 w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
          />
        </div>
      )}
    </li>
  )
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background public-page flex items-center justify-center p-6">
      <div className="text-center text-sm text-gray-600">{children}</div>
    </div>
  )
}
