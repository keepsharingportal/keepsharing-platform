'use client'

// JSON upload UI for the standalone PHP portal's stop export.
// The actual heavy lifting lives at POST /api/admin/circulation/import.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Upload, Check } from 'lucide-react'

interface Props { market: string }

interface ImportResult {
  market:         string
  routesUpserted: number
  stopsUpserted:  number
  geocoded:       number
  skipped:        number
}

export function CirculationImporter({ market }: Props) {
  const router = useRouter()
  const [file,   setFile]   = useState<File | null>(null)
  const [busy,   setBusy]   = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error,  setError]  = useState<string | null>(null)

  async function handleImport() {
    if (!file) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('market', market)
      const res = await fetch('/api/admin/circulation/import', { method: 'POST', body: form })
      const j   = await res.json() as ImportResult & { error?: string }
      if (!res.ok) throw new Error(j.error ?? 'Import failed')
      setResult(j)
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
      <p className="text-xs text-gray-600">
        Upload <code className="px-1 bg-gray-100 rounded">rrp_stops_YYYY-MM-DD.json</code> exported from
        <code className="px-1 bg-gray-100 rounded ml-1">drivers.keepsharing.com/admin/import.php</code>.
        Replaces all existing stops for <span className="font-bold">{market.toUpperCase()}</span>.
      </p>
      <div className="flex items-center gap-2 flex-wrap">
        <input
          type="file"
          accept="application/json,.json"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="text-xs"
        />
        <button
          onClick={handleImport}
          disabled={!file || busy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {busy ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {busy ? 'Importing…' : 'Import JSON'}
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {result && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-xs text-green-900 flex items-start gap-2">
          <Check size={12} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-bold">Import complete</p>
            <p>
              {result.routesUpserted} routes upserted · {result.stopsUpserted} stops loaded ·
              {' '}{result.geocoded} geocoded · {result.skipped} skipped
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
