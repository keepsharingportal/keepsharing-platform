'use client'

// Edit Route — drag-drop reorder + add new stops.
//
// Renamed from "Suggest route order" per driver request. Drivers now
// can drop new stops into the sequence anywhere they like. Everything
// (reorder + new stops) is sent as ONE suggestion for admin approval.
//
// The `stop_order` array holds either real stop UUIDs (existing stops)
// OR temp UUIDs prefixed with "temp-" for new stops. The `new_stops[]`
// array carries the metadata for each temp entry. On approval the admin
// endpoint creates each new stop, gets a real UUID, substitutes it in
// stop_order, then applies the reorder.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface StopLite {
  id: string
  sort_order: number
  name: string
  address: string | null
  city: string | null
  is_pickup: boolean
  not_delivering: boolean
}

interface DraftStop {
  id:         string        // temp-{uuid}
  isNew:      true
  name:       string
  address:    string
  city:       string
  zip:        string
  notes:      string
  quantities: Record<string, number>
}

interface Props {
  routeId:    string
  market:     string
  pickup:     StopLite | null
  draggable:  StopLite[]
  pubKeys?:   string[]      // publication short_names sourced from existing stops
}

type OrderItem =
  | { kind: 'existing'; stop: StopLite }
  | { kind: 'new';      stop: DraftStop }

function tempId(): string {
  return 'temp-' + Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
}

