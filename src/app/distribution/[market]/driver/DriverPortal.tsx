'use client'

// Driver portal — mobile-first checklist for the current month.
//
// Loads on mount via GET /api/circulation/driver. Each stop is a giant
// tap target with a circle that toggles checked on click. Notes + flag
// open inline when the user hits the … menu. Optimistic UI everywhere
// so taps feel instant; the API call settles in the background.

import { useEffect, useMemo, useState } from 'react'
import { Check, ChevronDown, Loader2, MessageSquare, Flag, X, Navigation, Package, Send, AlertCircle } from 'lucide-react'

interface Route { id: string; name: string; city: string | null }
interface Stop  { id: string; route_id: string; name: string; address: string | null; city: string | null; zip: string | null; sort_order: number; quantities: Record<string, number> | null; not_delivering: boolean; is_pickup?: boolean; is_advertiser?: boolean; ad_level?: string | null }
interface Delivery { id: string; route_id: string; status?: string }
interface DeliveryStop {
  id:             string
  delivery_id:    string
  stop_id:        string
  checked:        boolean
  checked_at:     string | null
  notes:          string | null   // legacy alias, prefer driver_note
  driver_note:    string | null
  leftovers:      number
  leftovers_json: Record<string, number> | null
  flag:           string | null
  flag_note:      string | null
}

interface ApiResponse {
  driver:        { user_id: string; market: string; full_name: string; rate_per_stop?: number }
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
    // Eligible stops = excludes pickup-only + not-delivering. Drivers don't
    // get paid for those, and they don't count toward the done/total ratio.
    const eligible = stops.filter(s => !s.not_delivering && !s.is_pickup)
    const total    = eligible.length
    const done     = eligible.filter(s => byStop.get(s.id)?.checked).length
    const submitted = (delivery.status ?? 'draft') !== 'draft'
    return { stops, byStop, total, done, deliveryId: delivery.id, submitted, status: delivery.status }
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

