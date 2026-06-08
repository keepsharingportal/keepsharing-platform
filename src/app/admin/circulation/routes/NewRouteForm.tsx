'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'

export function NewRouteForm({ market }: { market: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [busy, setBusy] = useState(false)
  const [err,  setErr]  = useState<string | null>(null)

  async function handleAdd() {
    if (!name.trim()) return
    setBusy(true)
    setErr(null)
    try {
      const res = await fetch('/api/admin/circulation/routes', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ market, name: name.trim(), city: city.trim() || null }),
      })
      const j = await res.json() as { error?: string }
      if (!res.ok) throw new Error(j.error ?? 'Create failed')
      setName(''); setCity('')
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-portal-border-2 bg-white p-4 space-y-2">
      <p className="text-xs font-bold text-portal-text">Add a new route</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Route name (e.g. Wetumpka / Millbrook)"
          className="flex-1 min-w-[200px] rounded-md border border-portal-border-2 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
        />
        <input
          value={city}
          onChange={e => setCity(e.target.value)}
          placeholder="City (optional)"
          className="w-40 rounded-md border border-portal-border-2 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-portal-blue/30"
        />
        <button
          onClick={handleAdd}
          disabled={busy || !name.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-portal-navy text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          Add Route
        </button>
      </div>
      {err && <p className="text-xs text-portal-red">{err}</p>}
    </div>
  )
}
