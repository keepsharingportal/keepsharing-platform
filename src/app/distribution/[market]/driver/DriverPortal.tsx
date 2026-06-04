'use client'

// Driver portal — mobile-first checklist for the current month.
//
// Loads on mount via GET /api/circulation/driver. Each stop is a giant
// tap target with a circle that toggles checked on click. Notes + flag
// open inline when the user hits the … menu. Optimistic UI everywhere
// so taps feel instant; the API call settles in the background.

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Loader2, MessageSquare, Flag, X, Navigation } from 'lucide-react'

interface Route { id: string; name: string; city: string | null }
interface Stop  { id: string; route_id: string; name: string; address: string | null; city: string | null; zip: string | null; sort_order: number; quantities: Record<string, number> | null; not_delivering: boolean }
interface Delivery { id: string; route_id: string }
interface DeliveryStop { id: string; delivery_id: string; stop_id: string; checked: boolean; checked_at: string | null; notes: string | null; flag: string | null; flag_note: string | null }

interface ApiResponse {
  driver:        { user_id: string; market: string; full_name: string }
  month:         string
  routes:        Route[]
  stops:         Stop[]
  deliveries:    Delivery[]
  deliveryStops: DeliveryStop[]
}

const FLAGS = [
  { key: 'closed',        label: 'Closed' },
  { key: 'wrong_address', label: 'Wrong address' },
  { key: 'wrong_qty',     label: 'Wrong quantity' },
  { key: 'new_stop',      label: 'Add a stop' },
  { key: 'other',         label: 'Other' },
]

export function DriverPortal({ market, driverName }: { market: string; driverName: string }) {
  const [data, setData]       = useState<ApiResponse | null>(null)
  const [err, setErr]         = useState<string | null>(null)
  const [activeRoute, setActiveRoute] = useState<string | null>(null)

  // Initial load
  useEffect(() => {
    fetch('/api/circulation/driver')
      .then(r => r.ok ? r.json() : Promise.reject('Failed to load'))
      .then((j: ApiResponse) => {
        setData(j)
        if (j.routes.length > 0) setActiveRoute(j.routes[0].id)
      })
      .catch(e => setErr(typeof e === 'string' ? e : 'Could not load route'))
  }, [])

  // Stops + delivery state for the active route
  const view = useMemo(() => {
    if (!data || !activeRoute) return null
    const stops    = data.stops.filter(s => s.route_id === activeRoute).sort((a, b) => a.sort_order - b.sort_order)
    const delivery = data.deliveries.find(d => d.route_id === activeRoute)
    if (!delivery) return null
    const byStop   = new Map<string, DeliveryStop>()
    for (const ds of data.deliveryStops.filter(ds => ds.delivery_id === delivery.id)) byStop.set(ds.stop_id, ds)
    const total    = stops.filter(s => !s.not_delivering).length
    const done     = stops.filter(s => byStop.get(s.id)?.checked).length
    return { stops, byStop, total, done, deliveryId: delivery.id }
  }, [data, activeRoute])

  function updateLocally(deliveryStopId: string, patch: Partial<DeliveryStop>) {
    setData(prev => prev ? ({
      ...prev,
      deliveryStops: prev.deliveryStops.map(ds => ds.id === deliveryStopId ? { ...ds, ...patch } : ds),
    }) : prev)
  }

  async function toggleChecked(ds: DeliveryStop) {
    const nextChecked = !ds.checked
    updateLocally(ds.id, { checked: nextChecked, checked_at: nextChecked ? new Date().toISOString() : null })
    await fetch('/api/circulation/driver', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ delivery_stop_id: ds.id, checked: nextChecked }),
    }).catch(() => {})
  }

  async function saveNotes(ds: DeliveryStop, notes: string) {
    updateLocally(ds.id, { notes })
    await fetch('/api/circulation/driver', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ delivery_stop_id: ds.id, notes }),
    }).catch(() => {})
  }

  async function saveFlag(ds: DeliveryStop, flag: string | null, flagNote: string) {
    updateLocally(ds.id, { flag, flag_note: flagNote })
    await fetch('/api/circulation/driver', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ delivery_stop_id: ds.id, flag, flag_note: flagNote }),
    }).catch(() => {})
  }

  if (err)   return <CenteredMessage>{err}</CenteredMessage>
  if (!data) return <CenteredMessage><Loader2 className="h-5 w-5 animate-spin" /></CenteredMessage>
  if (data.routes.length === 0) {
    return <CenteredMessage>No routes assigned to you yet. Contact the distribution manager.</CenteredMessage>
  }

  return (
    <div className="min-h-screen bg-background public-page pb-32">
      <header className="sticky top-0 z-30 bg-card border-b border-border shadow-sm">
        <div className="container py-3 flex items-center gap-3">
          <Navigation className="h-5 w-5 text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">{market.toUpperCase()} · {data.month}</p>
            <p className="text-sm font-bold truncate">{driverName}</p>
          </div>
          {view && (
            <div className="shrink-0 text-right">
              <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">Done</p>
              <p className="text-sm font-bold text-primary">{view.done}/{view.total}</p>
            </div>
          )}
        </div>

        {/* Route selector — only if multiple */}
        {data.routes.length > 1 && (
          <div className="container pb-3 flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {data.routes.map(r => (
              <button
                key={r.id}
                onClick={() => setActiveRoute(r.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${activeRoute === r.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground hover:bg-muted/70'}`}
              >
                {r.name}
              </button>
            ))}
          </div>
        )}

        {/* Progress bar */}
        {view && (
          <div className="container pb-3">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: view.total > 0 ? `${(view.done / view.total) * 100}%` : '0%' }}
              />
            </div>
          </div>
        )}
      </header>

      <main className="container py-4 space-y-2">
        {view?.stops.map(stop => {
          const ds = view.byStop.get(stop.id)
          if (!ds) return null
          return (
            <StopRow
              key={stop.id}
              stop={stop}
              ds={ds}
              onToggle={() => toggleChecked(ds)}
              onNotes={(n)  => saveNotes(ds, n)}
              onFlag={(f, n) => saveFlag(ds, f, n)}
            />
          )
        })}
      </main>
    </div>
  )
}