  async function saveNotes(ds: DeliveryStop, driverNote: string) {
    updateLocally(ds.id, { driver_note: driverNote })
    await fetch('/api/circulation/driver', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ delivery_stop_id: ds.id, driver_note: driverNote }),
    }).catch(() => {})
  }

  async function saveLeftovers(ds: DeliveryStop, leftoversJson: Record<string, number>) {
    const total = Object.values(leftoversJson).reduce((sum, n) => sum + (Number(n) || 0), 0)
    updateLocally(ds.id, { leftovers: total, leftovers_json: leftoversJson })
    await fetch('/api/circulation/driver', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ delivery_stop_id: ds.id, leftovers: total, leftovers_json: leftoversJson }),
    }).catch(() => {})
  }

  // Submit-invoice flow — driver finishes their route, hits "Submit Invoice",
  // status flips to 'submitted', they can't toggle stops anymore.
  const [submitOpen, setSubmitOpen] = useState(false)
  const [submitBusy, setSubmitBusy] = useState(false)
  const [submitNote, setSubmitNote] = useState('')
  const [submitResult, setSubmitResult] = useState<{ ok: boolean; text: string } | null>(null)

  async function handleSubmitInvoice() {
    if (!view) return
    setSubmitBusy(true)
    setSubmitResult(null)
    try {
      const res = await fetch('/api/circulation/driver', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:       'submit-delivery',
          delivery_id:  view.deliveryId,
          driver_notes: submitNote,
        }),
      })
      const json = await res.json() as { ok?: boolean; stops?: number; pay?: number; error?: string }
      if (!res.ok || !json.ok) {
        setSubmitResult({ ok: false, text: json.error ?? 'Submit failed' })
        return
      }
      setSubmitResult({ ok: true, text: `Submitted — ${json.stops} stops, $${(json.pay ?? 0).toFixed(2)}` })
      // Re-pull data so the UI reflects 'submitted' state.
      const refresh = await fetch('/api/circulation/driver').then(r => r.json() as Promise<ApiResponse>)
      setData(refresh)
      setTimeout(() => setSubmitOpen(false), 1500)
    } catch (e) {
      setSubmitResult({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setSubmitBusy(false)
    }
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
            <a
              href={`/distribution/${market}/driver/run`}
              className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap bg-primary/20 text-primary hover:bg-primary/30"
            >
              Full Run →
            </a>
          </div>
        )}

        {/* Secondary actions strip */}
        <div className="container pb-3 flex items-center gap-3 text-xs">
          <a href={`/distribution/${market}/driver/invoices`} className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
            <Send className="h-3 w-3" /> My invoices
          </a>
        </div>

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
        {view?.submitted && (
          <div className="mb-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0" />
            <div>
              <p className="font-bold leading-tight">Submitted</p>
              <p className="text-xs leading-tight">This route is locked. Contact ops if you need to make a change.</p>
            </div>
          </div>
        )}
        {view?.stops.map(stop => {
          const ds = view.byStop.get(stop.id)
          if (!ds) return null
          // Eligible pubs from this stop's qty (used to render the leftovers
          // breakdown — driver records up to N copies leftover per pub).
          const pubKeys = stop.quantities ? Object.keys(stop.quantities).sort() : []
          return (
            <StopRow
              key={stop.id}
              stop={stop}
              ds={ds}
              pubKeys={pubKeys}
              locked={view.submitted ?? false}
              onToggle={() => toggleChecked(ds)}
              onNotes={(n)  => saveNotes(ds, n)}
              onLeftovers={(json) => saveLeftovers(ds, json)}
              onFlag={(f, n) => saveFlag(ds, f, n)}
            />
          )
        })}

        {/* Submit invoice card — only when there are eligible stops and the
            delivery hasn't been submitted yet. */}
        {view && !view.submitted && view.total > 0 && (
          <div className="mt-4 rounded-2xl border border-border bg-card p-4 space-y-3">
            <div>
              <p className="text-sm font-bold flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" /> Submit Invoice
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                When you've checked off every stop you made it to, submit this route to send the invoice for review. After submitting, you can&apos;t toggle stops without ops reopening it.
              </p>
            </div>
            {!submitOpen ? (
              <button
                onClick={() => setSubmitOpen(true)}
                disabled={view.done === 0}
                className="w-full text-sm font-bold px-4 py-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
              >
                {view.done === 0 ? 'Check off at least one stop first' : `Submit ${view.done} of ${view.total} stops`}
              </button>
            ) : (
              <div className="space-y-2">
                {view.done < view.total && (
                  <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900 flex items-start gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <span>
                      {view.total - view.done} stop{view.total - view.done === 1 ? '' : 's'} not checked off. They won&apos;t count toward your pay. Continue anyway?
                    </span>
                  </div>
                )}
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Note for ops (optional)</span>
                  <textarea
                    value={submitNote}
                    onChange={e => setSubmitNote(e.target.value)}
                    rows={2}
                    placeholder="Anything to flag about this delivery?"
                    className="mt-1 w-full rounded-md border border-border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </label>
                {submitResult && (
                  <p className={`text-xs font-semibold ${submitResult.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                    {submitResult.text}
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSubmitInvoice}
                    disabled={submitBusy}
                    className="flex-1 text-sm font-bold px-3 py-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-50"
                  >
                    {submitBusy ? <Loader2 className="h-4 w-4 animate-spin inline" /> : 'Confirm submit'}
                  </button>
                  <button
                    onClick={() => { setSubmitOpen(false); setSubmitResult(null) }}
                    disabled={submitBusy}
                    className="px-3 py-2.5 text-sm font-semibold text-muted-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Sticky bottom bar — running pay total. Legacy parity (`.earn-amt`
          in run.php). Updates instantly via local state on every toggle,
          then settles when the API echoes the authoritative count back.
          Hidden once the delivery is submitted to keep the "this run is
          locked" message dominant. */}
      {view && !view.submitted && (data.driver.rate_per_stop ?? 0) > 0 && (
        <div
          className="fixed bottom-0 inset-x-0 z-40 bg-card border-t border-border px-4 py-3 flex items-center justify-between"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Earned this run</p>
            <p className="text-[10px] text-muted-foreground/70">
              {view.done} of {view.total} stops · ${(data.driver.rate_per_stop ?? 0).toFixed(2)}/stop
            </p>
          </div>
          <p className="text-2xl font-black text-emerald-600 tabular-nums">
            ${(view.done * (data.driver.rate_per_stop ?? 0)).toFixed(2)}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Stop row ─────────────────────────────────────────────────────────────────

function StopRow({ stop, ds, pubKeys, locked, onToggle, onNotes, onLeftovers, onFlag }: {
  stop:        Stop
  ds:          DeliveryStop
  pubKeys:     string[]                  // pub keys this stop carries, used for leftovers UI
  locked:      boolean                   // true when delivery is already submitted
  onToggle:    () => void
  onNotes:     (n: string) => void
  onLeftovers: (json: Record<string, number>) => void
  onFlag:      (flag: string | null, note: string) => void
}) {
  const [open, setOpen]     = useState(false)
  const [notes, setNotes]   = useState(ds.driver_note ?? ds.notes ?? '')
  const [leftovers, setLeftovers] = useState<Record<string, number>>(ds.leftovers_json ?? {})
  const [flagOpen, setFlagOpen] = useState(false)
  const [flag, setFlag] = useState(ds.flag ?? '')
  const [flagNote, setFlagNote] = useState(ds.flag_note ?? '')

  return (
    <div className={`rounded-2xl border ${ds.checked ? 'bg-green-50 border-green-200' : stop.not_delivering ? 'bg-amber-50 border-amber-200' : 'bg-card border-border'}`}>
      <div className="flex items-center gap-3 p-3">
        {/* Big circle */}
        <button
          onClick={onToggle}
          disabled={stop.not_delivering || locked}
          className={`shrink-0 w-12 h-12 rounded-full border-2 flex items-center justify-center transition-colors ${
            stop.not_delivering ? 'border-amber-300 bg-amber-100' :
            ds.checked          ? 'border-green-600 bg-green-600' :
                                  'border-gray-300 bg-white hover:bg-gray-50 active:bg-gray-100'
          } ${locked ? 'opacity-60' : ''}`}
        >
          {ds.checked && <Check className="h-6 w-6 text-white" strokeWidth={3} />}
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-foreground leading-tight truncate flex items-center gap-1.5">
            {stop.is_advertiser && (
              <span
                title="Advertiser — give them a big smile!"
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 18, height: 18, borderRadius: 4,
                  background: '#FEF3C7', color: '#92400E',
                  fontSize: 11, fontWeight: 800, flexShrink: 0,
                }}
              >★</span>
            )}
            <span className="truncate">{stop.name}</span>
          </p>
          {stop.address && (
            <p className="text-xs text-muted-foreground truncate">
              {stop.address}{stop.city ? `, ${stop.city}` : ''}
            </p>
          )}
          {/* Get directions — opens Google Maps / Apple Maps on the
              driver's phone with the address pre-filled. Critical for
              the 'walking up to a stop I've never been to' moment. */}
          {stop.address && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent([stop.address, stop.city, stop.zip].filter(Boolean).join(', '))}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 mt-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-600 text-white hover:bg-blue-700"
              style={{ textDecoration: 'none' }}
            >
              🧭 Get directions
            </a>
          )}
          {stop.quantities && Object.keys(stop.quantities).length > 0 && (
            /* Per-publication qty pills — same vocabulary as the public
               map's tier badges so single-pub markets render one chip and
               multi-pub markets (RRP+BOOM, etc.) render one per pub. The
               legacy portal used solid-fill colored pills for the same
               reason — at-a-glance hint at the moment of drop. */
            <div className="flex flex-wrap gap-1 mt-1.5">
              {Object.entries(stop.quantities)
                .filter(([, v]) => v > 0)
                .map(([k, v]) => (
                  <span
                    key={k}
                    className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 uppercase"
                  >{k} {v}</span>
                ))}
            </div>
          )}
          {stop.not_delivering && (
            <p className="text-[11px] text-amber-700 font-semibold mt-0.5">Not delivering this month</p>
          )}
          {(ds.driver_note || ds.notes || ds.flag || ds.leftovers > 0) && (
            <p className="text-[11px] text-blue-700 mt-0.5">
              {ds.flag      && <span className="mr-1.5">🚩 {ds.flag.replace(/_/g, ' ')}</span>}
              {ds.leftovers > 0 && <span className="mr-1.5">📦 {ds.leftovers} leftover</span>}
              {(ds.driver_note ?? ds.notes) && <span>📝 {(ds.driver_note ?? ds.notes ?? '').slice(0, 40)}{(ds.driver_note ?? ds.notes ?? '').length > 40 ? '…' : ''}</span>}
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
          {/* Driver note */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Note for this stop
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              onBlur={() => { if (notes !== (ds.driver_note ?? ds.notes ?? '')) onNotes(notes) }}
              rows={2}
              disabled={locked}
              placeholder="Anything to remember about this stop?"
              className="mt-1 w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Leftovers — per-publication breakdown. Only renders when this
              stop carries quantities for >= 1 publication. */}
          {pubKeys.length > 0 && (
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Package className="h-3 w-3" /> Leftover copies
              </label>
              <p className="text-[11px] text-muted-foreground mt-0.5">How many came back unused per publication?</p>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {pubKeys.map(pub => {
                  const dropAmt = stop.quantities?.[pub] ?? 0
                  return (
                    <label key={pub} className="flex items-center gap-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">{pub}</span>
                      <input
                        type="number"
                        min={0}
                        max={dropAmt}
                        value={leftovers[pub] ?? 0}
                        onChange={e => {
                          const v = Math.max(0, Math.min(dropAmt, parseInt(e.target.value || '0', 10)))
                          setLeftovers(prev => ({ ...prev, [pub]: v }))
                        }}
                        onBlur={() => onLeftovers(leftovers)}
                        disabled={locked}
                        className="w-16 rounded-md border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-gray-50"
                      />
                      <span className="text-[10px] text-muted-foreground">/ {dropAmt}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          )}

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
