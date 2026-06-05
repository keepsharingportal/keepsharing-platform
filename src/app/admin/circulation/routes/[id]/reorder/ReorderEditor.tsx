'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Loader2, GripVertical, ArrowUp, ArrowDown, RotateCcw, Check, X } from 'lucide-react'

export interface StopMini { id: string; name: string; address: string | null; city: string | null; sort_order: number; is_pickup: boolean }
export interface Snapshot { id: string; label: string | null; created_at: string }
export interface DriverSuggestion { id: string; driver_id: string; driver_name: string; suggestion: string[]; created_at: string }

interface Props {
  routeId:      string
  initialStops: StopMini[]
  snapshots:    Snapshot[]
  suggestions:  DriverSuggestion[]
}

export function ReorderEditor({ routeId, initialStops, snapshots, suggestions }: Props) {
  const router = useRouter()
  const [stops, setStops] = useState<StopMini[]>(initialStops)
  const [snapshotLabel, setSnapshotLabel] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [err,  setErr]  = useState<string | null>(null)
  const dirty = stops.some((s, i) => s.id !== initialStops[i]?.id)

  function move(srcIdx: number, destIdx: number) {
    if (destIdx < 0 || destIdx >= stops.length) return
    const next = stops.slice()
    const [m] = next.splice(srcIdx, 1)
    next.splice(destIdx, 0, m)
    setStops(next)
  }

  // ── HTML5 drag-drop ────────────────────────────────────────────────────
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  function onDragStart(i: number) { setDragFrom(i) }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }
  function onDrop(destIdx: number) {
    if (dragFrom == null || dragFrom === destIdx) return
    move(dragFrom, destIdx)
    setDragFrom(null)
  }

  async function save() {
    setBusy('save')
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/route-order', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ route_id: routeId, ids: stops.map(s => s.id), snapshot_label: snapshotLabel.trim() || undefined }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(j.error ?? 'Save failed')
      }
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally { setBusy(null) }
  }

  async function restore(snapshotId: string) {
    if (!confirm('Restore this snapshot? Current order will be snapshotted first.')) return
    setBusy(`restore-${snapshotId}`)
    try {
      const res = await fetch('/api/admin/circulation/route-order', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ route_id: routeId, action: 'restore', snapshot_id: snapshotId }),
      })
      if (!res.ok) throw new Error('Restore failed')
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally { setBusy(null) }
  }

  async function patchSuggestion(suggestionId: string, action: 'approve' | 'reject') {
    setBusy(`sug-${suggestionId}`)
    try {
      const res = await fetch('/api/admin/circulation/route-order', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ suggestion_id: suggestionId, action }),
      })
      if (!res.ok) throw new Error('Failed')
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally { setBusy(null) }
  }

  return (
    <div className="space-y-6">
      {err && <p className="text-xs text-red-600">{err}</p>}

      {suggestions.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-2">Driver suggestions</h2>
          <ul className="space-y-2">
            {suggestions.map(s => (
              <li key={s.id} className="rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-amber-900">{s.driver_name} suggests a new order</p>
                    <p className="text-[11px] text-amber-700">
                      {new Date(s.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      {' · '}{s.suggestion.length} stops
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => patchSuggestion(s.id, 'approve')} disabled={busy !== null} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50">
                      <Check size={11} /> Approve
                    </button>
                    <button onClick={() => patchSuggestion(s.id, 'reject')} disabled={busy !== null} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-red-200 text-red-700 hover:bg-red-100 disabled:opacity-50">
                      <X size={11} /> Reject
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-gray-900">Stops</h2>
          <p className="text-[11px] text-gray-500">{stops.length} total · drag to reorder</p>
        </div>
        <ul className="space-y-1">
          {stops.map((s, i) => (
            <li
              key={s.id}
              draggable
              onDragStart={() => onDragStart(i)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(i)}
              className={`rounded-lg border bg-white p-2 flex items-center gap-2 ${dragFrom === i ? 'opacity-50 border-blue-400' : 'border-gray-200'}`}
            >
              <GripVertical size={14} className="text-gray-300 shrink-0 cursor-grab" />
              <span className="text-[11px] font-bold text-gray-400 tabular-nums w-6 shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">
                  {s.name}
                  {s.is_pickup && <span className="ml-2 text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">PICKUP</span>}
                </p>
                {s.address && <p className="text-[11px] text-gray-500 truncate">{s.address}{s.city ? `, ${s.city}` : ''}</p>}
              </div>
              <div className="flex flex-col gap-0.5 shrink-0">
                <button onClick={() => move(i, i - 1)} disabled={i === 0} className="text-gray-400 hover:text-gray-900 disabled:opacity-30"><ArrowUp size={12} /></button>
                <button onClick={() => move(i, i + 1)} disabled={i === stops.length - 1} className="text-gray-400 hover:text-gray-900 disabled:opacity-30"><ArrowDown size={12} /></button>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex items-center gap-2">
          <input
            value={snapshotLabel}
            onChange={e => setSnapshotLabel(e.target.value)}
            placeholder="Snapshot label (optional)"
            className="flex-1 rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
          <button onClick={save} disabled={!dirty || busy !== null} className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {busy === 'save' ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            Save order
          </button>
        </div>
      </section>

      {snapshots.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-gray-900 mb-2">Snapshots</h2>
          <ul className="space-y-1">
            {snapshots.map(s => (
              <li key={s.id} className="rounded-md border border-gray-200 bg-white p-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.label ?? 'Snapshot'}</p>
                  <p className="text-[11px] text-gray-500">{new Date(s.created_at).toLocaleString()}</p>
                </div>
                <button onClick={() => restore(s.id)} disabled={busy !== null} className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                  {busy === `restore-${s.id}` ? <Loader2 size={11} className="animate-spin" /> : <RotateCcw size={11} />}
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