// ── Stop row ─────────────────────────────────────────────────────────────────

function StopRow({ stop, ds, onToggle, onNotes, onFlag }: {
  stop:    Stop
  ds:      DeliveryStop
  onToggle: () => void
  onNotes:  (n: string) => void
  onFlag:   (flag: string | null, note: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState(ds.notes ?? '')
  const [flagOpen, setFlagOpen] = useState(false)
  const [flag, setFlag] = useState(ds.flag ?? '')
  const [flagNote, setFlagNote] = useState(ds.flag_note ?? '')

  return (
    <div className={`rounded-2xl border ${ds.checked ? 'bg-green-50 border-green-200' : stop.not_delivering ? 'bg-amber-50 border-amber-200' : 'bg-card border-border'}`}>
      <div className="flex items-center gap-3 p-3">
        {/* Big circle */}
        <button
          onClick={onToggle}
          disabled={stop.not_delivering}
          className={`shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors ${
            stop.not_delivering ? 'border-amber-300 bg-amber-100' :
            ds.checked          ? 'border-green-600 bg-green-600' :
                                  'border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100'
          }`}
        >
          {ds.checked && <Check className="h-6 w-6 text-white" strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground leading-tight truncate">{stop.name}</p>
          {stop.address && (
            <p className="text-xs text-muted-foreground truncate">
              {stop.address}{stop.city ? `, ${stop.city}` : ''}
            </p>
          )}
          {stop.quantities && Object.keys(stop.quantities).length > 0 && (
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {Object.entries(stop.quantities).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(' · ')}
            </p>
          )}
          {stop.not_delivering && (
            <p className="text-[11px] text-amber-700 font-semibold mt-0.5">Not delivering this month</p>
          )}
          {(ds.notes || ds.flag) && (
            <p className="text-[11px] text-blue-700 mt-0.5">
              {ds.flag && `🚩 ${ds.flag.replace(/_/g, ' ')} `}
              {ds.notes && `📝 ${ds.notes.slice(0, 40)}${ds.notes.length > 40 ? '…' : ''}`}
            </p>
          )}
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          className="shrink-0 w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center"
          aria-label="Notes / flag"
        >
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border/60 pt-3">
          {/* Notes */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Notes
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => { if (notes !== (ds.notes ?? '')) onNotes(notes) }}
              rows={2}
              placeholder="Anything to remember about this stop?"
              className="mt-1 w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>

          {/* Flag */}
          <div>
            <button
              onClick={() => setFlagOpen(o => !o)}
              className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 hover:text-foreground"
            >
              <Flag className="h-3 w-3" /> {ds.flag ? `Flagged: ${ds.flag.replace(/_/g, ' ')}` : 'Flag an issue'}
              <ChevronDown className={`h-3 w-3 transition-transform ${flagOpen ? 'rotate-180' : ''}`} />
            </button>
            {flagOpen && (
              <div className="mt-2 space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {FLAGS.map(f => {
                    const on = flag === f.key
                    return (
                      <button
                        key={f.key}
                        onClick={() => setFlag(on ? '' : f.key)}
                        className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${on ? 'bg-red-600 text-white border-red-600' : 'bg-white text-foreground border-gray-200 hover:border-red-300'}`}
                      >
                        {f.label}
                      </button>
                    )
                  })}
                  {flag && (
                    <button onClick={() => setFlag('')} className="px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                      <X className="h-3 w-3" /> Clear
                    </button>
                  )}
                </div>
                <textarea
                  value={flagNote}
                  onChange={e => setFlagNote(e.target.value)}
                  rows={2}
                  placeholder="Details for the distribution manager"
                  className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button
                  onClick={() => onFlag(flag || null, flagNote)}
                  className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md font-semibold"
                >
                  Save flag
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background public-page flex items-center justify-center p-6">
      <div className="text-center text-sm text-gray-600">{children}</div>
    </div>
  )
}
