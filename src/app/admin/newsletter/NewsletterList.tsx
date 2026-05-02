'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

interface Subscriber {
  id: string
  email: string
  first_name?: string | null
  source?: string | null
  tags?: string[] | null
  ghl_contact_id?: string | null
  subscribed_at: string
  is_subscribed: boolean
}

export function NewsletterList({ subscribers }: { subscribers: Subscriber[] }) {
  const [filterSource, setFilterSource] = useState('all')
  const [search, setSearch] = useState('')

  const sources = Array.from(new Set(subscribers.map(s => s.source ?? 'unknown').filter(Boolean)))

  const filtered = subscribers.filter(s => {
    if (filterSource !== 'all' && s.source !== filterSource) return false
    if (search && !s.email.toLowerCase().includes(search.toLowerCase()) && !(s.first_name ?? '').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  function exportCSV() {
    const rows = [
      ['Email', 'First Name', 'Source', 'Tags', 'Subscribed At', 'GHL ID'],
      ...filtered.map(s => [
        s.email, s.first_name ?? '', s.source ?? '',
        (s.tags ?? []).join('|'), s.subscribed_at, s.ghl_contact_id ?? '',
      ]),
    ]
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `rrp-subscribers-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <select
          value={filterSource} onChange={e => setFilterSource(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none bg-white"
        >
          <option value="all">All sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="search" placeholder="Search by email..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none bg-white focus:border-blue-400"
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-gray-500">{filtered.length} showing</span>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Source</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Tags</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Subscribed</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">GHL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-2.5 text-gray-900 font-medium text-xs">{s.email}</td>
                <td className="px-4 py-2.5 text-gray-600 text-xs">{s.first_name ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium text-[11px]">
                    {s.source ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs">
                  <div className="flex flex-wrap gap-1">
                    {(s.tags ?? []).filter(t => t !== 'rrp-main-email').slice(0, 3).map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px]">{t}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">
                  {new Date(s.subscribed_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {s.ghl_contact_id
                    ? <span className="text-green-600 font-medium">✓ Synced</span>
                    : <span className="text-amber-500">Pending</span>
                  }
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
