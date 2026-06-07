'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, ChevronDown, ChevronUp, TrendingUp, TrendingDown, Minus,
  Calendar, DollarSign, FileText, Phone, Mail, Plus, Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatCurrency, issueLabel } from '@/lib/utils'
import type { AdvertiserRecord } from '@/types'

export interface BusinessRecord {
  name: string
  contact: string
  email: string
  phone: string
  publication: string
  totalRevenue: number
  adCount: number
  issues: string[]        // sorted most-recent-first
  lastIssue: string
  ads: AdvertiserRecord[]
  renewalScore: 'high' | 'medium' | 'low' | 'new'
}

// Agreements + Ad Proofs were placeholder-only routes; removed in the
// contacts/CRM cleanup. Re-add the entries here and in the sibling tab
// strips (/admin/advertisers/page.tsx + /pipeline/page.tsx) when those
// surfaces get rebuilt against real data.
const ADVERTISER_TABS = ['Active Advertisers', 'Layout Sheet', 'Pipeline', 'Businesses']
const ADVERTISER_HREFS: Record<string, string> = {
  'Active Advertisers': '/admin/advertisers',
  'Layout Sheet':       '/admin/advertisers/layout-sheet',
  'Pipeline':           '/admin/advertisers/pipeline',
  'Businesses':         '/admin/advertisers/businesses',
}

const RENEWAL_CONFIG = {
  high:   { label: 'High',   cls: 'bg-green-50 text-green-700 ring-green-200', icon: TrendingUp },
  medium: { label: 'Medium', cls: 'bg-amber-50 text-amber-700 ring-amber-200', icon: Minus },
  low:    { label: 'Low',    cls: 'bg-red-50 text-red-600 ring-red-200',       icon: TrendingDown },
  new:    { label: 'New',    cls: 'bg-blue-50 text-blue-700 ring-blue-200',    icon: TrendingUp },
}

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function issueToDate(issue: string): number {
  const parts = issue.trim().split(' ')
  const monthYear = parts[1] ?? ''
  const monthCode = monthYear.slice(0, 3).toUpperCase()
  const yearCode  = parseInt(monthYear.slice(3)) + 2000
  const monthIdx  = MONTHS.indexOf(monthCode)
  if (monthIdx === -1 || isNaN(yearCode)) return 0
  return yearCode * 100 + monthIdx
}

interface Props {
  businesses: BusinessRecord[]
  totalRevenue: number
}

