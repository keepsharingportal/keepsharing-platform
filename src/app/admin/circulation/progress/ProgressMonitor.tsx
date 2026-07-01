'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Check, MapPin, Package, MessageSquare, ChevronRight, RefreshCw, PauseCircle, PlayCircle, Edit3, X as XIcon } from 'lucide-react'

export interface DeliveryProgressRow {
  id:               string
  driver_name:      string
  route_name:       string
  status:           string
  total:            number
  done:             number
  leftovers:        number
  stops_completed:  number
  pay_calculated:   number
  pay_final:        number | null
  submitted_at:     string | null
  paid_at:          string | null
  month:            string
  gas_amount:       number | null
  gas_receipt_url:  string | null
  pickup_load_json: Record<string, number> | null
}

interface FocusStop {
  id:             string
  stop_id?:       string          // circulation_stops.id (distinct from delivery_stops.id which is `id`)
  name:           string
  address:        string | null
  city:           string | null
  zip?:           string | null
  quantities?:    Record<string, number> | null
  notes?:         string | null
  sort_order:     number
  is_pickup:      boolean
  not_delivering: boolean
  checked:        boolean
  checked_at:     string | null
  driver_note:    string | null
  leftovers:      number
  leftovers_json: Record<string, number> | null
  photo_urls:     string[]
}

interface Props {
  rows:        DeliveryProgressRow[]
  months:      string[]
  activeMonth: string
  focusDetail: { delivery: DeliveryProgressRow; stops: FocusStop[] } | null
}

const STATUS_COLOR: Record<string, string> = {
  draft:     'bg-portal-row-hover text-portal-text',
  submitted: 'bg-portal-blue-lt text-portal-blue',
  reviewed:  'bg-portal-blue-lt text-portal-blue',
  paid:      'bg-portal-green-lt text-portal-green',
}

