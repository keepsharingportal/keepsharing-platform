'use client'

// Client component for /admin/circulation/route-order.
//
// Matches the screenshot the publisher shared: route tab strip, left
// card with drag-to-reorder list (Publications Plus pinned at the top),
// position-number inputs that jump a stop to a typed position, "Save as
// master order" button, plus a right card with a live Leaflet route map
// using numbered red pins. "Version history" button in the map card
// header opens a modal listing prior snapshots with Restore actions.

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { ArrowRight, History } from 'lucide-react'

interface RouteLite    { id: string; name: string }
interface StopLite     {
  id: string; sort_order: number; name: string;
  address: string | null; city: string | null;
  is_pickup: boolean; not_delivering: boolean;
  lat: number | null; lng: number | null;
}
interface SnapshotLite { id: string; label: string | null; created_at: string }

interface Props {
  routes:       RouteLite[]
  currentRoute: RouteLite | null
  stops:        StopLite[]
  snapshots:    SnapshotLite[]
}

// Leaflet hits `window` on import → SSR off.
const NumberedRouteMap = dynamic(() => import('./NumberedRouteMap'), {
  ssr:     false,
  loading: () => <div style={{ height: 500, background: '#F1F5F9', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#64748B' }}>Loading map…</div>,
})

export function RouteOrderClient({ routes, currentRoute, stops, snapshots }: Props) {
  const router = useRouter()

  // Working order — initialized from server data, mutated client-side as
  // the operator drags / types positions. Pickup stays at index 0.
  const initialOrder = useMemo(() => stops.slice().sort((a, b) => a.sort_order - b.sort_order), [stops])
  const [order, setOrder] = useState<StopLite[]>(initialOrder)
  const [busy,  setBusy]  = useState(false)
  const [saved, setSaved] = useState(false)
  const [err,   setErr]   = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)

  // Reset when route changes
  useEffect(() => { setOrder(initialOrder); setSaved(false); setErr(null) }, [initialOrder])

  // ── HTML5 drag-and-drop ──────────────────────────────────────────────
  const dragId = useRef<string | null>(null)
  function onDragStart(id: string) { dragId.current = id }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }
  function onDrop(targetId: string) {
    if (!dragId.current || dragId.current === targetId) return
    const src = order.find(s => s.id === dragId.current)
    const dst = order.find(s => s.id === targetId)
    if (!src || !dst || src.is_pickup || dst.is_pickup) {
      dragId.current = null
      return
    }
    const next = order.slice()
    const srcIdx = next.findIndex(s => s.id === src.id)
    const dstIdx = next.findIndex(s => s.id === dst.id)
    next.splice(srcIdx, 1)
    next.splice(dstIdx, 0, src)
    setOrder(next)
    setSaved(false)
    dragId.current = null
  }

  function moveToPos(id: string, raw: string) {
    const pos = parseInt(raw, 10)
    if (Number.isNaN(pos)) return
    const pickup = order[0]?.is_pickup ? order[0] : null
    const rest   = order.filter(s => !s.is_pickup)
    const moving = rest.find(s => s.id === id)
    if (!moving) return
    const idx = Math.max(0, Math.min(rest.length - 1, pos - 1))
    const without = rest.filter(s => s.id !== id)
    without.splice(idx, 0, moving)
    setOrder(pickup ? [pickup, ...without] : without)
    setSaved(false)
  }

  async function save() {
    if (!currentRoute) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/route-order', {
        method:  'PUT',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ route_id: currentRoute.id, ids: order.map(s => s.id) }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j.error ?? 'Save failed.')
        return
      }
      setSaved(true)
      // Refresh server data so the page reflects the new sort_order +
      // surfaces a new snapshot row in version history next time.
      router.refresh()
      setTimeout(() => setSaved(false), 2500)
    } finally { setBusy(false) }
  }

  async function restore(snapId: string) {
    if (!currentRoute) return
    if (!confirm('Restore route to this version? The current order will be saved as a new snapshot first.')) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/route-order', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body:    JSON.stringify({ route_id: currentRoute.id, action: 'restore', snapshot_id: snapId }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setErr(j.error ?? 'Restore failed.')
        return
      }
      setShowHistory(false)
      router.refresh()
    } finally { setBusy(false) }
  }

  // Position counter — pickup gets "P", everyone else is 1-based.
  const positions = useMemo(() => {
    const out = new Map<string, string>()
    let i = 0
    for (const s of order) out.set(s.id, s.is_pickup ? 'P' : String(++i))
    return out
  }, [order])

  // Geo-located stops for the map (skip pickup which is informational only).
  const mappable = order.filter(s => s.lat != null && s.lng != null)

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div>
          <h1 className="ph-title">Route Order</h1>
        </div>
        <div className="ph-actions">
          {/* Version history button mirrors the screenshot — top-right action that opens the snapshot modal. */}
          {currentRoute && snapshots.length > 0 && (
            <button type="button" onClick={() => setShowHistory(true)} className="btn btn-ghost btn-sm">
              <History size={14} /> Version history
            </button>
          )}
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        {/* Route tab strip */}
        {routes.length > 0 && (
          <div className="flex gap-2 mb-4" style={{ flexWrap: 'wrap' }}>
            {routes.map(r => {
              const isActive = currentRoute?.id === r.id
              return (
                <Link
                  key={r.id}
                  href={`/admin/circulation/route-order?route=${r.id}`}
                  className={`btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`}
                >
                  {r.name}
                </Link>
              )
            })}
          </div>
        )}

        {!currentRoute ? (
          <div className="card">
            <p className="text-muted text-sm">No active routes. Add one in Routes &amp; Stops.</p>
          </div>
        ) : (
          <div className="grid-2">

            {/* ── Drag list ── */}
            <div>
              <div className="card">
                <div className="card-header">
                  <span className="card-title">Drag to reorder · or type a position number</span>
                </div>
                <div className="text-muted text-xs" style={{ marginBottom: 10 }}>
                  Publications Plus is always first and cannot be moved.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {order.map(s => {
                    const isPickup = s.is_pickup
                    return (
                      <div
                        key={s.id}
                        draggable={!isPickup}
                        onDragStart={() => onDragStart(s.id)}
                        onDragOver={onDragOver}
                        onDrop={() => onDrop(s.id)}
                        className="flex items-center"
                        style={{
                          gap: 8,
                          background:    isPickup ? 'var(--color-portal-navy-lt)' : 'white',
                          border:        '1px solid var(--color-portal-border)',
                          borderRadius:  6,
                          padding:       '8px 10px',
                          cursor:        isPickup ? 'default' : 'grab',
                        }}
                      >
                        {isPickup ? (
                          <>
                            <span style={{ fontSize: 12, color: 'var(--color-portal-blue)', fontWeight: 600, padding: '0 4px' }}>P</span>
                            <span style={{ width: 44 }} />
                          </>
                        ) : (
                          <>
                            <span style={{ fontSize: 16, color: 'var(--color-portal-muted)', userSelect: 'none' }}>⠿</span>
                            <input
                              type="number"
                              min={1}
                              max={Math.max(1, order.length - 1)}
                              value={positions.get(s.id) ?? ''}
                              onChange={e => moveToPos(s.id, e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                              style={{
                                width: 44,
                                padding: '3px 5px',
                                fontSize: 12,
                                fontFamily: 'ui-monospace, monospace',
                                border: '1px solid var(--color-portal-border)',
                                borderRadius: 4,
                                textAlign: 'center',
                              }}
                            />
                          </>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500 }}>
                            {s.not_delivering && (
                              <span style={{ color: 'var(--color-portal-amber)' }}>⏸ </span>
                            )}
                            {s.name}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--color-portal-muted)' }}>
                            {s.address ?? ''}{s.city ? `, ${s.city}` : ''}
                          </div>
                        </div>
                        {isPickup && (
                          <span className="badge badge-rrp" style={{ fontSize: 10 }}>Pickup</span>
                        )}
                        {!isPickup && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-xs"
                            onClick={() => {
                              // Move to next position — mirrors the screenshot's "→ Move" affordance.
                              const idx = order.findIndex(x => x.id === s.id)
                              if (idx < order.length - 1) {
                                const next = order.slice()
                                const [it] = next.splice(idx, 1)
                                next.splice(idx + 1, 0, it)
                                setOrder(next)
                                setSaved(false)
                              }
                            }}
                          >
                            <ArrowRight size={11} /> Move
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-2" style={{ marginTop: 16, alignItems: 'center' }}>
                  <button type="button" onClick={save} disabled={busy} className="btn btn-primary">
                    {busy ? 'Saving…' : 'Save as master order'}
                  </button>
                  {saved && (
                    <span style={{ fontSize: 12, color: 'var(--color-portal-green)' }}>✓ Saved</span>
                  )}
                  {err && (
                    <span style={{ fontSize: 12, color: 'var(--color-portal-red)' }}>{err}</span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Route map ── */}
            <div>
              <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '14px 18px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--color-portal-border)',
                  }}
                >
                  <div>
                    <div className="card-title">Route map</div>
                    <div className="text-muted text-xs" style={{ marginTop: 2 }}>
                      Numbered markers show delivery order. Updates when you save.
                    </div>
                  </div>
                </div>
                {mappable.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--color-portal-sub)', fontSize: 13 }}>
                    No geocoded stops on this route yet.
                    {' '}
                    <Link href="/admin/circulation/geocode" className="text-blue-600 underline">Run geocoder →</Link>
                  </div>
                ) : (
                  <NumberedRouteMap
                    points={mappable.map(s => ({
                      id:    s.id,
                      label: positions.get(s.id) ?? '',
                      name:  s.name,
                      lat:   s.lat!,
                      lng:   s.lng!,
                    }))}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Version history modal ── */}
      {showHistory && currentRoute && (
        <div
          onClick={() => setShowHistory(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
            zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="portal-app"
            style={{
              background: 'white', borderRadius: 12, padding: 24,
              width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0,0,0,.25)',
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6, color: 'var(--color-portal-text)' }}>
              Version history
            </div>
            <div className="text-muted text-xs" style={{ marginBottom: 14 }}>
              A snapshot is saved each time you save the master order.
            </div>
            {snapshots.length === 0 ? (
              <p className="text-muted text-sm">No snapshots yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {snapshots.map(s => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between"
                    style={{
                      padding: '8px 10px',
                      border: '1px solid var(--color-portal-border)',
                      borderRadius: 6,
                      fontSize: 13,
                    }}
                  >
                    <div>
                      {s.label ?? new Date(s.created_at).toLocaleString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                        hour: 'numeric', minute: '2-digit',
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => restore(s.id)}
                      disabled={busy}
                      className="btn btn-ghost btn-xs"
                    >
                      Restore
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-footer">
              <button type="button" onClick={() => setShowHistory(false)} className="btn btn-ghost">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
