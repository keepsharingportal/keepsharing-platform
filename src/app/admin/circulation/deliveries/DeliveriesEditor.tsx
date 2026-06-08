'use client'

// Deliveries admin — month filter + invoice table + mark-paid flow.

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, Check, X, RotateCcw, DollarSign, AlertTriangle } from 'lucide-react'

export interface DeliveryRow {
  id:                   string
  route_id:             string
  driver_id:            string
  month:                string
  status:               string  // draft | submitted | reviewed | paid
  stops_completed:      number
  pay_calculated:       number
  pay_final:            number | null
  adjustment_note:      string | null
  driver_notes:         string | null
  submitted_at:         string | null
  reviewed_at:          string | null
  paid_at:              string | null
  circulation_routes?:  { name: string } | null
  circulation_drivers?: { full_name: string; email: string; rate_per_stop: number } | null
}

interface Props {
  initialDeliveries: DeliveryRow[]
  stragglers:        Array<{ user_id: string; full_name: string }>
  months:            string[]
  activeMonth:       string
}

function fmtMonth(m: string): string {
  if (!m) return ''
  const d = new Date(m + '-01T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}
function fmtShortMonth(m: string): string {
  const d = new Date(m + '-01T12:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
function fmtMoney(n: number | null | undefined): string {
  if (n == null) return '—'
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
}

const STATUS_BADGE: Record<string, string> = {
  draft:     'bg-portal-row-hover text-portal-text',
  submitted: 'bg-portal-blue-lt text-portal-blue',
  reviewed:  'bg-portal-blue-lt text-portal-blue',
  paid:      'bg-portal-green-lt text-portal-green',
}

export function DeliveriesEditor({ initialDeliveries, stragglers, months, activeMonth }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const [rows, setRows] = useState<DeliveryRow[]>(initialDeliveries)
  const [editing, setEditing] = useState<string | null>(null)

  function patchLocal(id: string, fields: Partial<DeliveryRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...fields } : r))
  }

  async function action(id: string, body: Record<string, unknown>) {
    const res = await fetch('/api/admin/circulation/deliveries', {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ id, ...body }),
    })
    if (!res.ok) {
      const j = await res.json().catch(() => ({})) as { error?: string }
      alert(j.error ?? 'Action failed')
      return false
    }
    router.refresh()
    return true
  }

  function gotoMonth(m: string) {
    const q = new URLSearchParams(params)
    q.set('month', m)
    router.push(`/admin/circulation/deliveries?${q.toString()}`)
  }

  return (
    <div className="space-y-4">

      {/* Month filter */}
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

      {/* Stragglers */}
      {stragglers.length > 0 && (
        <div className="rounded-lg border border-portal-amber/30 bg-portal-amber-lt p-3 text-sm text-portal-amber flex items-start gap-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Not yet submitted for {fmtMonth(activeMonth)}</p>
            <p className="text-xs">{stragglers.map(s => s.full_name).join(', ')}</p>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-portal-border p-8 text-center bg-white">
          <p className="text-sm text-portal-sub">No deliveries on file for {fmtMonth(activeMonth)} yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map(row => (
            <li key={row.id} className={`rounded-lg border bg-white p-3 ${row.status === 'paid' ? 'border-portal-green/30' : row.status === 'draft' ? 'border-portal-border' : 'border-portal-blue/30'}`}>

              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-portal-text truncate">{row.circulation_drivers?.full_name ?? '(unknown driver)'}</p>
                    <span className="text-[10px] text-portal-muted">·</span>
                    <p className="text-sm text-portal-text truncate">{row.circulation_routes?.name ?? '(route)'}</p>
                    <span className={`inline-block rounded-full text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 ${STATUS_BADGE[row.status] ?? 'bg-portal-row-hover text-portal-text'}`}>
                      {row.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-portal-sub mt-0.5">
                    {row.stops_completed} stop{row.stops_completed === 1 ? '' : 's'}
                    {' · '}
                    Calc {fmtMoney(row.pay_calculated)}
                    {row.pay_final != null && row.pay_final !== row.pay_calculated && (
                      <> {' · '} <span className="font-semibold text-portal-green">Final {fmtMoney(row.pay_final)}</span></>
                    )}
                    {row.submitted_at && <> {' · '} Submitted {new Date(row.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</>}
                    {row.paid_at && <> {' · '} Paid {new Date(row.paid_at).toLocaleDateString()}</>}
                  </p>
                  {row.driver_notes && (
                    <p className="text-[11px] text-portal-text mt-1 italic">📝 {row.driver_notes}</p>
                  )}
                  {row.adjustment_note && (
                    <p className="text-[11px] text-portal-amber mt-0.5">⚖ {row.adjustment_note}</p>
                  )}
                </div>

                <div className="shrink-0 flex flex-col gap-1.5">
                  {row.status === 'submitted' && (
                    <>
                      <button
                        onClick={() => setEditing(editing === row.id ? null : row.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-portal-green text-white hover:bg-portal-green"
                      >
                        <DollarSign size={11} /> Mark Paid
                      </button>
                      <button
                        onClick={() => action(row.id, { action: 'reopen' })}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-portal-border text-portal-text hover:bg-portal-bg"
                      >
                        <RotateCcw size={11} /> Reopen
                      </button>
                    </>
                  )}
                  {row.status === 'paid' && (
                    <button
                      onClick={() => action(row.id, { action: 'reopen' })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-portal-amber/30 text-portal-amber hover:bg-portal-amber-lt"
                    >
                      <RotateCcw size={11} /> Reopen
                    </button>
                  )}
                  {row.status === 'draft' && (
                    <span className="text-[11px] text-portal-muted italic px-2">In progress</span>
                  )}
                </div>
              </div>

              {editing === row.id && (
                <PayForm
                  delivery={row}
                  onCancel={() => setEditing(null)}
                  onSaved={(payFinal, note) => {
                    patchLocal(row.id, { status: 'paid', pay_final: payFinal, adjustment_note: note, paid_at: new Date().toISOString() })
                    setEditing(null)
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Pay form ─────────────────────────────────────────────────────────────────

function PayForm({ delivery, onCancel, onSaved }: {
  delivery: DeliveryRow
  onCancel: () => void
  onSaved:  (payFinal: number, note: string | null) => void
}) {
  const [final, setFinal] = useState<string>((delivery.pay_calculated ?? 0).toFixed(2))
  const [note,  setNote]  = useState<string>('')
  const [busy,  setBusy]  = useState(false)
  const [err,   setErr]   = useState<string | null>(null)

  async function save() {
    setBusy(true)
    setErr(null)
    try {
      const payFinal = parseFloat(final || '0')
      const res = await fetch('/api/admin/circulation/deliveries', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          id:              delivery.id,
          action:          'mark-paid',
          pay_final:       payFinal,
          adjustment_note: note.trim() || null,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(j.error ?? 'Save failed')
      }
      onSaved(payFinal, note.trim() || null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-portal-border grid grid-cols-1 sm:grid-cols-3 gap-3">
      <label className="block">
        <span className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">Final pay ($)</span>
        <input
          value={final}
          onChange={e => setFinal(e.target.value)}
          inputMode="decimal"
          className="mt-0.5 w-full rounded-md border border-portal-border-2 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
        />
      </label>
      <label className="block sm:col-span-2">
        <span className="text-[11px] font-bold uppercase tracking-wider text-portal-sub">Adjustment note (optional)</span>
        <input
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Fuel bonus, partial pay, etc."
          className="mt-0.5 w-full rounded-md border border-portal-border-2 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
        />
      </label>
      {err && <p className="text-xs text-portal-red sm:col-span-3">{err}</p>}
      <div className="sm:col-span-3 flex items-center gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-green text-white rounded-md hover:bg-portal-green disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
          {busy ? 'Saving…' : 'Confirm Paid'}
        </button>
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-portal-sub hover:bg-portal-row-hover rounded-md"
        >
          <X size={12} /> Cancel
        </button>
      </div>
    </div>
  )
}