function fmtShortMonth(m: string): string {
  const d = new Date(m + '-01T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

// Translate raw delivery.status + progress into a human label for the
// main Live Progress list. 'DRAFT' is meaningless to non-devs; we want
// 'Not started' / 'In progress' instead.
function friendlyStatus(status: string, done: number): { label: string; badgeClass: string } {
  if (status === 'paid')      return { label: 'Paid',        badgeClass: 'bg-portal-green-lt text-portal-green' }
  if (status === 'submitted' || status === 'reviewed') return { label: 'Submitted', badgeClass: 'bg-portal-blue-lt text-portal-blue' }
  // draft (or anything else): differentiate by progress
  if (done > 0)               return { label: 'In progress', badgeClass: 'bg-portal-blue-lt text-portal-blue' }
  return                             { label: 'Not started', badgeClass: 'bg-portal-row-hover text-portal-sub' }
}

export function ProgressMonitor({ rows, months, activeMonth, focusDetail }: Props) {
  const router = useRouter()
  const params = useSearchParams()

  // ── 30-second auto-refresh ─────────────────────────────────────────────
  // Live monitoring is the WHOLE point of this page — when a driver
  // taps a stop in the field, ops watching here should see it tick up
  // within the cadence ops can tolerate. router.refresh() re-runs the
  // server component without losing scroll position. Toggleable so a
  // distracted ops manager doesn't burn bandwidth on a forgotten tab.
  const [autoRefresh, setAutoRefresh]   = useState(true)
  const [lastRefresh, setLastRefresh]   = useState<Date>(() => new Date())
  const [editStopId, setEditStopId]     = useState<string | null>(null)
  useEffect(() => {
    if (!autoRefresh) return
    // 2-minute refresh cadence — matches the driver's real check-off
    // pace better than the old 30-second thrash (which was more UI churn
    // than progress info).
    const t = setInterval(() => {
      router.refresh()
      setLastRefresh(new Date())
    }, 120_000)
    return () => clearInterval(t)
  }, [autoRefresh, router])

  function gotoMonth(m: string) {
    const q = new URLSearchParams(params)
    q.set('month', m)
    q.delete('delivery')
    router.push(`/admin/circulation/progress?${q.toString()}`)
  }

  function gotoDelivery(id: string) {
    const q = new URLSearchParams(params)
    q.set('delivery', id)
    router.push(`/admin/circulation/progress?${q.toString()}`)
  }

  function backToList() {
    const q = new URLSearchParams(params)
    q.delete('delivery')
    router.push(`/admin/circulation/progress?${q.toString()}`)
  }

  if (focusDetail) {
    const d = focusDetail.delivery
    const pct = d.total > 0 ? Math.round(d.done / d.total * 100) : 0
    return (
      <div className="space-y-4">
        <button onClick={backToList} className="text-xs text-portal-blue hover:underline inline-flex items-center gap-1">
          ← Back to month
        </button>

        <div className="rounded-lg border border-portal-border bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-portal-sub uppercase font-bold tracking-wider">Progress</p>
              <p className="text-2xl font-bold text-portal-text">
                {d.done} <span className="text-base font-normal text-portal-sub">of {d.total} stops</span>
              </p>
            </div>
            <p className={`text-3xl font-bold ${pct === 100 ? 'text-portal-green' : pct > 0 ? 'text-portal-blue' : 'text-portal-muted'}`}>
              {pct}%
            </p>
          </div>
          <div className="h-2 bg-portal-row-hover rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${pct === 100 ? 'bg-portal-green' : 'bg-portal-blue'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-3 flex items-center gap-3 text-xs text-portal-sub flex-wrap">
            <span><span className="font-bold text-portal-text">{d.driver_name}</span> · {d.route_name}</span>
            {(() => {
              const f = friendlyStatus(d.status, d.done)
              return (
                <span className={`inline-block rounded-full text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${f.badgeClass}`}>
                  {f.label}
                </span>
              )
            })()}
            {d.submitted_at && <span>Submitted {new Date(d.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
            {d.leftovers > 0 && <span className="inline-flex items-center gap-1 text-portal-amber font-semibold"><Package size={11} /> {d.leftovers} leftover</span>}
            {d.gas_amount != null && d.gas_amount > 0 && (
              <span className="inline-flex items-center gap-1 text-portal-blue font-semibold">
                ⛽ {fmtMoney(d.gas_amount)} gas
                {d.gas_receipt_url && (
                  <a href={d.gas_receipt_url} target="_blank" rel="noopener noreferrer" className="ml-1 text-portal-blue hover:underline">receipt →</a>
                )}
              </span>
            )}
            {d.pickup_load_json && Object.keys(d.pickup_load_json).length > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold">
                📦 Loaded {Object.entries(d.pickup_load_json).filter(([, v]) => v > 0).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ')}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-portal-border bg-white overflow-hidden">
          <p className="px-4 py-3 text-sm font-bold text-portal-text border-b border-portal-border">Every stop</p>
          <ul className="divide-y divide-portal-border">
            {focusDetail.stops.map((s, idx) => {
              const number = s.is_pickup ? 'P' : (idx + (focusDetail.stops.findIndex(x => !x.is_pickup) >= 0 ? 0 : 1))
              const bg = s.checked ? 'bg-portal-green-lt' : s.not_delivering ? 'bg-portal-red-lt' : ''
              return (
                <li key={s.id} className={`px-4 py-3 flex items-center gap-3 ${bg}`}>
                  <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    s.checked    ? 'bg-portal-green text-white' :
                    s.is_pickup  ? 'bg-portal-blue text-white'    :
                                   'bg-white border-2 border-portal-border-2 text-portal-muted'
                  }`}>
                    {s.checked ? <Check size={12} strokeWidth={3} /> : s.is_pickup ? 'P' : number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold ${s.checked ? 'text-portal-sub line-through' : 'text-portal-text'}`}>
                      {s.stop_id ? (
                        <Link href={`/admin/circulation/stops/${s.stop_id}`} className="hover:underline" style={{ color: 'inherit' }}>
                          {s.name}
                        </Link>
                      ) : s.name}
                      {s.not_delivering && <span className="ml-2 text-[10px] text-portal-red">(not delivering)</span>}
                    </p>
                    {s.address && <p className="text-[11px] text-portal-sub">{s.address}{s.city ? `, ${s.city}` : ''}</p>}
                    {s.driver_note && (
                      <p className="text-[11px] text-portal-amber mt-0.5 inline-flex items-center gap-1">
                        <MessageSquare size={10} /> {s.driver_note}
                      </p>
                    )}
                    {s.leftovers > 0 && (
                      <p className="text-[11px] text-portal-amber mt-0.5 inline-flex items-center gap-1">
                        <Package size={10} /> Leftover: {s.leftovers_json
                          ? Object.entries(s.leftovers_json).filter(([, v]) => v > 0).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(', ')
                          : `${s.leftovers} copies`}
                      </p>
                    )}
                    {(s.photo_urls?.length ?? 0) > 0 && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {s.photo_urls.map(url => (
                          <a key={url} href={url} target="_blank" rel="noopener noreferrer" title="Open full size">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="POD" style={{ width: 132, height: 132, objectFit: 'cover', borderRadius: 6, border: '1px solid #E2E8F0' }} />
                          </a>
                        ))}
                      </div>
                    )}

                    {s.stop_id && editStopId === s.stop_id && (
                      <EditStopPanel
                        stopId={s.stop_id}
                        initial={{
                          name:       s.name,
                          address:    s.address,
                          city:       s.city,
                          zip:        s.zip ?? null,
                          notes:      s.notes ?? null,
                          quantities: s.quantities ?? null,
                        }}
                        onClose={() => setEditStopId(null)}
                        onSaved={() => { setEditStopId(null); router.refresh() }}
                      />
                    )}
                  </div>
                  <div className="shrink-0 flex flex-col items-end gap-1">
                    {s.checked && s.checked_at && (
                      <span className="text-[10px] text-portal-green font-semibold">
                        {new Date(s.checked_at).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </span>
                    )}
                    {s.stop_id && !s.is_pickup && (
                      <button
                        type="button"
                        onClick={() => setEditStopId(editStopId === s.stop_id ? null : (s.stop_id ?? null))}
                        className="text-[10px] text-portal-blue hover:underline inline-flex items-center gap-1"
                        title="Edit this stop"
                      >
                        <Edit3 size={10} /> {editStopId === s.stop_id ? 'Cancel' : 'Edit'}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Auto-refresh toggle. Defaults ON because that's the page's whole
          job; ops can pause it when stepping away. */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button
          onClick={() => { router.refresh(); setLastRefresh(new Date()) }}
          className="text-xs px-2.5 py-1 rounded-full font-semibold border bg-white border-portal-border text-portal-text hover:border-portal-border-2 inline-flex items-center gap-1.5"
          title="Refresh now"
        >
          <RefreshCw size={11} /> Refresh
        </button>
        <div className="text-[11px] text-portal-sub inline-flex items-center gap-2">
          <span>Last updated {lastRefresh.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' })}</span>
          <button
            onClick={() => setAutoRefresh(a => !a)}
            className="inline-flex items-center gap-1 text-portal-blue hover:underline"
            title={autoRefresh ? 'Pause 30-second auto-refresh' : 'Resume 30-second auto-refresh'}
          >
            {autoRefresh ? <><PauseCircle size={11} /> Auto-refresh on</> : <><PlayCircle size={11} /> Auto-refresh off</>}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-xs text-portal-sub mr-1">Month:</span>
        {months.length === 0 && <span className="text-xs text-portal-muted italic">No deliveries yet</span>}
        {months.map(m => (
          <button
            key={m}
            onClick={() => gotoMonth(m)}
            className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${m === activeMonth ? 'bg-portal-navy text-white border-portal-blue' : 'bg-white border-portal-border text-portal-text hover:border-portal-border-2'}`}
          >
            {fmtShortMonth(m)}
          </button>
        ))}
        {!months.includes(activeMonth) && (
          <button
            onClick={() => gotoMonth(activeMonth)}
            className="text-xs px-2.5 py-1 rounded-full font-semibold border bg-portal-navy text-white border-portal-blue"
          >
            {fmtShortMonth(activeMonth)}
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-portal-border p-8 text-center bg-white">
          <p className="text-sm text-portal-sub">No deliveries on file for this month.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map(r => {
            const pct = r.total > 0 ? Math.round(r.done / r.total * 100) : 0
            const friendly = friendlyStatus(r.status, r.done)
            return (
              <li key={r.id}>
                <button
                  onClick={() => gotoDelivery(r.id)}
                  className="w-full text-left rounded-lg border border-portal-border bg-white p-3 hover:border-portal-border-2 hover:shadow-sm transition-all"
                  style={{ cursor: 'pointer' }}
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-portal-text truncate">{r.driver_name}</p>
                      <p className="text-[11px] text-portal-sub truncate">
                        {r.route_name}
                        <span className={`ml-2 inline-block rounded-full text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 ${friendly.badgeClass}`}>
                          {friendly.label}
                        </span>
                      </p>
                    </div>
                    <div className="shrink-0 flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-portal-text">{r.done}<span className="text-xs font-normal text-portal-sub">/{r.total}</span></p>
                        <p className="text-[10px] text-portal-muted uppercase tracking-wider">stops</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${pct === 100 ? 'text-portal-green' : pct > 0 ? 'text-portal-blue' : 'text-portal-muted'}`}>{pct}%</p>
                        {r.pay_final != null
                          ? <p className="text-[10px] text-portal-green font-semibold">{fmtMoney(r.pay_final)}</p>
                          : <p className="text-[10px] text-portal-muted">{fmtMoney(r.pay_calculated)}</p>}
                      </div>
                      <ChevronRight size={14} className="text-portal-border-2 shrink-0" />
                    </div>
                  </div>
                  <div className="h-1.5 bg-portal-row-hover rounded-full overflow-hidden">
                    <div
                      className={`h-full ${pct === 100 ? 'bg-portal-green' : 'bg-portal-blue'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {r.leftovers > 0 && (
                    <p className="mt-2 text-[11px] text-portal-amber inline-flex items-center gap-1">
                      <Package size={10} /> {r.leftovers} total leftover this run
                    </p>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

// ── Edit stop panel ────────────────────────────────────────────────────
// Inline form under the stop row on the delivery detail view. Lets ops
// fix name / address / quantities without leaving Live Progress.
function EditStopPanel({
  stopId, initial, onClose, onSaved,
}: {
  stopId:  string
  initial: {
    name:       string
    address:    string | null
    city:       string | null
    zip:        string | null
    notes:      string | null
    quantities: Record<string, number> | null
  }
  onClose: () => void
  onSaved: () => void
}) {
  const [name,       setName]       = useState(initial.name ?? '')
  const [address,    setAddress]    = useState(initial.address ?? '')
  const [city,       setCity]       = useState(initial.city ?? '')
  const [zip,        setZip]        = useState(initial.zip ?? '')
  const [notes,      setNotes]      = useState(initial.notes ?? '')
  const [quantities, setQuantities] = useState<Record<string, number>>(initial.quantities ?? {})
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  const pubKeys = Object.keys(quantities).length > 0
    ? Object.keys(quantities).sort()
    : ['rrp', 'boom']

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/stops', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({
          id:         stopId,
          name:       name.trim() || null,
          address:    address.trim() || null,
          city:       city.trim() || null,
          zip:        zip.trim() || null,
          notes:      notes.trim() || null,
          quantities: Object.fromEntries(Object.entries(quantities).filter(([, v]) => v > 0)),
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(j.error ?? 'Save failed.'); return }
      onSaved()
    } finally { setBusy(false) }
  }

  return (
    <div style={{
      marginTop: 12, padding: 12,
      background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#64748B' }}>
          Edit stop
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }} title="Close">
          <XIcon size={14} />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={smLabelStyle}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={smInputStyle} />
        </div>
        <div>
          <label style={smLabelStyle}>Zip</label>
          <input value={zip} onChange={e => setZip(e.target.value)} style={smInputStyle} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 8 }}>
        <div>
          <label style={smLabelStyle}>Address</label>
          <input value={address} onChange={e => setAddress(e.target.value)} style={smInputStyle} />
        </div>
        <div>
          <label style={smLabelStyle}>City</label>
          <input value={city} onChange={e => setCity(e.target.value)} style={smInputStyle} />
        </div>
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={smLabelStyle}>Copies per publication</label>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
          {pubKeys.map(pub => (
            <label key={pub} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#1E293B' }}>
              <span style={{ fontWeight: 700, fontFamily: '"DM Mono", ui-monospace, monospace' }}>{pub.toUpperCase()}</span>
              <input
                type="number" min={0} inputMode="numeric"
                value={quantities[pub] || ''}
                onChange={e => setQuantities({ ...quantities, [pub]: Math.max(0, parseInt(e.target.value || '0', 10)) })}
                style={{ width: 70, padding: '6px 8px', border: '1.5px solid #E2E8F0', borderRadius: 6, fontSize: 13 }}
              />
            </label>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={smLabelStyle}>Stop notes (shown to driver)</label>
        <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Ask for Bob at the counter" style={smInputStyle} />
      </div>

      {err && <p style={{ fontSize: 12, color: '#DC2626', marginBottom: 8 }}>{err}</p>}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={save} disabled={busy}
          className="btn btn-primary btn-sm"
          style={{ cursor: busy ? 'default' : 'pointer' }}
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
        <button onClick={onClose} className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
    </div>
  )
}

const smLabelStyle: React.CSSProperties = {
  display: 'block', fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '.3px', color: '#64748B', marginBottom: 4,
}
const smInputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 10px', border: '1.5px solid #E2E8F0',
  borderRadius: 6, fontSize: 13, fontFamily: 'inherit',
}
