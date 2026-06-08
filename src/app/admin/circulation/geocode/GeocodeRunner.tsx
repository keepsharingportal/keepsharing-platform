'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Play, Check, AlertTriangle } from 'lucide-react'

interface Props {
  market:      string
  missing:     Array<{ id: string; name: string; address: string | null; city: string | null; zip: string | null }>
  totalActive: number
  history:     Array<{ id: string; started_at: string; finished_at: string | null; stops_total: number; stops_success: number; stops_failed: number }>
}

export function GeocodeRunner({ market, missing, totalActive, history }: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null)
  const pctGeo = totalActive > 0 ? Math.round(((totalActive - missing.length) / totalActive) * 100) : 0

  async function geocode() {
    setBusy(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/circulation/geocode', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ market, limit: 25 }),
      })
      const j = await res.json() as { geocoded?: number; failed?: number; error?: string; message?: string }
      if (!res.ok) throw new Error(j.error ?? 'Failed')
      setResult({ ok: true, text: j.message ?? `${j.geocoded ?? 0} geocoded · ${j.failed ?? 0} failed` })
      router.refresh()
    } catch (e) {
      setResult({ ok: false, text: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-portal-border bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-portal-text">Coverage</p>
            <p className="text-2xl font-bold text-portal-text mt-0.5">
              {totalActive - missing.length}<span className="text-base text-portal-sub font-normal"> / {totalActive}</span>
            </p>
            <p className="text-[11px] text-portal-sub mt-0.5">{missing.length} stops missing coordinates</p>
          </div>
          <p className={`text-3xl font-bold ${pctGeo === 100 ? 'text-emerald-600' : pctGeo > 50 ? 'text-portal-blue' : 'text-amber-600'}`}>
            {pctGeo}%
          </p>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${pctGeo === 100 ? 'bg-portal-green-lt0' : 'bg-portal-blue-lt0'}`} style={{ width: `${pctGeo}%` }} />
        </div>
        <button
          onClick={geocode}
          disabled={busy || missing.length === 0}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-portal-navy text-white rounded-md hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          Geocode next 25 (≈30s)
        </button>
        {result && (
          <p className={`text-xs font-semibold ${result.ok ? 'text-portal-green' : 'text-portal-red'} flex items-center gap-1`}>
            {result.ok ? <Check size={11} /> : <AlertTriangle size={11} />} {result.text}
          </p>
        )}
      </section>

      {missing.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-portal-text mb-2">Up next ({Math.min(25, missing.length)})</h2>
          <ul className="rounded-xl border border-portal-border bg-white divide-y divide-portal-border">
            {missing.slice(0, 25).map(s => (
              <li key={s.id} className="p-3">
                <p className="text-sm font-bold text-portal-text">{s.name}</p>
                <p className="text-[11px] text-portal-sub">
                  {s.address}{s.city ? `, ${s.city}` : ''}{s.zip ? ` ${s.zip}` : ''}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {history.length > 0 && (
        <section>
          <h2 className="text-sm font-bold text-portal-text mb-2">Recent runs</h2>
          <ul className="rounded-xl border border-portal-border bg-white divide-y divide-portal-border">
            {history.map(h => (
              <li key={h.id} className="p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-portal-text">{new Date(h.started_at).toLocaleString()}</p>
                  <p className="text-[11px] text-portal-sub">
                    {h.stops_success} succeeded · {h.stops_failed} failed · {h.stops_total} total
                  </p>
                </div>
                <p className="text-[10px] text-portal-muted">{h.finished_at ? 'Finished' : 'Running'}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
