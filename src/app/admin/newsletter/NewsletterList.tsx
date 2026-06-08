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
          className="px-3 py-1.5 text-sm border border-portal-border rounded-lg outline-none bg-white"
        >
          <option value="all">All sources</option>
          {sources.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          type="search" placeholder="Search by email..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="px-3 py-1.5 text-sm border border-portal-border rounded-lg outline-none bg-white focus:border-portal-blue"
        />
        <div className="ml-auto flex items-center gap-2">
          <span className="text-sm text-portal-sub">{filtered.length} showing</span>
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-portal-border-2 rounded-lg text-portal-text hover:bg-portal-bg transition-colors"
          >
            <Download size={12} /> Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-portal-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-portal-bg border-b border-portal-border">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-portal-sub uppercase tracking-wider">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-portal-sub uppercase tracking-wider">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-portal-sub uppercase tracking-wider">Source</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-portal-sub uppercase tracking-wider">Tags</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-portal-sub uppercase tracking-wider">Subscribed</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-portal-sub uppercase tracking-wider">GHL</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-portal-border">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-portal-bg transition-colors">
                <td className="px-4 py-2.5 text-portal-text font-medium text-xs">{s.email}</td>
                <td className="px-4 py-2.5 text-portal-sub text-xs">{s.first_name ?? '—'}</td>
                <td className="px-4 py-2.5 text-xs">
                  <span className="px-2 py-0.5 rounded-full bg-portal-blue-lt text-portal-blue font-medium text-[11px]">
                    {s.source ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-xs">
                  <div className="flex flex-wrap gap-1">
                    {(s.tags ?? []).filter(t => t !== 'rrp-main-email').slice(0, 3).map(t => (
                      <span key={t} className="px-1.5 py-0.5 rounded bg-gray-100 text-portal-sub text-[10px]">{t}</span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-portal-muted text-xs">
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