export function DriverReorderClient({ routeId, market, pickup, draggable, pubKeys = [] }: Props) {
  const router = useRouter()
  const [order, setOrder] = useState<OrderItem[]>(
    draggable.map(s => ({ kind: 'existing', stop: s }) as OrderItem)
  )
  const [note,     setNote]     = useState('')
  const [busy,     setBusy]     = useState(false)
  const [err,      setErr]      = useState<string | null>(null)
  const [addOpen,  setAddOpen]  = useState(false)

  // Draft state for the "Add new stop" form
  const [draftName,    setDraftName]    = useState('')
  const [draftAddress, setDraftAddress] = useState('')
  const [draftCity,    setDraftCity]    = useState('')
  const [draftZip,     setDraftZip]     = useState('')
  const [draftNotes,   setDraftNotes]   = useState('')
  const [draftQty,     setDraftQty]     = useState<Record<string, number>>({})
  const [draftInsert,  setDraftInsert]  = useState<number>(order.length)

  function resetDraft() {
    setDraftName(''); setDraftAddress(''); setDraftCity(''); setDraftZip('')
    setDraftNotes(''); setDraftQty({}); setDraftInsert(order.length)
  }

  function addDraftStop() {
    if (!draftName.trim()) { alert('Stop name is required.'); return }
    const draft: DraftStop = {
      id:         tempId(),
      isNew:      true,
      name:       draftName.trim(),
      address:    draftAddress.trim(),
      city:       draftCity.trim(),
      zip:        draftZip.trim(),
      notes:      draftNotes.trim(),
      quantities: Object.fromEntries(Object.entries(draftQty).filter(([, v]) => v > 0)),
    }
    const next = order.slice()
    const pos = Math.max(0, Math.min(draftInsert, next.length))
    next.splice(pos, 0, { kind: 'new', stop: draft })
    setOrder(next)
    setAddOpen(false)
    resetDraft()
  }

  function removeItem(id: string) {
    setOrder(order.filter(o => o.stop.id !== id))
  }

  // ── Drag & drop ────────────────────────────────────────────────────
  function handleDragStart(e: React.DragEvent, id: string) {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }
  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }
  function handleDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    const srcId = e.dataTransfer.getData('text/plain')
    if (!srcId || srcId === targetId) return
    const src = order.find(o => o.stop.id === srcId)
    if (!src) return
    const next = order.filter(o => o.stop.id !== srcId)
    const dstIdx = next.findIndex(o => o.stop.id === targetId)
    next.splice(Math.max(0, dstIdx), 0, src)
    setOrder(next)
  }

  async function submit() {
    setBusy(true)
    setErr(null)
    try {
      const stop_order = order.map(o => o.stop.id)
      const new_stops = order
        .filter((o): o is Extract<OrderItem, { kind: 'new' }> => o.kind === 'new')
        .map(o => ({
          temp_id:    o.stop.id,
          name:       o.stop.name,
          address:    o.stop.address || undefined,
          city:       o.stop.city    || undefined,
          zip:        o.stop.zip     || undefined,
          notes:      o.stop.notes   || undefined,
          quantities: o.stop.quantities,
        }))

      const res = await fetch('/api/circulation/driver', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({
          action:           'suggest-route-order',
          route_id:         routeId,
          stop_order,
          new_stops,
          suggestion_note:  note.trim() || null,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(j.error ?? 'Submit failed.'); return }
      router.push(`/distribution/${market}/driver/dashboard`)
    } finally { setBusy(false) }
  }

  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-title mb-2">Drag stops · add new ones · send for approval</div>
        <p className="text-sub text-sm mb-4" style={{ lineHeight: 1.6 }}>
          Reorder existing stops by dragging. Tap <strong>+ Add stop</strong> to propose a new location and pick where it should sit.
          Everything goes to Jason for approval before your delivery route updates. Publications Plus stays first.
        </p>

        {pickup && (
          <div style={{
            background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 10,
            padding: '12px 16px', marginBottom: 12,
            display: 'flex', alignItems: 'center', gap: 10,
            fontSize: 14, fontWeight: 600, color: '#1A5FA8',
          }}>
            📦 {pickup.name}
            <span style={{ fontSize: 11, color: '#93C5FD', marginLeft: 'auto' }}>Always first</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
          {order.map((item, i) => {
            const isNew = item.kind === 'new'
            const s = item.stop
            return (
              <div
                key={s.id}
                draggable
                onDragStart={e => handleDragStart(e, s.id)}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, s.id)}
                style={{
                  background: isNew ? '#EFF6FF' : 'white',
                  border: `1.5px solid ${isNew ? '#93C5FD' : 'var(--color-portal-border)'}`,
                  borderRadius: 10, padding: '12px 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                  cursor: 'grab', userSelect: 'none', touchAction: 'none',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#CBD5E1" style={{ flexShrink: 0 }}>
                  <circle cx="9"  cy="5"  r="1.5" />
                  <circle cx="15" cy="5"  r="1.5" />
                  <circle cx="9"  cy="12" r="1.5" />
                  <circle cx="15" cy="12" r="1.5" />
                  <circle cx="9"  cy="19" r="1.5" />
                  <circle cx="15" cy="19" r="1.5" />
                </svg>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: 'var(--color-portal-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700, color: 'var(--color-portal-sub)',
                  flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {isNew ? (s as DraftStop).name : (s as StopLite).name}
                    {isNew && (
                      <span style={{ fontSize: 9, fontWeight: 700, background: '#1A5FA8', color: 'white', padding: '1px 6px', borderRadius: 8, marginLeft: 6, verticalAlign: 'middle', letterSpacing: '.3px' }}>
                        NEW
                      </span>
                    )}
                  </div>
                  {(isNew ? (s as DraftStop).address : (s as StopLite).address) && (
                    <div style={{ fontSize: 12, color: 'var(--color-portal-sub)' }}>
                      {isNew ? (s as DraftStop).address : (s as StopLite).address}
                      {(isNew ? (s as DraftStop).city : (s as StopLite).city) && `, ${isNew ? (s as DraftStop).city : (s as StopLite).city}`}
                    </div>
                  )}
                </div>
                {isNew && (
                  <button
                    type="button"
                    onClick={() => removeItem(s.id)}
                    style={{
                      background: 'transparent', border: 'none', color: '#DC2626',
                      cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4,
                    }}
                    title="Remove this new stop"
                    aria-label="Remove"
                  >×</button>
                )}
              </div>
            )
          })}
        </div>

        {!addOpen ? (
          <button
            type="button"
            onClick={() => { resetDraft(); setDraftInsert(order.length); setAddOpen(true) }}
            className="btn btn-ghost"
            style={{
              width: '100%', border: '1.5px dashed #CBD5E1',
              marginBottom: 16, padding: 12, fontSize: 14, fontWeight: 600,
              color: '#1A5FA8', background: '#F8FAFC',
            }}
          >
            + Add stop
          </button>
        ) : (
          <div style={{
            background: '#F8FAFC', border: '1.5px solid #CBD5E1',
            borderRadius: 10, padding: 14, marginBottom: 16,
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1E293B', marginBottom: 10 }}>
              New stop
            </div>

            <div className="fg" style={{ marginBottom: 10 }}>
              <label>Stop name *</label>
              <input value={draftName} onChange={e => setDraftName(e.target.value)} placeholder="e.g. Ace Hardware" autoFocus />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 8, marginBottom: 10 }}>
              <div className="fg">
                <label>Address</label>
                <input value={draftAddress} onChange={e => setDraftAddress(e.target.value)} placeholder="123 Main St" />
              </div>
              <div className="fg">
                <label>Zip</label>
                <input value={draftZip} onChange={e => setDraftZip(e.target.value)} placeholder="36054" />
              </div>
            </div>

            <div className="fg" style={{ marginBottom: 10 }}>
              <label>City</label>
              <input value={draftCity} onChange={e => setDraftCity(e.target.value)} placeholder="Millbrook" />
            </div>

            {pubKeys.length > 0 && (
              <div className="fg" style={{ marginBottom: 10 }}>
                <label>Copies per publication (rough estimate)</label>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 6 }}>
                  {pubKeys.map(pub => (
                    <label key={pub} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#1E293B' }}>
                      <span style={{ fontWeight: 700, fontFamily: '"DM Mono", ui-monospace, monospace' }}>{pub.toUpperCase()}</span>
                      <input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={draftQty[pub] ?? 0}
                        onChange={e => setDraftQty({
                          ...draftQty,
                          [pub]: Math.max(0, parseInt(e.target.value || '0', 10)),
                        })}
                        style={{ width: 70, padding: '6px 8px', border: '1.5px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }}
                      />
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="fg" style={{ marginBottom: 10 }}>
              <label>Notes (optional)</label>
              <textarea
                value={draftNotes}
                onChange={e => setDraftNotes(e.target.value)}
                rows={2}
                placeholder="e.g. Ask for Bob at the counter"
                style={{ height: 60 }}
              />
            </div>

            <div className="fg" style={{ marginBottom: 12 }}>
              <label>Insert at position</label>
              <select value={draftInsert} onChange={e => setDraftInsert(parseInt(e.target.value, 10))}>
                <option value={0}>Beginning of route</option>
                {order.map((o, i) => (
                  <option key={o.stop.id} value={i + 1}>
                    After #{i + 1} — {(o.stop as StopLite | DraftStop).name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={addDraftStop} className="btn btn-primary btn-sm">
                Add to route
              </button>
              <button type="button" onClick={() => { setAddOpen(false); resetDraft() }} className="btn btn-ghost btn-sm">
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="fg">
          <label>Why these changes? (optional)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ height: 80 }}
            placeholder="e.g. Better flow · new spot near stop 3 the manager asked for…"
          />
        </div>

        {err && <p className="text-sm" style={{ color: 'var(--color-portal-red)' }}>{err}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={submit} disabled={busy} className="btn btn-primary">
            {busy ? 'Sending…' : 'Send changes for review'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title mb-2">How this works</div>
        <div style={{ fontSize: 13, color: 'var(--color-portal-sub)', lineHeight: 1.8 }}>
          <div>1. Drag stops into your preferred delivery order</div>
          <div>2. Tap <strong>+ Add stop</strong> to propose a new location — pick where it goes</div>
          <div>3. Add a note explaining why (optional but helpful)</div>
          <div>4. Submit — the distribution manager gets an email to review</div>
          <div>5. Once approved, your route and any new stops go live automatically</div>
          <div style={{
            marginTop: 12, padding: 10,
            background: 'var(--color-portal-bg)', borderRadius: 8,
            fontSize: 12,
          }}>
            Your current delivery route stays the same until the manager approves the change.
          </div>
        </div>
      </div>
    </div>
  )
}