export function BusinessesClient({ businesses, totalRevenue }: Props) {
  const [search, setSearch]         = useState('')
  const [sortBy, setSortBy]         = useState<'name' | 'revenue' | 'recent'>('name')
  const [sortDir, setSortDir]       = useState<'asc' | 'desc'>('asc')
  const [expandedName, setExpandedName] = useState<string | null>(null)
  const [renewalFilter, setRenewalFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    let list = businesses
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((b) => b.name.toLowerCase().includes(q) || b.contact.toLowerCase().includes(q))
    }
    if (renewalFilter !== 'all') {
      list = list.filter((b) => b.renewalScore === renewalFilter)
    }
    list = [...list].sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name')    cmp = a.name.localeCompare(b.name)
      if (sortBy === 'revenue') cmp = a.totalRevenue - b.totalRevenue
      if (sortBy === 'recent')  cmp = issueToDate(a.lastIssue) - issueToDate(b.lastIssue)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return list
  }, [businesses, search, sortBy, sortDir, renewalFilter])

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('desc') }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) => {
    if (sortBy !== col) return null
    return sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
  }

  const highCount   = businesses.filter((b) => b.renewalScore === 'high').length
  const mediumCount = businesses.filter((b) => b.renewalScore === 'medium').length
  const lowCount    = businesses.filter((b) => b.renewalScore === 'low').length

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold text-gray-900">Advertisers</h1>
          <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full ring-1 ring-blue-200">
            {businesses.length.toLocaleString()} businesses
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-gray-500">Lifetime revenue</span>
          <span className="text-lg font-bold text-gray-900">{formatCurrency(totalRevenue)}</span>
          <button className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
            <Plus size={14} /> Add Business
          </button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="bg-white border-b border-gray-200 px-6 shrink-0">
        <div className="flex items-center gap-1">
          {ADVERTISER_TABS.map((tab) => (
            <Link key={tab} href={ADVERTISER_HREFS[tab]}
              className={cn(
                'px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2',
                tab === 'Businesses'
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 border-transparent hover:border-gray-300'
              )}>
              {tab}
            </Link>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-3 shrink-0">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search businesses or contacts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 w-64 transition-all"
          />
        </div>

        {/* Renewal filter chips */}
        <div className="flex items-center gap-1.5">
          {([
            ['all', `All (${businesses.length})`, 'bg-gray-100 text-gray-600'],
            ['high',   `High (${highCount})`,   'bg-green-100 text-green-700'],
            ['medium', `Medium (${mediumCount})`, 'bg-amber-100 text-amber-700'],
            ['low',    `Low (${lowCount})`,    'bg-red-100 text-red-700'],
          ] as const).map(([val, label, activeCls]) => (
            <button key={val} onClick={() => setRenewalFilter(val)}
              className={cn(
                'text-xs px-2.5 py-1 rounded-lg font-medium transition-colors',
                renewalFilter === val ? activeCls : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'
              )}>
              {label}
            </button>
          ))}
        </div>

        <span className="ml-auto text-xs text-gray-400">{filtered.length} shown</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10 bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <button onClick={() => toggleSort('name')} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                  Business Name <SortIcon col="name" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <button onClick={() => toggleSort('recent')} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                  Last Issue <SortIcon col="recent" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                <button onClick={() => toggleSort('revenue')} className="flex items-center gap-1 hover:text-gray-700 transition-colors">
                  Lifetime Rev. <SortIcon col="revenue" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Issues</th>
              <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">Renewal</th>
              <th className="px-4 py-2.5 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map((biz) => {
              const isExpanded = expandedName === biz.name
              const RenewIcon = RENEWAL_CONFIG[biz.renewalScore].icon
              return [
                <tr
                  key={biz.name}
                  className="hover:bg-gray-50 cursor-pointer transition-colors group"
                  onClick={() => setExpandedName(isExpanded ? null : biz.name)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                        {biz.name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{biz.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{biz.contact || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-700 font-medium px-2 py-0.5 rounded">{biz.lastIssue}</span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(biz.totalRevenue)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 font-medium">{biz.adCount}</td>
                  <td className="px-4 py-3">
                    <span className={cn('flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1 w-fit', RENEWAL_CONFIG[biz.renewalScore].cls)}>
                      <RenewIcon size={10} />
                      {RENEWAL_CONFIG[biz.renewalScore].label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  </td>
                </tr>,

                isExpanded && (
                  <tr key={`${biz.name}-detail`}>
                    <td colSpan={7} className="px-0 py-0">
                      <div className="bg-blue-50/40 border-t border-b border-blue-100 px-6 py-5">
                        <div className="grid grid-cols-3 gap-6">
                          {/* Contact info */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Contact</h4>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-gray-700">
                                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold shrink-0">
                                  {biz.contact.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase() || '?'}
                                </div>
                                <span className="font-medium">{biz.contact || 'Unknown'}</span>
                              </div>
                              {biz.email && (
                                <a href={`mailto:${biz.email}`} className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800">
                                  <Mail size={12} /> {biz.email}
                                </a>
                              )}
                              {biz.phone && (
                                <a href={`tel:${biz.phone}`} className="flex items-center gap-2 text-xs text-blue-600 hover:text-blue-800">
                                  <Phone size={12} /> {biz.phone}
                                </a>
                              )}
                            </div>
                          </div>

                          {/* Revenue breakdown */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Revenue by Publication</h4>
                            <div className="space-y-1.5">
                              {Object.entries(
                                biz.ads.reduce<Record<string, number>>((acc, ad) => {
                                  acc[ad.publication] = (acc[ad.publication] ?? 0) + ad.amount
                                  return acc
                                }, {})
                              ).sort(([, a], [, b]) => b - a).map(([pub, rev]) => (
                                <div key={pub} className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500 font-medium">{pub}</span>
                                  <span className="font-semibold text-gray-900">{formatCurrency(rev)}</span>
                                </div>
                              ))}
                              <div className="flex items-center justify-between text-sm border-t border-blue-100 pt-1.5 mt-1.5">
                                <span className="text-gray-700 font-semibold">Total</span>
                                <span className="font-bold text-gray-900">{formatCurrency(biz.totalRevenue)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Issue history */}
                          <div>
                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Ad History ({biz.ads.length} records)</h4>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {biz.ads.slice().sort((a, b) => issueToDate(b.issue) - issueToDate(a.issue)).map((ad) => (
                                <div key={ad.id} className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar size={10} className="text-gray-400 shrink-0" />
                                    <span className="text-gray-600 font-medium">{ad.issue}</span>
                                    <span className="text-gray-400">{ad.size === 1 ? 'Full' : ad.size === 0.5 ? '1/2' : ad.size === 0.25 ? '1/4' : `${ad.size}pg`}p</span>
                                  </div>
                                  <span className={cn(
                                    'text-[10px] px-1.5 py-0.5 rounded font-medium',
                                    ad.stage === 'Closed Won' || ad.stage === 'Renewed' ? 'bg-green-100 text-green-700' :
                                    ad.stage === 'Dropped' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-600'
                                  )}>
                                    {ad.stage}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ),
              ]
            })}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Search size={28} className="mb-2 opacity-30" />
            <p className="text-sm">No businesses match "{search}"</p>
          </div>
        )}
      </div>
    </div>
  )
}
