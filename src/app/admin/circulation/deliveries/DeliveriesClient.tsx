'use client'

// Client component for /admin/circulation/deliveries.
// Month chip selector + stragglers banner + table + Mark paid modal.
// Mirrors admin/deliveries.php from the v3_FINAL portal source.

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
export interface DeliveryRow {
  id:               string
  driver_id:        string
  route_id:         string
  month:            string
  status:           string
  stops_completed:  number | null
  pay_calculated:   number | null
  pay_final:        number | null
  adjustment_note:  string | null
  submitted_at:     string | null
  paid_at:          string | null
  driver_name:      string
  route_name:       string
  gas_amount:       number | null
  gas_receipt_url:  string | null
  pickup_load_json: Record<string, number> | null
}

interface Props {
  month:       string
  months:      string[]
  deliveries:  DeliveryRow[]
  stragglers:  Array<{ user_id: string; full_name: string }>
}

function fmtMoney(cents: number | null): string {
  const dollars = (cents ?? 0) / 100
  return dollars.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function fmtMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}
function fmtMonthLong(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function DeliveriesClient({ month, months, deliveries, stragglers }: Props) {
  const router = useRouter()
  const [paySheet, setPaySheet] = useState<null | DeliveryRow>(null)
  const [busy, setBusy] = useState(false)

  async function reopen(id: string) {
    if (!confirm('Reopen so the driver can resubmit?')) return
    setBusy(true)
    try {
      const res = await fetch('/api/admin/circulation/deliveries', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ id, action: 'reopen' }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error ?? 'Reopen failed.')
        return
      }
      router.refresh()
    } finally { setBusy(false) }
  }

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div>
          <h1 className="ph-title">Deliveries</h1>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {/* Month selector */}
        <div className="flex gap-2 mb-4 items-center" style={{ flexWrap: 'wrap' }}>
          <span className="text-sub text-sm">Month:</span>
          {months.map(m => (
            <Link
              key={m}
              href={`/admin/circulation/deliveries?month=${m}`}
              className={`btn btn-sm ${m === month ? 'btn-primary' : 'btn-ghost'}`}
            >
              {fmtMonthLabel(m)}
            </Link>
          ))}
        </div>

        {stragglers.length > 0 && (
          <div className="alert alert-warning mb-4">
            ⚠ Not yet submitted for {fmtMonthLong(month)}: {stragglers.map(d => d.full_name).join(', ')}
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Driver</th>
                <th>Route</th>
                <th>Month</th>
                <th style={{ textAlign: 'center' }}>Stops</th>
                <th style={{ textAlign: 'right' }}>Stop pay</th>
                <th style={{ textAlign: 'right' }}>Gas</th>
                <th style={{ textAlign: 'right' }}>Total</th>
                <th>Extras</th>
                <th>Status</th>
                <th>Submitted</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {deliveries.length === 0 && (
                <tr><td colSpan={11} style={{ textAlign: 'center', padding: 32, color: 'var(--color-portal-muted)' }}>
                  No deliveries for {fmtMonthLong(month)}.
                </td></tr>
              )}
              {deliveries.map(d => {
                const badgeCls = d.status === 'submitted' ? 'badge-amber' : d.status === 'paid' ? 'badge-green' : 'badge-gray'
                const stopPay  = d.pay_final ?? d.pay_calculated ?? 0
                // gas_amount is stored as dollars (NUMERIC) — convert to
                // whatever unit stopPay is in. fmtMoney treats input as
                // cents, so we multiply gas dollars × 100 for the total.
                const gasCents = d.gas_amount != null ? Math.round(Number(d.gas_amount) * 100) : 0
                const total    = Number(stopPay) + gasCents
                const pickupSummary = d.pickup_load_json
                  ? Object.entries(d.pickup_load_json).filter(([, v]) => v > 0).map(([k, v]) => `${k.toUpperCase()} ${v}`).join(' · ')
                  : ''
                return (
                  <tr key={d.id}>
                    <td><strong>{d.driver_name}</strong></td>
                    <td className="text-sub text-sm">{d.route_name}</td>
                    <td className="mono text-sm">{d.month}</td>
                    <td className="mono" style={{ textAlign: 'center' }}>{d.stops_completed ?? 0}</td>
                    <td className="mono" style={{ textAlign: 'right' }}>
                      {fmtMoney(stopPay)}
                    </td>
                    <td className="mono" style={{ textAlign: 'right', color: gasCents > 0 ? 'var(--color-portal-text)' : 'var(--color-portal-muted)' }}>
                      {gasCents > 0 ? (
                        <>
                          {fmtMoney(gasCents)}
                          {d.gas_receipt_url && (
                            <a href={d.gas_receipt_url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 6, fontSize: 10, textDecoration: 'underline' }}>rcpt</a>
                          )}
                        </>
                      ) : '—'}
                    </td>
                    <td className="mono fw-700" style={{ textAlign: 'right', color: 'var(--color-portal-green)' }}>
                      {fmtMoney(total)}
                    </td>
                    <td className="text-sub" style={{ fontSize: 11, maxWidth: 220 }}>
                      {pickupSummary && <div>📦 Loaded {pickupSummary}</div>}
                      {d.adjustment_note && <div style={{ marginTop: 2 }}>{d.adjustment_note}</div>}
                    </td>
                    <td><span className={`badge ${badgeCls}`}>{d.status[0].toUpperCase() + d.status.slice(1)}</span></td>
                    <td className="text-muted" style={{ fontSize: 12 }}>
                      {d.submitted_at
                        ? new Date(d.submitted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
                        : '-'}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        {d.status === 'submitted' && (
                          <button type="button" onClick={() => setPaySheet(d)} className="btn btn-green btn-xs">
                            Mark paid
                          </button>
                        )}
                        {(d.status === 'submitted' || d.status === 'paid') && (
                          <button type="button" onClick={() => reopen(d.id)} disabled={busy} className="btn btn-ghost btn-xs">
                            Reopen
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {paySheet && (
        <PaySheet
          delivery={paySheet}
          onClose={() => setPaySheet(null)}
          onSaved={() => { setPaySheet(null); router.refresh() }}
        />
      )}
    </div>
  )
}

function PaySheet({ delivery, onClose, onSaved }: { delivery: DeliveryRow; onClose: () => void; onSaved: () => void }) {
  const calc = (delivery.pay_calculated ?? 0) / 100
  const [amount, setAmount] = useState<number>(calc)
  const [note,   setNote]   = useState('')
  const [busy,   setBusy]   = useState(false)
  const [err,    setErr]    = useState<string | null>(null)

  async function submit() {
    setBusy(true)
    setErr(null)
    try {
      const cents = Math.round(amount * 100)
      const requiresNote = cents !== (delivery.pay_calculated ?? 0)
      if (requiresNote && !note.trim()) {
        setErr('Adjustment note required when amount differs from the calculated value.')
        setBusy(false); return
      }
      const res = await fetch('/api/admin/circulation/deliveries', {
        method:  'PATCH',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({
          id: delivery.id,
          action: 'mark-paid',
          pay_final: cents,
          adjustment_note: note.trim() || null,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(j.error ?? 'Save failed.'); return }
      onSaved()
    } finally { setBusy(false) }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="portal-app"
        style={{
          background: 'white', borderRadius: 14, padding: 24,
          width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,.2)',
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Mark as paid</h3>
        <p style={{ fontSize: 13, color: 'var(--color-portal-sub)', marginBottom: 16 }}>
          {delivery.driver_name} · {delivery.stops_completed ?? 0} stops · Calculated: ${calc.toFixed(2)}
        </p>
        <div className="fg">
          <label>Payout amount</label>
          <input
            type="number"
            step={0.01}
            min={0}
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            style={{ fontSize: 20, fontWeight: 700, color: '#16A34A' }}
            autoFocus
          />
          <div className="hint">Change this if you need to adjust the auto-calculated amount.</div>
        </div>
        <div className="fg">
          <label>Adjustment note <span style={{ fontWeight: 400, color: 'var(--color-portal-sub)' }}>(required if amount changed)</span></label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ height: 70 }}
            placeholder="e.g. Bonus for covering extra stops, deducted 2 stops not delivered…"
          />
        </div>
        {err && <p className="text-sm" style={{ color: 'var(--color-portal-red)' }}>{err}</p>}
        <div className="flex gap-2" style={{ marginTop: 8 }}>
          <button type="button" onClick={submit} disabled={busy} className="btn btn-primary" style={{ flex: 1 }}>
            {busy ? 'Saving…' : 'Confirm payment'}
          </button>
          <button type="button" onClick={onClose} className="btn btn-ghost">Cancel</button>
        </div>
      </div>
    </div>
  )
}
