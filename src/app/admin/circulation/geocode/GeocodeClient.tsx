'use client'

// Client component for /admin/circulation/geocode.
// Iterates through stops one at a time, calling POST /api/admin/circulation/geocode
// with { stop_id }. Live progress + scrolling log + table updates as
// each stop's coordinates land. Mirrors admin/geocode.php behavior.

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, MapPin, RotateCcw, Square } from 'lucide-react'

export interface StopForGeocode {
  id:         string
  name:       string
  address:    string | null
  city:       string | null
  zip:        string | null
  lat:        number | null
  lng:        number | null
  route_id:   string
  route_name: string
}

interface Props { market: string; stops: StopForGeocode[] }

interface LogLine { time: string; msg: string; tone: 'info' | 'ok' | 'err' | 'warn' | 'muted' }

export function GeocodeClient({ market, stops: initialStops }: Props) {
  const [stops,   setStops]   = useState<StopForGeocode[]>(initialStops)
  const [running, setRunning] = useState(false)
  const [done,    setDone]    = useState<number>(initialStops.filter(s => s.lat != null && s.lng != null).length)
  const [log,     setLog]     = useState<LogLine[]>([{ time: '', msg: 'Ready. Click the button above to start.', tone: 'muted' }])
  const [eta,     setEta]     = useState<string>('')
  const [filter,  setFilter]  = useState('')
  const stopFlag  = useRef(false)
  const logEnd    = useRef<HTMLDivElement | null>(null)

  const total      = stops.length
  const remaining  = stops.filter(s => s.lat == null || s.lng == null).length
  const pct        = total > 0 ? Math.round((done / total) * 100) : 0

  function append(line: Omit<LogLine, 'time'>) {
    const t = new Date().toLocaleTimeString()
    setLog(prev => [...prev, { time: t, ...line }])
    requestAnimationFrame(() => logEnd.current?.scrollIntoView({ block: 'end' }))
  }

  async function start(reAll = false) {
    if (running) return
    setRunning(true)
    stopFlag.current = false
    setEta('')

    const queue = reAll ? stops.slice() : stops.filter(s => s.lat == null || s.lng == null)
    append({ msg: `Starting geocode for ${queue.length} stops…`, tone: 'info' })

    let success = 0
    let failed  = 0
    const startTime = Date.now()

    for (let i = 0; i < queue.length; i++) {
      if (stopFlag.current) {
        append({ msg: 'Stopped by user.', tone: 'warn' })
        break
      }
      const s = queue[i]

      if (i > 0) {
        const elapsed   = (Date.now() - startTime) / 1000
        const rate      = i / elapsed
        const remainSec = Math.round((queue.length - i) / Math.max(rate, 0.01))
        const mins      = Math.floor(remainSec / 60)
        const secs      = remainSec % 60
        setEta('ETA: ' + (mins > 0 ? `${mins}m ` : '') + `${secs}s remaining`)
      }

      try {
        const res = await fetch('/api/admin/circulation/geocode', {
          method:  'POST',
          headers: { 'content-type': 'application/json' },
          body:    JSON.stringify({ market, stop_id: s.id }),
        })
        const j = await res.json().catch(() => ({})) as { ok?: boolean; lat?: number; lng?: number; message?: string; error?: string }
        if (j.ok && typeof j.lat === 'number' && typeof j.lng === 'number') {
          success++
          // Mutate stop's coords in state so the table + done count update.
          setStops(prev => prev.map(x => x.id === s.id ? { ...x, lat: j.lat!, lng: j.lng! } : x))
          if (s.lat == null || s.lng == null) setDone(d => d + 1)
          append({ msg: `✓ ${s.name} → ${j.lat.toFixed(4)}, ${j.lng.toFixed(4)}`, tone: 'ok' })
        } else {
          failed++
          append({ msg: `✗ ${s.name}: ${j.message ?? j.error ?? 'Not found.'}`, tone: 'err' })
        }
      } catch {
        failed++
        append({ msg: `✗ Network error on ${s.name}`, tone: 'err' })
      }

      // Pacing — match the source's 1.1s spacing when we're on OSM
      // fallback; tighten when Google is available. We can't know
      // server-side which provider was used until the response, so
      // assume ~200ms is safe and the server-side pacing handles QPS.
      if (i < queue.length - 1) await new Promise(r => setTimeout(r, 200))
    }

    setEta('')
    setRunning(false)
    append({ msg: `Complete! ${success} geocoded, ${failed} failed.`, tone: 'info' })
    if (failed > 0) {
      append({ msg: 'Failed stops may have incomplete addresses. Edit them in Routes & Stops and try again.', tone: 'warn' })
    }
  }

  function stop() {
    stopFlag.current = true
    append({ msg: 'Stopping after current stop…', tone: 'warn' })
  }

  const filtered = useMemo(() => {
    if (!filter.trim()) return stops
    const q = filter.toLowerCase()
    return stops.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.route_name.toLowerCase().includes(q) ||
      (s.address ?? '').toLowerCase().includes(q) ||
      (s.city    ?? '').toLowerCase().includes(q)
    )
  }, [stops, filter])

  function logColor(t: LogLine['tone']): string {
    switch (t) {
      case 'ok':    return 'var(--color-portal-green)'
      case 'err':   return '#EF4444'
      case 'warn':  return 'var(--color-portal-amber)'
      case 'info':  return 'var(--color-portal-blue)'
      case 'muted': return 'var(--color-portal-muted)'
    }
  }

  return (
    <div className="portal-app flex flex-col flex-1 min-h-0 bg-portal-bg">

      <div className="page-header">
        <div>
          <h1 className="ph-title">Geocode stop locations</h1>
        </div>
        <div className="ph-actions">
          <Link href="/admin/circulation/routes" className="btn btn-ghost btn-sm">
            <ArrowLeft size={14} /> Back to routes
          </Link>
        </div>
      </div>

      <div className="content-body overflow-y-auto">

        <div className="card mb-4">
          <div className="card-header">
            <span className="card-title">Google Geocoding</span>
            <span className={`badge ${done === total ? 'badge-green' : 'badge-amber'}`}>
              {done} / {total} geocoded
            </span>
          </div>
          <p className="text-sub text-sm" style={{ lineHeight: 1.6, marginBottom: 14 }}>
            Looks up GPS coordinates for each stop address. Backed by Google Geocoding (with OpenStreetMap fallback).
            {' '}{remaining > 0 ? <><strong>{remaining}</strong> stops still need coordinates.</> : <span>Every active stop has coordinates.</span>}
            {' '}<strong>Leave this page open</strong> while it runs.
          </p>

          <div style={{ background: 'var(--color-portal-bg)', borderRadius: 6, height: 8, marginBottom: 8, overflow: 'hidden' }}>
            <div style={{ height: 8, borderRadius: 6, background: 'var(--color-portal-blue)', transition: 'width .3s', width: `${pct}%` }} />
          </div>
          <div className="flex justify-between text-sm text-muted mb-4">
            <span>{done} of {total} stops geocoded</span>
            <span>{pct}%</span>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => start(false)}
              disabled={running || remaining === 0}
            >
              <MapPin size={14} /> Geocode {remaining} remaining stop{remaining === 1 ? '' : 's'}
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => start(true)}
              disabled={running || total === 0}
            >
              <RotateCcw size={14} /> Re-geocode all {total} stops
            </button>
            {running && (
              <button type="button" className="btn btn-red btn-sm" onClick={stop}>
                <Square size={14} /> Stop
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Progress log</span>
            <span className="text-muted text-sm">{eta}</span>
          </div>
          <div style={{
            fontFamily: 'ui-monospace, monospace', fontSize: 12,
            maxHeight: 400, overflowY: 'auto',
            background: 'var(--color-portal-bg)', borderRadius: 8, padding: 12,
            display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            {log.map((l, i) => (
              <span key={i} style={{ color: logColor(l.tone) }}>
                {l.time && <>{l.time}  </>}{l.msg}
              </span>
            ))}
            <div ref={logEnd} />
          </div>
        </div>

        <div className="card" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
          <div className="card-header" style={{ padding: '14px 18px', borderBottom: '1px solid var(--color-portal-border)' }}>
            <span className="card-title">All stops</span>
            <input
              type="search"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter…"
              style={{
                padding: '6px 10px',
                border: '1.5px solid var(--color-portal-border-2)',
                borderRadius: 8,
                fontSize: 12, width: 200,
              }}
            />
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Stop</th>
                <th>Route</th>
                <th>Address</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'center' }}>Coordinates</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const hasCoords = s.lat != null && s.lng != null
                return (
                  <tr key={s.id}>
                    <td><strong>{s.name}</strong></td>
                    <td className="text-sub text-sm">{s.route_name}</td>
                    <td className="text-sub text-sm">
                      {s.address ?? ''}{s.city ? `, ${s.city}` : ''}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${hasCoords ? 'badge-green' : 'badge-gray'}`}>
                        {hasCoords ? '✓ Done' : 'Pending'}
                      </span>
                    </td>
                    <td className="mono text-sm" style={{ textAlign: 'center' }}>
                      {hasCoords ? `${s.lat!.toFixed(4)}, ${s.lng!.toFixed(4)}` : '-'}
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 24, color: 'var(--color-portal-sub)' }}>
                  No stops match.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
