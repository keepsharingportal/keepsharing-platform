'use client'

// Print Export panel — generates a ZIP of high-res images + bits.csv
// manifest for InDesign Data Merge. Lives in /admin/school-news header.
//
// The download is just a GET to /api/admin/school-news/export-print — we
// route through a hidden anchor so the browser's native "save as" prompt
// handles it without us needing to buffer the whole ZIP in JS.

import { useState } from 'react'
import { Download, RefreshCw } from 'lucide-react'

interface Props {
  approvedCount: number
}

export function PrintExportPanel({ approvedCount }: Props) {
  const [issueMonth, setIssueMonth] = useState(() => {
    // Default to current month
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
  const [filterByMonth, setFilterByMonth] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr]   = useState<string | null>(null)

  function download() {
    setBusy(true); setErr(null)
    const qs = new URLSearchParams()
    qs.set('status', 'approved')
    if (filterByMonth) {
      if (!/^\d{4}-\d{2}$/.test(issueMonth)) {
        setErr('Issue month must be YYYY-MM (e.g., 2026-03)')
        setBusy(false)
        return
      }
      qs.set('issue_month', issueMonth)
    }
    const url = `/api/admin/school-news/export-print?${qs.toString()}`

    // Use a hidden anchor so the browser handles the file download natively
    const a = document.createElement('a')
    a.href = url
    a.download = ''  // server sets Content-Disposition; this just hints to download
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    // Give the browser a moment to start the download, then release the busy state
    setTimeout(() => setBusy(false), 1500)
  }

  return (
    <details className="border border-gray-200 rounded-lg bg-white text-sm">
      <summary className="px-3 py-2 cursor-pointer font-semibold text-gray-700 inline-flex items-center gap-1.5 select-none">
        <Download size={13} className="text-gray-400" /> Print export ({approvedCount} approved)
      </summary>
      <div className="px-3 pb-3 pt-1 space-y-2">
        <p className="text-[11px] text-gray-500 leading-relaxed">
          Downloads a ZIP with high-res images + a bits.csv manifest InDesign Data Merge can ingest directly.
        </p>

        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={filterByMonth}
            onChange={e => setFilterByMonth(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300"
          />
          <span className="font-semibold">Filter to a specific issue month:</span>
          <input
            type="text"
            value={issueMonth}
            onChange={e => setIssueMonth(e.target.value)}
            disabled={!filterByMonth}
            placeholder="YYYY-MM"
            className="text-xs px-2 py-1 border border-gray-200 rounded w-24 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </label>

        {err && <p className="text-xs text-rose-700 font-semibold">{err}</p>}

        <button
          type="button"
          onClick={download}
          disabled={busy || approvedCount === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-40"
        >
          {busy ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
          {busy ? 'Generating…' : 'Download ZIP'}
        </button>
      </div>
    </details>
  )
}
