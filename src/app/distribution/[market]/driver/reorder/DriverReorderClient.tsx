'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

interface StopLite { id: string; sort_order: number; name: string; address: string | null; city: string | null; is_pickup: boolean; not_delivering: boolean }

interface Props {
  routeId:   string
  pickup:    StopLite | null
  draggable: StopLite[]
}

export function DriverReorderClient({ routeId, pickup, draggable }: Props) {
  const router = useRouter()
  const [order, setOrder] = useState<StopLite[]>(draggable)
  const [note,  setNote]  = useState('')
  const [busy,  setBusy]  = useState(false)
  const [err,   setErr]   = useState<string | null>(null)

  const dragId = useRef<string | null>(null)
  function onDragStart(id: string) { dragId.current = id }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }
  function onDrop(targetId: string) {
    if (!dragId.current || dragId.current === targetId) return
    const src = order.find(s => s.id === dragId.current)
    if (!src) { dragId.current = null; return }
    const next = order.slice()
    const srcIdx = next.findIndex(s => s.id === src.id)
    next.splice(srcIdx, 1)
    const dstIdx = next.findIndex(s => s.id === targetId)
    next.splice(Math.max(0, dstIdx), 0, src)
    setOrder(next)
    dragId.current = null
  }

  async function submit() {
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/circulation/driver', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({
          action:           'suggest-route-order',
          route_id:         routeId,
          stop_order:       order.map(s => s.id),
          suggestion_note:  note.trim() || null,
        }),
      })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setErr(j.error ?? 'Submit failed.'); return }
      router.push(`/distribution/${routeId.split('-')[0] || ''}/driver/dashboard`)
    } finally { setBusy(false) }
  }

  return (
    <div className="grid-2">
      <div className="card">
        <div className="card-title mb-2">Drag stops into your preferred order</div>
        <p className="text-sub text-sm mb-4" style={{ lineHeight: 1.6 }}>
          Your suggestion goes to the distribution manager for approval. Your delivery route stays the same until they approve it. Publications Plus is always first and cannot be moved.
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
          {order.map((s, i) => (
            <div
              key={s.id}
              draggable
              onDragStart={() => onDragStart(s.id)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(s.id)}
              style={{
                background: 'white', border: '1.5px solid var(--color-portal-border)',
                borderRadius: 10, padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'grab', userSelect: 'none', touchAction: 'none',
              }}
            >
              <span style={{ color: '#CBD5E1', fontSize: 16 }}>⠿</span>
              <div style={{
                width: 26, height: 26, borderRadius: '50%',
                background: 'var(--color-portal-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700, color: 'var(--color-portal-sub)',
                flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</div>
                {s.address && (
                  <div style={{ fontSize: 12, color: 'var(--color-portal-sub)' }}>
                    {s.address}{s.city ? `, ${s.city}` : ''}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="fg">
          <label>Why this order? (optional)</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{ height: 80 }}
            placeholder="e.g. This order saves backtracking, works better with my commute…"
          />
        </div>

        {err && <p className="text-sm" style={{ color: 'var(--color-portal-red)' }}>{err}</p>}

        <div className="flex gap-2">
          <button type="button" onClick={submit} disabled={busy} className="btn btn-primary">
            {busy ? 'Sending…' : 'Send suggestion'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-title mb-2">How this works</div>
        <div style={{ fontSize: 13, color: 'var(--color-portal-sub)', lineHeight: 1.8 }}>
          <div>1. Drag stops into your preferred delivery order</div>
          <div>2. Add a note explaining why (optional but helpful)</div>
          <div>3. Submit — the distribution manager gets an email to review</div>
          <div>4. Once approved, your route updates automatically</div>
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
